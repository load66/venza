/* Venza Garage update helper — separate from main app for faster future fixes. */
/* Runtime patch loader added for small future updates. */
(function(){
  const VERSION_URL = './version.json';

  function readCurrentVersion(){
    try{ return window.VENZA_RUNTIME_VERSION || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0'); }catch(err){ return '0.0.0'; }
  }
  function readCurrentBuild(){
    try{ return window.VENZA_RUNTIME_BUILD || (typeof APP_BUILD !== 'undefined' ? APP_BUILD : ''); }catch(err){ return ''; }
  }
  function compareVersions(a,b){
    const pa = String(a||'0').split('.').map(n=>parseInt(n,10)||0);
    const pb = String(b||'0').split('.').map(n=>parseInt(n,10)||0);
    for(let i=0;i<Math.max(pa.length,pb.length);i++){
      const diff = (pa[i]||0) - (pb[i]||0);
      if(diff) return diff;
    }
    return 0;
  }
  function status(message, cls=''){
    const el = document.getElementById('appUpdateStatus');
    if(el){
      el.textContent = message;
      el.style.color = cls === 'good' ? 'var(--green2)' : cls === 'warn' ? 'var(--orange2)' : cls === 'bad' ? 'var(--toyota2)' : 'var(--text3)';
    }
    const btn = document.getElementById('appUpdateBtn');
    if(btn) btn.textContent = cls === 'warn' ? '↻ Update ready' : '↻ Update';
  }
  function cacheBustedUrl(input){
    const url = new URL(input, window.location.href);
    url.searchParams.set('cache', Date.now().toString());
    return url;
  }

  window.forceAppUpdate = async function(){
    const currentVersion = readCurrentVersion();
    const currentBuild = readCurrentBuild();
    status(`Clearing cache and loading latest Venza app...`);
    try{
      if('caches' in window){
        const names = await caches.keys();
        await Promise.all(names.map(name=>caches.delete(name)));
      }
    }catch(err){}
    try{
      if('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg=>reg.unregister()));
      }
    }catch(err){}
    try{ localStorage.setItem('vz_last_manual_update_click', new Date().toISOString()); }catch(err){}
    const url = new URL(window.location.href);
    url.searchParams.set('v', currentVersion);
    if(currentBuild) url.searchParams.set('build', currentBuild);
    url.searchParams.set('refresh', Date.now().toString());
    window.location.replace(url.toString());
  };

  window.checkForAppUpdate = async function(userTriggered=false){
    const currentVersion = readCurrentVersion();
    try{
      if(userTriggered) status('Checking version.json for the newest uploaded app...');
      const res = await fetch(cacheBustedUrl(VERSION_URL).toString(), {cache:'no-store'});
      if(!res.ok) throw new Error('version.json not available');
      const remote = await res.json();
      const remoteVersion = String(remote.version || '');
      const remoteBuild = String(remote.build || '');
      if(remoteVersion && compareVersions(remoteVersion, currentVersion) > 0){
        status(`Update available: APP v${remoteVersion}. Tap Update / Reload App.`, 'warn');
        return true;
      }
      if(remoteVersion === currentVersion && remoteBuild && remoteBuild !== readCurrentBuild()){
        status(`New build available for v${remoteVersion}. Tap Update / Reload App.`, 'warn');
        return true;
      }
      status(`Latest uploaded version loaded: APP v${currentVersion}.`, 'good');
      return false;
    }catch(err){
      status(`Current app: APP v${currentVersion}. Version check unavailable; tap Update after upload.`, userTriggered ? 'warn' : '');
      return false;
    }
  };

  const PATCH_SCRIPTS = [
    './js/updates/tires-20260908.js?v=1.5.5'
  ];
  const PATCH_LOADER_KEY = '__venzaPatchLoaderLoaded';
  function loadScriptOnce(src){
    return new Promise(resolve=>{
      try{
        const url = new URL(src, window.location.href).toString();
        if(document.querySelector(`script[data-venza-patch="${url}"]`)) return resolve(true);
        const el = document.createElement('script');
        el.src = url;
        el.async = false;
        el.dataset.venzaPatch = url;
        el.onload = ()=>resolve(true);
        el.onerror = ()=>resolve(false);
        document.head.appendChild(el);
      }catch(err){ resolve(false); }
    });
  }
  window.loadVenzaPatchScripts = async function(){
    if(window[PATCH_LOADER_KEY]) return true;
    window[PATCH_LOADER_KEY] = true;
    for(const src of PATCH_SCRIPTS){ await loadScriptOnce(src); }
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(typeof window.renderAll === 'function') window.renderAll();
      if(typeof window.renderBackup === 'function') window.renderBackup();
    }catch(err){}
    return true;
  };
  const bootPatches = ()=>window.loadVenzaPatchScripts().then(()=>setTimeout(()=>window.checkForAppUpdate(false), 300));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootPatches, {once:true});
  else bootPatches();

})();
