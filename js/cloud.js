/* R2 cloud recovery. Credentials stay in the existing private Railway backend. */
(function(){
  'use strict';
  const API='https://api-production-00f74.up.railway.app/api/venza/state';
  const META='vz_cloud_meta', RECOVERY='vz_cloud_recovery';
  const KEYS=new Set(['vz_log','vz_mi','vz_inventory','vz_master_parts','vz_mi_state_v1','vz_mi_history_v1','vz_oil_avg_reset_at','vz_avg_service_type','vz_schedule_overrides','vz_service_part_requirements','vz_master_parts_inventory_only_v1','vz_verification_overrides','vz_basic_parts']);
  const supported=k=>KEYS.has(k)||/^vz_(?:photo_|part_photo_|migration_)[a-zA-Z0-9_-]{1,160}$/.test(k);
  const rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;
  const hadLocal=localStorage.getItem('vz_log')!==null;
  let meta=readMeta(),timer,busy=false,suspended=false,conflict=false,message='',failures=0,started=false,userChanged=false;
  function readMeta(){try{return JSON.parse(localStorage.getItem(META)||'null')||{revision:null,dirty:false};}catch{return {revision:null,dirty:true};}}
  function writeMeta(){rawSet.call(localStorage,META,JSON.stringify(meta));}
  function snapshot(){
    const storageSnapshot={};
    const keys=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(supported(k))keys.push(k);}
    for(const k of keys.sort())storageSnapshot[k]=localStorage.getItem(k);
    return JSON.stringify({format:'VenzaCloudState',version:1,storageSnapshot});
  }
  async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  function status(text){message=text;render();}
  function render(){
    const el=document.getElementById('cloudStatus');if(el)el.textContent=message||(!VenzaAuth.connected()?'Sign in once to enable automatic cloud saves.':meta.dirty?'Changes waiting for cloud save.':'Checking cloud connection…');
    const actions=document.getElementById('cloudConflict');if(actions)actions.hidden=!conflict;
    const form=document.getElementById('cloudSignIn');if(form)form.hidden=VenzaAuth.connected();
  }
  async function request(method='GET',body){
    let token=await VenzaAuth.token();
    for(let attempt=0;attempt<2;attempt++){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
      try{
        const r=await fetch(API,{method,credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});
        if(r.status===401&&attempt===0){token=await VenzaAuth.token(true);continue;}
        const data=await r.json();
        if(!r.ok){
          if(r.status===401||r.status===403)VenzaAuth.disconnect();
          const e=Error(data.detail||data.error||'Cloud storage unavailable.');e.status=r.status;throw e;
        }
        return data;
      }finally{clearTimeout(timeout);}
    }
  }
  function changed(){
    if(suspended)return;
    if(started)userChanged=true;
    meta.dirty=true;writeMeta();
    status(VenzaAuth.connected()?'Saving changes to cloud…':'Saved on this device. Sign in to enable cloud recovery.');
    schedule();
  }
  function schedule(delay=1000){clearTimeout(timer);if(VenzaAuth.connected()&&!conflict)timer=setTimeout(flush,delay);}
  Storage.prototype.setItem=function(key,value){const before=this.getItem(key);rawSet.call(this,key,value);if(this===localStorage&&supported(String(key))&&before!==String(value))changed();};
  Storage.prototype.removeItem=function(key){const before=this.getItem(key);rawRemove.call(this,key);if(this===localStorage&&supported(String(key))&&before!==null)changed();};
  const rawClear=Storage.prototype.clear;
  Storage.prototype.clear=function(){const had=this===localStorage&&this.getItem('vz_log')!==null;rawClear.call(this);if(had)changed();};
  async function restore(remote){
    if(!remote.verified||await hash(remote.snapshot)!==remote.sha256)throw Error('Cloud integrity check failed. Local records preserved.');
    const parsed=JSON.parse(remote.snapshot);
    if(parsed.format!=='VenzaCloudState'||parsed.version!==1||!parsed.storageSnapshot||typeof parsed.storageSnapshot.vz_log!=='string')throw Error('Invalid cloud format.');
    const next=parsed.storageSnapshot;
    if(Object.entries(next).some(([k,v])=>!supported(k)||typeof v!=='string'))throw Error('Unsupported cloud data.');
    const previous=JSON.parse(snapshot()).storageSnapshot;
    // One recoverable local state, replaced on each restore; never back up auth tokens.
    rawSet.call(localStorage,RECOVERY,JSON.stringify(previous));
    suspended=true;
    try{
      for(const k of Object.keys(previous))rawRemove.call(localStorage,k);
      for(const [k,v] of Object.entries(next))rawSet.call(localStorage,k,v);
      meta={revision:remote.revision,dirty:false,sha256:remote.sha256,savedAt:remote.savedAt};writeMeta();
    }catch(e){
      for(const k of Object.keys(next))rawRemove.call(localStorage,k);
      for(const [k,v] of Object.entries(previous))rawSet.call(localStorage,k,v);
      throw Error('Not enough device storage to restore. Existing records preserved.');
    }finally{suspended=false;}
    conflict=false;status('Cloud records loaded.');
  }
  async function reconcile(){
    if(!VenzaAuth.connected())return;
    status('Checking your saved cloud records…');
    const remote=await request();
    if(!remote.exists){
      if(meta.revision){conflict=true;status('Cloud copy is missing. Review before uploading this device.');return;}
      if(localStorage.getItem('vz_log')!==null){meta.dirty=true;writeMeta();schedule();}
      return;
    }
    const localHash=localStorage.getItem('vz_log')!==null?await hash(snapshot()):null;
    if(localHash===remote.sha256){meta={revision:remote.revision,dirty:false,sha256:remote.sha256,savedAt:remote.savedAt};writeMeta();status('Cloud saved · '+new Date(remote.savedAt).toLocaleString());return;}
    if((!hadLocal&&!userChanged)||(!meta.dirty&&meta.revision)){
      await restore(remote);return true;
    }
    if(meta.revision===remote.revision){schedule();return;}
    conflict=true;status('This device and cloud have different records. Choose which copy to use.');
  }
  async function flush(){
    if(busy||conflict||!meta.dirty||!VenzaAuth.connected()||localStorage.getItem('vz_log')===null)return;
    busy=true;clearTimeout(timer);
    try{
      const text=snapshot(),digest=await hash(text);
      const saved=await request('PUT',{snapshot:text,sha256:digest,baseRevision:meta.revision});
      if(!saved.verified||saved.sha256!==digest)throw Error('Cloud save was not verified.');
      meta.revision=saved.revision;meta.sha256=digest;meta.savedAt=saved.savedAt;
      meta.dirty=snapshot()!==text;writeMeta();failures=0;
      status(meta.dirty?'Saving newer changes…':'Cloud saved · '+new Date(saved.savedAt).toLocaleString());
    }catch(e){
      if(e.status===409){
        // A lost network acknowledgment can leave our exact state already saved.
        try{await reconcile();}catch{conflict=true;status('Cloud conflict. Local records preserved.');}
      }else{failures++;status('Cloud save pending. Records remain on this device; retrying when connected.');}
    }finally{busy=false;if(meta.dirty&&!conflict)schedule(Math.min(30000,1000*Math.pow(2,Math.min(failures,5))));}
  }
  async function signIn(event){
    event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;
    try{
      await VenzaAuth.signIn(form.elements.email.value.trim(),form.elements.password.value);
      form.elements.password.value='';
      const restored=await reconcile();if(restored)location.reload();else render();
    }catch(e){status(e.message);}finally{button.disabled=false;}
  }
  async function loadCloud(){
    if(!confirm('Load the cloud records on this device? Your current local copy will be kept for recovery.'))return;
    try{const remote=await request();if(!remote.exists)throw Error('No cloud copy exists yet.');await restore(remote);location.reload();}catch(e){status(e.message);}
  }
  async function useDevice(){
    if(!confirm('Replace cloud records with this device’s records? Other devices may contain newer changes.'))return;
    try{
      const remote=await request();
      // Preserve the previous cloud state locally before deliberate replacement.
      if(remote.exists)rawSet.call(localStorage,RECOVERY,remote.snapshot);
      meta.revision=remote.revision;meta.dirty=true;writeMeta();conflict=false;await flush();
    }catch(e){status(e.message);}
  }
  window.VenzaCloud={prepare:async()=>{
    try{await reconcile();}catch{status('Cloud unavailable. Local records preserved.');}
  },signIn,loadCloud,useDevice,flush,render,start:()=>{
    // Baseline/data migrations run through DOMContentLoaded and load. They are
    // not user edits and must not block automatic recovery on a new phone.
    if(document.readyState==='complete')started=true;
    else addEventListener('load',()=>{started=true;},{once:true});
    render();if(meta.dirty)schedule();
    addEventListener('online',()=>schedule(0));
    addEventListener('storage',e=>{if(e.key===META){meta=readMeta();render();}else if(supported(e.key||'')){meta=readMeta();schedule();}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
  }};
})();
