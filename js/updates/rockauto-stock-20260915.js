/* Venza Garage runtime patch: RockAuto stock-up order #360079453. */
(function(){
  const PATCH_VERSION = '1.5.9';
  const PATCH_BUILD = '2026.09.15.1';
  const PATCH_UPDATED = 'Sep 15, 2026';
  const MIGRATION_KEY = 'vz_migration_20260915_rockauto_360079453_v1';
  const ORDER_NO = '360079453';
  const ORDER_DATE = '2026-09-15';
  const ORDER_TOTAL = 57.40;
  const DISCOUNT = 2.33;
  const SHIPPING = 8.99;
  const TAX = 4.05;
  const MERCH_TOTAL = 46.69;

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function norm(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function money(v){ return '$' + Number(v || 0).toFixed(2); }

  // Landed line totals allocate the complete $57.40 order total proportionally
  // across the merchandise lines, so future service-cost calculations include
  // the order-level discount, shipping, and tax instead of only sticker price.
  const PARTS = [
    {
      id:'ra_360079453_bosch_3311',
      name:'Bosch 3311 Premium Oil Filter',
      serviceType:'oil',
      qty:2,
      partNum:'3311',
      invoiceUnit:4.67,
      lineTotal:9.34,
      landedLineTotal:11.48,
      unitCost:5.74,
      store:'RockAuto',
      link:'https://www.rockauto.com/?carcode=3447042&parttype=5340',
      countInOilAvg:true
    },
    {
      id:'ra_360079453_bosch_6092c',
      name:'Bosch 6092C Cabin Air Filter',
      serviceType:'cabin',
      qty:3,
      partNum:'6092C',
      invoiceUnit:7.51,
      lineTotal:22.53,
      landedLineTotal:27.70,
      unitCost:27.70/3,
      store:'RockAuto',
      link:'https://www.rockauto.com/?carcode=3447042&parttype=6832',
      countInOilAvg:false
    },
    {
      id:'ra_360079453_mahle_lx5472',
      name:'MAHLE / CLEVITE LX5472 Engine Air Filter',
      serviceType:'engine_filter',
      qty:3,
      partNum:'LX5472',
      invoiceUnit:4.94,
      lineTotal:14.82,
      landedLineTotal:18.22,
      unitCost:18.22/3,
      store:'RockAuto',
      link:'https://www.rockauto.com/?carcode=3447042&parttype=6192',
      countInOilAvg:false
    }
  ];

  function partNote(spec){
    return `RockAuto order #${ORDER_NO} · ordered ${ORDER_DATE} for 2021 Toyota Venza 2.5L Hybrid. Qty ${spec.qty}. Invoice ${money(spec.invoiceUnit)} each / ${money(spec.lineTotal)} line. Landed allocation ${money(spec.landedLineTotal)} after order-level discount -${money(DISCOUNT)}, shipping ${money(SHIPPING)}, and tax ${money(TAX)}. Entire order total ${money(ORDER_TOTAL)}. Incoming stock from order confirmation.`;
  }

  function ensureInventory(){
    if(typeof getInventory !== 'function' || typeof saveInventory !== 'function') return false;
    if(localStorage.getItem(MIGRATION_KEY)) return false;
    const inv = getInventory();
    let changed = false;

    PARTS.forEach(spec=>{
      let item = inv.find(x => norm(x.partNum) === norm(spec.partNum));
      if(!item){
        item = {
          id:spec.id,
          name:spec.name,
          serviceType:spec.serviceType,
          qtyOnHand:spec.qty,
          unitCost:spec.unitCost,
          partNum:spec.partNum,
          store:spec.store,
          link:spec.link,
          note:partNote(spec),
          countInOilAvg:spec.countInOilAvg,
          masterPartId:''
        };
        inv.push(item);
      }else{
        item.qtyOnHand = Math.max(0, Number(item.qtyOnHand || 0)) + spec.qty;
        item.name = spec.name;
        item.serviceType = spec.serviceType;
        item.unitCost = spec.unitCost;
        item.partNum = spec.partNum;
        item.store = spec.store;
        item.link = spec.link;
        item.note = partNote(spec);
        item.countInOilAvg = spec.countInOilAvg;
      }
      changed = true;
    });

    if(changed) saveInventory(inv);

    // Also surface each stocked item in the Parts/master-parts list when supported.
    if(typeof upsertMasterPartFromInventoryPayload === 'function'){
      PARTS.forEach(spec=>{
        try{
          upsertMasterPartFromInventoryPayload({
            name:spec.name,
            serviceType:spec.serviceType,
            unitCost:spec.unitCost,
            partNum:spec.partNum,
            store:spec.store,
            link:spec.link,
            note:partNote(spec),
            countInOilAvg:spec.countInOilAvg
          });
        }catch(err){}
      });
    }

    localStorage.setItem(MIGRATION_KEY, '1');
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
    const changed = ensureInventory();
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(changed && typeof renderParts === 'function') renderParts();
      if(changed && typeof renderAll === 'function') renderAll();
      if(typeof renderBackup === 'function') renderBackup();
      if(changed && typeof showToast === 'function') setTimeout(()=>showToast('RockAuto stock-up added to Parts ✓'), 700);
    }catch(err){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
