/* Venza Garage runtime patch: exact restock link for Toyota oil filter 90915-YZZN1. */
(function(){
  const PATCH_VERSION = '1.6.3';
  const PATCH_BUILD = '2026.09.15.5';
  const PATCH_UPDATED = 'Sep 15, 2026';
  const MIGRATION_KEY = 'vz_migration_20260915_toyota_filter_exact_restock_link_v1';
  const FILTER_PART = '90915-YZZN1';
  const EXACT_URL = 'https://autoparts.fletcher-toyota.com/products/product/filter-s-a-oil-90915yzzn1';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function norm(v){ return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g,''); }
  function isFilter(item){ return norm(item?.partNum) === norm(FILTER_PART); }

  function updateInventory(){
    if(typeof getInventory !== 'function' || typeof saveInventory !== 'function') return false;
    const items = getInventory();
    let changed = false;
    items.forEach(item=>{
      if(!isFilter(item)) return;
      if(item.link !== EXACT_URL){ item.link = EXACT_URL; changed = true; }
    });
    if(changed) saveInventory(items);
    return changed;
  }

  function updateBasicParts(){
    if(typeof getBasicPartsList !== 'function' || typeof saveBasicPartsList !== 'function') return false;
    const parts = getBasicPartsList();
    let changed = false;
    parts.forEach(part=>{
      if(!isFilter(part)) return;
      if(part.link !== EXACT_URL){ part.link = EXACT_URL; changed = true; }
    });
    if(changed) saveBasicPartsList(parts);
    return changed;
  }

  function updateMasterParts(){
    if(typeof getMasterParts !== 'function' || typeof saveMasterParts !== 'function') return false;
    const parts = getMasterParts();
    let changed = false;
    parts.forEach(part=>{
      if(!isFilter(part)) return;
      const current = Array.isArray(part.sources) ? part.sources : [];
      const kept = current.filter(source=>{
        const store = String(source?.store || '').toLowerCase();
        const url = String(source?.url || '').toLowerCase();
        return !(store.includes('fletcher') || url.includes('autoparts.fletcher-toyota.com'));
      });
      kept.push({
        store:'Frank Fletcher Toyota, Joplin MO',
        url:EXACT_URL,
        label:'autoparts.fletcher-toyota.com · Frank Fletcher Toyota, Joplin MO',
        unitPrice:Number(part.unitCost || 4.96) || 4.96,
        addedAt:new Date().toISOString()
      });
      const nextSources = typeof normalizeMasterPartSources === 'function' ? normalizeMasterPartSources(kept) : kept;
      if(JSON.stringify(nextSources) !== JSON.stringify(current)){
        part.sources = nextSources;
        changed = true;
      }
    });
    if(changed) saveMasterParts(parts);
    return changed;
  }

  function updateServiceHistory(){
    if(typeof getData !== 'function' || typeof save !== 'function') return false;
    const data = getData();
    let changed = false;
    data.forEach(entry=>{
      if(!Array.isArray(entry.items)) return;
      entry.items.forEach(item=>{
        if(!isFilter(item)) return;
        if(item.link !== EXACT_URL){ item.link = EXACT_URL; changed = true; }
      });
    });
    if(changed) save(data);
    return changed;
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

  function boot(){
    let changed = false;
    try{
      if(!localStorage.getItem(MIGRATION_KEY)){
        changed = updateInventory() || changed;
        changed = updateBasicParts() || changed;
        changed = updateMasterParts() || changed;
        changed = updateServiceHistory() || changed;
        localStorage.setItem(MIGRATION_KEY, '1');
      }
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(changed && typeof renderParts === 'function') renderParts();
      if(changed && typeof renderAll === 'function') renderAll();
      if(typeof renderBackup === 'function') renderBackup();
      if(changed && typeof showToast === 'function') setTimeout(()=>showToast('Toyota filter restock link updated ✓'), 700);
    }catch(err){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
