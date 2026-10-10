import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config, Override, State } from '../shared/types.ts';
import { ConfigFullError, addProject, ConfigStore, parseFavourite, parseHideRule, parseOverride, validateProject } from './config.ts';
import { Scanner, detectHost } from './scan.ts';
import { Supervisor, defaultCheckPort, refusalStatus } from './supervisor.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SHED_PORT ?? 4777);
// Deliberately not configurable: The Shed lists processes and must never be reachable off-machine.
const BIND = '127.0.0.1';
const STATIC_DIR = path.join(ROOT, 'dist');
const CACHE_MS = 4000;
const MAX_BODY = 16 * 1024;

const store = new ConfigStore(process.env.SHED_CONFIG ?? path.join(ROOT, 'data', 'config.json'), detectHost());
const scanner = new Scanner({ serverPort: PORT }, () => store.get());
const supervisor = new Supervisor({
  hostEnv: store.host,
  getProject: (id) => store.get().projects.find((p) => p.id === id),
  // The bind attempt decides; a fresh scan, run only once the port is known busy, names the holder.
  // Windows and WSL share one port space, so a holder on either side counts.
  checkPort: defaultCheckPort(async (port) => {
    const s = (await scanner.get(0)).services.find((x) => x.port === port);
    return s ? `${s.processName ?? s.name}${s.pid ? ` (pid ${s.pid})` : ''}` : undefined;
  }),
});

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
function trackFavourites(state: Pick<State, 'scan' | 'config'>): Config {
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
  return { scan, config, runs: supervisor.runs() };
}

/**
 * Requests are strict where a loaded file is lenient: a bad field is a 400 with its reason. A
 * folder sent without an environment gets the one its form implies. `fromKey` names a discovered
 * card being registered: its rename and folder fill what the request leaves out.
 */
function projectFromRequest(body: unknown, id: string, override?: Override) {
  const project = validateProject({ name: override?.name, folder: override?.folder, ...(body as object) }, id, store.host, true);
  if (typeof project === 'string') throw new HttpError(400, project);
  return project;
}

async function api(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET';
  if (method !== 'GET') {
    if (!originAllowed(req.headers.origin)) throw new HttpError(403, 'Cross-origin request refused');
    // A custom header can't be sent cross-site without a CORS preflight, which this server never grants.
    if (!req.headers['x-shed']) throw new HttpError(403, 'Missing X-Shed header');
  }
  const route = `${method} ${url.pathname}`;
  const idMatch = /^\/api\/(projects|hidden)\/([\w-]{1,100})$/.exec(url.pathname);
  const runMatch = /^\/api\/projects\/([\w-]{1,100})\/(start|stop|restart|log)$/.exec(url.pathname);

  if (route === 'GET /api/health') return send(res, 200, { ok: true });

  if (route === 'GET /api/state') {
    return send(res, 200, await state(url.searchParams.has('refresh') ? 0 : CACHE_MS));
  }

  if (route === 'POST /api/projects') {
    const body = (await readJson(req)) as Record<string, unknown> | null;
    const fromKey = typeof body?.fromKey === 'string' ? body.fromKey : undefined;
    const current = store.get();
    const override = fromKey ? current.overrides.find((o) => o.key === fromKey) : undefined;
    const project = projectFromRequest(body, crypto.randomUUID(), override);
    store.update((c) => addProject(c, project, fromKey));
    await scanner.refreshProjects();
    return send(res, 200, await state());
  }

  if (method === 'PUT' && idMatch?.[1] === 'projects') {
    const id = idMatch[2];
    if (!store.get().projects.some((p) => p.id === id)) throw new HttpError(404, 'No such project');
    const project = projectFromRequest(await readJson(req), id);
    store.update((c) => ({ ...c, projects: c.projects.map((p) => (p.id === id ? project : p)) }));
    await scanner.refreshProjects();
    return send(res, 200, await state());
  }

  if (runMatch && ((runMatch[2] === 'log' && method === 'GET') || (runMatch[2] !== 'log' && method === 'POST'))) {
    const [, id, action] = runMatch;
    if (!store.get().projects.some((p) => p.id === id)) throw new HttpError(404, 'No such project');
    if (action === 'log') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return void res.end(supervisor.log(id) ?? '');
    }
    await readJson(req); // body is `{}`; reading it enforces the JSON content type like other mutations
    const result = await supervisor[action as 'start' | 'stop' | 'restart'](id);
    if (!result.ok) throw new HttpError(refusalStatus(result.code), result.message);
    await scanner.get(0); // a fresh scan so the new run and its port show up together
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

  if (method === 'DELETE' && idMatch?.[1] === 'projects') {
    await readJson(req); // body is `{}`; reading it enforces the JSON content type like other mutations
    if (supervisor.isActive(idMatch[2])) throw new HttpError(409, 'This project is running; stop it first.');
    store.update((c) => ({
      ...c,
      projects: c.projects.filter((p) => p.id !== idMatch[2]),
      favourites: c.favourites.filter((f) => f.key !== `project:${idMatch[2]}`),
    }));
    await scanner.refreshProjects();
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
    await readJson(req);
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
    const status = err instanceof HttpError ? err.status : err instanceof ConfigFullError ? 409 : 500;
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

const SHUTDOWN_WAIT_MS = 10_000;
let shuttingDown = false;

/** Stop what The Shed started, then exit. SIGKILL and End Task cannot be caught; those leave the project running, to be found as External. */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shed] ${signal}: stopping projects The Shed started`);
  server.close();
  await Promise.race([supervisor.stopAll(), new Promise((r) => setTimeout(r, SHUTDOWN_WAIT_MS))]).catch((err) => console.error('[shed]', err));
  process.exit(0);
}

// SIGBREAK is Ctrl+Break and console close on Windows; the others are a no-op or unavailable where they do not apply.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'] as const) process.on(signal, () => void shutdown(signal));
