import { execFile, spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import net from 'node:net';
import { isActiveState as isActive, missingForLaunch, wrongEnvironment } from '../shared/launch.ts';
import type { Env, Project, Refusal, RunState, RunSummary } from '../shared/types.ts';

export type SpawnFn = (file: string, args: string[], opts: SpawnOptions) => ChildProcess;
export type PortCheck = { busy: false } | { busy: true; holder?: string };
export type Started = { ok: true; run: RunSummary } | Refusal;

export interface SupervisorDeps {
  /** The environment this server runs in. Only projects in the same environment can be launched. */
  hostEnv: Env;
  getProject: (id: string) => Project | undefined;
  spawn: SpawnFn;
  /** Is the port free on this host? A busy answer may name the holder when a fresh scan knows it. */
  checkPort: (port: number) => Promise<PortCheck>;
  isListening: (port: number) => Promise<boolean>;
  /** Signal the whole tree of a run's leader. Only ever called with a PID from a live run record. */
  killTree: (pid: number, signal: 'SIGTERM' | 'SIGKILL') => void;
  /** Does any process of a run's group remain after its leader is gone? Always false where the group cannot be probed. */
  groupAlive: (pid: number) => boolean;
  now: () => number;
  stopGraceMs: number;
  killWaitMs: number;
  readyPollMs: number;
  readyTimeoutMs: number;
}

export const LOG_LIMIT = 64 * 1024;
const TAIL_LINES = 5;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Output of one run: plain text only, newest ~64 KB. */
export class LogBuffer {
  private text = '';
  /** An escape sequence cut off at the end of a chunk, completed by the next one. */
  private carry = '';

  append(chunk: string): void {
    const joined = this.carry + chunk;
    const cut = /\x1b(?:\[[0-9;?]*[ -/]*)?$/.exec(joined);
    this.carry = cut ? cut[0] : '';
    const clean = (cut ? joined.slice(0, cut.index) : joined)
      .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
      .replace(/\x1b/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '');
    this.text = (this.text + clean).slice(-LOG_LIMIT);
  }

  toString(): string {
    return this.text;
  }

  tail(lines: number): string {
    return this.text.trimEnd().split('\n').slice(-lines).join('\n');
  }
}

interface Run {
  summary: RunSummary;
  child?: ChildProcess;
  log: LogBuffer;
  exited: Promise<void>;
  settle: () => void;
  done: boolean;
  /** The leader's exit, held back while a stop waits for the rest of the group. */
  leaderExit?: Partial<RunSummary>;
}

const refuse = (code: Refusal['code'], message: string): Refusal => ({ ok: false, code, message });

/** The HTTP status for a refusal: 404 unknown project, 400 not launchable, 409 for a state conflict. */
export function refusalStatus(code: Refusal['code']): number {
  if (code === 'unknown-project') return 404;
  return code === 'not-launchable' ? 400 : 409;
}

/** Replace `{port}` with the validated integer port; nothing else is ever put into the command. */
export function withPort(command: string, port: number): string {
  return command.replaceAll('{port}', String(port));
}

/**
 * The only code that starts or stops project processes. A stop works through a run record made in this
 * server session and never takes a PID from outside (SCOPE-02).
 */
export class Supervisor {
  private readonly deps: SupervisorDeps;
  private readonly runs_ = new Map<string, Run>();
  /** Projects whose start is between the checks and the spawn. */
  private readonly starting = new Set<string>();

  constructor(deps: Partial<SupervisorDeps> & Pick<SupervisorDeps, 'hostEnv' | 'getProject'>) {
    this.deps = {
      spawn: nodeSpawn,
      checkPort: defaultCheckPort(),
      isListening: defaultIsListening,
      killTree: defaultKillTree(deps.hostEnv),
      // An injected killTree comes with no probe, so a test's fake PID is never looked up on the real host.
      groupAlive: deps.killTree ? () => false : defaultGroupAlive(deps.hostEnv),
      now: Date.now,
      stopGraceMs: 3000,
      killWaitMs: 2000,
      readyPollMs: 250,
      readyTimeoutMs: 60_000,
      ...deps,
    };
  }

  runs(): RunSummary[] {
    return [...this.runs_.values()].map((r) => ({ ...r.summary }));
  }

  /** Is a launch of this project starting, running or stopping? */
  isActive(projectId: string): boolean {
    const run = this.runs_.get(projectId);
    return this.starting.has(projectId) || (!!run && isActive(run.summary.state));
  }

  log(projectId: string): string | undefined {
    return this.runs_.get(projectId)?.log.toString();
  }

  async start(projectId: string): Promise<Started> {
    const project = this.deps.getProject(projectId);
    if (!project) return refuse('unknown-project', 'No such project.');
    const problem = missingForLaunch(project);
    if (problem) return refuse('not-launchable', problem);
    const { command } = project.launch!;
    const port = project.port!;
    const elsewhere = wrongEnvironment(project, this.deps.hostEnv);
    if (elsewhere) return refuse('wrong-environment', elsewhere);
    const existing = this.runs_.get(projectId);
    if (this.starting.has(projectId) || (existing && isActive(existing.summary.state))) {
      return refuse('already-active', `${project.name} is already running or starting.`);
    }
    const other = [...this.runs_.values()].find((r) => isActive(r.summary.state) && r.summary.port === port);
    if (other) return refuse('port-busy', `Port ${port} is held by ${other.summary.projectId}, which The Shed started.`);

    this.starting.add(projectId);
    try {
      const check = await this.deps.checkPort(port);
      if (check.busy) {
        return refuse('port-busy', `Port ${port} is in use${check.holder ? ` by ${check.holder}` : ', holder unknown'}.`);
      }
      return { ok: true, run: this.launch(project, withPort(command, port), port) };
    } finally {
      this.starting.delete(projectId);
    }
  }

  async stop(projectId: string): Promise<{ ok: true; run: RunSummary } | Refusal> {
    const run = this.runs_.get(projectId);
    if (!run || !isActive(run.summary.state) || run.summary.pid === undefined) {
      return refuse('not-running', 'The Shed has no running process for this project.');
    }
    if (run.summary.state !== 'stopping') {
      this.update(run, { state: 'stopping', message: 'Stopping.' });
      await this.escalate(run, run.summary.pid);
    } else {
      await run.exited;
    }
    return { ok: true, run: { ...run.summary } };
  }

  async restart(projectId: string): Promise<Started> {
    const run = this.runs_.get(projectId);
    if (run && isActive(run.summary.state)) {
      const stopped = await this.stop(projectId);
      if (!stopped.ok) return stopped;
      if (stopped.run.state === 'failed') return refuse('already-active', stopped.run.message);
      await this.waitPortFree(stopped.run.port);
    }
    return this.start(projectId);
  }

  async stopAll(): Promise<void> {
    await Promise.all([...this.runs_.keys()].map((id) => this.stop(id)));
  }

  private launch(project: Project, command: string, port: number): RunSummary {
    const env = { ...process.env, PORT: String(port) };
    const windows = this.deps.hostEnv === 'windows';
    // The command is one shell argument. cmd.exe needs it wrapped in a single pair of quotes and passed verbatim.
    const child = (() => {
      try {
        return windows
          ? this.deps.spawn('cmd.exe', ['/d', '/s', '/c', `"${command}"`], { cwd: project.folder, env, windowsVerbatimArguments: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
          : this.deps.spawn('sh', ['-c', command], { cwd: project.folder, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) {
        return err as Error;
      }
    })();

    let settle = (): void => {};
    const exited = new Promise<void>((r) => (settle = r));
    const run: Run = {
      summary: { projectId: project.id, startedAt: new Date(this.deps.now()).toISOString(), port, state: 'starting', message: 'Starting.' },
      log: new LogBuffer(),
      exited,
      settle,
      done: false,
    };
    this.runs_.set(project.id, run);

    if (child instanceof Error) {
      this.finish(run, { state: 'failed', message: `Could not start: ${child.message}` });
      return { ...run.summary };
    }
    run.child = child;
    run.summary.pid = child.pid;
    for (const stream of [child.stdout, child.stderr]) {
      stream?.setEncoding('utf8');
      stream?.on('data', (c: string) => run.log.append(c));
    }
    child.on('error', (err) => this.finish(run, { state: 'failed', message: `Could not start: ${err.message}` }));
    child.on('exit', (code, signal) => this.onExit(run, code, signal));
    void this.awaitReady(run);
    return { ...run.summary };
  }

  private onExit(run: Run, code: number | null, signal: NodeJS.Signals | null): void {
    const how = signal ? `signal ${signal}` : `code ${code}`;
    const tail = run.log.tail(TAIL_LINES);
    const after = tail ? `\nLast output:\n${tail}` : '';
    const detail = { exitCode: code ?? undefined, signal: signal ?? undefined };
    const { state } = run.summary;
    // The leader dying does not mean the server below it has: the stop finishes once the whole group is gone.
    if (state === 'stopping') run.leaderExit = detail;
    else if (state === 'starting') this.finish(run, { ...detail, state: 'failed', message: `Exited with ${how} before the port was ready.${after}` });
    else this.finish(run, { ...detail, state: 'exited', message: `Exited with ${how}.${after}` });
  }

  /** Records the final state once; a late event after the run ended changes nothing. */
  private finish(run: Run, patch: Partial<RunSummary>): void {
    if (run.done) return;
    run.done = true;
    this.update(run, patch);
    run.settle();
  }

  private update(run: Run, patch: Partial<RunSummary>): void {
    Object.assign(run.summary, patch);
  }

  /** "Running" means the assigned port is listening. */
  private async awaitReady(run: Run): Promise<void> {
    const deadline = this.deps.now() + this.deps.readyTimeoutMs;
    while (run.summary.state === 'starting') {
      if (await this.deps.isListening(run.summary.port)) {
        if (run.summary.state === 'starting') this.update(run, { state: 'running', message: `Listening on port ${run.summary.port}.` });
        return;
      }
      if (this.deps.now() >= deadline) {
        const pid = run.summary.pid;
        this.update(run, { state: 'stopping', message: `Port ${run.summary.port} was not listening after ${Math.round(this.deps.readyTimeoutMs / 1000)}s; stopping.` });
        if (pid !== undefined) await this.escalate(run, pid);
        if ((run.summary.state as RunState) === 'stopped') this.update(run, { state: 'failed', message: `Port ${run.summary.port} never started listening; stopped.\n${run.log.tail(TAIL_LINES)}`.trimEnd() });
        return;
      }
      await sleep(this.deps.readyPollMs);
    }
  }

  /** Ask, wait a bounded time, then force; give up (and say so) if the process still does not go. */
  private async escalate(run: Run, pid: number): Promise<void> {
    const gone = (): boolean => run.done || (run.leaderExit !== undefined && !this.deps.groupAlive(pid));
    const waitFor = async (ms: number): Promise<boolean> => {
      let over = false;
      const timer = sleep(ms).then(() => ((over = true), false));
      const poll = (async () => {
        while (!over) {
          if (gone()) return true;
          await sleep(5);
        }
        return false;
      })();
      return Promise.race([poll, timer]);
    };
    const done = (): void => this.finish(run, { ...run.leaderExit, state: 'stopped', message: 'Stopped.' });
    this.deps.killTree(pid, 'SIGTERM');
    if (await waitFor(this.deps.stopGraceMs)) return done();
    // The group id stays ours for as long as any member lives, so the forced signal cannot reach a stranger.
    if (run.leaderExit === undefined || this.deps.groupAlive(pid)) this.deps.killTree(pid, 'SIGKILL');
    if (await waitFor(this.deps.killWaitMs)) return done();
    this.finish(run, { state: 'failed', message: 'The process did not exit after a forced stop.' });
  }

  /** After a stop, give the port a bounded moment to be released before starting again. */
  private async waitPortFree(port: number): Promise<void> {
    const end = Date.now() + this.deps.killWaitMs;
    while (Date.now() < end && (await this.deps.checkPort(port)).busy) await sleep(50);
  }
}

/** A bind attempt shows a busy port on either side; naming the holder is up to the caller's scan. */
export function defaultCheckPort(findHolder?: (port: number) => Promise<string | undefined>): (port: number) => Promise<PortCheck> {
  return (port) =>
    new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', async () => resolve({ busy: true, holder: await findHolder?.(port).catch(() => undefined) }));
      server.listen(port, '127.0.0.1', () => server.close(() => resolve({ busy: false })));
    });
}

function connects(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
    socket.once('error', () => resolve(false));
  });
}

/** Windows Vite listens on ::1 only, WSL on 127.0.0.1, so try both. */
export async function defaultIsListening(port: number): Promise<boolean> {
  return (await connects(port, '127.0.0.1')) || (await connects(port, '::1'));
}

function defaultGroupAlive(host: Env): SupervisorDeps['groupAlive'] {
  if (host === 'windows') return () => false;
  return (pid) => {
    try {
      process.kill(-pid, 0);
      return true;
    } catch (err) {
      return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
  };
}

function defaultKillTree(host: Env): SupervisorDeps['killTree'] {
  if (host === 'windows') {
    // The leader is still alive here (the run record is active), so its PID cannot have been reused.
    return (pid) => void execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => {});
  }
  return (pid, signal) => {
    try {
      process.kill(-pid, signal);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') throw err;
    }
  };
}
