import type { Env, Favourite, HideRule, Override, PortConflict, Project, Probe, RunSummary, Service, State } from '../../shared/types.ts';
import { ownershipOf, portMismatch, startBlock, type Ownership } from './runs.ts';

/** What a thing is, independent of whether we can currently reach it. */
export type Kind = 'website' | 'api' | 'other' | 'unknown';
/** Whether we can currently reach it. */
export type Status = 'live' | 'unverified' | 'offline';

interface Base {
  key: string;
  /** Display name after user overrides. */
  name: string;
  /** Name before overrides, shown as a hint when renamed. */
  discoveredName?: string;
  folder?: string;
  folderSource?: 'cwd' | 'commandLine' | 'user';
  url: string;
  favourite: boolean;
  kind: Kind;
  status: Status;
  statusDetail: string;
  /** Managed or External, for anything that is running. */
  ownership?: Ownership;
}

/** Everything the UI shows as a card, whether discovered, typed in, or a remembered favourite. */
export type Item =
  | (Base & { type: 'service'; service: Service; override?: Override; hiddenBy?: HideRule })
  | (Base & { type: 'project'; project: Project; /** The running service this project absorbed. */ service?: Service; warnings: string[]; editors: EditorLink[]; /** The latest launch The Shed made for this project. */ run?: RunSummary; /** Why Start is not offered; absent when it is, or while a run is active. */ startBlock?: string })
  | (Base & { type: 'offline'; fav: Favourite });

export interface Sections {
  favourites: Item[];
  projects: Item[];
  pages: Item[];
  other: Item[];
  hidden: Item[];
}

export const ENV_LABEL: Record<Env, string> = { windows: 'WIN', wsl: 'WSL', linux: 'LINUX' };
export const KIND_LABEL: Record<Kind, string> = { website: 'Website', api: 'API', other: 'Other', unknown: '' };
export const STATUS_LABEL: Record<Status, string> = { live: 'Live', unverified: 'Unverified', offline: 'Offline' };

export function hiddenBy(s: Service, rules: HideRule[]): HideRule | undefined {
  return rules.find((r) =>
    r.env === s.env && (r.kind === 'port' ? r.port === s.port : r.process.toLowerCase() === (s.processName ?? '').toLowerCase()),
  );
}

function kindOf(p: Probe): Kind {
  return p.kind === 'web' ? 'website' : p.kind === 'http' ? 'api' : p.kind === 'tcp' ? 'other' : 'unknown';
}

function statusOf(p: Probe): Pick<Base, 'status' | 'statusDetail'> {
  const ms = p.ms !== undefined ? ` · ${p.ms} ms` : '';
  switch (p.kind) {
    case 'web':
      return { status: 'live', statusDetail: `HTTP ${p.status ?? ''}${ms}` };
    case 'http':
      return { status: 'live', statusDetail: `HTTP ${p.status ?? ''} ${p.contentType?.split(';')[0] ?? ''}${ms}`.trim() };
    case 'tcp':
      return { status: 'live', statusDetail: `Accepts connections, not HTTP${ms}` };
    case 'closed':
      return { status: 'offline', statusDetail: p.error ?? 'Not responding' };
    default:
      return { status: 'unverified', statusDetail: p.error ?? 'Not probed' };
  }
}

function matches(item: Item, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const hay: (string | number | undefined)[] = [item.name, item.discoveredName, item.url, item.folder, KIND_LABEL[item.kind]];
  const s = serviceOf(item);
  if (s) hay.push(s.port, s.processName, s.probe.title, s.env);
  if (item.type === 'project') hay.push(item.project.port, item.project.env);
  return hay.some((h) => h !== undefined && String(h).toLowerCase().includes(q));
}

/** The running service behind a card, if any. */
export const serviceOf = (i: Item): Service | undefined => (i.type === 'offline' ? undefined : i.service);

/** One plain sentence per conflict this project is part of, naming the other project or the process holding the port. */
function conflictWarnings(project: Project, conflicts: PortConflict[], projects: Map<string, Project>): string[] {
  return conflicts
    .filter((c) => c.projectIds.includes(project.id))
    .map((c) => {
      const others = c.projectIds.filter((id) => id !== project.id).map((id) => projects.get(id)?.name ?? 'another project');
      if (others.length) return `Port ${c.port} is also set for ${others.join(', ')}`;
      const h = c.holder;
      return `Port ${c.port} is in use by ${h?.processName ?? 'another process'}${h ? ` (${ENV_LABEL[h.env]})` : ''}`;
    });
}

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const portOf = (i: Item) => serviceOf(i)?.port ?? 0;

export function buildSections(state: State, query: string): Sections {
  const { scan, config } = state;
  const favKeys = new Set(config.favourites.map((f) => f.key));
  const overrides = new Map(config.overrides.map((o) => [o.key, o]));
  const sections: Sections = { favourites: [], projects: [], pages: [], other: [], hidden: [] };
  const present = new Set<string>();
  const serviceById = new Map(scan.services.map((sv) => [sv.id, sv]));
  const matchByProject = new Map(scan.matches.map((m) => [m.projectId, serviceById.get(m.serviceId)]));
  const absorbed = new Set(scan.matches.map((m) => m.serviceId));

  for (const service of scan.services) {
    if (service.self) continue;
    const key = service.favouriteKey;
    if (absorbed.has(service.id)) {
      // The project card stands in for this service, so its star must not also spawn an Offline card.
      if (favKeys.has(key)) present.add(key);
      continue;
    }
    const override = overrides.get(key);
    const favourite = favKeys.has(key);
    const rule = hiddenBy(service, config.hidden);
    const folder = override?.folder ?? service.projectDir;
    const item: Item = {
      type: 'service',
      key: service.id,
      service,
      override,
      hiddenBy: rule,
      name: override?.name ?? service.name,
      discoveredName: override?.name ? service.name : undefined,
      folder,
      folderSource: override?.folder ? 'user' : service.projectDirSource,
      url: service.url,
      favourite,
      kind: kindOf(service.probe),
      ownership: 'external',
      ...statusOf(service.probe),
    };
    if (favourite) present.add(key);
    if (!matches(item, query)) continue;
    if (rule && !favourite) sections.hidden.push(item);
    else if (favourite) sections.favourites.push(item);
    // A project we can't probe (e.g. Windows Vite on ::1 seen from WSL) is still a project.
    else if (folder && (item.kind === 'website' || item.status === 'unverified')) sections.projects.push(item);
    else if (item.kind === 'website') sections.pages.push(item);
    else sections.other.push(item);
  }

  const urlStatus = new Map(scan.projects.map((m) => [m.id, m.probe]));
  const projectsById = new Map(config.projects.map((p) => [p.id, p]));
  const runByProject = new Map(state.runs.map((r) => [r.projectId, r]));
  for (const project of config.projects) {
    const key = `project:${project.id}`;
    const service = matchByProject.get(project.id);
    const favourite = favKeys.has(key) || (service !== undefined && favKeys.has(service.favouriteKey));
    // Without a URL there is nothing to probe, so an unmatched project is simply not running.
    const probe = service?.probe ?? (project.url ? urlStatus.get(project.id) : undefined);
    const run = runByProject.get(project.id);
    const mismatch = portMismatch(run, service);
    const item: Item = {
      type: 'project',
      key,
      project,
      service,
      warnings: [...conflictWarnings(project, scan.conflicts, projectsById), ...(mismatch ? [mismatch] : [])],
      run,
      startBlock: startBlock(project, scan.host.env, run),
      ownership: ownershipOf(run, service),
      editors: editorLinks(project, scan.host.distro),
      name: project.name,
      folder: project.folder,
      folderSource: project.folder ? 'user' : undefined,
      url: project.url ?? service?.url ?? '',
      favourite,
      kind: probe ? kindOf(probe) : 'unknown',
      ...(probe ? statusOf(probe) : { status: 'offline' as const, statusDetail: 'Not running' }),
    };
    if (favourite) present.add(key);
    if (!matches(item, query)) continue;
    (favourite ? sections.favourites : sections.projects).push(item);
  }

  // Favourites that aren't running still get a card, so they're one click away later.
  for (const fav of config.favourites) {
    if (present.has(fav.key)) continue;
    const override = overrides.get(fav.key);
    const item: Item = {
      type: 'offline',
      key: `offline:${fav.key}`,
      fav,
      name: override?.name ?? fav.name,
      folder: override?.folder ?? folderFromKey(fav.key),
      url: fav.url,
      favourite: true,
      kind: 'unknown',
      status: 'offline',
      statusDetail: fav.lastSeen ? `Last seen ${new Date(fav.lastSeen).toLocaleString()}` : 'Not seen yet',
    };
    if (matches(item, query)) sections.favourites.push(item);
  }

  sections.favourites.sort(byName);
  sections.projects.sort((a, b) => byName(a, b) || portOf(a) - portOf(b));
  sections.pages.sort((a, b) => portOf(a) - portOf(b));
  sections.other.sort((a, b) => portOf(a) - portOf(b));
  sections.hidden.sort((a, b) => portOf(a) - portOf(b));
  return sections;
}

/** `dir:wsl:/home/me/site#node` → `/home/me/site`. */
function folderFromKey(key: string): string | undefined {
  const m = /^dir:[a-z]+:(.*)#[^#]*$/.exec(key);
  return m?.[1];
}

/** Only ever hand http(s) URLs to an <a href>. */
export function safeHref(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
}

export function looksLikeFolder(s: string): boolean {
  return s.startsWith('/') || /^[a-z]:[\\/]/i.test(s) || s.startsWith('\\\\');
}

export function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export interface EditorLink {
  label: string;
  href: string;
}

const encodePath = (path: string): string =>
  path
    .split('/')
    .map((seg) => (/^[a-z]:$/i.test(seg) ? seg : encodeURIComponent(seg)))
    .join('/');

/**
 * Links that open a project's folder in VS Code and Cursor, built here because the server runs
 * nothing. A WSL folder needs the distro name and gets none when it is unknown.
 */
export function editorLinks(project: Project, distro: string | undefined): EditorLink[] {
  const { folder, env } = project;
  if (!folder || !env) return [];
  const editors = [
    { label: 'VS Code', scheme: 'vscode' },
    { label: 'Cursor', scheme: 'cursor' },
  ];
  if (env === 'wsl' && !distro) return [];
  return editors.map(({ label, scheme }) => ({
    label,
    href:
      env === 'wsl'
        ? `${scheme}://vscode-remote/wsl+${encodeURIComponent(distro!)}${encodePath(folder)}`
        : `${scheme}://file${env === 'windows' ? '/' : ''}${encodePath(env === 'windows' ? folder.replace(/\\/g, '/') : folder)}`,
  }));
}
