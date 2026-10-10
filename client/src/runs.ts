import { isActiveState, missingForLaunch, wrongEnvironment } from '../../shared/launch.ts';
import type { Env, Project, RunState, RunSummary, Service } from '../../shared/types.ts';

/** Managed: The Shed started it in this server session. External: anything else that is running. */
export type Ownership = 'managed' | 'external';

export const RUN_LABEL: Record<RunState, string> = {
  starting: 'Starting',
  running: 'Running',
  stopping: 'Stopping',
  stopped: 'Stopped',
  exited: 'Exited',
  failed: 'Failed',
};

export const isActiveRun = (run: RunSummary | undefined): run is RunSummary => !!run && isActiveState(run.state);
/** A run that will change by itself soon, so the page should keep asking. */
export const isTransitioning = (run: RunSummary | undefined): boolean => run?.state === 'starting' || run?.state === 'stopping';
/** A run that ended badly, so the card explains it. */
export const isProblemRun = (run: RunSummary | undefined): run is RunSummary => run?.state === 'exited' || run?.state === 'failed';

/** Why Start is not offered, as a short reason; undefined when it is. A project with an active run never offers Start. */
export function startBlock(project: Project, hostEnv: Env, run: RunSummary | undefined): string | undefined {
  if (isActiveRun(run)) return undefined;
  return missingForLaunch(project) ?? wrongEnvironment(project, hostEnv);
}

/**
 * A project with an active run, and its matched service, are Managed. Any other running service is External,
 * including a registered project matched to a service it did not start. Nothing running has no label.
 */
export function ownershipOf(run: RunSummary | undefined, service: Service | undefined): Ownership | undefined {
  if (isActiveRun(run)) return 'managed';
  return service ? 'external' : undefined;
}

/** A warning when the project's run is up but its matched service listens on another port than assigned. */
export function portMismatch(run: RunSummary | undefined, service: Service | undefined): string | undefined {
  if (run?.state !== 'running' || !service || service.port === run.port) return undefined;
  return `Started on port ${run.port}, but the matching service is listening on ${service.port}.`;
}

/** "code 1" or "signal SIGTERM" for a run that ended. */
export function exitText(run: RunSummary): string | undefined {
  if (run.signal) return `signal ${run.signal}`;
  return run.exitCode !== undefined ? `code ${run.exitCode}` : undefined;
}
