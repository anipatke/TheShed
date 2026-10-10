import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Config, Probe, Project, RunSummary, Service, State } from '../shared/types.ts';
import { buildSections } from '../client/src/model.ts';
import { exitText, isActiveRun, ownershipOf, portMismatch, startBlock } from '../client/src/runs.ts';

const project = (extra: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Site',
  env: 'wsl',
  folder: '/home/me/site',
  port: 5173,
  launch: { command: 'npm run dev -- --port {port}' },
  ...extra,
});
const run = (extra: Partial<RunSummary> = {}): RunSummary => ({ projectId: 'p1', startedAt: '2026-10-10T00:00:00Z', port: 5173, state: 'running', message: '', ...extra });
const service = (port: number): Service => {
  const probe: Probe = { kind: 'web' };
  return { id: `wsl:${port}`, env: 'wsl', port, addresses: ['127.0.0.1'], url: `http://localhost:${port}`, name: 'svc', nameSource: 'port', probe, favouriteKey: `port:wsl:${port}` };
};

describe('startBlock', () => {
  it('offers Start for a complete project in the hosting environment', () => {
    assert.equal(startBlock(project(), 'wsl', undefined), undefined);
  });
  it('names what is missing', () => {
    assert.match(startBlock(project({ launch: undefined, port: undefined }), 'wsl', undefined)!, /a launch command, a preferred port/);
    assert.match(startBlock(project({ folder: undefined, env: undefined }), 'wsl', undefined)!, /a folder, an environment/);
  });
  it('refuses another environment and says where to start from', () => {
    assert.match(startBlock(project({ env: 'windows' }), 'wsl', undefined)!, /start it from a Shed running in windows/);
  });
  it('is not a concern while a run is active', () => {
    assert.equal(startBlock(project({ env: 'windows' }), 'wsl', run()), undefined);
  });
  it('offers Start again after a run ended', () => {
    for (const state of ['stopped', 'exited', 'failed'] as const) assert.equal(startBlock(project(), 'wsl', run({ state })), undefined);
  });
});

describe('ownershipOf', () => {
  it('is Managed while a run is active, with or without a matched service', () => {
    for (const state of ['starting', 'running', 'stopping'] as const) assert.equal(ownershipOf(run({ state }), undefined), 'managed');
    assert.equal(ownershipOf(run(), service(5173)), 'managed');
  });
  it('is External for a running service with no active run', () => {
    assert.equal(ownershipOf(undefined, service(5173)), 'external');
    assert.equal(ownershipOf(run({ state: 'exited' }), service(5173)), 'external');
  });
  it('has no label when nothing is running', () => {
    assert.equal(ownershipOf(undefined, undefined), undefined);
    assert.equal(ownershipOf(run({ state: 'stopped' }), undefined), undefined);
  });
  it('treats only starting, running and stopping as active', () => {
    assert.equal(isActiveRun(run({ state: 'failed' })), false);
    assert.equal(isActiveRun(undefined), false);
  });
});

describe('portMismatch', () => {
  it('warns when the service is on another port than the run was assigned', () => {
    assert.match(portMismatch(run(), service(5174))!, /5173.*5174/);
  });
  it('is quiet when ports agree, the run is not running, or there is no service', () => {
    assert.equal(portMismatch(run(), service(5173)), undefined);
    assert.equal(portMismatch(run({ state: 'starting' }), service(5174)), undefined);
    assert.equal(portMismatch(run(), undefined), undefined);
  });
});

describe('exitText', () => {
  it('prefers the signal, then the code', () => {
    assert.equal(exitText(run({ exitCode: 1 })), 'code 1');
    assert.equal(exitText(run({ signal: 'SIGTERM', exitCode: undefined })), 'signal SIGTERM');
    assert.equal(exitText(run()), undefined);
  });
});

describe('cards carry run information', () => {
  const config: Config = { version: 2, projects: [project()], favourites: [], hidden: [], overrides: [] };
  const state = (runs: RunSummary[], services: Service[], matches: State['scan']['matches']): State => ({
    config,
    runs,
    scan: { scannedAt: '', durationMs: 0, host: { env: 'wsl' }, sources: [], services, projects: [], matches, conflicts: [] },
  });
  it('marks a started project Managed and flags a port mismatch', () => {
    const [item] = buildSections(state([run()], [service(5174)], [{ projectId: 'p1', serviceId: 'wsl:5174' }]), '').projects;
    assert.equal(item.type === 'project' && item.ownership, 'managed');
    assert.equal(item.type === 'project' && item.warnings.length, 1);
  });
  it('marks a matched project without a run External and a discovered service External', () => {
    const matched = buildSections(state([], [service(5173)], [{ projectId: 'p1', serviceId: 'wsl:5173' }]), '').projects[0];
    assert.equal(matched.ownership, 'external');
    const lone = buildSections(state([], [service(3000)], []), '');
    assert.equal(lone.pages[0].ownership, 'external');
  });
});
