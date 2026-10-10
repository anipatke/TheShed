// Run the real server on a scratch config and exercise the repaired API paths.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const [root, dir] = process.argv.slice(2);
const cfg = `${dir}/config.json`;
const PORT = 4849;
const base = `http://localhost:${PORT}`;
let srv;
const start = async () => {
  srv = spawn(process.execPath, [`${root}/server/index.ts`], { env: { ...process.env, SHED_PORT: String(PORT), SHED_CONFIG: cfg }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`${base}/api/health`); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('server did not start');
};
const stop = () => new Promise(r => { srv.once('exit', r); srv.kill(); });
const req = async (method, path, { body, type = 'application/json', origin } = {}) => {
  const headers = {};
  if (type) headers['Content-Type'] = type;
  if (origin) headers.Origin = origin;
  const r = await fetch(base + path, { method, headers, body });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
};
const out = [];
const log = (name, expected, actual, pass) => out.push({ name, expected, actual, pass });

writeFileSync(cfg, JSON.stringify({ manual: [], hidden: [] }));
await start();
let r = await req('POST', '/api/hidden', { body: JSON.stringify({ kind: 'port', env: 'wsl', port: 9999 }) });
const hid = r.j.config.hidden[0].id;
r = await req('POST', '/api/manual', { body: JSON.stringify({ name: 'doc', url: 'http://localhost:5300' }) });
const mid = r.j.config.manual[0].id;
for (const [label, type] of [['absent', null], ['text/plain', 'text/plain'], ['form', 'application/x-www-form-urlencoded']]) {
  for (const [kind, path, count] of [['hidden', `/api/hidden/${hid}`, (j) => j], ['manual', `/api/manual/${mid}`, null]]) {
    const x = await req('DELETE', path, { type, body: type ? 'x' : undefined });
    const st = (await req('GET', '/api/state')).j.config;
    const kept = kind === 'hidden' ? st.hidden.some(h => h.id === hid) : st.manual.some(m => m.id === mid);
    log(`DELETE ${kind} with ${label} content type`, '415, entry kept', `${x.status}, kept=${kept}`, x.status === 415 && kept);
  }
}
let x = await req('DELETE', `/api/hidden/${hid}`, { body: '{}', origin: 'http://evil.example' });
log('DELETE hidden JSON from remote Origin', '403, kept', `${x.status}, kept=${(await req('GET','/api/state')).j.config.hidden.length === 1}`, x.status === 403);
// Host rejection is checked with curl: fetch() cannot override the Host header.
x = await req('DELETE', `/api/hidden/${hid}`, { body: '{}', origin: base });
log('DELETE hidden with JSON {} (client format), localhost Origin', '200, removed', `${x.status}, hidden=${x.j.config?.hidden.length}`, x.status === 200 && x.j.config.hidden.length === 0);
x = await req('DELETE', `/api/manual/${mid}`, { body: '{}' });
log('DELETE manual with JSON {}', '200, removed', `${x.status}, manual=${x.j.config?.manual.length}`, x.status === 200 && x.j.config.manual.length === 0);
x = await req('PUT', '/api/overrides', { body: JSON.stringify({ key: 'port:wsl:1234', name: 'LM API', folder: '/home/user/code/lm' }) });
log('PUT override (rename+folder) still works', '200', `${x.status}`, x.status === 200);
await stop();

// Capacity: 500 saved manual entries, then one more via the API.
const many = Array.from({ length: 500 }, (_, i) => ({ id: `m${i}`, name: `m${i}`, url: 'http://example.com' }));
writeFileSync(cfg, JSON.stringify({ manual: many }));
await start();
x = await req('POST', '/api/manual', { body: JSON.stringify({ name: 'new-501', url: 'http://example.com' }) });
log('POST manual at 500 saved', '409 explicit error, 500 kept', `${x.status} "${x.j.error}", saved=${JSON.parse(readFileSync(cfg,'utf8')).manual.length}`, x.status === 409);
await stop();
writeFileSync(cfg, JSON.stringify({ manual: [...many, { id: 'm500', name: 'm500', url: 'http://example.com' }, { name: 'bad', url: 'javascript:x' }] }));
await start();
let st = (await req('GET', '/api/state')).j.config;
log('Load 501 valid + 1 malformed manual', '501 kept, malformed dropped', `${st.manual.length}`, st.manual.length === 501);
x = await req('DELETE', '/api/manual/m0', { body: '{}' });
log('DELETE at 501 (shrinks)', '200, 500', `${x.status}, ${x.j.config?.manual.length}`, x.status === 200 && x.j.config.manual.length === 500);
x = await req('POST', '/api/manual', { body: JSON.stringify({ name: 'back-to-501', url: 'http://example.com' }) });
log('POST at 500 after shrinking', '409', `${x.status}`, x.status === 409);
await stop();
await start();
st = (await req('GET', '/api/state')).j.config;
log('Restart keeps saved count', '500', `${st.manual.length}`, st.manual.length === 500);
await stop();

// Capacity just below: 499 saved, add one → kept durably.
writeFileSync(cfg, JSON.stringify({ manual: many.slice(0, 499) }));
await start();
x = await req('POST', '/api/manual', { body: JSON.stringify({ name: 'new-500', url: 'http://example.com' }) });
await stop(); await start();
st = (await req('GET', '/api/state')).j.config;
log('POST at 499, then restart', '200, new entry present', `${x.status}, ${st.manual.length}, present=${st.manual.some(m => m.name === 'new-500')}`, x.status === 200 && st.manual.some(m => m.name === 'new-500'));
await stop();
console.log(JSON.stringify(out, null, 1));
process.exit(out.every(o => o.pass) ? 0 : 1);
