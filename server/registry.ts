import type { Config, Env, PortConflict, Project, ProjectMatch, Service } from '../shared/types.ts';

/** Compare folders as the platform does: Windows ignores case and separator style; trailing separators never matter. */
export function normaliseFolder(folder: string, env: Env): string {
  if (env === 'windows') return folder.replace(/\//g, '\\').replace(/(?<=[^:])\\+$/, '').toLowerCase();
  return folder.replace(/(?<=.)\/+$/, '');
}

/** Lower is better: a page to open beats an API, which beats anything else. */
function kindRank(s: Service): number {
  return s.probe.kind === 'web' ? 0 : s.probe.kind === 'http' ? 1 : 2;
}

/** Folder-matched candidates are ordered best-first: web > http > other, then lowest port. */
function byPreference(a: Service, b: Service): number {
  return kindRank(a) - kindRank(b) || a.port - b.port || a.id.localeCompare(b.id);
}

/** Folder of a service for matching: the user's override folder, else the inferred project folder. */
function serviceFolders(services: Service[], config: Config): Map<string, string> {
  const overrides = new Map(config.overrides.map((o) => [o.key, o.folder]));
  const folders = new Map<string, string>();
  for (const s of services) {
    const folder = overrides.get(s.favouriteKey) ?? s.projectDir;
    if (folder) folders.set(s.id, normaliseFolder(folder, s.env));
  }
  return folders;
}

type Tier = (project: Project, candidates: Service[], inFolder: (s: Service) => boolean) => Service | undefined;

const sameEnv = (project: Project, s: Service): boolean => project.env === undefined || project.env === s.env;

// Applied in this order across all projects, so an earlier project cannot take a later one's better match.
const TIERS: Tier[] = [
  // A folder match that is also on the preferred port.
  (p, c, inFolder) => c.find((s) => inFolder(s) && s.port === p.port),
  // The preferred port alone.
  (p, c) => c.find((s) => s.port === p.port),
  // A folder match, best service first.
  (_p, c, inFolder) => c.filter(inFolder).sort(byPreference)[0],
];

/**
 * Pair each registered project with at most one running service, and each service with at most one project.
 * A project without a folder has no environment, so its preferred port matches in any environment.
 */
export function matchProjects(projects: Project[], services: Service[], config: Config): ProjectMatch[] {
  const folders = serviceFolders(services, config);
  const projectFolder = (p: Project): string | undefined => (p.folder && p.env ? normaliseFolder(p.folder, p.env) : undefined);
  const matches: ProjectMatch[] = [];
  const claimed = new Set<string>();
  const matched = new Set<string>();

  for (const tier of TIERS) {
    for (const project of projects) {
      if (matched.has(project.id)) continue;
      const folder = projectFolder(project);
      const candidates = services.filter((s) => !claimed.has(s.id) && sameEnv(project, s));
      const inFolder = (s: Service): boolean => folder !== undefined && folders.get(s.id) === folder;
      const hit = tier(project, candidates, inFolder);
      if (!hit) continue;
      matches.push({ projectId: project.id, serviceId: hit.id });
      claimed.add(hit.id);
      matched.add(project.id);
    }
  }
  return matches;
}

/**
 * Report preferred ports that cannot be used as planned: shared by several projects, or held by a listener
 * that is not one of those projects' own service. Windows and WSL are one port space (mirrored networking
 * shares localhost). Nothing is changed.
 */
export function findPortConflicts(projects: Project[], services: Service[], matches: ProjectMatch[]): PortConflict[] {
  const byPort = new Map<number, string[]>();
  for (const p of projects) if (p.port !== undefined) byPort.set(p.port, [...(byPort.get(p.port) ?? []), p.id]);

  const conflicts: PortConflict[] = [];
  for (const [port, projectIds] of byPort) {
    const own = new Set(matches.filter((m) => projectIds.includes(m.projectId)).map((m) => m.serviceId));
    const holder = services.filter((s) => s.port === port && !own.has(s.id)).sort((a, b) => a.id.localeCompare(b.id))[0];
    if (projectIds.length < 2 && !holder) continue;
    conflicts.push({
      port,
      projectIds,
      holder: holder && { serviceId: holder.id, env: holder.env, processName: holder.processName },
    });
  }
  return conflicts.sort((a, b) => a.port - b.port);
}

/** Everything the page needs to show a registered project as running, and to warn about port clashes. */
export function resolveProjects(config: Config, services: Service[]): { matches: ProjectMatch[]; conflicts: PortConflict[] } {
  const matches = matchProjects(config.projects, services, config);
  return { matches, conflicts: findPortConflicts(config.projects, services, matches) };
}
