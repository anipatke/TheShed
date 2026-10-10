import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../shared/types.ts';
import type { Listener } from './discovery/listener.ts';
import { cleanText } from './discovery/listener.ts';

export interface Identity {
  projectDir?: string;
  projectDirSource?: 'cwd' | 'commandLine';
  packageName?: string;
}

export interface HostContext {
  /** Where this server process runs. */
  host: Env;
  /** WSL distro name, needed to read WSL files from Windows. */
  distro?: string;
}

const MARKERS = ['package.json', '.git', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'deno.json', 'composer.json', 'Gemfile'];

// Directories that are never a "project": process cwd defaults and install locations.
const POSIX_NOT_PROJECT = /^\/(?:$|usr|opt|snap|proc|sys|etc|var|bin|sbin|lib|run|tmp\/?$|mnt\/[a-z]\/?$|mnt\/[a-z]\/windows)/i;
const WIN_NOT_PROJECT = /^[a-z]:\\(?:$|windows|program files|programdata|users\\[^\\]+\\(?:appdata|scoop|\.\w))/i;
// Tool installs inside a home directory (global npm packages, editor servers, version managers).
const POSIX_TOOL_DIR = /^\/(?:home\/[^/]+|root)\/\.(?:nvm|vscode-server|cursor-server|local|cache|cargo|rustup|npm|bun|deno|volta|pyenv|fnm)(?:\/|$)/;

/** Normalise a path coming from either OS, keeping its own separator style. */
function isWinPath(p: string): boolean {
  return /^[a-z]:\\/i.test(p);
}

function dirname(p: string): string {
  return isWinPath(p) ? path.win32.dirname(p) : path.posix.dirname(p);
}

export function basename(p: string): string {
  return isWinPath(p) ? path.win32.basename(p) : path.posix.basename(p);
}

function join(p: string, name: string): string {
  return isWinPath(p) ? path.win32.join(p, name) : path.posix.join(p, name);
}

function isHome(p: string): boolean {
  return /^\/home\/[^/]+\/?$/.test(p) || p === '/root' || /^[a-z]:\\users\\[^\\]+\\?$/i.test(p);
}

export function looksLikeProjectDir(p: string): boolean {
  if (isHome(p)) return false;
  if (isWinPath(p)) return !WIN_NOT_PROJECT.test(p);
  return p.startsWith('/') && !POSIX_NOT_PROJECT.test(p) && !POSIX_TOOL_DIR.test(p);
}

/** Pull an absolute path out of a command line token, stripping quotes and `--flag=` prefixes. */
function pathTokens(commandLine: string): string[] {
  const tokens = commandLine.match(/"[^"]*"|\S+/g) ?? [];
  return tokens
    .map((t) => t.replace(/^"|"$/g, '').replace(/^--?[\w-]+=/, ''))
    .filter((t) => isWinPath(t) || t.startsWith('/'));
}

/**
 * Guess a project directory from a command line:
 * 1. anything inside `node_modules` → the folder that owns node_modules
 * 2. a script argument (.js/.ts/.py…) in a non-system location → its folder
 */
export function projectDirFromCommandLine(commandLine: string): string | undefined {
  const tokens = pathTokens(commandLine);
  for (const t of tokens) {
    const m = /^(.*?)[\\/]node_modules[\\/]/i.exec(t);
    if (m && looksLikeProjectDir(m[1])) return m[1];
  }
  // Skip the executable itself when it is an absolute path ("C:\…\node.exe script.js").
  const startsWithExe = tokens[0] !== undefined && commandLine.trim().replace(/^"/, '').startsWith(tokens[0]);
  for (const t of startsWithExe ? tokens.slice(1) : tokens) {
    if (/\.(?:[cm]?[jt]sx?|py|rb|php|go|dll)$/i.test(t) && looksLikeProjectDir(dirname(t))) return dirname(t);
  }
  // A cwd-relative script ("node server.js") gives us nothing; an executable living in a
  // project folder (e.g. a compiled Go/Rust binary under target/) is still a useful hint.
  if (startsWithExe && looksLikeProjectDir(dirname(tokens[0]))) return dirname(tokens[0]);
  return undefined;
}

/** Translate a path from a service's environment into one this server can read, if possible. */
export function toLocalPath(p: string, env: Env, ctx: HostContext): string | undefined {
  if (env === ctx.host) return p;
  if (ctx.host === 'wsl' && env === 'windows' && isWinPath(p)) {
    return `/mnt/${p[0].toLowerCase()}/${p.slice(3).replace(/\\/g, '/')}`;
  }
  if (ctx.host === 'windows' && env === 'wsl' && ctx.distro && p.startsWith('/')) {
    return `\\\\wsl.localhost\\${ctx.distro}${p.replace(/\//g, '\\')}`;
  }
  return undefined;
}

/** `\\wsl.localhost\<distro>\a\b` or `\\wsl$\<distro>\a\b` → `/a/b`; undefined for any other path. */
export function wslUncToPosix(p: string): string | undefined {
  const m = /^\\\\wsl(?:\.localhost|\$)\\[^\\]+(?:\\(.*))?$/i.exec(p);
  return m ? `/${(m[1] ?? '').replace(/\\/g, '/')}`.replace(/(.)\/$/, '$1') : undefined;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Walk up (max 4 levels) from a directory to the nearest folder with a project marker. */
async function findRoot(dir: string, env: Env, ctx: HostContext): Promise<string> {
  let current = dir;
  for (let i = 0; i < 4 && looksLikeProjectDir(current); i++) {
    const local = toLocalPath(current, env, ctx);
    if (!local) return dir;
    for (const marker of MARKERS) if (await exists(join(local, marker))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dir;
}

/** Read `name` from package.json. The file belongs to an untrusted project: cap size, validate type. */
async function readPackageName(dir: string, env: Env, ctx: HostContext): Promise<string | undefined> {
  const local = toLocalPath(dir, env, ctx);
  if (!local) return undefined;
  try {
    const file = join(local, 'package.json');
    if ((await stat(file)).size > 512 * 1024) return undefined;
    const pkg = JSON.parse(await readFile(file, 'utf8')) as { name?: unknown };
    return cleanText(pkg.name, 100);
  } catch {
    return undefined;
  }
}

export async function identify(l: Listener, ctx: HostContext): Promise<Identity> {
  let start: string | undefined;
  let source: Identity['projectDirSource'];
  if (l.cwd && looksLikeProjectDir(l.cwd)) {
    start = l.cwd;
    source = 'cwd';
  } else if (l.commandLine) {
    start = projectDirFromCommandLine(l.commandLine);
    source = start ? 'commandLine' : undefined;
  }
  if (!start) return {};
  // Packaged apps report virtual paths (e.g. pkg's C:\snapshot\…). Only trust folders that exist.
  const local = toLocalPath(start, l.env, ctx);
  if (local && !(await exists(local))) return {};
  const projectDir = await findRoot(start, l.env, ctx);
  return { projectDir, projectDirSource: source, packageName: await readPackageName(projectDir, l.env, ctx) };
}
