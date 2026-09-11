/* Venza Garage runtime patch: Goodyear tire purchase + installation from Gmail receipt. */
(function(){
  const PATCH_VERSION = '1.5.5';
  const PATCH_BUILD = '2026.09.11.1';
  const PATCH_UPDATED = 'Sep 11, 2026';
  const MIGRATION_KEY = 'vz_migration_20260908_goodyear_tires_v1';
  const ENTRY_ID = 2026090868484;
  const FALLBACK_MI = 68484;
  const INSTALL_DATE = '2026-09-08';
  const ORDER_NO = '10455235542';
  const REBATE_CLAIM = 'ULSFX4NZRZ';
  const TIRE_NAME = 'Goodyear Assurance MaxLife 2';
  const TIRE_SIZE = '225/60R18 100V';
  const TIRE_ITEM = '984273957';
  const TIRE_UNIT = 182.88;
  const TIRE_TOTAL = 731.52;
  const INSTALL_UNIT = 20.00;
  const INSTALL_TOTAL = 80.00;
  const SUBTOTAL = 811.52;
  const TAX = 62.99;
  const PRODUCT_FEES = 2.00;
  const SAVINGS = 180.00;
  const PAID = 696.51;
  const SHOP = "Sam's Club Tire & Battery Center, Joplin MO";
  const ADDRESS = '3536 Hammons Blvd., Joplin, MO 64804';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function n(v){ const num = Number(v); return Number.isFinite(num) ? num : 0; }
  function money(v){ return '$' + Number(v||0).toFixed(2); }
  function currentMileageForEntry(){
    try{ return Math.max(n(getMi && getMi()), FALLBACK_MI); }catch(err){ return FALLBACK_MI; }
  }
  function norm(v){ return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function entryDescription(mi){
    return `New four tires purchased with installation package — ${TIRE_NAME}, ${TIRE_SIZE}, qty 4. Sam's Club order #${ORDER_NO}. Tire item #${TIRE_ITEM}: ${money(TIRE_TOTAL)} total (${money(TIRE_UNIT)} each). Installation package item #5: ${money(INSTALL_TOTAL)} total (${money(INSTALL_UNIT)} each). Subtotal ${money(SUBTOTAL)}, sales tax ${money(TAX)}, product fees ${money(PRODUCT_FEES)}, instant savings -${money(SAVINGS)}, paid online ${money(PAID)}. Appointment/install date: Tue Sep 8, 2026 at 12:00 PM, ${SHOP}, ${ADDRESS}. Goodyear rebate claim #${REBATE_CLAIM} submitted; claim later placed on hold for dealer-name mismatch and must be updated before Jan 31, 2027. Next tire rotation target: ${(mi + 5000).toLocaleString()} mi or Mar 8, 2027, whichever comes first.`;
  }
  function tireItems(){
    return [
      {name:`${TIRE_NAME} Tire — ${TIRE_SIZE}`, category:'tires', partNum:TIRE_ITEM, store:"Sam's Club", link:'', price:TIRE_UNIT, qty:4, note:`Receipt line total ${money(TIRE_TOTAL)}. Sam's Club item #${TIRE_ITEM}.`, saveToParts:true},
      {name:'Tire Installation Package', category:'tires', partNum:'5', store:"Sam's Club", link:'', price:INSTALL_UNIT, qty:4, note:`Installation package line total ${money(INSTALL_TOTAL)}.`, saveToParts:false},
      {name:'Sam’s Club Instant Savings', category:'tires', partNum:'', store:"Sam's Club", link:'', price:-SAVINGS, qty:1, note:'Instant savings from receipt.', saveToParts:false},
      {name:'Sales Tax', category:'other', partNum:'', store:"Sam's Club", link:'', price:TAX, qty:1, note:'Sales tax from receipt.', saveToParts:false},
      {name:'Product Fees', category:'other', partNum:'', store:"Sam's Club", link:'', price:PRODUCT_FEES, qty:1, note:'Product fees from receipt.', saveToParts:false}
    ];
  }
  function cloneTireEntry(){
    const mi = currentMileageForEntry();
    return {
      id: ENTRY_ID,
      date: INSTALL_DATE,
      mi,
      type: 'tires_new',
      desc: entryDescription(mi),
      cost: PAID,
      shop: SHOP,
      link: `https://www.goodyearrebates.com/existing/${REBATE_CLAIM}`,
      items: tireItems(),
      inventoryUses: [],
      builtin: true
    };
  }
  function looksLikeTirePurchase(entry){
    const desc = String(entry && entry.desc || '').toLowerCase();
    return String(entry && entry.type || '') === 'tires_new' && (
      String(entry.id) === String(ENTRY_ID) ||
      desc.includes(String(ORDER_NO).toLowerCase()) ||
      desc.includes(String(REBATE_CLAIM).toLowerCase()) ||
      desc.includes('goodyear assurance max')
    );
  }
  function patchRecurringRules(){
    try{
      if(Array.isArray(RECURRING_RULES)){
        const rotation = RECURRING_RULES.find(rule=>rule.id === 'tires');
        if(rotation){
          rotation.entryTypes = Array.from(new Set([...(rotation.entryTypes || []), 'tires_new']));
          rotation.note = `Rotate every 5,000 mi / 6 mo. New tire install counts as the rotation baseline.`;
        }
        const tiresNew = RECURRING_RULES.find(rule=>rule.id === 'tires_new');
        if(tiresNew){
          tiresNew.note = `${TIRE_NAME} ${TIRE_SIZE} installed/purchased Sep 8, 2026 from Sam's Club. Paid ${money(PAID)} after ${money(SAVINGS)} savings. Rebate claim #${REBATE_CLAIM} on hold for dealer-name mismatch.`;
        }
      }
    }catch(err){}
  }
  function ensureTirePart(){
    try{
      const parts = getBasicPartsList();
      const exists = parts.some(part=>norm(part.partNum) === norm(TIRE_ITEM) || String(part.name||'').toLowerCase().includes('assurance maxlife'));
      if(exists) return false;
      saveBasicPartsList([...parts, {
        id: 'tires_20260908_goodyear_maxlife2',
        name: `${TIRE_NAME} Tire — ${TIRE_SIZE}`,
        category: 'tires',
        serviceType: 'tires_new',
        store: "Sam's Club",
        link: '',
        partNum: TIRE_ITEM,
        unitCost: TIRE_UNIT,
        note: `Qty 4 purchased Sep 8, 2026. Order #${ORDER_NO}. Tire line ${money(TIRE_TOTAL)}; installation ${money(INSTALL_TOTAL)}; tax ${money(TAX)}; product fees ${money(PRODUCT_FEES)}; instant savings -${money(SAVINGS)}; paid online ${money(PAID)}. Rebate claim #${REBATE_CLAIM}.`
      }]);
      return true;
    }catch(err){ return false; }
  }
  function ensureTireEntry(){
    patchRecurringRules();
    let changed = false;
    try{
      const data = getData();
      let entry = data.find(looksLikeTirePurchase);
      if(!entry){
        data.push(cloneTireEntry());
        changed = true;
      }else{
        const mi = Math.max(n(entry.mi), currentMileageForEntry());
        const desired = cloneTireEntry();
        desired.mi = mi;
        desired.desc = entryDescription(mi);
        ['date','type','desc','cost','shop','link'].forEach(key=>{
          if(String(entry[key] ?? '') !== String(desired[key] ?? '')){ entry[key] = desired[key]; changed = true; }
        });
        if(n(entry.mi) !== mi){ entry.mi = mi; changed = true; }
        if(!Array.isArray(entry.items) || entry.items.length < 2){ entry.items = tireItems(); changed = true; }
        if(!Array.isArray(entry.inventoryUses)){ entry.inventoryUses = []; changed = true; }
        entry.builtin = true;
      }
      if(changed) save(data);
      const latestMi = currentMileageForEntry();
      if(latestMi >= FALLBACK_MI && n(getMi && getMi()) < latestMi){
        setMi(latestMi, {source:'entry', entryId:ENTRY_ID, allowLower:false});
        changed = true;
      }
      if(ensureTirePart()) changed = true;
      try{ localStorage.setItem(MIGRATION_KEY, '1'); }catch(err){}
      return changed;
    }catch(err){ return false; }
  }
  window.ensureGoodyearTireRecord = ensureTireEntry;

  const baseRenderAppVersion = window.renderAppVersion;
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

  const baseResetData = window.resetData;
  if(typeof baseResetData === 'function'){
    window.resetData = function(){
      const before = Date.now();
      baseResetData();
      setTimeout(()=>{
        try{
          if(ensureTireEntry() && typeof renderAll === 'function') renderAll();
          if(typeof renderBackup === 'function') renderBackup();
        }catch(err){}
      }, 50);
      return before;
    };
  }

  function boot(){
    const changed = ensureTireEntry();
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(changed && typeof renderAll === 'function') renderAll();
      if(typeof renderBackup === 'function') renderBackup();
      if(changed && typeof showToast === 'function') setTimeout(()=>showToast(`${TIRE_NAME} tire service logged ✓`), 900);
    }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
