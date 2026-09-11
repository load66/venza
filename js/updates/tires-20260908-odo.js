/* Venza Garage runtime patch: corrected tire install odometer/details from Sam's Club paper receipt. */
(function(){
  const PATCH_VERSION = '1.5.6';
  const PATCH_BUILD = '2026.09.11.2';
  const PATCH_UPDATED = 'Sep 11, 2026';
  const ENTRY_ID = 2026090868484;
  const INSTALL_DATE = '2026-09-08';
  const INSTALL_MI = 69921;
  const NEXT_ROTATION_MI = 74921;
  const ORDER_NO = '10455235542';
  const REBATE_CLAIM = 'ULSFX4NZRZ';
  const TIRE_NAME = 'Goodyear Assurance MaxLife 2';
  const TIRE_SIZE = '225/60R18 100V';
  const TIRE_ITEM = '984273957';
  const PAID = 696.51;
  const SHOP = "Sam's Club Tire & Battery Center, Joplin MO";

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function n(v){ const x = Number(v); return Number.isFinite(x) ? x : 0; }
  function mi(v){ return Number(v || 0).toLocaleString(); }
  function money(v){ return '$' + Number(v || 0).toFixed(2); }
  function low(v){ return String(v || '').toLowerCase(); }

  function tireDesc(){
    return `New four tires purchased and installed — ${TIRE_NAME}, ${TIRE_SIZE}, qty 4. Sam's Club order #${ORDER_NO}. Paper receipt/service sheet confirmed install odometer ${mi(INSTALL_MI)} mi and handwritten next balance + rotate reminder at ${mi(NEXT_ROTATION_MI)} mi. Gmail receipt total paid online ${money(PAID)}. Tire line: $731.52 total / $182.88 each. Installation package: $80.00 total / $20.00 each. Sales tax $62.99, product fees $2.00, instant savings -$180.00. Installed Tue Sep 8, 2026 at 12:00 PM at ${SHOP}, 3536 Hammons Blvd., Joplin, MO 64804. Service sheet details: tire pressure set to 33 PSI front/rear, tread depth 12/32 on all four tires, TPMS relearn complete, final torque source complete from wheel torque chart, vehicle stability test complete/stable, wiper check tested good, lug torque recorded 76 ft-lbs on all wheels, and lug nuts should be re-torqued after the first 50 miles. Sam's battery check declined/not tested because the battery/terminals could not be accessed. Goodyear rebate claim #${REBATE_CLAIM} submitted; claim later placed on hold for dealer-name mismatch and must be updated before Jan 31, 2027. Next tire rotation target: ${mi(NEXT_ROTATION_MI)} mi or Mar 8, 2027, whichever comes first.`;
  }

  function tireItems(){
    return [
      {name:`${TIRE_NAME} Tire — ${TIRE_SIZE}`, category:'tires', partNum:TIRE_ITEM, store:"Sam's Club", link:'', price:182.88, qty:4, note:`Qty 4. Tire line total $731.52. Installed at ${mi(INSTALL_MI)} mi.`, saveToParts:true},
      {name:'Tire Installation Package', category:'tires', partNum:'5', store:"Sam's Club", link:'', price:20, qty:4, note:'Balance/install, pressure set, TPMS relearn, stability test, and lug torque check. Line total $80.00.', saveToParts:false},
      {name:'Sam’s Club Instant Savings', category:'tires', partNum:'', store:"Sam's Club", link:'', price:-180, qty:1, note:'Instant savings from receipt.', saveToParts:false},
      {name:'Sales Tax', category:'other', partNum:'', store:"Sam's Club", link:'', price:62.99, qty:1, note:'Sales tax from receipt.', saveToParts:false},
      {name:'Product Fees', category:'other', partNum:'', store:"Sam's Club", link:'', price:2, qty:1, note:'Product fees from receipt.', saveToParts:false}
    ];
  }

  function isTireEntry(e){
    const text = low((e && e.desc) + ' ' + (e && e.type) + ' ' + (e && e.shop));
    return String(e && e.id) === String(ENTRY_ID) ||
      (String(e && e.type) === 'tires_new' && (text.includes('goodyear assurance max') || text.includes(ORDER_NO.toLowerCase()) || text.includes(REBATE_CLAIM.toLowerCase())));
  }

  function patchRules(){
    try{
      if(!Array.isArray(RECURRING_RULES)) return;
      const rot = RECURRING_RULES.find(r => r.id === 'tires');
      if(rot){
        rot.entryTypes = Array.from(new Set([...(rot.entryTypes || []), 'tires_new']));
        rot.note = `Rotate every 5,000 mi / 6 mo. New tire install at ${mi(INSTALL_MI)} mi sets the baseline; next balance + rotate at ${mi(NEXT_ROTATION_MI)} mi or Mar 8, 2027.`;
      }
    }catch(err){}
  }

  function patchPart(){
    try{
      if(typeof getBasicPartsList !== 'function' || typeof saveBasicPartsList !== 'function') return false;
      const parts = getBasicPartsList();
      const idx = parts.findIndex(p => low(p.partNum) === low(TIRE_ITEM) || low(p.name).includes('assurance maxlife'));
      const note = `Qty 4 installed Sep 8, 2026 at ${mi(INSTALL_MI)} mi. Paid ${money(PAID)} after $180.00 instant savings. Next balance + rotate at ${mi(NEXT_ROTATION_MI)} mi. Pressure 33 PSI all around, tread 12/32 all around, lug torque recorded 76 ft-lbs. Rebate claim #${REBATE_CLAIM}.`;
      const obj = {id:'tires_20260908_goodyear_maxlife2', name:`${TIRE_NAME} Tire — ${TIRE_SIZE}`, category:'tires', serviceType:'tires_new', store:"Sam's Club", link:'', partNum:TIRE_ITEM, unitCost:182.88, note};
      if(idx >= 0) parts[idx] = {...parts[idx], ...obj};
      else parts.push(obj);
      saveBasicPartsList(parts);
      return true;
    }catch(err){ return false; }
  }

  function patchEntry(){
    patchRules();
    let changed = false;
    try{
      if(typeof getData !== 'function' || typeof save !== 'function') return false;
      const data = getData();
      let e = data.find(isTireEntry);
      const desired = {id:ENTRY_ID, date:INSTALL_DATE, mi:INSTALL_MI, type:'tires_new', desc:tireDesc(), cost:PAID, shop:SHOP, link:`https://www.goodyearrebates.com/existing/${REBATE_CLAIM}`, items:tireItems(), inventoryUses:[], builtin:true};
      if(!e){ data.push(desired); changed = true; }
      else{
        ['date','mi','type','desc','cost','shop','link','builtin'].forEach(k => { if(String(e[k] ?? '') !== String(desired[k] ?? '')){ e[k] = desired[k]; changed = true; } });
        e.items = desired.items;
        e.inventoryUses = Array.isArray(e.inventoryUses) ? e.inventoryUses : [];
        changed = true;
      }
      if(changed) save(data);
      try{ if(typeof getMi === 'function' && typeof setMi === 'function' && n(getMi()) < INSTALL_MI) setMi(INSTALL_MI, {source:'tire-install', entryId:ENTRY_ID, allowLower:false}); }catch(err){}
      patchPart();
      try{ localStorage.setItem('vz_migration_20260908_goodyear_tires_receipt_odo_v1','1'); }catch(err){}
      return true;
    }catch(err){ return false; }
  }

  window.ensureGoodyearTireReceiptDetails = patchEntry;
  const oldRenderVersion = window.renderAppVersion;
  window.renderAppVersion = function(){
    try{ if(typeof oldRenderVersion === 'function') oldRenderVersion(); }catch(err){}
    const header = document.getElementById('appVersionBadge');
    if(header){ header.textContent = `APP v${PATCH_VERSION} · ${PATCH_UPDATED}`; header.title = `APP v${PATCH_VERSION} · ${PATCH_UPDATED} · build ${PATCH_BUILD}`; }
    const backup = document.getElementById('bkVersion');
    if(backup) backup.textContent = `APP v${PATCH_VERSION} · ${PATCH_UPDATED} · build ${PATCH_BUILD}`;
    document.documentElement.dataset.appVersion = PATCH_VERSION;
  };

  function boot(){
    const changed = patchEntry();
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(typeof renderAll === 'function') renderAll();
      if(typeof renderBackup === 'function') renderBackup();
      if(changed && typeof showToast === 'function') setTimeout(()=>showToast(`Tire install corrected to ${mi(INSTALL_MI)} mi ✓`), 800);
    }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
