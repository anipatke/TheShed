import type { Env, Project, RunState } from './types.ts';

/** States in which a launch still owns a process: it can be stopped, and a second start is refused. */
export const ACTIVE_STATES: readonly RunState[] = ['starting', 'running', 'stopping'];
export const isActiveState = (s: RunState): boolean => ACTIVE_STATES.includes(s);

/** What a project still lacks before it can be started, as one sentence; undefined when nothing is missing. */
export function missingForLaunch(p: Project): string | undefined {
  const missing = [!p.launch?.command && 'a launch command', !p.folder && 'a folder', !p.env && 'an environment', !p.port && 'a preferred port'].filter(Boolean);
  return missing.length ? `${p.name} needs ${missing.join(', ')} before it can be started.` : undefined;
}

/** A project can only be launched from a Shed running in the project's own environment. */
export function wrongEnvironment(p: Project, hostEnv: Env): string | undefined {
  return p.env !== hostEnv ? `${p.name} lives in ${p.env}; start it from a Shed running in ${p.env}.` : undefined;
}
