import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Config, Env, Favourite, HideRule, ManualProject, Override } from '../shared/types.ts';

const ENVS: Env[] = ['windows', 'wsl', 'linux'];
/** Additions stop at this many entries per list. Entries already saved are never dropped for count. */
export const MAX_ITEMS = 500;

/** A change would grow a list past MAX_ITEMS. Nothing was written. */
export class ConfigFullError extends Error {}

export const emptyConfig = (): Config => ({ version: 1, manual: [], favourites: [], hidden: [], overrides: [] });

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

export function parseManual(v: unknown, id?: string): ManualProject | undefined {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = str(o.name, 100);
  const url = safeUrl(o.url);
  if (!name || !url) return undefined;
  const folder = safeFolder(o.folder);
  return { id: id ?? str(o.id, 100) ?? randomUUID(), name, url, ...(folder && { folder }) };
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

/** Validate a config loaded from disk. Invalid entries are dropped rather than failing the whole file. */
export function sanitizeConfig(raw: unknown): Config {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = <T>(v: unknown, parse: (x: unknown) => T | undefined): T[] =>
    (Array.isArray(v) ? v : []).map((x) => parse(x)).filter((x): x is T => x !== undefined);
  return {
    version: 1,
    manual: list(o.manual, (x) => parseManual(x)),
    favourites: list(o.favourites, parseFavourite),
    hidden: list(o.hidden, (x) => parseHideRule(x)),
    overrides: list(o.overrides, parseOverride).filter((x) => x.name || x.folder),
  };
}

export class ConfigStore {
  readonly file: string;
  private config: Config;

  constructor(file: string) {
    this.file = path.resolve(file);
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
      return sanitizeConfig(JSON.parse(text));
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
    const next = sanitizeConfig(change(structuredClone(this.config)));
    for (const list of ['manual', 'favourites', 'hidden', 'overrides'] as const) {
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
