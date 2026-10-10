import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Config, Env, Probe, Project, Service } from '../shared/types.ts';
import { buildSections } from '../client/src/model.ts';
import { findPortConflicts, matchProjects, normaliseFolder, resolveProjects } from './registry.ts';

function service(env: Env, port: number, extra: Partial<Service> = {}): Service {
  const probe: Probe = { kind: 'web' };
  return {
    id: `${env}:${port}`,
    env,
    port,
    addresses: ['127.0.0.1'],
    url: `http://localhost:${port}`,
    name: `svc-${port}`,
    nameSource: 'port',
    probe,
    favouriteKey: `port:${env}:${port}`,
    ...extra,
  };
}

const config = (projects: Project[], overrides: Config['overrides'] = []): Config => ({ version: 2, projects, favourites: [], hidden: [], overrides });
const pairs = (projects: Project[], services: Service[], overrides: Config['overrides'] = []): string[] =>
  matchProjects(projects, services, config(projects, overrides)).map((m) => `${m.projectId}=${m.serviceId}`);

const wsl = (id: string, folder: string, port?: number): Project => ({ id, name: id, env: 'wsl', folder, port });
const win = (id: string, folder: string, port?: number): Project => ({ id, name: id, env: 'windows', folder, port });

describe('normaliseFolder', () => {
  it('ignores case, separator style and trailing separators on Windows', () => {
    assert.equal(normaliseFolder('C:\\Dev\\App\\', 'windows'), normaliseFolder('c:/dev/app', 'windows'));
    assert.equal(normaliseFolder('C:\\', 'windows'), 'c:\\');
  });
  it('is case-sensitive on POSIX and ignores a trailing slash', () => {
    assert.equal(normaliseFolder('/home/a/App/', 'wsl'), '/home/a/App');
    assert.notEqual(normaliseFolder('/home/a/App', 'wsl'), normaliseFolder('/home/a/app', 'wsl'));
    assert.equal(normaliseFolder('/', 'linux'), '/');
  });
});

describe('matchProjects', () => {
  it('matches by folder in the same environment, and leaves a stopped project unmatched', () => {
    const projects = [wsl('run', '/home/a/run'), wsl('stopped', '/home/a/stopped')];
    assert.deepEqual(pairs(projects, [service('wsl', 3000, { projectDir: '/home/a/run' })]), ['run=wsl:3000']);
  });

  it('compares Windows folders case-insensitively', () => {
    const projects = [win('p', 'C:\\Dev\\App')];
    assert.deepEqual(pairs(projects, [service('windows', 5173, { projectDir: 'c:\\dev\\app\\' })]), ['p=windows:5173']);
  });

  it('does not match a folder in another environment', () => {
    assert.deepEqual(pairs([wsl('p', '/srv/app')], [service('linux', 3000, { projectDir: '/srv/app' })]), []);
  });

  it('matches by preferred port in the same environment when no folder matches', () => {
    assert.deepEqual(pairs([wsl('p', '/home/a/p', 4000)], [service('wsl', 4000), service('windows', 4000)]), ['p=wsl:4000']);
  });

  it('matches a project without a folder by port in any environment', () => {
    assert.deepEqual(pairs([{ id: 'p', name: 'p', port: 4000 }], [service('windows', 4000)]), ['p=windows:4000']);
  });

  it('prefers a folder match on the preferred port over a plain port match and over other folder matches', () => {
    const p = wsl('p', '/home/a/p', 3001);
    const services = [
      service('wsl', 3000, { projectDir: '/home/a/p' }),
      service('wsl', 3001, { projectDir: '/home/a/p', probe: { kind: 'tcp' } }),
      service('wsl', 3002),
    ];
    assert.deepEqual(pairs([p], services), ['p=wsl:3001']);
  });

  it('prefers a port match over a folder match on another port', () => {
    const p = wsl('p', '/home/a/p', 3001);
    assert.deepEqual(pairs([p], [service('wsl', 3000, { projectDir: '/home/a/p' }), service('wsl', 3001)]), ['p=wsl:3001']);
  });

  it('ranks folder matches web > http > other, then lowest port', () => {
    const p = wsl('p', '/home/a/p');
    const dir = { projectDir: '/home/a/p' };
    const tcp = service('wsl', 2000, { ...dir, probe: { kind: 'tcp' } });
    const api = service('wsl', 2500, { ...dir, probe: { kind: 'http' } });
    const webHigh = service('wsl', 4000, dir);
    const webLow = service('wsl', 3000, dir);
    assert.deepEqual(pairs([p], [tcp, api, webHigh, webLow]), ['p=wsl:3000']);
    assert.deepEqual(pairs([p], [tcp, api]), ['p=wsl:2500']);
  });

  it('leaves a helper process in the same folder unmatched', () => {
    const p = wsl('p', '/home/a/p');
    const matches = matchProjects([p], [service('wsl', 3000, { projectDir: '/home/a/p' }), service('wsl', 9229, { projectDir: '/home/a/p', probe: { kind: 'tcp' } })], config([p]));
    assert.deepEqual(matches, [{ projectId: 'p', serviceId: 'wsl:3000' }]);
  });

  it('uses an override folder instead of the inferred one', () => {
    const s = service('wsl', 3000, { projectDir: '/home/a/wrong', favouriteKey: 'k1' });
    assert.deepEqual(pairs([wsl('p', '/home/a/right')], [s], [{ key: 'k1', folder: '/home/a/right' }]), ['p=wsl:3000']);
    assert.deepEqual(pairs([wsl('p', '/home/a/wrong')], [s], [{ key: 'k1', folder: '/home/a/right' }]), []);
  });

  it('gives each service to one project and each project one service', () => {
    const projects = [wsl('a', '/home/a/p'), wsl('b', '/home/a/p')];
    const services = [service('wsl', 3000, { projectDir: '/home/a/p' }), service('wsl', 3001, { projectDir: '/home/a/p' })];
    assert.deepEqual(pairs(projects, services), ['a=wsl:3000', 'b=wsl:3001']);
  });

  it('lets a better match win over an earlier project that would settle for less', () => {
    const early = wsl('early', '/home/a/x');
    const late = wsl('late', '/home/a/y', 3000);
    const services = [service('wsl', 3000, { projectDir: '/home/a/x' })];
    assert.deepEqual(pairs([early, late], services), ['late=wsl:3000']);
  });
});

describe('findPortConflicts', () => {
  const conflicts = (projects: Project[], services: Service[]) =>
    findPortConflicts(projects, services, matchProjects(projects, services, config(projects)));

  it('names both projects that prefer the same port', () => {
    const result = conflicts([wsl('a', '/a', 3000), wsl('b', '/b', 3000)], []);
    assert.deepEqual(result, [{ port: 3000, projectIds: ['a', 'b'], holder: undefined }]);
  });

  it('treats Windows and WSL as one port space', () => {
    const result = conflicts([win('a', 'C:\\a', 3000), wsl('b', '/b', 3000)], []);
    assert.deepEqual(result.map((c) => c.projectIds), [['a', 'b']]);
  });

  it('reports a preferred port held by an unrelated listener, naming its environment and process', () => {
    const result = conflicts([wsl('a', '/a', 3000)], [service('windows', 3000, { processName: 'svchost.exe' })]);
    assert.deepEqual(result, [{ port: 3000, projectIds: ['a'], holder: { serviceId: 'windows:3000', env: 'windows', processName: 'svchost.exe' } }]);
  });

  it('reports a port held by a service matched to a different project', () => {
    const projects = [wsl('a', '/a', 3000), win('b', 'C:\\b')];
    const result = conflicts(projects, [service('windows', 3000, { projectDir: 'C:\\b' })]);
    assert.equal(result.length, 1);
    assert.equal(result[0].holder?.serviceId, 'windows:3000');
  });

  it('does not report a project running on its own preferred port', () => {
    assert.deepEqual(conflicts([wsl('a', '/a', 3000)], [service('wsl', 3000, { projectDir: '/a' })]), []);
  });

  it('does not report a stopped project with a free port', () => {
    assert.deepEqual(conflicts([wsl('a', '/a', 3000)], [service('wsl', 3001)]), []);
  });
});

describe('resolveProjects', () => {
  it('matches the running project, leaves the stopped one, and lists the shared port', () => {
    const projects = [wsl('run', '/home/a/run', 3000), wsl('stopped', '/home/a/stopped'), wsl('clash', '/home/a/clash', 3000)];
    const result = resolveProjects(config(projects), [service('wsl', 3000, { projectDir: '/home/a/run' })]);
    assert.deepEqual(result.matches, [{ projectId: 'run', serviceId: 'wsl:3000' }]);
    assert.deepEqual(result.conflicts.map((c) => [c.port, c.projectIds]), [[3000, ['run', 'clash']]]);
  });
});

describe('starred service registered from scratch (I-007)', () => {
  it('shows one live favourite card, not a live card plus an Offline one', () => {
    const svc = service('wsl', 5173, { favouriteKey: 'dir:wsl:/home/me/site#node' });
    const project: Project = { id: 'p1', name: 'Site', env: 'wsl', folder: '/home/me/site', port: 5173, url: 'http://localhost:5173' };
    const state = {
      scan: {
        scannedAt: '', durationMs: 0, host: { env: 'wsl' as Env }, sources: [], services: [svc], projects: [],
        matches: [{ projectId: 'p1', serviceId: svc.id }], conflicts: [],
      },
      config: { version: 2 as const, projects: [project], hidden: [], overrides: [], favourites: [{ key: svc.favouriteKey, name: 'Site', url: svc.url }] },
      runs: [],
    };
    const s = buildSections(state, '');
    const all = [...s.favourites, ...s.projects, ...s.pages, ...s.other, ...s.hidden];
    assert.equal(all.length, 1);
    assert.equal(s.favourites.length, 1);
    assert.equal(s.favourites[0].type, 'project');
    assert.equal(s.favourites[0].status, 'live');
  });
});
