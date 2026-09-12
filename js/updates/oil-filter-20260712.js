/* Venza Garage runtime patch: exact DIY oil-change parts/costs from Amazon + Frank Fletcher Toyota receipts. */
(function(){
  const PATCH_VERSION = '1.5.8';
  const PATCH_BUILD = '2026.09.12.1';
  const PATCH_UPDATED = 'Sep 12, 2026';
  const MIGRATION_KEY = 'vz_migration_20260712_oil_parts_exact_v1';

  const OIL_ENTRY_ID = 2026071268187;
  const OIL_DATE = '2026-07-12';
  const OIL_MI = 68187;

  const AMAZON_ORDER = '114-3966183-9088235';
  const OIL_NAME = 'Mobil 1 Advanced Fuel Economy Full Synthetic Motor Oil 0W-16, 5 Quart';
  const OIL_ASIN = 'B07Y5MG3MX';
  const OIL_PURCHASE_QTY = 2;
  const OIL_PURCHASE_TOTAL = 36.72;
  const OIL_UNIT_LANDED = 18.36; // $36.72 / 2 bottles

  const TOYOTA_ORDER = 'T24076003003709';
  const FILTER_NAME = 'Genuine Toyota Oil Filter - Canister Oil Filter';
  const FILTER_PART = '90915-YZZN1';
  const FILTER_PURCHASE_QTY = 2;
  const FILTER_SUBTOTAL = 9.04;
  const FILTER_TAX = 0.88;
  const FILTER_PURCHASE_TOTAL = 9.92;
  const FILTER_UNIT_LANDED = 4.96; // $9.92 / 2 filters

  const SERVICE_TOTAL = 23.32; // one 5-qt bottle + one filter

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function norm(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function money(v){ return '$' + Number(v || 0).toFixed(2); }

  function ensureInventoryPart(spec){
    if(typeof getInventory !== 'function' || typeof saveInventory !== 'function') return false;
    const inv = getInventory();
    let item = inv.find(x =>
      (spec.partNum && norm(x.partNum) === norm(spec.partNum)) ||
      norm(x.name).includes(norm(spec.name).slice(0,18))
    );
    let changed = false;
    if(!item){
      item = {
        id: spec.id,
        name: spec.name,
        serviceType: 'oil',
        qtyOnHand: 1,
        unitCost: spec.unitCost,
        partNum: spec.partNum || '',
        store: spec.store,
        link: spec.link || '',
        note: spec.note,
        countInOilAvg: true,
        masterPartId: ''
      };
      inv.push(item);
      changed = true;
    }else{
      const firstMigration = !localStorage.getItem(MIGRATION_KEY);
      const desired = {
        name: spec.name,
        serviceType: 'oil',
        unitCost: spec.unitCost,
        partNum: spec.partNum || item.partNum || '',
        store: spec.store,
        link: spec.link || item.link || '',
        note: spec.note,
        countInOilAvg: true
      };
      Object.entries(desired).forEach(([k,v])=>{
        if(String(item[k] ?? '') !== String(v ?? '')){ item[k] = v; changed = true; }
      });
      // Purchase qty was 2 and one unit was consumed in the Jul 12 oil change.
      // Only set the initial remaining quantity during this migration so later user edits are preserved.
      if(firstMigration && Number(item.qtyOnHand) !== 1){ item.qtyOnHand = 1; changed = true; }
    }
    if(changed) saveInventory(inv);
    return changed;
  }

  function ensurePartsInventory(){
    let changed = false;
    changed = ensureInventoryPart({
      id:'oil_mobil1_0w16_20260410',
      name:OIL_NAME,
      partNum:OIL_ASIN,
      unitCost:OIL_UNIT_LANDED,
      store:'Amazon',
      link:'https://www.amazon.com/dp/B07Y5MG3MX',
      note:`Purchased Apr 10, 2026 · Amazon order #${AMAZON_ORDER} · qty ${OIL_PURCHASE_QTY} · paid ${money(OIL_PURCHASE_TOTAL)} total (${money(OIL_UNIT_LANDED)} landed cost per 5-qt bottle). One bottle used Jul 12, 2026; 1 bottle remains.`
    }) || changed;
    changed = ensureInventoryPart({
      id:'oil_filter_90915_yzzn1_20260304',
      name:FILTER_NAME,
      partNum:FILTER_PART,
      unitCost:FILTER_UNIT_LANDED,
      store:'Frank Fletcher Toyota, Joplin MO',
      link:'https://autoparts.fletcher-toyota.com/',
      note:`Purchased Mar 4, 2026 · Toyota order #${TOYOTA_ORDER} · qty ${FILTER_PURCHASE_QTY} · subtotal ${money(FILTER_SUBTOTAL)} + tax ${money(FILTER_TAX)} = ${money(FILTER_PURCHASE_TOTAL)} total (${money(FILTER_UNIT_LANDED)} landed cost per filter). One filter used Jul 12, 2026; 1 filter remains.`
    }) || changed;
    try{ if(typeof syncMasterPartsFromInventory === 'function') syncMasterPartsFromInventory(); }catch(err){}
    return changed;
  }

  function buildOilItems(){
    return [
      {
        name: OIL_NAME,
        category: 'engine_oil',
        partNum: OIL_ASIN,
        store: 'Amazon',
        link: 'https://www.amazon.com/dp/B07Y5MG3MX',
        price: OIL_UNIT_LANDED,
        qty: 1,
        note: `Amazon order #${AMAZON_ORDER} · bought 2 for ${money(OIL_PURCHASE_TOTAL)} total · allocated ${money(OIL_UNIT_LANDED)} to this oil change.`,
        useInOilAvg: true
      },
      {
        name: FILTER_NAME,
        category: 'oil_filter',
        partNum: FILTER_PART,
        store: 'Frank Fletcher Toyota, Joplin MO',
        link: 'https://autoparts.fletcher-toyota.com/',
        price: FILTER_UNIT_LANDED,
        qty: 1,
        note: `Toyota order #${TOYOTA_ORDER} · bought 2 for ${money(FILTER_PURCHASE_TOTAL)} total after tax · allocated ${money(FILTER_UNIT_LANDED)} to this oil change.`,
        useInOilAvg: true
      }
    ];
  }

  function ensureOilEntry(){
    if(typeof getData !== 'function' || typeof save !== 'function') return false;
    const data = getData();
    let entry = data.find(e => String(e.id) === String(OIL_ENTRY_ID)) ||
                data.find(e => e.type === 'oil' && e.date === OIL_DATE && Number(e.mi) === OIL_MI);
    let changed = false;
    if(!entry){
      entry = {
        id: OIL_ENTRY_ID,
        date: OIL_DATE,
        mi: OIL_MI,
        type: 'oil',
        desc: '',
        cost: SERVICE_TOTAL,
        shop: 'DIY · Amazon + Frank Fletcher Toyota',
        link: '',
        items: buildOilItems(),
        inventoryUses: [],
        builtin: true
      };
      data.push(entry);
      changed = true;
    }
    const desc = `DIY oil + filter change — ${OIL_NAME} and Toyota OEM oil filter ${FILTER_PART}. Exact allocated parts cost: ${money(OIL_UNIT_LANDED)} oil + ${money(FILTER_UNIT_LANDED)} filter = ${money(SERVICE_TOTAL)}. Oil source: Amazon order #${AMAZON_ORDER}. Filter source: Frank Fletcher Toyota order #${TOYOTA_ORDER}. Current mileage: 68,187. Next service target: 73,187 mi or Jan 12, 2027, whichever comes first.`;
    const desired = {
      date: OIL_DATE,
      mi: OIL_MI,
      type: 'oil',
      desc,
      cost: SERVICE_TOTAL,
      shop: 'DIY · Amazon + Frank Fletcher Toyota',
      items: buildOilItems(),
      inventoryUses: [],
      builtin: true
    };
    Object.entries(desired).forEach(([k,v])=>{
      const before = JSON.stringify(entry[k] ?? null);
      const after = JSON.stringify(v);
      if(before !== after){ entry[k] = v; changed = true; }
    });
    if(changed) save(data);
    return changed;
  }

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

  function boot(){
    let changed = false;
    try{ changed = ensurePartsInventory() || changed; }catch(err){ console.warn('Oil parts inventory migration', err); }
    try{ changed = ensureOilEntry() || changed; }catch(err){ console.warn('Oil service migration', err); }
    try{ localStorage.setItem(MIGRATION_KEY,'1'); }catch(err){}
    try{
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
      if(typeof renderAll === 'function') renderAll();
      if(typeof renderParts === 'function') renderParts();
      if(typeof renderBackup === 'function') renderBackup();
      if(changed && typeof showToast === 'function') setTimeout(()=>showToast('Oil filter + exact oil cost updated ✓'), 900);
    }catch(err){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
