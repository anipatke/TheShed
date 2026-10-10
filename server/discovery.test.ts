import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import type { Env } from '../shared/types.ts';
import type { Listener } from './discovery/listener.ts';
import { parsePosixOutput, parseSsAddress } from './discovery/posix.ts';
import { run } from './discovery/run.ts';
import { discoverWindows, parseNetstatOutput, parsePowerShellOutput, parseTasklist } from './discovery/windows.ts';
import { identify, looksLikeProjectDir, projectDirFromCommandLine, toLocalPath } from './identify.ts';
import { classify, extractTitle, isLoopbackHost, probe } from './probe.ts';
import { collectSources, dropRelayDuplicates, probeListener } from './scan.ts';
import { ConfigFullError, ConfigStore, MAX_ITEMS, parseManual, parseOverride, safeFolder, safeUrl, sanitizeConfig } from './config.ts';

const LOCAL_ENV: Env = process.platform === 'win32' ? 'windows' : 'linux';

/** A scratch folder inside the repo: OS temp dirs (e.g. Windows AppData) are not project folders. */
function scratchDir(): string {
  const dir = mkdtempSync(path.join(import.meta.dirname, '..', '.test-scratch-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

describe('ss parsing', () => {
  it('parses address forms', () => {
    assert.deepEqual(parseSsAddress('127.0.0.1:5173'), { address: '127.0.0.1', port: 5173 });
    assert.deepEqual(parseSsAddress('[::]:80'), { address: '::', port: 80 });
    assert.deepEqual(parseSsAddress('127.0.0.53%lo:53'), { address: '127.0.0.53', port: 53 });
    assert.deepEqual(parseSsAddress('*:22'), { address: '0.0.0.0', port: 22 });
    assert.equal(parseSsAddress('garbage'), undefined);
  });

  it('joins listeners with /proc details and merges dual-stack sockets', () => {
    const out = [
      '@@DISTRO\tUbuntu',
      'LISTEN 0 511 127.0.0.1:5173 0.0.0.0:* users:(("node",pid=88065,fd=25))',
      'LISTEN 0 511 [::1]:5173 [::]:* users:(("node",pid=88065,fd=26))',
      'LISTEN 0 4096 127.0.0.1:11434 0.0.0.0:*',
      'LISTEN 0 4096 127.0.0.53%lo:53 0.0.0.0:*',
      '@@PROC',
      '88065\t/home/user/code/galaxy\tnode /home/user/code/galaxy/node_modules/.bin/vite ',
    ].join('\n');
    const { listeners, distro } = parsePosixOutput(out, 'wsl');
    assert.equal(distro, 'Ubuntu');
    assert.equal(listeners.length, 2, 'DNS stub on :53 is dropped');
    assert.deepEqual(listeners[0].addresses, ['127.0.0.1', '::1']);
    assert.equal(listeners[0].cwd, '/home/user/code/galaxy');
    assert.equal(listeners[0].processName, 'node');
    assert.equal(listeners[1].pid, undefined, 'other-user sockets have no pid');
  });
});

describe('Windows parsing', () => {
  it('parses PowerShell JSON, tolerating null command lines', () => {
    const json = JSON.stringify({
      listeners: [
        { LocalAddress: '127.0.0.1', LocalPort: 1234, OwningProcess: 24396 },
        { LocalAddress: '::', LocalPort: 135, OwningProcess: 1300 },
        { LocalAddress: '0.0.0.0', LocalPort: 135, OwningProcess: 1300 },
      ],
      processes: [
        { ProcessId: 24396, Name: 'LM Studio.exe', ExecutablePath: 'C:\\x\\LM Studio.exe', CommandLine: '"C:\\x\\LM Studio.exe"' },
        { ProcessId: 1300, Name: 'svchost.exe', ExecutablePath: null, CommandLine: null },
      ],
    });
    const rows = parsePowerShellOutput('\uFEFF' + json);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].addresses.sort(), ['0.0.0.0', '::']);
    assert.equal(rows[0].commandLine, undefined);
    assert.equal(rows[1].processName, 'LM Studio.exe');
  });

  it('parses netstat + tasklist fallback', () => {
    const names = parseTasklist('"adb.exe","14132","Console","1","8,000 K"\r\n');
    const rows = parseNetstatOutput(
      '  TCP    127.0.0.1:5037   0.0.0.0:0   LISTENING   14132\r\n  TCP    [::]:445   [::]:0   LISTENING   4\r\n  TCP    127.0.0.1:1 127.0.0.1:2 ESTABLISHED 9\r\n',
      names,
    );
    assert.deepEqual(
      rows.map((r) => [r.port, r.processName, r.addresses[0]]),
      [
        [445, undefined, '::'],
        [5037, 'adb.exe', '127.0.0.1'],
      ],
    );
  });
});

describe('project inference', () => {
  it('finds the folder that owns node_modules', () => {
    assert.equal(projectDirFromCommandLine('node /home/u/code/app/node_modules/.bin/vite --port 5199'), '/home/u/code/app');
    assert.equal(
      projectDirFromCommandLine('"C:\\Program Files\\nodejs\\node.exe" C:\\dev\\site\\node_modules\\next\\dist\\bin\\next dev'),
      'C:\\dev\\site',
    );
  });

  it('uses a script argument, but not global installs', () => {
    assert.equal(projectDirFromCommandLine('python3 /home/u/code/api/server.py'), '/home/u/code/api');
    assert.equal(projectDirFromCommandLine('node /home/u/.nvm/versions/node/v22/lib/node_modules/x/cli.js'), undefined);
    assert.equal(projectDirFromCommandLine('"C:\\Users\\Ann\\AppData\\Roaming\\npm\\node_modules\\x\\cli.js"'), undefined);
    assert.equal(projectDirFromCommandLine('"C:\\Program Files\\Steam\\steam.exe" -silent'), undefined);
  });

  it('rejects system and home directories', () => {
    for (const p of ['/', '/usr/bin', '/home/u', 'C:\\Windows\\System32', 'C:\\Users\\Ann']) assert.equal(looksLikeProjectDir(p), false, p);
    for (const p of ['/home/u/code/app', 'C:\\dev\\site', '/mnt/c/dev/site']) assert.equal(looksLikeProjectDir(p), true, p);
  });

  it('translates paths across the WSL boundary', () => {
    assert.equal(toLocalPath('C:\\dev\\site', 'windows', { host: 'wsl' }), '/mnt/c/dev/site');
    assert.equal(toLocalPath('/home/u/app', 'wsl', { host: 'windows', distro: 'Ubuntu' }), '\\\\wsl.localhost\\Ubuntu\\home\\u\\app');
    assert.equal(toLocalPath('/home/u/app', 'wsl', { host: 'windows' }), undefined);
  });
});

describe('probe helpers', () => {
  it('extracts titles as plain text', () => {
    assert.equal(extractTitle('<title>  Galaxy &amp; Atlas\n</title>'), 'Galaxy & Atlas');
    assert.equal(extractTitle('<title><script>x</script>Hi\u202e</title>'), 'xHi');
    assert.equal(extractTitle('<p>none</p>'), undefined);
    assert.equal(extractTitle(`<title>${'a'.repeat(500)}</title>`)?.length, 120);
  });

  it('classifies responses', () => {
    assert.equal(classify(200, 'text/html', ''), 'web');
    assert.equal(classify(302, '', ''), 'web');
    assert.equal(classify(401, 'text/html', ''), 'web');
    assert.equal(classify(404, 'text/html', ''), 'http');
    assert.equal(classify(200, 'application/json', '{}'), 'http');
  });

  it('only treats loopback hosts as probe-able', () => {
    for (const h of ['localhost', '127.0.0.1', '127.1.2.3', '[::1]', 'app.localhost']) assert.ok(isLoopbackHost(h), h);
    for (const h of ['example.com', '192.168.1.5', 'localhost.evil.com']) assert.ok(!isLoopbackHost(h), h);
  });
});

describe('probe against real sockets', () => {
  const servers: (http.Server | net.Server)[] = [];
  after(() => servers.forEach((s) => s.close()));

  const listen = (s: http.Server | net.Server) =>
    new Promise<number>((resolve) => {
      servers.push(s);
      s.listen(0, '127.0.0.1', () => resolve((s.address() as net.AddressInfo).port));
    });

  it('sees a web page', async () => {
    const port = await listen(http.createServer((_q, r) => r.writeHead(200, { 'content-type': 'text/html' }).end('<title>Hello</title>')));
    const p = await probe({ host: '127.0.0.1', port });
    assert.equal(p.kind, 'web');
    assert.equal(p.title, 'Hello');
  });

  it('sees a silent TCP server', async () => {
    const port = await listen(net.createServer(() => {}));
    assert.equal((await probe({ host: '127.0.0.1', port, timeoutMs: 300 })).kind, 'tcp');
  });

  it('sees a non-HTTP banner', async () => {
    const port = await listen(net.createServer((sock) => sock.end('SSH-2.0-OpenSSH\r\n')));
    assert.equal((await probe({ host: '127.0.0.1', port })).kind, 'tcp');
  });

  it('sees a closed port', async () => {
    const s = net.createServer();
    const port = await listen(s);
    await new Promise((r) => s.close(r));
    // Usually 'closed'; under WSL mirrored networking the relay may accept-then-reset ('tcp').
    // Discovered listeners never hit this path, and manual projects map 'tcp' to down.
    assert.ok(['closed', 'tcp'].includes((await probe({ host: '127.0.0.1', port })).kind));
  });
});

describe('config validation', () => {
  it('drops invalid entries instead of failing', () => {
    const c = sanitizeConfig({
      manual: [{ name: 'ok', url: 'http://localhost:3000' }, { name: 'bad', url: 'javascript:alert(1)' }, 'junk'],
      favourites: [{ key: 'k', name: 'n', url: 'file:///etc/passwd' }],
      hidden: [{ kind: 'port', env: 'wsl', port: 99999 }, { kind: 'process', env: 'windows', process: 'steam.exe' }],
    });
    assert.equal(c.manual.length, 1);
    assert.equal(c.favourites.length, 0);
    assert.deepEqual(c.hidden.map((h) => h.kind), ['process']);
    assert.deepEqual(sanitizeConfig(null), { version: 1, manual: [], favourites: [], hidden: [], overrides: [] });
  });

  it('allows only http(s) URLs', () => {
    assert.equal(safeUrl('https://localhost:5173/x'), 'https://localhost:5173/x');
    for (const u of ['javascript:alert(1)', 'data:text/html,x', 'file:///c:/', 'nope']) assert.equal(safeUrl(u), undefined);
  });
});

describe('overrides and folders', () => {
  it('accepts absolute POSIX, Windows and UNC folders only', () => {
    for (const f of ['/home/me/app', 'C:\\dev\\app', 'c:/dev/app', '\\\\wsl.localhost\\Ubuntu\\home']) assert.equal(safeFolder(f), f, f);
    for (const f of ['app', '../etc', '~/code', 'C:', '/home/me\nrm -rf', 'x'.repeat(2000)]) assert.equal(safeFolder(f), undefined, f);
  });

  it('parses overrides; an invalid supplied field rejects the whole thing', () => {
    assert.deepEqual(parseOverride({ key: 'port:wsl:5173', name: ' My App ' }), { key: 'port:wsl:5173', name: 'My App' });
    assert.deepEqual(parseOverride({ key: 'k', name: '', folder: '' }), { key: 'k' }, 'empty means clear');
    assert.equal(parseOverride({ key: 'k', folder: 'relative/path' }), undefined);
    assert.equal(parseOverride({ key: 'k', name: 'x'.repeat(101) }), undefined);
    assert.equal(parseOverride({ name: 'no key' }), undefined);
  });

  it('keeps an optional folder on manual projects', () => {
    assert.equal(parseManual({ name: 'a', url: 'http://localhost:1', folder: 'C:\\dev\\a' }, 'id')?.folder, 'C:\\dev\\a');
    assert.equal(parseManual({ name: 'a', url: 'http://localhost:1', folder: 'nope' }, 'id')?.folder, undefined);
  });

  it('drops empty overrides from stored config', () => {
    const c = sanitizeConfig({ overrides: [{ key: 'a', name: 'A' }, { key: 'b' }, { key: 'c', folder: 'bad' }] });
    assert.deepEqual(c.overrides, [{ key: 'a', name: 'A' }]);
  });
});

describe('identify on real folders', () => {
  const listener = (l: Partial<Listener>): Listener => ({ env: LOCAL_ENV, port: 5000, addresses: ['127.0.0.1'], ...l });
  const ctx = { host: LOCAL_ENV };

  it('ignores a folder that does not exist (packaged-app virtual paths)', async () => {
    const missing = path.join(scratchDir(), 'snapshot', 'bundle');
    assert.deepEqual(await identify(listener({ cwd: missing }), ctx), {});
    assert.deepEqual(await identify(listener({ commandLine: `node ${path.join(missing, 'app.js')}` }), ctx), {});
  });

  it('still identifies an existing project folder', async () => {
    const dir = scratchDir();
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'real-app' }));
    mkdirSync(path.join(dir, 'src'));
    const id = await identify(listener({ cwd: path.join(dir, 'src') }), ctx);
    assert.deepEqual(id, { projectDir: dir, projectDirSource: 'cwd', packageName: 'real-app' });
  });
});

describe('probe body cap', () => {
  const servers: http.Server[] = [];
  after(() => servers.forEach((s) => s.close()));

  /** Serve HTML in two writes, so the title arrives in a separate chunk after `head`. */
  const serve = (head: string, tail: string) =>
    new Promise<number>((resolve) => {
      const s = http.createServer((_q, r) => {
        r.writeHead(200, { 'content-type': 'text/html' });
        r.write(head);
        setTimeout(() => r.end(tail), 30);
      });
      servers.push(s);
      s.listen(0, '127.0.0.1', () => resolve((s.address() as net.AddressInfo).port));
    });

  const LIMIT = 64 * 1024;
  const pad = (n: number) => 'x'.repeat(n);

  for (const offset of [LIMIT - 1, LIMIT, LIMIT + 1, 100_000]) {
    it(`ignores a title starting at byte ${offset}`, async () => {
      const port = await serve(pad(65530), pad(offset - 65530) + '<title>BEYOND-CAP</title>');
      const p = await probe({ host: '127.0.0.1', port });
      assert.equal(p.kind, 'web');
      assert.equal(p.title, undefined);
    });
  }

  it('reads a title that ends exactly at the cap', async () => {
    const title = '<title>INSIDE</title>';
    const port = await serve(pad(60000), pad(LIMIT - 60000 - title.length) + title + pad(1000));
    assert.equal((await probe({ host: '127.0.0.1', port })).title, 'INSIDE');
  });

  it('ignores a title past the cap inside one large chunk', async () => {
    const port = await serve(pad(LIMIT) + '<title>ONE-CHUNK</title>', '');
    assert.equal((await probe({ host: '127.0.0.1', port })).title, undefined);
  });

  it('settles on a truncated response instead of waiting for the timeout', async () => {
    const s = http.createServer((_q, r) => {
      r.writeHead(200, { 'content-type': 'text/html', 'content-length': '5000' });
      r.write('<html><head>');
      setTimeout(() => r.socket?.destroy(), 30);
    });
    servers.push(s);
    const port = await new Promise<number>((resolve) => s.listen(0, '127.0.0.1', () => resolve((s.address() as net.AddressInfo).port)));
    const p = await probe({ host: '127.0.0.1', port, timeoutMs: 2000 });
    assert.equal(p.kind, 'web');
    assert.ok((p.ms ?? Infinity) < 1000, `took ${p.ms} ms`);
  });
});

describe('TLS retry', () => {
  // Needs openssl to mint a throwaway self-signed certificate; skipped where it is missing.
  let tls: { key: string; cert: string } | undefined;
  try {
    const dir = mkdtempSync(path.join(import.meta.dirname, '..', '.test-scratch-'));
    try {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
        '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
      tls = { key: readFileSync(path.join(dir, 'k.pem'), 'utf8'), cert: readFileSync(path.join(dir, 'c.pem'), 'utf8') };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    tls = undefined;
  }
  const servers: https.Server[] = [];
  after(() => servers.forEach((s) => s.close()));
  const listen = (handler: http.RequestListener) =>
    new Promise<number>((resolve) => {
      const s = https.createServer(tls!, handler);
      servers.push(s);
      s.listen(0, '127.0.0.1', () => resolve((s.address() as net.AddressInfo).port));
    });
  const listener = (port: number): Listener => ({ env: LOCAL_ENV, port, addresses: ['127.0.0.1'] });

  it('retries a TLS dev server over HTTPS', { skip: !tls && 'openssl not available' }, async () => {
    const port = await listen((_q, r) => r.writeHead(200, { 'content-type': 'text/html' }).end('<title>Secure</title>'));
    const { probe: p, protocol } = await probeListener(listener(port), LOCAL_ENV, undefined);
    assert.equal(protocol, 'https:');
    assert.equal(p.kind, 'web');
    assert.equal(p.title, 'Secure');
  });

  it('keeps the plain result when the HTTPS retry is truncated', { skip: !tls && 'openssl not available' }, async () => {
    const port = await listen((_q, r) => r.socket?.destroy());
    const { probe: p, protocol } = await probeListener(listener(port), LOCAL_ENV, undefined);
    assert.equal(protocol, 'http:');
    assert.equal(p.kind, 'tcp');
  });
});

describe('source orchestration', () => {
  const l = (env: Env, port: number, processName?: string): Listener => ({ env, port, addresses: ['127.0.0.1'], processName });
  const ok = (env: Env, listeners: Listener[]) => ({ env, method: 'fake', discover: async () => ({ listeners, method: 'fake', notes: [] }) });
  const failing = (env: Env, message: string) => ({ env, method: 'fake', discover: async () => Promise.reject(new Error(message)) });

  it('reports a failed source and keeps the others', async () => {
    for (const message of ['powershell.exe timed out', 'wsl.exe not found', 'Unexpected end of JSON input']) {
      const r = await collectSources([failing('windows', message), ok('wsl', [l('wsl', 5173)])]);
      assert.deepEqual(r.listeners.map((x) => x.port), [5173]);
      assert.deepEqual(r.sources.map((s) => [s.env, s.ok, s.error]), [['windows', false, message], ['wsl', true, undefined]]);
    }
  });

  it('turns malformed tool output into no listeners, not an error', () => {
    assert.deepEqual(parsePosixOutput('garbage\n\0\nLISTEN nonsense', 'wsl').listeners, []);
    assert.throws(() => parsePowerShellOutput('{"listeners": [oops'));
    assert.deepEqual(parseNetstatOutput('Active Connections\n  TCP junk', new Map()), []);
  });

  it('falls back to netstat when PowerShell fails', async () => {
    const calls: string[] = [];
    const exec: typeof run = async (file) => {
      calls.push(path.basename(file));
      if (/powershell/i.test(file)) throw new Error('powershell.exe timed out');
      if (/tasklist/i.test(file)) return { stdout: '"node.exe","4242","Console","1","50,000 K"\n', stderr: '' };
      return { stdout: '  TCP    127.0.0.1:5300         0.0.0.0:0              LISTENING       4242\n', stderr: '' };
    };
    const out = await discoverWindows(exec);
    assert.equal(out.method, 'netstat.exe + tasklist.exe');
    assert.match(out.notes[0], /PowerShell discovery failed \(powershell.exe timed out\); fell back to netstat/);
    assert.deepEqual(out.listeners.map((x) => [x.port, x.pid, x.processName]), [[5300, 4242, 'node.exe']]);
    assert.ok(calls.some((c) => /netstat/i.test(c)));
  });

  it('turns a hung or missing tool into an error message', async () => {
    await assert.rejects(run(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { timeoutMs: 200 }), /timed out/);
    await assert.rejects(run('the-shed-no-such-tool', []), /the-shed-no-such-tool not found/);
  });

  it('shows a WSL port once when wslrelay re-listens on Windows', () => {
    const merged = dropRelayDuplicates([l('wsl', 5173, 'node'), l('windows', 5173, 'wslrelay.exe'), l('windows', 8080, 'wslrelay.exe'), l('windows', 3000, 'node.exe'), l('wsl', 3000, 'node')]);
    assert.deepEqual(merged.map((x) => `${x.env}:${x.port}:${x.processName}`), ['wsl:5173:node', 'windows:8080:wslrelay.exe', 'windows:3000:node.exe', 'wsl:3000:node']);
  });
});

describe('preference capacity', () => {
  const entries = {
    manual: (i: number) => ({ id: `m${i}`, name: `m${i}`, url: `http://localhost:${1000 + i}` }),
    favourites: (i: number) => ({ key: `port:wsl:${i}`, name: `f${i}`, url: `http://localhost:${1000 + i}` }),
    hidden: (i: number) => ({ id: `h${i}`, kind: 'port', env: 'wsl', port: 1000 + i }),
    overrides: (i: number) => ({ key: `port:wsl:${i}`, name: `o${i}` }),
  };
  const lists = Object.keys(entries) as (keyof typeof entries)[];

  const storeWith = (counts: Partial<Record<keyof typeof entries, number>>, extra: Record<string, unknown[]> = {}) => {
    const file = path.join(scratchDir(), 'config.json');
    const raw: Record<string, unknown[]> = {};
    for (const list of lists) raw[list] = [...Array.from({ length: counts[list] ?? 0 }, (_, i) => entries[list](i)), ...(extra[list] ?? [])];
    writeFileSync(file, JSON.stringify(raw));
    return { file, store: new ConfigStore(file) };
  };

  for (const list of lists) {
    it(`${list}: adds up to ${MAX_ITEMS}, rejects the next without losing anything`, () => {
      const { file, store } = storeWith({ [list]: MAX_ITEMS - 1 });
      const add = (i: number) => store.update((c) => ({ ...c, [list]: [...c[list], entries[list](i)] }));
      assert.equal(add(MAX_ITEMS - 1)[list].length, MAX_ITEMS);
      const before = readFileSync(file, 'utf8');
      assert.throws(() => add(MAX_ITEMS), ConfigFullError);
      assert.equal(store.get()[list].length, MAX_ITEMS);
      assert.equal(readFileSync(file, 'utf8'), before, 'file untouched by the rejected write');
      assert.equal(new ConfigStore(file).get()[list].length, MAX_ITEMS, 'survives restart');
    });

    it(`${list}: keeps ${MAX_ITEMS + 1} valid saved entries and still drops malformed ones`, () => {
      const { file, store } = storeWith({ [list]: MAX_ITEMS + 1 }, { [list]: ['junk', { bad: true }] });
      assert.equal(store.get()[list].length, MAX_ITEMS + 1);
      // Changes that don't grow the list still save.
      store.update((c) => ({ ...c, [list]: c[list].slice(1) }));
      assert.equal(new ConfigStore(file).get()[list].length, MAX_ITEMS);
    });
  }

  it('leaves the saved file and memory unchanged when the write fails', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, () => {
    const { file, store } = storeWith({ manual: 1 });
    const before = readFileSync(file, 'utf8');
    chmodSync(path.dirname(file), 0o500);
    try {
      assert.throws(() => store.update((c) => ({ ...c, manual: [...c.manual, entries.manual(1)] })));
    } finally {
      chmodSync(path.dirname(file), 0o700);
    }
    assert.equal(store.get().manual.length, 1);
    assert.equal(readFileSync(file, 'utf8'), before);
  });
});
