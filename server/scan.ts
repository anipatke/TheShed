import { existsSync, readFileSync } from 'node:fs';
import type { Config, Env, ProjectStatus, Probe, ScanResult, Service, SourceReport } from '../shared/types.ts';
import type { Listener, SourceOutput } from './discovery/listener.ts';
import { discoverPosixLocal, discoverWslFromWindows } from './discovery/posix.ts';
import { discoverWindows } from './discovery/windows.ts';
import { run } from './discovery/run.ts';
import { basename, identify, type HostContext } from './identify.ts';
import { isLoopbackHost, mapLimit, probe } from './probe.ts';
import { resolveProjects } from './registry.ts';

export function detectHost(): Env {
  if (process.platform === 'win32') return 'windows';
  if (process.env.WSL_DISTRO_NAME || existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')) return 'wsl';
  try {
    if (/microsoft/i.test(readFileSync('/proc/version', 'utf8'))) return 'wsl';
  } catch {
    /* not Linux */
  }
  return 'linux';
}

async function detectNetworkingMode(host: Env): Promise<string | undefined> {
  if (host === 'wsl') {
    try {
      return (await run('wslinfo', ['--networking-mode'], { timeoutMs: 3000 })).stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }
  if (host === 'windows' && process.env.USERPROFILE) {
    try {
      const cfg = readFileSync(`${process.env.USERPROFILE}\\.wslconfig`, 'utf8');
      return /^\s*networkingMode\s*=\s*(\w+)/im.exec(cfg)?.[1]?.toLowerCase() ?? 'nat';
    } catch {
      return 'nat';
    }
  }
  return undefined;
}

export interface Source {
  env: Env;
  method: string;
  discover: () => Promise<SourceOutput>;
}

function sourcesFor(host: Env): Source[] {
  if (host === 'windows') {
    return [
      { env: 'windows', method: 'PowerShell', discover: () => discoverWindows() },
      { env: 'wsl', method: 'wsl.exe', discover: discoverWslFromWindows },
    ];
  }
  if (host === 'wsl') {
    return [
      { env: 'wsl', method: 'ss + /proc', discover: () => discoverPosixLocal('wsl') },
      { env: 'windows', method: 'PowerShell (interop)', discover: () => discoverWindows() },
    ];
  }
  return [{ env: 'linux', method: 'ss + /proc', discover: () => discoverPosixLocal('linux') }];
}

/** Choose the address to probe a listener on, from this host's point of view. */
function probeHost(l: Listener, host: Env): string {
  const a = l.addresses;
  if (a.some((x) => x === '0.0.0.0' || x.startsWith('127.'))) return '127.0.0.1';
  if (a.includes('::1')) return '::1';
  // Windows `::` sockets are usually IPv6-only; Linux `::` is dual-stack.
  if (a.includes('::')) return l.env === 'windows' && host === 'windows' ? '::1' : '127.0.0.1';
  return a[0] ?? '127.0.0.1';
}

function browserUrl(l: Listener, protocol: string): string {
  const a = l.addresses;
  const loopbackOrAny = a.some((x) => x === '0.0.0.0' || x === '::' || x === '::1' || x.startsWith('127.'));
  if (loopbackOrAny || !a[0]) return `${protocol}//localhost:${l.port}`;
  return `${protocol}//${a[0].includes(':') ? `[${a[0]}]` : a[0]}:${l.port}`;
}

function displayName(l: Listener, packageName?: string, projectDir?: string, title?: string): Pick<Service, 'name' | 'nameSource'> {
  if (packageName) return { name: packageName, nameSource: 'package' };
  if (projectDir) return { name: basename(projectDir), nameSource: 'directory' };
  if (title) return { name: title, nameSource: 'title' };
  if (l.processName) return { name: l.processName.replace(/\.exe$/i, ''), nameSource: 'process' };
  return { name: `Port ${l.port}`, nameSource: 'port' };
}

export async function probeListener(l: Listener, host: Env, mode: string | undefined): Promise<{ probe: Probe; protocol: string }> {
  const target = { host: probeHost(l, host), port: l.port };
  let result = await probe(target);
  let protocol = 'http:';
  // A plain-HTTP request to a TLS server fails to parse or gets reset: retry once over HTTPS.
  if (result.kind === 'tcp' && /^HPE_|ECONNRESET|socket hang up/i.test(result.error ?? '')) {
    const tls = await probe({ ...target, protocol: 'https:', timeoutMs: 1500 });
    if (tls.kind === 'web' || tls.kind === 'http') {
      result = tls;
      protocol = 'https:';
    }
  }
  // The OS just told us this port is listening, so a refused connection means we can't reach it
  // from here (WSL NAT mode, IPv6 loopback not mirrored, LAN-only bind), not that it's down.
  if (result.kind === 'closed') {
    const why = host === 'wsl' && l.env === 'windows' && mode !== 'mirrored' ? 'WSL NAT networking' : result.error;
    result = { kind: 'unverified', error: `Listening, but not reachable from The Shed (${why})`, ms: result.ms };
  }
  return { probe: result, protocol };
}

async function probeProjects(config: Config): Promise<ProjectStatus[]> {
  return mapLimit(config.projects, 8, async (m) => {
    if (!m.url) return { id: m.id, probe: { kind: 'unverified', error: 'No URL to probe' } };
    let url: URL;
    try {
      url = new URL(m.url);
    } catch {
      return { id: m.id, probe: { kind: 'unverified', error: 'Invalid URL' } };
    }
    // Only probe loopback: the server must not become a proxy for requests to other hosts.
    if (!isLoopbackHost(url.hostname)) return { id: m.id, probe: { kind: 'unverified', error: 'Not a localhost URL; not probed' } };
    const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    const target = { protocol: url.protocol as 'http:' | 'https:', port, path: url.pathname + url.search };
    // `localhost` may be IPv4 or IPv6 only (Windows Node/Vite default to ::1), as a browser would, try both.
    let result = await probe({ ...target, host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname.replace(/^\[|\]$/g, '') });
    if (url.hostname === 'localhost' && result.kind === 'closed') result = await probe({ ...target, host: '::1' });
    // A project with a URL, so anything that doesn't answer HTTP is down. (WSL's mirrored
    // relay can briefly accept and reset connections to unused ports, which looks like "tcp".)
    return { id: m.id, probe: result.kind === 'tcp' ? { ...result, kind: 'closed' } : result };
  });
}

/** Run every source; one that throws becomes a failed report while the others still count (DISC-01). */
export async function collectSources(list: Source[]): Promise<{ sources: SourceReport[]; listeners: Listener[]; distro?: string }> {
  const outputs = await Promise.all(
    list.map(async (src) => {
      const t0 = Date.now();
      try {
        const out = await src.discover();
        return { src, out, ms: Date.now() - t0 };
      } catch (err) {
        return { src, error: (err as Error).message.slice(0, 300), ms: Date.now() - t0 };
      }
    }),
  );
  const sources: SourceReport[] = [];
  const listeners: Listener[] = [];
  let distro: string | undefined;
  for (const o of outputs) {
    if ('error' in o) {
      sources.push({ env: o.src.env, ok: false, method: o.src.method, count: 0, ms: o.ms, error: o.error, notes: [] });
      continue;
    }
    distro ??= o.out.distro;
    listeners.push(...o.out.listeners);
    sources.push({ env: o.src.env, ok: true, method: o.out.method, count: o.out.listeners.length, ms: o.ms, notes: o.out.notes });
  }
  return { sources, listeners, distro };
}

/** In WSL NAT mode, wslrelay.exe re-listens on Windows for each forwarded WSL port. Show it once. */
export function dropRelayDuplicates(listeners: Listener[]): Listener[] {
  const wslPorts = new Set(listeners.filter((l) => l.env === 'wsl').map((l) => l.port));
  return listeners.filter((l) => !(l.env === 'windows' && /^wslrelay/i.test(l.processName ?? '') && wslPorts.has(l.port)));
}

export interface ScanOptions {
  serverPort: number;
}

export async function scan(config: Config, opts: ScanOptions): Promise<ScanResult> {
  const started = Date.now();
  const host = detectHost();
  const modePromise = detectNetworkingMode(host);

  const collected = await collectSources(sourcesFor(host));
  const mode = await modePromise;
  const { sources, distro } = collected;
  const listeners = dropRelayDuplicates(collected.listeners);

  const ctx: HostContext = { host, distro };
  const services = await mapLimit(listeners, 16, async (l): Promise<Service> => {
    const self = l.env === host && (l.pid === process.pid || l.port === opts.serverPort);
    const [id, probed] = await Promise.all([
      identify(l, ctx),
      self ? Promise.resolve({ probe: { kind: 'web' } as Probe, protocol: 'http:' }) : probeListener(l, host, mode),
    ]);
    const naming = displayName(l, id.packageName, id.projectDir, probed.probe.title);
    return {
      id: `${l.env}:${l.port}`,
      env: l.env,
      port: l.port,
      addresses: l.addresses,
      url: browserUrl(l, probed.protocol),
      pid: l.pid,
      processName: l.processName,
      commandLine: l.commandLine,
      cwd: l.cwd,
      ...id,
      ...naming,
      probe: probed.probe,
      favouriteKey: id.projectDir ? `dir:${l.env}:${id.projectDir}#${l.processName ?? ''}` : `port:${l.env}:${l.port}`,
      self: self || undefined,
    };
  });

  return {
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    host: { env: host, networkingMode: mode, distro },
    sources,
    services,
    projects: await probeProjects(config),
    ...resolveProjects(config, services),
  };
}

/** Caches the last scan and collapses concurrent refreshes into one. */
export class Scanner {
  private last?: ScanResult;
  private inflight?: Promise<ScanResult>;
  private readonly opts: ScanOptions;
  private readonly getConfig: () => Config;

  constructor(opts: ScanOptions, getConfig: () => Config) {
    this.opts = opts;
    this.getConfig = getConfig;
  }

  async get(maxAgeMs: number): Promise<ScanResult> {
    if (this.last && Date.now() - Date.parse(this.last.scannedAt) < maxAgeMs) return this.last;
    this.inflight ??= scan(this.getConfig(), this.opts)
      .then((r) => (this.last = r))
      .finally(() => (this.inflight = undefined));
    return this.inflight;
  }

  /** Re-probe registered projects only (after the user adds, edits or removes one). */
  async refreshProjects(): Promise<void> {
    if (!this.last) return;
    const config = this.getConfig();
    this.last = { ...this.last, projects: await probeProjects(config), ...resolveProjects(config, this.last.services) };
  }
}
