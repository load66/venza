const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function auth(seed={},response={access_token:'fresh-access',refresh_token:'fresh-refresh',expires_in:3600},ok=true){
  const saved=new Map(Object.entries(seed)),calls=[];const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const c={localStorage:storage,sessionStorage:{getItem:()=>null,removeItem:()=>{}},AbortController,setTimeout:()=>1,clearTimeout:()=>{},navigator:{},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok,status:ok?200:503,json:async()=>response};}};
  c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('js/cloud-auth.js','utf8'),c);return {api:c.VenzaAuth,saved,calls};
}
test('sign-in persists across a fresh page context without retaining the password',async()=>{
  const a=auth();await a.api.signIn('synthetic@example.com','not-stored-password');const raw=a.saved.get('venza-cloud-auth');assert(!raw.includes('not-stored-password'));
  const b=auth(Object.fromEntries(a.saved));assert(b.api.connected());assert.equal(await b.api.token(),'fresh-access');assert.equal(b.calls.length,0);
});
test('expired access token renews via the saved refresh session and persists the replacement',async()=>{
  const a=auth({'venza-cloud-auth':JSON.stringify({access_token:'expired',refresh_token:'existing-refresh',expires_at:1})});
  assert.equal(await a.api.token(),'fresh-access');assert(a.calls[0].url.endsWith('grant_type=refresh_token'));assert.equal(a.calls[0].body.refresh_token,'existing-refresh');assert.equal(JSON.parse(a.saved.get('venza-cloud-auth')).refresh_token,'fresh-refresh');
});
test('temporary auth outage does not erase persistent sign-in',async()=>{
  const raw=JSON.stringify({access_token:'expired',refresh_token:'existing-refresh',expires_at:1}),a=auth({'venza-cloud-auth':raw},{},false);
  await assert.rejects(a.api.token());assert.equal(a.saved.get('venza-cloud-auth'),raw);
});
