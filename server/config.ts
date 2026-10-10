import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Config, Env, Favourite, HideRule, Override, Project } from '../shared/types.ts';
import { wslUncToPosix } from './identify.ts';

const ENVS: Env[] = ['windows', 'wsl', 'linux'];
/** Additions stop at this many entries per list. Entries already saved are never dropped for count. */
export const MAX_ITEMS = 500;

/** A change would grow a list past MAX_ITEMS. Nothing was written. */
export class ConfigFullError extends Error {}

export const emptyConfig = (): Config => ({ version: 2, projects: [], favourites: [], hidden: [], overrides: [] });

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s && s.length <= max ? s : undefined;
}

function env(v: unknown): Env | undefined {
  return ENVS.includes(v as Env) ? (v as Env) : undefined;
}

/** Only http(s) URLs may be opened from the dashboard (no javascript:, file:, data:…). */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v, 2000);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A folder the user typed: stored and displayed only, never read or executed. Must look like an
 * absolute POSIX, Windows drive or UNC path.
 */
export function safeFolder(v: unknown): string | undefined {
  const s = str(v, 1000);
  // eslint-disable-next-line no-control-regex
  if (!s || /[\u0000-\u001f\u007f]/.test(s)) return undefined;
  return s.startsWith('/') || /^[a-z]:[\\/]/i.test(s) || s.startsWith('\\\\') ? s : undefined;
}

/** Does the folder's form belong to the environment? Windows: drive or non-WSL UNC path. WSL/Linux: absolute POSIX path. */
function folderFitsEnv(folder: string, e: Env): boolean {
  return e === 'windows' ? !wslUncToPosix(folder) && !folder.startsWith('/') : folder.startsWith('/');
}

/**
 * The environment a folder belongs to, from its form alone. A WSL UNC path is always WSL, so a
 * saved project is kept whatever the host. A POSIX path is WSL unless the server runs on plain
 * Linux, since on Windows or WSL a POSIX folder can only be a WSL one.
 */
export function inferFolderEnv(folder: string, host: Env): Env {
  if (wslUncToPosix(folder)) return 'wsl';
  if (folder.startsWith('/')) return host === 'linux' ? 'linux' : 'wsl';
  return 'windows';
}

export const MAX_LAUNCH_COMMAND = 1000;

/** A launch command is one line of text, kept exactly as typed apart from surrounding whitespace. */
export function launchCommand(v: unknown): string | undefined {
  const s = str(v, MAX_LAUNCH_COMMAND);
  // eslint-disable-next-line no-control-regex
  return s && !/[\r\n\u0000]/.test(s) ? s : undefined;
}

/**
 * Check a project. Returns the project, or the reason it is invalid. With `infer`, a folder given
 * without an environment gets the one its form implies (V1 files, and requests from the page).
 */
export function validateProject(v: unknown, id: string | undefined, host: Env, infer = false): Project | string {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = str(o.name, 100);
  if (!name) return 'Need a name (≤100 chars)';
  const hasUrl = o.url !== undefined && o.url !== null && o.url !== '';
  const url = hasUrl ? safeUrl(o.url) : undefined;
  if (hasUrl && !url) return 'URL must be a full http:// or https:// address';
  const hasPort = o.port !== undefined && o.port !== null && o.port !== '';
  if (hasPort && !(Number.isInteger(o.port) && (o.port as number) > 0 && (o.port as number) < 65536)) return 'Port must be a whole number from 1 to 65535';
  const hasLaunch = o.launch !== undefined && o.launch !== null;
  const command = hasLaunch ? launchCommand((o.launch as { command?: unknown }).command) : undefined;
  if (hasLaunch && !command) return `Launch command must be one line of 1 to ${MAX_LAUNCH_COMMAND} characters`;
  const hasFolder = o.folder !== undefined && o.folder !== null && o.folder !== '';
  let folder = hasFolder ? safeFolder(o.folder) : undefined;
  if (hasFolder && !folder) return 'Folder must be an absolute path';
  let e = o.env === undefined || o.env === null || o.env === '' ? undefined : env(o.env);
  if (o.env !== undefined && o.env !== null && o.env !== '' && !e) return 'Environment must be windows, wsl or linux';
  if (folder && !e && infer) e = inferFolderEnv(folder, host);
  if (!folder && e) return 'An environment needs a folder';
  if (folder && !e) return 'A folder needs an environment';
  if (folder && e) {
    if (e === 'wsl') folder = wslUncToPosix(folder) ?? folder;
    if (!folderFitsEnv(folder, e)) return `Folder is not a ${e} path`;
  }
  return {
    id: id ?? str(o.id, 100) ?? randomUUID(),
    name,
    ...(e && { env: e }),
    ...(folder && { folder }),
    ...(hasPort && { port: o.port as number }),
    ...(url && { url }),
    ...(command && { launch: { command } }),
  };
}

/** From disk: an invalid launch command is dropped, not the project that carries it. */
export function parseProject(v: unknown, host: Env, id?: string): Project | undefined {
  const r = validateProject(v, id, host);
  if (typeof r !== 'string') return r;
  const { launch: _dropped, ...rest } = (v ?? {}) as Record<string, unknown>;
  const retry = validateProject(rest, id, host);
  return typeof retry === 'string' ? undefined : retry;
}

/**
 * A V1 manual project: it needs a URL, and an unusable folder is dropped rather than losing the
 * project. Its id, name and URL carry over unchanged.
 */
function upgradeManual(v: unknown, host: Env): Project | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  if (!safeUrl(o.url)) return undefined;
  const r = validateProject({ id: o.id, name: o.name, url: o.url, folder: safeFolder(o.folder) }, undefined, host, true);
  return typeof r === 'string' ? undefined : r;
}

/** Returns undefined for an invalid override; an override with neither field means "clear". */
export function parseOverride(v: unknown): Override | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const key = str(o.key, 2000);
  if (!key) return undefined;
  const name = o.name === undefined || o.name === '' ? undefined : str(o.name, 100);
  const folder = o.folder === undefined || o.folder === '' ? undefined : safeFolder(o.folder);
  // A field that was supplied but failed validation rejects the whole override.
  if ((o.name !== undefined && o.name !== '' && !name) || (o.folder !== undefined && o.folder !== '' && !folder)) return undefined;
  return { key, ...(name && { name }), ...(folder && { folder }) };
}

export function parseFavourite(v: unknown): Favourite | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const key = str(o.key, 2000);
  const name = str(o.name, 200);
  const url = safeUrl(o.url);
  if (!key || !name || !url) return undefined;
  const lastSeen = typeof o.lastSeen === 'string' && !Number.isNaN(Date.parse(o.lastSeen)) ? o.lastSeen : undefined;
  return { key, name, url, env: env(o.env), lastSeen };
}

export function parseHideRule(v: unknown, id?: string): HideRule | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const e = env(o.env);
  if (!e) return undefined;
  const ruleId = id ?? str(o.id, 100) ?? randomUUID();
  if (o.kind === 'port' && Number.isInteger(o.port) && (o.port as number) > 0 && (o.port as number) < 65536) {
    return { id: ruleId, kind: 'port', env: e, port: o.port as number };
  }
  const proc = str(o.process, 200);
  if (o.kind === 'process' && proc) return { id: ruleId, kind: 'process', env: e, process: proc };
  return undefined;
}

/**
 * Validate a config loaded from disk. Invalid entries are dropped rather than failing the whole
 * file. A V1 file (a `manual` list) is upgraded: every manual project becomes a project and its
 * `manual:<id>` favourite becomes `project:<id>`; hide rules and overrides carry over as they are.
 */
export function sanitizeConfig(raw: unknown, host: Env): Config {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = <T>(v: unknown, parse: (x: unknown) => T | undefined): T[] =>
    (Array.isArray(v) ? v : []).map((x) => parse(x)).filter((x): x is T => x !== undefined);
  const v1 = o.version !== 2;
  const favourites = list(o.favourites, parseFavourite);
  return {
    version: 2,
    projects: v1 ? list(o.manual, (x) => upgradeManual(x, host)) : list(o.projects, (x) => parseProject(x, host)),
    favourites: v1 ? favourites.map((f) => (f.key.startsWith('manual:') ? { ...f, key: `project:${f.key.slice('manual:'.length)}` } : f)) : favourites,
    hidden: list(o.hidden, (x) => parseHideRule(x)),
    overrides: list(o.overrides, parseOverride).filter((x) => x.name || x.folder),
  };
}

/**
 * Add a project. Registering a discovered card (`fromKey`) moves that card's favourite and
 * rename onto the new project in the same change, so nothing is left behind or double-listed.
 */
export function addProject(c: Config, project: Project, fromKey?: string): Config {
  const moved = fromKey ? c.favourites.find((f) => f.key === fromKey) : undefined;
  return {
    ...c,
    projects: [...c.projects, project],
    favourites: moved
      ? [...c.favourites.filter((f) => f.key !== fromKey), { ...moved, key: `project:${project.id}`, name: project.name, url: project.url ?? moved.url }]
      : c.favourites,
    overrides: fromKey ? c.overrides.filter((o) => o.key !== fromKey) : c.overrides,
  };
}

export class ConfigStore {
  readonly file: string;
  /** Where the server runs; decides which environment a POSIX folder belongs to. */
  readonly host: Env;
  private config: Config;

  constructor(file: string, host: Env) {
    this.file = path.resolve(file);
    this.host = host;
    this.config = this.load();
  }

  private load(): Config {
    let text: string;
    try {
      text = readFileSync(this.file, 'utf8');
    } catch {
      return emptyConfig();
    }
    try {
      return sanitizeConfig(JSON.parse(text), this.host);
    } catch (err) {
      // Keep the broken file for the user to inspect; start fresh rather than refusing to run.
      const backup = `${this.file}.broken-${Date.now()}`;
      try {
        renameSync(this.file, backup);
      } catch {
        /* best effort */
      }
      console.warn(`[shed] ${this.file} is not valid JSON (${(err as Error).message}); moved to ${backup}`);
      return emptyConfig();
    }
  }

  get(): Config {
    return this.config;
  }

  /** Apply a change and persist it atomically (write temp file, then rename over the original). */
  update(change: (c: Config) => Config): Config {
    const next = sanitizeConfig(change(structuredClone(this.config)), this.host);
    for (const list of ['projects', 'favourites', 'hidden', 'overrides'] as const) {
      if (next[list].length > MAX_ITEMS && next[list].length > this.config[list].length) {
        throw new ConfigFullError(`Can't save more than ${MAX_ITEMS} ${list} entries; remove some first`);
      }
    }
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    renameSync(tmp, this.file);
    this.config = next;
    return next;
  }
}
