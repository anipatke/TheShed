import http from 'node:http';
import https from 'node:https';
import type { Probe } from '../shared/types.ts';

const MAX_BODY = 64 * 1024;

export interface ProbeTarget {
  protocol?: 'http:' | 'https:';
  host: string;
  port: number;
  path?: string;
  timeoutMs?: number;
}

/** Hosts the server is willing to send probes to. Manual projects elsewhere are never probed. */
export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h) || h.endsWith('.localhost');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Extract a <title> from untrusted HTML as plain text. The client renders it as text, never HTML. */
export function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return undefined;
  const text = m[1]
    .replace(/<[^>]*>/g, '')
    .replace(/&(#?\w+);/g, (all, name: string) => {
      if (ENTITIES[name]) return ENTITIES[name];
      const code = name.startsWith('#x') ? parseInt(name.slice(2), 16) : name.startsWith('#') ? Number(name.slice(1)) : NaN;
      return Number.isInteger(code) && code > 31 && code < 0x110000 ? String.fromCodePoint(code) : all;
    })
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, 120) : undefined;
}

export function classify(status: number, contentType: string, body: string): Probe['kind'] {
  // Error pages at / mean "something HTTP lives here", not "a site to open". Login walls still count.
  if (status >= 400 && status !== 401 && status !== 403) return 'http';
  if (/text\/html|application\/xhtml/i.test(contentType)) return 'web';
  if (status >= 300 && status < 400) return 'web';
  if (!contentType && /^\s*<!doctype html|^\s*<html/i.test(body)) return 'web';
  return 'http';
}

/**
 * Send one GET and classify the answer. Never follows redirects, reads at most 64 KB,
 * and treats everything the service returns as untrusted.
 */
export function probe(target: ProbeTarget): Promise<Probe> {
  const started = Date.now();
  const timeoutMs = target.timeoutMs ?? 2000;
  const lib = target.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    let connected = false;
    let done = false;
    const finish = (p: Omit<Probe, 'ms'>) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      req.destroy();
      resolve({ ...p, ms: Date.now() - started });
    };

    const req = lib.request({
      host: target.host,
      port: target.port,
      path: target.path ?? '/',
      method: 'GET',
      agent: false,
      headers: {
        Host: `localhost:${target.port}`,
        'User-Agent': 'TheShed/0.1 (local dashboard probe)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        Connection: 'close',
      },
      // Local dev servers commonly use self-signed certs. We only read a title from them.
      rejectUnauthorized: false,
    } as https.RequestOptions);

    const timer = setTimeout(() => {
      // Accepted the connection but never answered an HTTP request: not an HTTP server.
      finish(connected ? { kind: 'tcp', error: 'no HTTP response' } : { kind: 'closed', error: 'timed out' });
    }, timeoutMs);

    req.on('socket', (socket) => {
      socket.once('connect', () => (connected = true));
      socket.once('secureConnect', () => (connected = true));
    });

    req.on('response', (res) => {
      const status = res.statusCode ?? 0;
      const contentType = String(res.headers['content-type'] ?? '').slice(0, 100);
      const chunks: Buffer[] = [];
      let size = 0;
      const settle = () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const kind = classify(status, contentType, body);
        finish({ kind, status, contentType: contentType || undefined, title: kind === 'web' ? extractTitle(body) : undefined });
      };
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size >= MAX_BODY || /<\/title>/i.test(chunk.toString('latin1'))) settle();
      });
      res.on('end', settle);
      res.on('error', settle);
    });

    req.on('error', (err: NodeJS.ErrnoException) => {
      const code = err.code ?? '';
      if (code === 'ECONNREFUSED' || code === 'EADDRNOTAVAIL' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
        finish({ kind: 'closed', error: code });
      } else {
        // Parse errors (HPE_*), resets and TLS failures after connecting: something is
        // listening but it isn't speaking plain HTTP.
        finish({ kind: connected ? 'tcp' : 'closed', error: code || err.message.slice(0, 100) });
      }
    });

    req.end();
  });
}

/** Run async work over items with a concurrency cap. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
