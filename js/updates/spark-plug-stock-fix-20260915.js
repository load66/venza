/* Venza Garage runtime patch: remove already-installed Jul 24, 2026 spark plugs from stock on hand. */
(function(){
  const PATCH_VERSION = '1.6.1';
  const PATCH_BUILD = '2026.09.15.3';
  const PATCH_UPDATED = 'Sep 15, 2026';
  const MIGRATION_KEY = 'vz_migration_20260915_spark_plugs_installed_20260724_v1';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function isInstalledSparkPlugStock(item){
    const serviceType = String(item?.serviceType || '').toLowerCase();
    const partNum = String(item?.partNum || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const name = String(item?.name || '').toLowerCase();
    return serviceType === 'plugs' ||
      partNum === '9091901289' ||
      partNum === 'FC16HRQ8' ||
      name.includes('spark plug') ||
      name.includes('fc16hr-q8');
  }

  function migrateSparkPlugInventory(){
    try{
      if(localStorage.getItem(MIGRATION_KEY)) return false;
      if(typeof getInventory !== 'function' || typeof saveInventory !== 'function') return false;

      const inv = getInventory();
      let changed = false;
      inv.forEach(item=>{
        if(!isInstalledSparkPlugStock(item)) return;
        const qty = Number(item.qtyOnHand || 0);
        if(qty > 0){
          item.qtyOnHand = 0;
          changed = true;
        }
        const installedNote = 'Installed Jul 24, 2026 at 68,484 mi (qty 4). Consumed during completed spark plug service; not stock on hand.';
        const currentNote = String(item.note || '').trim();
        if(!currentNote.includes('Installed Jul 24, 2026 at 68,484 mi')){
          item.note = currentNote ? `${currentNote} ${installedNote}` : installedNote;
          changed = true;
        }
      });

      if(changed) saveInventory(inv);
      localStorage.setItem(MIGRATION_KEY, '1');
      return changed;
    }catch(err){
      return false;
    }
  }

  const baseRenderAppVersion = window.renderAppVersion;
  window.renderAppVersion = function(){
    try{ if(typeof baseRenderAppVersion === 'function') baseRenderAppVersion(); }catch(err){}
    const short = `APP v${PATCH_VERSION} · ${PATCH_UPDATED}`;
    const full = `${short} · build ${PATCH_BUILD}`;
    const badge = document.getElementById('appVersionBadge');
    if(badge){ badge.textContent = short; badge.title = full; }
    const backup = document.getElementById('bkVersion');
    if(backup) backup.textContent = full;
    document.documentElement.dataset.appVersion = PATCH_VERSION;
  };

  function refreshParts(){
    try{
      if(typeof renderParts === 'function') renderParts();
      if(typeof renderAll === 'function') renderAll();
      if(typeof renderBackup === 'function') renderBackup();
    }catch(err){}
  }

  function boot(){
    const changed = migrateSparkPlugInventory();
    try{ if(typeof window.renderAppVersion === 'function') window.renderAppVersion(); }catch(err){}
    if(changed){
      refreshParts();
      try{ if(typeof showToast === 'function') setTimeout(()=>showToast('Installed spark plugs removed from Stock on Hand ✓'), 700); }catch(err){}
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
