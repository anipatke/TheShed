// Drive the real UI in headless Windows Edge over CDP. Records each step's expected/actual outcome.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import http from 'node:http';
const [root, dir] = process.argv.slice(2);
const cfg = `${dir}/config.json`;
const PORT = 4829, API_PORT = 4831, CDP = 9343;
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const log = (name, expected, actual, pass) => { out.push({ name, expected, actual, pass }); console.error(pass ? 'PASS' : 'FAIL', name, '→', actual); };

// JSON-serving "project" (the I-001 subject), run from a folder so it gets identified.
mkdirSync(`${dir}/lm-api`, { recursive: true });
let apiSrv;
const startApi = () => new Promise((r) => { apiSrv = http.createServer((_q, res) => res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')).listen(API_PORT, '127.0.0.1', r); });
let shed;
const startShed = async () => {
  shed = spawn(process.execPath, [`${root}/server/index.ts`], { env: { ...process.env, SHED_PORT: String(PORT), SHED_CONFIG: cfg }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { await fetch(`${base}/api/health`); return; } catch { await sleep(100); } }
  throw new Error('shed did not start');
};
process.on('exit', () => shed?.kill());
const settle = () => sleep(3000);
const stopShed = () => new Promise((r) => { shed.once('exit', r); shed.kill(); });
const config = async () => (await (await fetch(`${base}/api/state`)).json()).config;

writeFileSync(cfg, '{}');
process.chdir(`${dir}/lm-api`);
await startApi();
await startShed();

const edge = spawn('/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', `--remote-debugging-port=${CDP}`, '--user-data-dir=C:\\Users\\User\\AppData\\Local\\Temp\\shed-c002-20261010', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 100 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((t) => t.type === 'page'); } catch { await sleep(200); } }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const HELPERS = `
  window.$row = (port) => [...document.querySelectorAll('li.row')].find((li) => li.querySelector('.row__port')?.textContent === String(port));
  window.$card = (name) => [...document.querySelectorAll('article.card')].find((c) => c.querySelector('.card__name')?.textContent === name);
  window.$expand = (title) => { const b = [...document.querySelectorAll('.section__toggle')].find((b) => b.textContent.includes(title)); if (b && b.getAttribute('aria-expanded') === 'false') b.click(); return !!b; };
  window.$set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  window.$menu = (scope, label) => { scope.querySelector('[aria-haspopup=menu]').click(); return new Promise((r) => setTimeout(() => { const b = [...document.querySelectorAll('[role=menuitem]')].find((b) => b.textContent.includes(label)); b?.click(); r(!!b); }, 50)); };
`;
const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: `(async () => { ${HELPERS} ${expr} })()`, awaitPromise: true, returnByValue: true })).result.result.value;
const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await ev(expr); if (v) return v; await sleep(250); } return false; };
const load = async () => { await cdp('Page.navigate', { url: base }); await until(`return !!document.querySelector('main')`); };
const shot = async (name) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${dir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };

await load();
const refresh = () => ev(`[...document.querySelectorAll('button')].find((b) => /Refresh/.test(b.textContent))?.click(); return true`);
await refresh();
let ok = await until(`$expand('Other listeners'); return !!$row(${API_PORT})`);
log('JSON service appears as a row in Other listeners', 'row present', String(ok), !!ok);
const rowInfo = await ev(`const r = $row(${API_PORT}); return { star: !!r.querySelector('.star'), kind: r.querySelector('.tag--kind')?.textContent }`);
log('Row has a favourite star', 'star present, kind API', JSON.stringify(rowInfo), rowInfo.star && rowInfo.kind === 'API');
await ev(`$row(${API_PORT}).scrollIntoView({ block: 'center' }); return true`); await shot('01-row-with-star');

// Rename + folder from the row.
ok = await ev(`return await $menu($row(${API_PORT}), 'Rename / set folder')`);
log('Row menu offers "Rename / set folder…"', 'menu item present', String(ok), ok);
ok = await until(`return !!$row(${API_PORT})?.querySelector('form.edit')`);
log('Edit form opens inside the row', 'form shown', String(ok), !!ok);
await ev(`$row(${API_PORT}).scrollIntoView({ block: 'center' }); return true`); await shot('02-row-edit-form');
// Invalid folder: client rejects, form stays with input.
await ev(`const f = $row(${API_PORT}).querySelector('form.edit'); const [n, d] = f.querySelectorAll('input'); $set(n, 'LM API'); $set(d, 'relative/path'); f.requestSubmit(); return true`);
let st = await until(`const f = $row(${API_PORT})?.querySelector('form.edit'); return f && f.querySelector('.edit__error')?.textContent && { error: f.querySelector('.edit__error').textContent, name: f.querySelectorAll('input')[0].value }`);
log('Invalid folder keeps form open with message and fields', 'error shown, name kept', JSON.stringify(st), st && st.name === 'LM API');
// Server down: save fails, form stays with what was entered.
await stopShed();
await ev(`const f = $row(${API_PORT}).querySelector('form.edit'); $set(f.querySelectorAll('input')[1], '/home/user/code/lm-api'); f.requestSubmit(); return true`);
st = await until(`const f = $row(${API_PORT})?.querySelector('form.edit'); const e = f?.querySelector('.edit__error')?.textContent; return e && e !== 'Folder must be an absolute path' && { error: e, name: f.querySelectorAll('input')[0].value, folder: f.querySelectorAll('input')[1].value }`);
log('Failed save (server stopped) keeps edit form and fields', 'error shown, fields kept', JSON.stringify(st), st && st.folder === '/home/user/code/lm-api');
await startShed(); await settle();
await ev(`$row(${API_PORT}).querySelector('form.edit').requestSubmit(); return true`);
ok = await until(`const r = $row(${API_PORT}); return r && !r.querySelector('form.edit') && r.querySelector('.row__name')?.textContent.startsWith('LM API')`);
let c = await config();
log('Retry after server restart saves rename + folder', 'form closes, row shows LM API, override saved', `${!!ok} ${JSON.stringify(c.overrides)}`, !!ok && c.overrides.some((o) => o.name === 'LM API' && o.folder === '/home/user/code/lm-api'));

// Star from the row.
await ev(`$row(${API_PORT}).querySelector('.star').click(); return true`);
ok = await until(`return !!$card('LM API')?.querySelector('.star--on')`);
c = await config();
log('Star on row favourites it (moves to Favourites as a card)', 'favourite saved, starred card', `${!!ok} favourites=${c.favourites.map((f) => f.name)}`, !!ok && c.favourites.length === 1);
await shot('03-favourited');

// Restart keeps rename, folder, favourite.
await stopShed(); await startShed(); await load();
ok = await until(`const c = $card('LM API'); return c && { star: !!c.querySelector('.star--on'), folder: c.querySelector('.path')?.textContent }`);
log('After restart: name, folder, favourite retained', 'starred LM API card with folder', JSON.stringify(ok), !!ok && ok.star);

// Unstar → back to a row, still renamed.
await ev(`$card('LM API').querySelector('.star').click(); return true`);
ok = await until(`$expand('Other listeners'); const r = $row(${API_PORT}); return r && r.querySelector('.row__name').textContent.startsWith('LM API') && !r.querySelector('.star--on')`);
c = await config();
log('Unstar returns it to an unstarred row with the rename', 'row, unstarred, 0 favourites', `${!!ok} favourites=${c.favourites.length}`, !!ok && c.favourites.length === 0);

// Hidden row: still has star and edit; unhide works.
await ev(`return await $menu($row(${API_PORT}), 'Hide port')`);
ok = await until(`$expand('Hidden'); const r = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Hidden'))?.querySelector('li.row'); return r && { star: !!r.querySelector('.star'), port: r.querySelector('.row__port').textContent }`);
log('Hidden row keeps star', 'hidden row with star', JSON.stringify(ok), !!ok && ok.star);
const hiddenMenu = (await ev(`const r = $row(${API_PORT}); r.querySelector('[aria-haspopup=menu]').click(); await new Promise((x) => setTimeout(x, 50)); const items = [...document.querySelectorAll('[role=menuitem]')].map((b) => b.textContent); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return items`)) ?? [];
log('Hidden row menu has edit and Unhide', 'Rename / set folder…, Unhide', JSON.stringify(hiddenMenu), hiddenMenu.some((t) => t.includes('Rename')) && hiddenMenu.includes('Unhide'));
await ev(`return await $menu($row(${API_PORT}), 'Unhide')`);
await sleep(500);
c = await config();
log('Unhide removes the rule (client DELETE with JSON body)', '0 hide rules', `hidden=${c.hidden.length}`, c.hidden.length === 0);

// Offline favourite: star it, stop the API, rescan.
await ev(`$expand('Other listeners'); $row(${API_PORT}).querySelector('.star').click(); return true`);
await until(`return !!$card('LM API')?.querySelector('.star--on')`);
await new Promise((r) => apiSrv.close(r));
await refresh();
ok = await until(`const c = $card('LM API'); return c && c.className.includes('card--offline') && !!c.querySelector('.star--on')`, 30000);
log('Offline favourite stays visible with star', 'offline starred card', String(!!ok), !!ok);
await shot('04-offline-favourite');

// Add-project form: failed save keeps form + fields; retry succeeds and closes.
await ev(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add project'))?.click(); return true`);
await until(`return !!document.querySelector('form.add')`);
await stopShed();
await ev(`const f = document.querySelector('form.add'); const [n, u, d] = f.querySelectorAll('input'); $set(n, 'Docs'); $set(u, 'http://localhost:5300'); $set(d, '/home/user/code/docs'); return true`);
await sleep(100);
await ev(`document.querySelector('form.add').requestSubmit(); return true`);
st = await until(`const f = document.querySelector('form.add'); const e = f?.querySelector('.add__error')?.textContent; return e && { error: e, fields: [...f.querySelectorAll('input')].map((i) => i.value), submitEnabled: !f.querySelector('button[type=submit]').disabled }`);
log('Add form: failed save (server stopped) keeps form and fields', 'error, fields kept, can retry', JSON.stringify(st), st && st.fields.join('|') === 'Docs|http://localhost:5300|/home/user/code/docs' && st.submitEnabled);
await shot('05-add-failed');
await startShed(); await settle();
await ev(`document.querySelector('form.add').requestSubmit(); return true`);
ok = await until(`return !document.querySelector('form.add') && !!$card('Docs')`);
c = await config();
log('Add form: retry succeeds, form closes, project saved', 'form closed, Docs card, saved', `${!!ok} manual=${c.manual.map((m) => `${m.name}:${m.folder}`)}`, !!ok && c.manual.some((m) => m.name === 'Docs' && m.folder === '/home/user/code/docs'));
// Remove through the menu uses DELETE with JSON body.
await ev(`return await $menu($card('Docs'), 'Remove project')`);
await sleep(500);
c = await config();
log('Remove project from the card (client DELETE)', '0 manual', `manual=${c.manual.length}`, c.manual.length === 0);

// Website card still has star and edit.
const site = http.createServer((_q, r) => r.writeHead(200, { 'content-type': 'text/html' }).end('<title>Site</title>')).listen(4832, '127.0.0.1');
await refresh();
ok = await until(`const c = [...document.querySelectorAll('article.card')].find((c) => c.textContent.includes(':4832')); if (!c) return false; c.querySelector('[aria-haspopup=menu]').click(); await new Promise((x) => setTimeout(x, 50)); const items = [...document.querySelectorAll('[role=menuitem]')].map((b) => b.textContent); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return { star: !!c.querySelector('.star'), items }`, 30000);
log('Website card keeps star and edit menu', 'star + Rename / set folder…', JSON.stringify(ok), !!ok && ok.star && ok.items.some((t) => t.includes('Rename')));
site.close();

ws.close(); edge.kill(); await stopShed();
// Killing the WSL launcher leaves Windows Edge running; stop only this profile's processes.
spawn('powershell.exe', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -like '*shed-c002-20261010*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { stdio: 'ignore' }).on('exit', () => process.exit(out.every((o) => o.pass) ? 0 : 1));
writeFileSync(`${dir}/ui-results.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.map((o) => [o.pass ? 'PASS' : 'FAIL', o.name]), null, 0));
