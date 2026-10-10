// T-011 real-machine scenarios. Run once per host side:
//   WSL:      node scenarios.mjs wsl     <shedRoot> <wslVite> <winVite>
//   Windows:  node.exe scenarios.mjs windows <shedRoot> <wslVite> <winVite>
// It starts its own Shed (port 4811 WSL / 4812 Windows), drives the HTTP API, and checks processes and ports
// with host tools. Evidence only: it changes no product code.
import { execFileSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const [side, shedRoot, wslVite, winVite] = process.argv.slice(2);
const win = side === 'windows';
const own = win ? winVite : wslVite;
const other = win ? wslVite : winVite;
const base = win ? 5620 : 5610;
const SHED_PORT = win ? 4812 : 4811;
const URL_ = `http://localhost:${SHED_PORT}`;
const cfgPath = path.join(os.tmpdir(), `t011-${side}-config.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const section = (t) => log(`\n=== ${t} ===`);

const VITE_CMD = 'npm run dev -- --port {port} --strictPort';
const project = (id, name, folder, port, command, env) => ({ id, name, env: env ?? (win ? 'windows' : 'wsl'), folder, port, ...(command && { launch: { command } }) });
const projects = [
  project('vite', 'Vite app', own, base + 1, VITE_CMD),
  project('held', 'Port held', own, base + 3, VITE_CMD),
  project('bad', 'Bad command', own, base + 4, `node -e "console.log('about to fail');console.error('more');process.exit(7)"`),
  project('hand', 'Hand-started', own, base + 2, VITE_CMD),
  project('cross', 'Other environment', other, base + 5, VITE_CMD, win ? 'wsl' : 'windows'),
];
writeFileSync(cfgPath, JSON.stringify({ version: 2, projects, favourites: [], hidden: [], overrides: [] }));

// ---- host tools -------------------------------------------------------------------------------------------
function processTable() {
  if (win) {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress'], { encoding: 'utf8', maxBuffer: 64e6 });
    return JSON.parse(out).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, name: p.Name, args: p.CommandLine ?? '' }));
  }
  const out = execFileSync('ps', ['-eo', 'pid=,ppid=,pgid=,comm=,args='], { encoding: 'utf8', maxBuffer: 64e6 });
  return out.split('\n').filter(Boolean).map((l) => {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(l);
    return m && { pid: +m[1], ppid: +m[2], pgid: +m[3], name: m[4], args: m[5] };
  }).filter(Boolean);
}
/** Leader plus everything below it, by parent links (and process group on Linux). */
function tree(leader) {
  const t = processTable();
  const ids = new Set([leader]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of t) if (!ids.has(p.pid) && (ids.has(p.ppid) || (!win && p.pgid === leader))) { ids.add(p.pid); grew = true; }
  }
  return t.filter((p) => ids.has(p.pid) && p.pid !== process.pid);
}
const show = (rows) => rows.map((p) => `${p.pid}:${p.name}`).join(' ') || '(none)';
const alive = (rows) => { const now = new Set(processTable().map((p) => p.pid)); return rows.filter((p) => now.has(p.pid)); };
/** Any node/esbuild/cmd still carrying this project's folder, regardless of parentage. */
const strays = () => processTable().filter((p) => /node|esbuild|cmd|npm/i.test(p.name) && p.args.includes(path.basename(own)) && p.pid !== process.pid);
const connects = (port, host) => new Promise((r) => { const s = net.connect({ port, host }); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); s.setTimeout(1500, () => { s.destroy(); r(false); }); });
const portOpen = async (port) => (await connects(port, '127.0.0.1')) || (await connects(port, '::1'));
function killRows(rows) {
  for (const p of rows.reverse()) { try { if (win) execFileSync('taskkill', ['/PID', String(p.pid), '/F'], { stdio: 'ignore' }); else process.kill(p.pid, 'SIGKILL'); } catch { /* gone */ } }
}

// ---- Shed lifecycle and API -------------------------------------------------------------------------------
let shed;
function startShed() {
  shed = spawn(process.execPath, ['server/index.ts'], { cwd: shedRoot, env: { ...process.env, SHED_PORT: String(SHED_PORT), SHED_CONFIG: cfgPath }, stdio: ['ignore', 'pipe', 'pipe'] });
  shed.stdout.on('data', (d) => log(`[shed] ${String(d).trimEnd()}`));
  shed.stderr.on('data', (d) => log(`[shed!] ${String(d).trimEnd()}`));
  shed.exited = new Promise((r) => shed.once('exit', (code, sig) => r({ code, sig })));
}
async function waitUp() { for (let i = 0; i < 60; i++) { try { if ((await fetch(`${URL_}/api/health`)).ok) return; } catch { /* not yet */ } await sleep(250); } throw new Error('Shed did not come up'); }
async function call(method, p) {
  const res = await fetch(URL_ + p, { method, headers: { 'X-Shed': '1', ...(method === 'POST' && { 'Content-Type': 'application/json' }) }, body: method === 'POST' ? '{}' : undefined });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}
const state = async (refresh = false) => (await call('GET', `/api/state${refresh ? '?refresh=1' : ''}`)).body;
const runOf = (st, id) => st.runs.find((r) => r.projectId === id);
async function until(fn, ms = 40000) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) return undefined; await sleep(400); } }
async function waitRun(id, wanted) { return until(async () => { const r = runOf(await state(), id); return r && wanted.includes(r.state) ? r : undefined; }); }

async function startVite() {
  const r = await call('POST', '/api/projects/vite/start');
  const run = await waitRun('vite', ['running', 'failed', 'exited']);
  return { r, run };
}
const matchOf = async (id) => { const st = await state(true); const m = st.scan.matches.find((x) => x.projectId === id); return m && st.scan.services.find((s) => s.id === m.serviceId); };

async function stopAndCheck(label, leader) {
  const before = tree(leader);
  log(`${label}: tree before stop: ${show(before)}`);
  const r = await call('POST', '/api/projects/vite/stop');
  const run = await waitRun('vite', ['stopped', 'failed', 'exited']);
  await sleep(1500);
  const left = alive(before);
  log(`${label}: stop HTTP ${r.status}; run state ${run?.state}; processes left from tree: ${show(left)}; same-folder strays: ${show(strays())}; port ${base + 1} open: ${await portOpen(base + 1)}`);
  return { left, run };
}

// ---- scenarios --------------------------------------------------------------------------------------------
section('Environment');
log(`side=${side} node=${process.version} platform=${process.platform} os.release=${os.release()} arch=${os.arch()}`);
if (win) log('Windows ver:', execFileSync('cmd.exe', ['/c', 'ver'], { encoding: 'utf8' }).trim());
else log('WSL:', execFileSync('sh', ['-c', 'cat /etc/os-release | grep PRETTY; uname -r; echo distro=$WSL_DISTRO_NAME'], { encoding: 'utf8' }).trim());
log('npm:', execFileSync(win ? 'cmd.exe' : 'npm', win ? ['/c', 'npm', '-v'] : ['-v'], { encoding: 'utf8' }).trim());
log(`own project folder: ${own}\nshed root: ${shedRoot}`);

startShed();
await waitUp();
let st = await state(true);
log('host (from Shed):', JSON.stringify(st.scan.host), ' sources:', st.scan.sources.map((s) => `${s.env}:${s.ok ? s.count : s.error}`).join(' '));

section('1. Launch: Vite on its preferred port');
let { r, run } = await startVite();
log(`start HTTP ${r.status}; run: ${JSON.stringify(run)}`);
let svc = await matchOf('vite');
log(`matched service: ${svc ? `${svc.env}:${svc.port} ${svc.processName} pid ${svc.pid}` : 'NONE'}; Managed (active run) = ${run?.state === 'running'}`);
const html = await fetch(`http://localhost:${base + 1}/`).then((x) => x.status).catch((e) => `error ${e.message}`);
log(`GET http://localhost:${base + 1}/ -> ${html}`);
const logText = (await call('GET', '/api/projects/vite/log')).body;
log(`output (first 300 chars): ${JSON.stringify(String(logText).slice(0, 300))}`);
log(`output contains ESC bytes: ${String(logText).includes('\x1b')}`);

section('2. Stop: no orphans, port free');
await stopAndCheck('stop', run.pid);

section('3. Restart then Stop');
({ r, run } = await startVite());
log(`start HTTP ${r.status}; state ${run?.state}; pid ${run?.pid}`);
const firstPid = run.pid;
const rr = await call('POST', '/api/projects/vite/restart');
run = await waitRun('vite', ['running', 'failed']);
log(`restart HTTP ${rr.status}; state ${run?.state}; pid ${firstPid} -> ${run?.pid}; old leader alive: ${alive([{ pid: firstPid }]).length > 0}`);
await stopAndCheck('restart+stop', run.pid);

section('4. Refusals');
const holder = net.createServer().listen(base + 3, '127.0.0.1');
await sleep(300);
r = await call('POST', '/api/projects/held/start');
log(`port held by another process (this harness, ${process.pid}), no scan since it bound -> HTTP ${r.status}: ${JSON.stringify(r.body)}`);
await state(true); // a fresh scan now knows the holder
r = await call('POST', '/api/projects/held/start');
log(`same, after a fresh scan -> HTTP ${r.status}: ${JSON.stringify(r.body)}`);
holder.close();
r = await call('POST', '/api/projects/bad/start');
run = await waitRun('bad', ['failed', 'exited']);
log(`bad command -> start HTTP ${r.status}; run: ${JSON.stringify(run)}`);
r = await call('POST', '/api/projects/cross/start');
log(`project in the other environment -> HTTP ${r.status}: ${JSON.stringify(r.body)}`);

section('5. A server started by hand is External and cannot be stopped');
const hand = win
  ? spawn('cmd.exe', ['/d', '/s', '/c', `"npm run dev -- --port ${base + 2} --strictPort"`], { cwd: own, windowsVerbatimArguments: true, stdio: 'ignore' })
  : spawn('sh', ['-c', `npm run dev -- --port ${base + 2} --strictPort`], { cwd: own, detached: true, stdio: 'ignore' });
const handUp = await until(() => portOpen(base + 2), 20000);
await sleep(500);
svc = await matchOf('hand');
st = await state();
log(`hand-started server up: ${handUp}; matched service: ${svc ? `${svc.env}:${svc.port} ${svc.processName} pid ${svc.pid}` : 'NONE'}; Shed run record for it: ${runOf(st, 'hand') ? 'YES' : 'none (External)'}`);
r = await call('POST', '/api/projects/hand/stop');
log(`API stop -> HTTP ${r.status}: ${JSON.stringify(r.body)}`);
await sleep(800);
log(`hand-started server still listening after refused stop: ${await portOpen(base + 2)}`);
const handTree = tree(hand.pid);
killRows(handTree);
await sleep(1000);
log(`cleaned up by harness; port ${base + 2} open: ${await portOpen(base + 2)}`);

section('6. Shutdown: Ctrl+C / SIGINT on the Shed stops what it started');
({ r, run } = await startVite());
const t6 = tree(run.pid);
log(`running pid ${run.pid}; tree: ${show(t6)}`);
if (win) {
  log('SKIPPED on Windows: a headless harness cannot deliver a real console Ctrl+C (SIGINT here would be TerminateProcess). See hard-kill below.');
} else {
  shed.kill('SIGINT');
  const ex = await Promise.race([shed.exited, sleep(15000).then(() => 'timeout')]);
  await sleep(1000);
  log(`Shed exit: ${JSON.stringify(ex)}; processes left from tree: ${show(alive(t6))}; strays: ${show(strays())}; port ${base + 1} open: ${await portOpen(base + 1)}`);
  startShed(); await waitUp();
}

section('7. Hard kill of the Shed, then restart');
if (!win) { ({ r, run } = await startVite()); } else if (!run || run.state !== 'running') { ({ r, run } = await startVite()); }
const t7 = tree(run.pid);
log(`running pid ${run.pid}; tree: ${show(t7)}`);
if (win) execFileSync('taskkill', ['/PID', String(shed.pid), '/F'], { stdio: 'ignore' }); else shed.kill('SIGKILL');
await shed.exited;
await sleep(2000);
log(`after hard kill of the Shed — survivors from tree: ${show(alive(t7))}; port ${base + 1} open: ${await portOpen(base + 1)}`);
startShed(); await waitUp();
st = await state(true);
svc = await matchOf('vite');
log(`after restarting the Shed — run record: ${runOf(st, 'vite') ? 'YES' : 'none'}; matched service (External): ${svc ? `${svc.env}:${svc.port} ${svc.processName} pid ${svc.pid}` : 'NONE'}`);
r = await call('POST', '/api/projects/vite/stop');
log(`API stop of the survivor -> HTTP ${r.status}: ${JSON.stringify(r.body)}; still listening: ${await portOpen(base + 1)}`);
killRows(alive(t7));
await sleep(1000);
log(`harness cleanup; port ${base + 1} open: ${await portOpen(base + 1)}; strays: ${show(strays())}`);

// final shutdown
if (win) execFileSync('taskkill', ['/PID', String(shed.pid), '/F'], { stdio: 'ignore' }); else shed.kill('SIGKILL');
log('\nDONE');
process.exit(0);
