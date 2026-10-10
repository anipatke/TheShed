import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import net from 'node:net';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import type { Env, Project } from '../shared/types.ts';
import { LOG_LIMIT, LogBuffer, Supervisor, refusalStatus, withPort, type SupervisorDeps } from './supervisor.ts';

class FakeChild extends EventEmitter {
  pid: number;
  stdout = new PassThrough();
  stderr = new PassThrough();
  constructor(pid: number) {
    super();
    this.pid = pid;
  }
  exit(code: number | null, signal: NodeJS.Signals | null = null): void {
    this.emit('exit', code, signal);
  }
}

interface Spawned {
  file: string;
  args: string[];
  opts: SpawnOptions;
  child: FakeChild;
}

const project = (extra: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'App',
  env: 'wsl',
  folder: '/home/u/app',
  port: 5173,
  launch: { command: 'npm run dev -- --port {port} --strictPort' },
  ...extra,
});

function setup(projects: Project[] = [project()], over: Partial<SupervisorDeps> = {}, host: Env = 'wsl') {
  const spawned: Spawned[] = [];
  const signals: Array<[number, string]> = [];
  let listening = false;
  let pid = 100;
  const sup = new Supervisor({
    hostEnv: host,
    getProject: (id) => projects.find((p) => p.id === id),
    spawn: (file, args, opts) => {
      const child = new FakeChild(pid++);
      spawned.push({ file, args, opts, child });
      return child as unknown as ChildProcess;
    },
    checkPort: async () => ({ busy: false }),
    isListening: async () => listening,
    killTree: (p, signal) => {
      signals.push([p, signal]);
    },
    stopGraceMs: 20,
    killWaitMs: 20,
    readyPollMs: 5,
    readyTimeoutMs: 1000,
    ...over,
  });
  return { sup, spawned, signals, setListening: (v: boolean) => (listening = v) };
}

const tick = (ms = 30): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('withPort', () => {
  it('substitutes every {port} with the integer', () => {
    assert.equal(withPort('vite --port {port} && echo {port}', 5173), 'vite --port 5173 && echo 5173');
  });
});

describe('Supervisor.start', () => {
  it('runs the command as one shell argument in the folder with PORT set and stdin closed', async () => {
    const { sup, spawned } = setup();
    const r = await sup.start('p1');
    assert.ok(r.ok);
    const [s] = spawned;
    assert.equal(s.file, 'sh');
    assert.deepEqual(s.args, ['-c', 'npm run dev -- --port 5173 --strictPort']);
    assert.equal(s.opts.cwd, '/home/u/app');
    assert.equal(s.opts.detached, true);
    assert.equal(s.opts.env?.PORT, '5173');
    assert.equal((s.opts.stdio as string[])[0], 'ignore');
  });

  it('uses cmd.exe with a verbatim, quoted command on Windows', async () => {
    const win = project({ env: 'windows', folder: 'C:\\dev\\app' });
    const { sup, spawned } = setup([win], {}, 'windows');
    await sup.start('p1');
    assert.equal(spawned[0].file, 'cmd.exe');
    assert.deepEqual(spawned[0].args, ['/d', '/s', '/c', '"npm run dev -- --port 5173 --strictPort"']);
    assert.equal(spawned[0].opts.windowsVerbatimArguments, true);
  });

  it('becomes running once the port is listening', async () => {
    const { sup, setListening } = setup();
    await sup.start('p1');
    assert.equal(sup.runs()[0].state, 'starting');
    setListening(true);
    await tick();
    assert.equal(sup.runs()[0].state, 'running');
  });

  const refusals: Array<[string, Partial<Project> | null, string, Env?]> = [
    ['no launch command', { launch: undefined }, 'not-launchable'],
    ['no folder', { folder: undefined, env: undefined }, 'not-launchable'],
    ['no environment', { env: undefined }, 'not-launchable'],
    ['no preferred port', { port: undefined }, 'not-launchable'],
    ['an unknown project', null, 'unknown-project'],
    ['a project in another environment', { env: 'windows', folder: 'C:\\app' }, 'wrong-environment'],
  ];
  for (const [name, patch, code, host] of refusals) {
    it(`refuses ${name} and spawns nothing`, async () => {
      const { sup, spawned } = setup(patch ? [project(patch)] : [], {}, host);
      const r = await sup.start('p1');
      assert.ok(!r.ok);
      assert.equal(r.code, code);
      assert.equal(spawned.length, 0);
    });
  }

  it('refuses a second start while a run is active, even while the first is checking the port', async () => {
    const { sup, spawned } = setup([project()], { checkPort: async () => (await tick(10), { busy: false }) });
    const [a, b] = await Promise.all([sup.start('p1'), sup.start('p1')]);
    assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
    assert.equal(spawned.length, 1);
    const c = await sup.start('p1');
    assert.ok(!c.ok && c.code === 'already-active');
  });

  it('refuses a busy port and names the holder when known', async () => {
    const { sup, spawned } = setup([project()], { checkPort: async () => ({ busy: true, holder: 'node (windows)' }) });
    const r = await sup.start('p1');
    assert.ok(!r.ok);
    assert.equal(r.code, 'port-busy');
    assert.match(r.message, /node \(windows\)/);
    assert.equal(spawned.length, 0);
  });

  it('says the holder is unknown when the scan does not know', async () => {
    const { sup } = setup([project()], { checkPort: async () => ({ busy: true }) });
    const r = await sup.start('p1');
    assert.ok(!r.ok);
    assert.match(r.message, /holder unknown/);
  });

  it('refuses a port that another run of The Shed is already using', async () => {
    const { sup, spawned } = setup([project(), project({ id: 'p2', name: 'Other' })]);
    await sup.start('p1');
    const r = await sup.start('p2');
    assert.ok(!r.ok && r.code === 'port-busy');
    assert.equal(spawned.length, 1);
  });
});

describe('exit and failure', () => {
  it('records failed with the code and last output lines on an early exit', async () => {
    const { sup, spawned } = setup();
    await sup.start('p1');
    spawned[0].child.stderr.write('line1\nline2\nPort 5173 is already in use\n');
    await tick(5);
    spawned[0].child.exit(1);
    const run = sup.runs()[0];
    assert.equal(run.state, 'failed');
    assert.equal(run.exitCode, 1);
    assert.match(run.message, /code 1/);
    assert.match(run.message, /Port 5173 is already in use/);
  });

  it('records exited after it was running', async () => {
    const { sup, spawned, setListening } = setup();
    await sup.start('p1');
    setListening(true);
    await tick();
    spawned[0].child.exit(null, 'SIGSEGV');
    const run = sup.runs()[0];
    assert.equal(run.state, 'exited');
    assert.equal(run.signal, 'SIGSEGV');
  });

  it('records a spawn error as failed', async () => {
    const { sup, spawned } = setup();
    await sup.start('p1');
    spawned[0].child.emit('error', new Error('spawn sh ENOENT'));
    assert.equal(sup.runs()[0].state, 'failed');
    assert.match(sup.runs()[0].message, /ENOENT/);
  });

  it('records a spawn that throws as failed', async () => {
    const { sup } = setup([project()], {
      spawn: () => {
        throw new Error('EINVAL');
      },
    });
    const r = await sup.start('p1');
    assert.ok(r.ok);
    assert.equal(r.run.state, 'failed');
  });

  it('allows a new start after a run has ended', async () => {
    const { sup, spawned } = setup();
    await sup.start('p1');
    spawned[0].child.exit(1);
    const r = await sup.start('p1');
    assert.ok(r.ok);
    assert.equal(spawned.length, 2);
  });
});

describe('LogBuffer', () => {
  it('keeps only the newest ~64 KB', () => {
    const log = new LogBuffer();
    log.append('a'.repeat(LOG_LIMIT));
    log.append('END');
    assert.equal(log.toString().length, LOG_LIMIT);
    assert.ok(log.toString().endsWith('END'));
    assert.ok(!log.toString().includes('b'));
  });

  it('strips colour and cursor sequences, including ones split across chunks', () => {
    const log = new LogBuffer();
    log.append('\u001b[32m\u001b[1mVITE\u001b[22m ready\r\n');
    log.append('half \u001b[3');
    log.append('2mgreen\u001b[0m\n');
    assert.equal(log.toString(), 'VITE ready\nhalf green\n');
  });
});

describe('Supervisor.stop', () => {
  it('refuses an unknown project and signals nothing', async () => {
    const { sup, signals } = setup();
    const r = await sup.stop('nope');
    assert.ok(!r.ok && r.code === 'not-running');
    assert.deepEqual(signals, []);
  });

  it('sends no signal after the process has exited', async () => {
    const { sup, spawned, signals } = setup();
    await sup.start('p1');
    spawned[0].child.exit(0);
    const r = await sup.stop('p1');
    assert.ok(!r.ok);
    assert.deepEqual(signals, []);
  });

  it('terminates, then reports stopped once the process exits', async () => {
    const { sup, spawned, signals } = setup();
    await sup.start('p1');
    const stopping = sup.stop('p1');
    spawned[0].child.exit(null, 'SIGTERM');
    const r = await stopping;
    assert.ok(r.ok);
    assert.equal(r.run.state, 'stopped');
    assert.deepEqual(signals, [[100, 'SIGTERM']]);
  });

  it('escalates to a forced kill when the process ignores the first signal', async () => {
    const { sup, spawned, signals } = setup();
    await sup.start('p1');
    const stopping = sup.stop('p1');
    await tick(30);
    spawned[0].child.exit(null, 'SIGKILL');
    const r = await stopping;
    assert.deepEqual(signals, [[100, 'SIGTERM'], [100, 'SIGKILL']]);
    assert.ok(r.ok && r.run.state === 'stopped');
  });

  it('keeps stopping until the group is empty after the leader has exited', async () => {
    let alive = true;
    const { sup, spawned, signals } = setup([project()], { groupAlive: () => alive });
    await sup.start('p1');
    const stopping = sup.stop('p1');
    spawned[0].child.exit(null, 'SIGTERM');
    await tick(10);
    assert.equal(sup.runs()[0].state, 'stopping');
    setTimeout(() => (alive = false), 5);
    const r = await stopping;
    assert.ok(r.ok && r.run.state === 'stopped');
    assert.deepEqual(signals, [[100, 'SIGTERM']]);
  });

  it('forces the remaining group when the leader exits but a member ignores the signal', async () => {
    let alive = true;
    const { sup, spawned, signals } = setup([project()], { groupAlive: () => alive });
    await sup.start('p1');
    const stopping = sup.stop('p1');
    spawned[0].child.exit(null, 'SIGTERM');
    await tick(30);
    alive = false;
    const r = await stopping;
    assert.deepEqual(signals, [[100, 'SIGTERM'], [100, 'SIGKILL']]);
    assert.ok(r.ok && r.run.state === 'stopped');
  });

  it('reports failed when even the forced kill does not end the process', async () => {
    const { sup } = setup();
    await sup.start('p1');
    const r = await sup.stop('p1');
    assert.ok(r.ok);
    assert.equal(r.run.state, 'failed');
  });

  it('stops a run that never becomes ready', async () => {
    const { sup, spawned, signals } = setup([project()], { readyTimeoutMs: 20 });
    await sup.start('p1');
    await tick(40);
    spawned[0].child.exit(null, 'SIGTERM');
    assert.deepEqual(signals[0], [100, 'SIGTERM']);
    await tick(5);
    assert.equal(sup.runs()[0].state, 'failed');
    assert.match(sup.runs()[0].message, /never started listening/);
  });
});

describe('restart and stop-all', () => {
  it('waits for the port to be released before starting again', async () => {
    let busy = 0;
    const { sup, spawned } = setup([project()], { checkPort: async () => ({ busy: busy-- > 0 }) });
    await sup.start('p1');
    busy = 1;
    const restarting = sup.restart('p1');
    await tick(5);
    spawned[0].child.exit(null, 'SIGTERM');
    const r = await restarting;
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(spawned.length, 2);
  });

  it('stops, waits for exit, then starts again', async () => {
    const events: string[] = [];
    const { sup, spawned } = setup([project()], { killTree: (p, s) => void events.push(`${s}:${p}`) });
    await sup.start('p1');
    const restarting = sup.restart('p1');
    await tick(5);
    assert.equal(spawned.length, 1);
    events.push('exit');
    spawned[0].child.exit(null, 'SIGTERM');
    const r = await restarting;
    assert.ok(r.ok);
    assert.equal(spawned.length, 2);
    assert.deepEqual(events, ['SIGTERM:100', 'exit']);
  });

  it('restart of a project that is not running just starts it', async () => {
    const { sup, spawned } = setup();
    const r = await sup.restart('p1');
    assert.ok(r.ok);
    assert.equal(spawned.length, 1);
  });

  it('stop-all stops every active run and leaves finished ones alone', async () => {
    const { sup, spawned, signals } = setup([project(), project({ id: 'p2', name: 'B', port: 5174 }), project({ id: 'p3', name: 'C', port: 5175 })]);
    await sup.start('p1');
    await sup.start('p2');
    await sup.start('p3');
    spawned[2].child.exit(0);
    const all = sup.stopAll();
    await tick(5);
    spawned[0].child.exit(null, 'SIGTERM');
    spawned[1].child.exit(null, 'SIGTERM');
    await all;
    assert.deepEqual(signals.map(([p]) => p).sort(), [100, 101]);
    assert.deepEqual(sup.runs().map((r) => r.state), ['stopped', 'stopped', 'failed']);
  });
});

describe('API support', () => {
  it('maps refusal codes to HTTP statuses', () => {
    assert.equal(refusalStatus('unknown-project'), 404);
    assert.equal(refusalStatus('not-launchable'), 400);
    for (const code of ['wrong-environment', 'already-active', 'port-busy', 'not-running'] as const) assert.equal(refusalStatus(code), 409);
  });

  it('isActive is true from start until the process has exited', async () => {
    const { sup, spawned } = setup();
    assert.equal(sup.isActive('p1'), false);
    await sup.start('p1');
    assert.equal(sup.isActive('p1'), true);
    spawned[0].child.exit(0);
    assert.equal(sup.isActive('p1'), false);
  });

  it('has no log for a project that was never started', () => {
    assert.equal(setup().sup.log('p1'), undefined);
  });
});

describe('real process tree', { skip: process.platform === 'win32' }, () => {
  it('stop leaves no process of the tree running', async () => {
    const probe = net.createServer();
    await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
    const port = (probe.address() as net.AddressInfo).port;
    await new Promise((r) => probe.close(r));

    const command =
      `node -e "require('child_process').spawn('sleep',['300']);require('net').createServer().listen(Number(process.env.PORT),'127.0.0.1')" # {port}`;
    const sup = new Supervisor({
      hostEnv: process.platform === 'linux' ? 'linux' : 'wsl',
      getProject: () => project({ env: process.platform === 'linux' ? 'linux' : 'wsl', folder: process.cwd(), port, launch: { command } }),
    });
    const started = await sup.start('p1');
    assert.ok(started.ok);
    const pgid = started.run.pid!;
    const members = (): string[] => {
      try {
        return execFileSync('ps', ['-o', 'pid=', '-g', String(pgid)], { encoding: 'utf8' }).split('\n').filter((l) => l.trim());
      } catch {
        return [];
      }
    };
    for (let i = 0; i < 100 && sup.runs()[0].state === 'starting'; i++) await tick(50);
    assert.equal(sup.runs()[0].state, 'running');
    assert.ok(members().length >= 3, `expected sh, node and sleep in the group, saw ${members().length}`);

    const stopped = await sup.stop('p1');
    assert.ok(stopped.ok && stopped.run.state === 'stopped');
    assert.deepEqual(members(), []);
  });
});
