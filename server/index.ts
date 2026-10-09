import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config, State } from '../shared/types.ts';
import { ConfigStore, parseFavourite, parseHideRule, parseManual, parseOverride, safeFolder } from './config.ts';
import { Scanner } from './scan.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SHED_PORT ?? 4777);
// Deliberately not configurable: The Shed lists processes and must never be reachable off-machine.
const BIND = '127.0.0.1';
const STATIC_DIR = path.join(ROOT, 'dist');
const CACHE_MS = 4000;
const MAX_BODY = 16 * 1024;

const store = new ConfigStore(process.env.SHED_CONFIG ?? path.join(ROOT, 'data', 'config.json'));
const scanner = new Scanner({ serverPort: PORT }, () => store.get());

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Reject requests whose Host isn't loopback — blocks DNS-rebinding pages from reading the API. */
function hostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  return LOCAL_HOSTNAMES.has(hostname);
}

/** Mutations must come from a localhost page (or a non-browser client that sends no Origin). */
function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && LOCAL_HOSTNAMES.has(u.host.replace(/:\d+$/, '').toLowerCase());
  } catch {
    return false;
  }
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  // Requiring JSON means a cross-site <form> can't produce an acceptable request.
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'Expected application/json');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'Body too large');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const TEN_MINUTES = 10 * 60 * 1000;

/** Keep favourites' last-known URL and last-seen time current, writing at most every ten minutes per entry. */
function trackFavourites(state: State): Config {
  const now = Date.now();
  const running = new Map(state.scan.services.map((s) => [s.favouriteKey, s]));
  const stale = state.config.favourites.some((f) => {
    const s = running.get(f.key);
    return s && (s.url !== f.url || !f.lastSeen || now - Date.parse(f.lastSeen) > TEN_MINUTES);
  });
  if (!stale) return state.config;
  return store.update((c) => {
    for (const f of c.favourites) {
      const s = running.get(f.key);
      if (s) Object.assign(f, { url: s.url, lastSeen: new Date(now).toISOString() });
    }
    return c;
  });
}

async function state(maxAgeMs = CACHE_MS): Promise<State> {
  const scan = await scanner.get(maxAgeMs);
  const config = trackFavourites({ scan, config: store.get() });
  return { scan, config };
}

/** parseManual is lenient (for loading config); requests must not silently lose a bad folder. */
function manualFromRequest(body: unknown, id: string) {
  const folder = (body as Record<string, unknown> | null)?.folder;
  if (folder !== undefined && folder !== null && folder !== '' && !safeFolder(folder)) throw new HttpError(400, 'Folder must be an absolute path');
  const project = parseManual(body, id);
  if (!project) throw new HttpError(400, 'Need a name (≤100 chars) and an http(s) URL');
  return project;
}

async function api(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && !originAllowed(req.headers.origin)) throw new HttpError(403, 'Cross-origin request refused');
  const route = `${method} ${url.pathname}`;
  const idMatch = /^\/api\/(manual|hidden)\/([\w-]{1,100})$/.exec(url.pathname);

  if (route === 'GET /api/health') return send(res, 200, { ok: true });

  if (route === 'GET /api/state') {
    return send(res, 200, await state(url.searchParams.has('refresh') ? 0 : CACHE_MS));
  }

  if (route === 'POST /api/manual') {
    const project = manualFromRequest(await readJson(req), crypto.randomUUID());
    store.update((c) => ({ ...c, manual: [...c.manual, project] }));
    await scanner.refreshManual();
    return send(res, 200, await state());
  }

  if (method === 'PUT' && idMatch?.[1] === 'manual') {
    const id = idMatch[2];
    if (!store.get().manual.some((m) => m.id === id)) throw new HttpError(404, 'No such project');
    const project = manualFromRequest(await readJson(req), id);
    store.update((c) => ({ ...c, manual: c.manual.map((m) => (m.id === id ? project : m)) }));
    await scanner.refreshManual();
    return send(res, 200, await state());
  }

  if (route === 'PUT /api/overrides') {
    const override = parseOverride(await readJson(req));
    if (!override) throw new HttpError(400, 'Need a key, a name (≤100 chars) and/or an absolute folder path');
    store.update((c) => {
      const rest = c.overrides.filter((o) => o.key !== override.key);
      // Empty name and folder clears the override.
      return { ...c, overrides: override.name || override.folder ? [...rest, override] : rest };
    });
    return send(res, 200, await state());
  }

  if (method === 'DELETE' && idMatch?.[1] === 'manual') {
    store.update((c) => ({
      ...c,
      manual: c.manual.filter((m) => m.id !== idMatch[2]),
      favourites: c.favourites.filter((f) => f.key !== `manual:${idMatch[2]}`),
    }));
    await scanner.refreshManual();
    return send(res, 200, await state());
  }

  if (route === 'PUT /api/favourites') {
    const body = (await readJson(req)) as Record<string, unknown>;
    const fav = parseFavourite({ ...body, lastSeen: new Date().toISOString() });
    if (!fav || typeof body.favourite !== 'boolean') throw new HttpError(400, 'Need key, name, url and favourite');
    store.update((c) => {
      const rest = c.favourites.filter((f) => f.key !== fav.key);
      return { ...c, favourites: body.favourite ? [...rest, fav] : rest };
    });
    return send(res, 200, await state());
  }

  if (route === 'POST /api/hidden') {
    const rule = parseHideRule(await readJson(req), crypto.randomUUID());
    if (!rule) throw new HttpError(400, 'Need {kind:"port",env,port} or {kind:"process",env,process}');
    store.update((c) => ({ ...c, hidden: [...c.hidden, rule] }));
    return send(res, 200, await state());
  }

  if (method === 'DELETE' && idMatch?.[1] === 'hidden') {
    store.update((c) => ({ ...c, hidden: c.hidden.filter((h) => h.id !== idMatch[2]) }));
    return send(res, 200, await state());
  }

  throw new HttpError(404, 'Not found');
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

function serveStatic(res: http.ServerResponse, pathname: string): void {
  if (!existsSync(STATIC_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('The UI has not been built. Run `npm run build`, or use `npm run dev` and open http://localhost:4778');
    return;
  }
  let file = path.join(STATIC_DIR, path.normalize(decodeURIComponent(pathname)));
  if (!file.startsWith(STATIC_DIR + path.sep) || !existsSync(file) || statSync(file).isDirectory()) {
    file = path.join(STATIC_DIR, 'index.html'); // single-page app fallback
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );

  try {
    if (!hostAllowed(req.headers.host)) throw new HttpError(421, 'Unexpected Host header');
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    serveStatic(res, url.pathname);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error('[shed]', err);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Internal error' : (err as Error).message });
    else res.end();
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') console.error(`[shed] Port ${PORT} is in use. Set SHED_PORT to use another.`);
  else console.error('[shed]', err);
  process.exit(1);
});

server.listen(PORT, BIND, () => {
  console.log(`[shed] The Shed is running at http://localhost:${PORT}  (bound to ${BIND} only)`);
  console.log(`[shed] Config: ${store.file}`);
});
