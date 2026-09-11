/* Venza Garage runtime patch: add tire installation/new tire average-cost option. */
(function(){
  const PATCH_VERSION = '1.5.7';
  const PATCH_BUILD = '2026.09.11.3';
  const PATCH_UPDATED = 'Sep 11, 2026';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  const baseGetAverageServiceOptions = window.getAverageServiceOptions;
  const baseEntryMatchesAverageType = window.entryMatchesAverageType;
  const baseRenderAppVersion = window.renderAppVersion;

  function dedupeOptions(options){
    const seen = new Set();
    return options.filter(opt=>{
      if(!opt || !opt.id || seen.has(opt.id)) return false;
      seen.add(opt.id);
      return true;
    });
  }

  window.getAverageServiceOptions = function(){
    let options = [];
    try{
      options = typeof baseGetAverageServiceOptions === 'function'
        ? baseGetAverageServiceOptions()
        : [
          {id:'oil_avg',label:'Oil Service'},
          {id:'tires',label:'Tire Rotation'},
          {id:'all',label:'All Services'}
        ];
    }catch(err){
      options = [{id:'oil_avg',label:'Oil Service'},{id:'tires',label:'Tire Rotation'},{id:'all',label:'All Services'}];
    }
    options = options.filter(opt=>!['tires_new','tires_all'].includes(opt.id));
    const tireInstall = {id:'tires_new', label:'New Tires / Installation'};
    const allTires = {id:'tires_all', label:'All Tire Services'};
    const tireIndex = options.findIndex(opt=>opt.id === 'tires');
    if(tireIndex >= 0){
      options.splice(tireIndex + 1, 0, tireInstall, allTires);
    }else{
      const allIndex = options.findIndex(opt=>opt.id === 'all');
      if(allIndex >= 0) options.splice(allIndex, 0, tireInstall, allTires);
      else options.push(tireInstall, allTires);
    }
    return dedupeOptions(options);
  };

  window.entryMatchesAverageType = function(entry, type){
    if(type === 'tires_new') return String(entry && entry.type || '') === 'tires_new';
    if(type === 'tires_all') return ['tires','tires_new'].includes(String(entry && entry.type || ''));
    if(typeof baseEntryMatchesAverageType === 'function') return baseEntryMatchesAverageType(entry, type);
    if(type === 'all') return true;
    if(type === 'oil_avg') return String(entry && entry.type || '') === 'oil';
    return String(entry && entry.type || '') === String(type || '');
  };

  window.renderAppVersion = function(){
    try{ if(typeof baseRenderAppVersion === 'function') baseRenderAppVersion(); }catch(err){}
    const full = `APP v${PATCH_VERSION} · ${PATCH_UPDATED} · build ${PATCH_BUILD}`;
    const short = `APP v${PATCH_VERSION} · ${PATCH_UPDATED}`;
    const headerEl = document.getElementById('appVersionBadge');
    if(headerEl){ headerEl.textContent = short; headerEl.title = full; }
    const backupEl = document.getElementById('bkVersion');
    if(backupEl) backupEl.textContent = full;
    document.documentElement.dataset.appVersion = PATCH_VERSION;
  };

  function boot(){
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(typeof window.renderDash === 'function') window.renderDash();
      if(typeof window.renderBackup === 'function') window.renderBackup();
      const select = document.getElementById('avgServiceSelect');
      if(select && !Array.from(select.options).some(opt=>opt.value === 'tires_new')){
        select.insertAdjacentHTML('beforeend','<option value="tires_new">New Tires / Installation</option><option value="tires_all">All Tire Services</option>');
      }
    }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
