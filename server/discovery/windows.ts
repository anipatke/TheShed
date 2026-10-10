import { existsSync } from 'node:fs';
import { run } from './run.ts';
import { cleanText, mergeListeners, type Listener, type SourceOutput } from './listener.ts';

// Constant script, passed base64-encoded via -EncodedCommand (stdin mode runs line by line and
// breaks multi-line blocks). CommandLine is null for elevated processes
// when we are not elevated; that is expected and handled downstream.
export const WINDOWS_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$l = @(Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess)
$ids = @($l | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique)
$p = @()
if ($ids.Count -gt 0) {
  $filter = ($ids | ForEach-Object { "ProcessId=$_" }) -join ' OR '
  $p = @(Get-CimInstance Win32_Process -Filter $filter | Select-Object ProcessId,Name,ExecutablePath,CommandLine)
}
ConvertTo-Json -Compress -Depth 3 -InputObject @{ listeners = $l; processes = $p }
`;

const ENCODED_SCRIPT = Buffer.from(WINDOWS_SCRIPT, 'utf16le').toString('base64');

const ON_WINDOWS = process.platform === 'win32';
const WSL_POWERSHELL = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const WSL_SYSTEM32 = '/mnt/c/Windows/System32';

function exe(name: string): string {
  if (ON_WINDOWS) return name;
  // Interop puts Windows on PATH by default, but appendWindowsPath=false removes it.
  if (name === 'powershell.exe' && existsSync(WSL_POWERSHELL)) return WSL_POWERSHELL;
  const full = `${WSL_SYSTEM32}/${name}`;
  return existsSync(full) ? full : name;
}

// Spawning Windows binaries from a WSL directory triggers a "UNC paths are not supported" warning.
const cwd = ON_WINDOWS ? undefined : existsSync('/mnt/c') ? '/mnt/c' : undefined;

interface PsListener { LocalAddress?: unknown; LocalPort?: unknown; OwningProcess?: unknown }
interface PsProcess { ProcessId?: unknown; Name?: unknown; ExecutablePath?: unknown; CommandLine?: unknown }

export function parsePowerShellOutput(stdout: string): Listener[] {
  const data = JSON.parse(stdout.replace(/^﻿/, '')) as { listeners?: unknown; processes?: unknown };
  const listeners = (Array.isArray(data.listeners) ? data.listeners : []) as PsListener[];
  const processes = (Array.isArray(data.processes) ? data.processes : []) as PsProcess[];

  const procs = new Map<number, PsProcess>();
  for (const p of processes) if (typeof p.ProcessId === 'number') procs.set(p.ProcessId, p);

  const rows: Listener[] = [];
  for (const l of listeners) {
    const port = Number(l.LocalPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
    const pid = typeof l.OwningProcess === 'number' ? l.OwningProcess : undefined;
    const proc = pid === undefined ? undefined : procs.get(pid);
    rows.push({
      env: 'windows',
      port,
      addresses: [cleanText(l.LocalAddress, 100) ?? '?'],
      pid,
      processName: cleanText(proc?.Name, 200) ?? (pid === 4 ? 'System' : undefined),
      executablePath: cleanText(proc?.ExecutablePath, 1000),
      commandLine: cleanText(proc?.CommandLine),
    });
  }
  return mergeListeners(rows);
}

/** Parse `netstat -ano` LISTENING rows: `  TCP    127.0.0.1:1234   0.0.0.0:0   LISTENING   24396`. */
export function parseNetstatOutput(stdout: string, names: Map<number, string>): Listener[] {
  const rows: Listener[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 5 || f[0] !== 'TCP' || f[3] !== 'LISTENING') continue;
    const idx = f[1].lastIndexOf(':');
    const port = Number(f[1].slice(idx + 1));
    if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
    const pid = Number(f[4]);
    rows.push({
      env: 'windows',
      port,
      addresses: [f[1].slice(0, idx).replace(/^\[|\]$/g, '')],
      pid: Number.isInteger(pid) ? pid : undefined,
      processName: names.get(pid),
    });
  }
  return mergeListeners(rows);
}

/** `tasklist /fo csv /nh` → pid → image name. */
export function parseTasklist(stdout: string): Map<number, string> {
  const names = new Map<number, string>();
  for (const line of stdout.split(/\r?\n/)) {
    const m = /^"([^"]*)","(\d+)"/.exec(line);
    if (m) names.set(Number(m[2]), m[1]);
  }
  return names;
}

/** `exec` is swappable so tests can force the PowerShell failure → netstat fallback path. */
export async function discoverWindows(exec: typeof run = run): Promise<SourceOutput> {
  const notes: string[] = [];
  try {
    const { stdout } = await exec(
      exe('powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', ENCODED_SCRIPT],
      { cwd, timeoutMs: 20_000 },
    );
    const listeners = parsePowerShellOutput(stdout);
    const hidden = listeners.filter((l) => l.pid !== undefined && !l.commandLine && l.pid > 4).length;
    if (hidden) notes.push(`${hidden} elevated/system process(es) hide their command line without admin.`);
    notes.push('Working directory is inferred from the command line; Windows does not expose it.');
    return { listeners, method: 'PowerShell Get-NetTCPConnection', notes };
  } catch (err) {
    notes.push(`PowerShell discovery failed (${(err as Error).message}); fell back to netstat.`);
  }

  const [netstat, tasklist] = await Promise.all([
    exec(exe('netstat.exe'), ['-ano', '-p', 'TCP'], { cwd }).then((r) => r.stdout),
    exec(exe('tasklist.exe'), ['/fo', 'csv', '/nh'], { cwd }).then((r) => r.stdout).catch(() => ''),
  ]);
  const v6 = await exec(exe('netstat.exe'), ['-ano', '-p', 'TCPv6'], { cwd }).then((r) => r.stdout).catch(() => '');
  const names = parseTasklist(tasklist);
  const listeners = parseNetstatOutput(`${netstat}\n${v6.replace(/TCPv6/g, 'TCP')}`, names);
  notes.push('netstat gives no command lines, so project names cannot be inferred.');
  return { listeners, method: 'netstat.exe + tasklist.exe', notes };
}
