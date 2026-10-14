const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
function phone(server,seed={},connected=true){
  class Storage{constructor(){this.data=new Map(Object.entries(seed));}get length(){return this.data.size;}key(i){return [...this.data.keys()][i];}getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}clear(){this.data.clear();}}
  const localStorage=new Storage(),elements=new Map();let offline=false;
  const context={Storage,localStorage,crypto:webcrypto,TextEncoder,AbortController,console,setTimeout:()=>1,clearTimeout:()=>{},addEventListener:()=>{},confirm:()=>true,document:{addEventListener:()=>{},getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);}},VenzaAuth:{connected:()=>connected,token:async()=>'synthetic-token'},location:{reload:()=>{}},fetch:async(url,options)=>{
    if(offline)throw Error('offline');
    if(options.method==='GET')return {ok:true,json:async()=>server.state||{exists:false,revision:null}};
    const p=JSON.parse(options.body),old=server.state;
    if(p.baseRevision!==(old?.revision??null))return {ok:false,status:409,json:async()=>({detail:'conflict'})};
    const revision='"'+String((server.count=(server.count||0)+1)).padStart(32,'0')+'"';
    server.state={exists:true,verified:true,revision,sha256:p.sha256,snapshot:p.snapshot,savedAt:new Date().toISOString()};
    return {ok:true,json:async()=>server.state};
  }};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('js/cloud.js','utf8'),context);
  return {context,storage:localStorage,cloud:context.VenzaCloud,elements,offline:v=>offline=v};
}
const seed={'vz_log':'[{"id":1,"type":"oil"}]','vz_mi':'70000','trading-journal-auth':'secret'};
test('first phone auto uploads supported records and new phone restores before app defaults',async()=>{
  const server={},a=phone(server,seed);await a.cloud.prepare();await a.cloud.flush();assert.equal(server.state.verified,true);
  assert.equal(JSON.parse(server.state.snapshot).storageSnapshot['trading-journal-auth'],undefined);
  const b=phone(server);await b.cloud.prepare();assert.equal(b.storage.getItem('vz_mi'),'70000');
  assert.equal(JSON.parse(b.storage.getItem('vz_cloud_meta')).dirty,false);
});
test('offline edits persist pending state and retry on reconnect',async()=>{
  const server={},a=phone(server,seed);await a.cloud.prepare();await a.cloud.flush();a.cloud.start();
  a.offline(true);a.storage.setItem('vz_mi','71000');await a.cloud.flush();assert.equal(JSON.parse(a.storage.getItem('vz_cloud_meta')).dirty,true);
  assert.equal(JSON.parse(server.state.snapshot).storageSnapshot.vz_mi,'70000');
  a.offline(false);await a.cloud.flush();assert.equal(JSON.parse(server.state.snapshot).storageSnapshot.vz_mi,'71000');
});
test('stale phone cannot silently overwrite newer device changes',async()=>{
  const server={},a=phone(server,seed);await a.cloud.prepare();await a.cloud.flush();a.cloud.start();
  const b=phone(server);await b.cloud.prepare();b.cloud.start();
  a.storage.setItem('vz_mi','71000');await a.cloud.flush();
  b.storage.setItem('vz_mi','72000');await b.cloud.flush();
  assert.equal(JSON.parse(server.state.snapshot).storageSnapshot.vz_mi,'71000');assert.equal(b.storage.getItem('vz_mi'),'72000');assert.equal(b.elements.get('cloudConflict').hidden,false);
});
test('unconnected phone and edited fresh phone do not discard local entries',async()=>{
  const server={},a=phone(server,seed);await a.cloud.prepare();await a.cloud.flush();
  const b=phone(server,{},true);b.storage.setItem('vz_log','[]');b.cloud.start();b.storage.setItem('vz_mi','72000');
  await b.cloud.prepare();assert.equal(b.storage.getItem('vz_mi'),'72000');assert.equal(b.elements.get('cloudConflict').hidden,false);
  const c=phone(server,seed,false);await c.cloud.prepare();c.storage.setItem('vz_mi','73000');await c.cloud.flush();assert.equal(JSON.parse(server.state.snapshot).storageSnapshot.vz_mi,'70000');
});
