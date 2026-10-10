import http from 'node:http';
import {spawn} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='/home/user/code/TheShed';
const dir='/tmp/shed-c001-sDMoh2';
const unc=p=>`\\\\wsl.localhost\\${process.env.WSL_DISTRO_NAME||'Ubuntu'}${p.replaceAll('/','\\')}`;
const boot=`${dir}/windows-final.mjs`;
writeFileSync(boot,`process.env.SHED_PORT=process.argv[2];process.env.SHED_CONFIG=process.argv[3];await import('file://wsl.localhost/${process.env.WSL_DISTRO_NAME||'Ubuntu'}/home/user/code/TheShed/server/index.ts');`);
const results=[];
const config=`${dir}/windows-final.json`;
writeFileSync(config,readFileSync(`${dir}/api.json`));
const p=spawn('/mnt/c/Program Files/nodejs/node.exe',[unc(boot),'49223',unc(config)],{stdio:['ignore','pipe','pipe']});
let log='';p.stdout.on('data',b=>log+=b);p.stderr.on('data',b=>log+=b);
const req=(method,path,body,headers={})=>new Promise((resolve,reject)=>{const q=http.request(`http://127.0.0.1:49223${path}`,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...headers}},r=>{let data='';r.on('data',b=>data+=b);r.on('end',()=>resolve({status:r.statusCode,body:JSON.parse(data)}));});q.on('error',reject);q.end(body===undefined?undefined:JSON.stringify(body));});
try{
for(let i=0;i<100;i++){try{if((await req('GET','/api/health')).status===200)break;}catch{}if(p.exitCode!==null)throw Error(log);await new Promise(r=>setTimeout(r,100));}
const r=await req('GET','/api/state?refresh=1');assert.equal(r.body.scan.host.env,'windows');assert.ok(r.body.scan.sources.every(s=>s.ok));results.push({id:'D Windows host retry without WSL port reservation',result:'pass',actual:{host:r.body.scan.host,sources:r.body.scan.sources,services:r.body.scan.services.map(({env,port,name,projectDir,probe})=>({env,port,name,projectDir,kind:probe.kind}))}});
for(const [name,headers] of [['missing Host',{Host:''}],['remote Origin',{Origin:'http://evil.example','Content-Type':'text/plain'}],['nonJSON DELETE',{'Content-Type':'text/plain'}]]){const r=await req(name==='missing Host'?'GET':'DELETE',name==='missing Host'?'/api/health':'/api/manual/missing',undefined,headers);results.push({id:name,status:r.status});}
const C=await import(root+'/server/config.ts');const cfg=C.emptyConfig();cfg.manual=Array.from({length:500},(_,i)=>({id:'seed-'+i,name:'seed-'+i,url:'http://example.com'}));writeFileSync(config,JSON.stringify(cfg));
// Seed a separate server after startup for the live 501st-entry API probe.
const wsl=spawn(process.execPath,[root+'/server/index.ts'],{env:{...process.env,SHED_PORT:'49224',SHED_CONFIG:config},stdio:['ignore','pipe','pipe']});
try{await new Promise(r=>setTimeout(r,700));const r=await fetch('http://127.0.0.1:49224/api/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'new-501',url:'http://example.com'})});const state=await r.json();results.push({id:'V3 supported API at capacity',status:r.status,count:state.config.manual.length,newEntryPresent:state.config.manual.some(x=>x.name==='new-501')});}finally{wsl.kill('SIGKILL');}
}catch(e){results.push({id:'Windows/final cells',result:'unverified',actual:e.message});}finally{p.kill('SIGKILL');console.log(JSON.stringify({at:new Date().toISOString(),results,log},null,2));}
