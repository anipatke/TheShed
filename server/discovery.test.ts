import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { after, describe, it } from 'node:test';
import { parsePosixOutput, parseSsAddress } from './discovery/posix.ts';
import { parseNetstatOutput, parsePowerShellOutput, parseTasklist } from './discovery/windows.ts';
import { looksLikeProjectDir, projectDirFromCommandLine, toLocalPath } from './identify.ts';
import { classify, extractTitle, isLoopbackHost, probe } from './probe.ts';
import { parseManual, parseOverride, safeFolder, safeUrl, sanitizeConfig } from './config.ts';

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
