/* Venza Garage runtime patch: visible stock-on-hand cost view. */
(function(){
  const PATCH_VERSION = '1.6.0';
  const PATCH_BUILD = '2026.09.15.2';
  const PATCH_UPDATED = 'Sep 15, 2026';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  const PURCHASE_PRICE_EACH = {
    '3311': 4.67,
    '6092C': 7.51,
    'LX5472': 4.94,
    '90915-YZZN1': 4.96
  };

  const SERVICE_LABELS = {
    oil:'Oil Service',
    cabin:'Cabin Air Filter',
    engine_filter:'Engine Air Filter',
    plugs:'Spark Plugs',
    battery:'12V Battery',
    tires_new:'Tires',
    other:'Other'
  };

  function money(v){ return '$' + Number(v || 0).toFixed(2); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function getStock(){
    try{
      if(typeof getInventory !== 'function') return [];
      return getInventory().filter(item=>Number(item.qtyOnHand || 0) > 0);
    }catch(err){ return []; }
  }
  function sourcePrice(item){
    const pn = String(item.partNum || '').trim().toUpperCase();
    return PURCHASE_PRICE_EACH[pn] ?? null;
  }
  function statusFor(item){
    return /incoming|order confirmation|ordered/i.test(String(item.note || '')) ? 'Incoming' : 'In stock';
  }

  function addStyles(){
    if(document.getElementById('vzStockCostStyles')) return;
    const s = document.createElement('style');
    s.id = 'vzStockCostStyles';
    s.textContent = `
      #vzStockOnHand{margin-bottom:18px}
      .vz-stock-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 10px}
      .vz-stock-title{font-size:15px;font-weight:700;color:var(--text,#f4f5f7)}
      .vz-stock-sub{font-size:11px;color:var(--text3,#8d93a5);line-height:1.45;margin-top:3px}
      .vz-stock-total{font-size:13px;font-weight:700;color:var(--green2,#55df8f);white-space:nowrap}
      .vz-stock-grid{display:grid;gap:10px}
      .vz-stock-card{background:var(--bg2,#24272f);border:1px solid var(--border,#353945);border-radius:12px;padding:13px}
      .vz-stock-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .vz-stock-name{font-size:14px;font-weight:700;line-height:1.35;color:var(--text,#f4f5f7)}
      .vz-stock-badge{font-size:10px;font-weight:700;border:1px solid var(--border2,#444957);border-radius:999px;padding:4px 7px;color:var(--orange2,#ffb05f);white-space:nowrap}
      .vz-stock-meta{font-size:11px;color:var(--text3,#8d93a5);margin-top:4px}
      .vz-stock-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:11px}
      .vz-stock-stat{background:var(--bg3,#1d2027);border-radius:9px;padding:9px 8px}
      .vz-stock-k{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#8d93a5)}
      .vz-stock-v{font-size:13px;font-weight:700;margin-top:3px;color:var(--text,#f4f5f7)}
      .vz-stock-note{font-size:10px;color:var(--text3,#8d93a5);margin-top:10px;line-height:1.45}
      .vz-stock-foot{margin-top:10px;padding:10px 11px;border-radius:10px;background:rgba(55,129,255,.08);border:1px solid rgba(55,129,255,.18);font-size:11px;color:var(--text2,#c2c6d0);line-height:1.45}
    `;
    document.head.appendChild(s);
  }

  function renderStockOnHand(){
    const page = document.getElementById('page-parts');
    if(!page) return;
    addStyles();
    let wrap = document.getElementById('vzStockOnHand');
    if(!wrap){
      wrap = document.createElement('section');
      wrap.id = 'vzStockOnHand';
      page.insertBefore(wrap, page.firstChild);
    }
    const stock = getStock();
    const total = stock.reduce((sum,item)=>sum + Number(item.qtyOnHand||0) * Number(item.unitCost||0),0);
    if(!stock.length){
      wrap.innerHTML = '<div class="vz-stock-title">Stock on Hand</div><div class="vz-stock-sub">No stocked parts recorded yet.</div>';
      return;
    }
    const cards = stock.map(item=>{
      const qty = Number(item.qtyOnHand || 0);
      const landed = Number(item.unitCost || 0);
      const sticker = sourcePrice(item);
      const service = SERVICE_LABELS[item.serviceType] || item.serviceType || 'Part';
      const note = sticker != null && Math.abs(sticker-landed) > 0.005
        ? `Purchase price ${money(sticker)} each. True cost ${money(landed)} each includes allocated shipping, tax, and discount.`
        : `Recorded cost ${money(landed)} each.`;
      return `<div class="vz-stock-card">
        <div class="vz-stock-top">
          <div><div class="vz-stock-name">${esc(item.name)}</div><div class="vz-stock-meta">${esc(service)}${item.partNum ? ` · Part #${esc(item.partNum)}` : ''}${item.store ? ` · ${esc(item.store)}` : ''}</div></div>
          <div class="vz-stock-badge">${esc(statusFor(item))}</div>
        </div>
        <div class="vz-stock-row">
          <div class="vz-stock-stat"><div class="vz-stock-k">Qty on hand</div><div class="vz-stock-v">${qty}</div></div>
          <div class="vz-stock-stat"><div class="vz-stock-k">Cost each</div><div class="vz-stock-v">${money(landed)}</div></div>
          <div class="vz-stock-stat"><div class="vz-stock-k">Stock value</div><div class="vz-stock-v">${money(qty*landed)}</div></div>
        </div>
        <div class="vz-stock-note">${esc(note)}</div>
      </div>`;
    }).join('');
    wrap.innerHTML = `<div class="vz-stock-head"><div><div class="vz-stock-title">Stock on Hand</div><div class="vz-stock-sub">Purchase inventory only — not maintenance until you actually install it.</div></div><div class="vz-stock-total">${money(total)} stocked</div></div><div class="vz-stock-grid">${cards}</div><div class="vz-stock-foot"><strong>Future install workflow:</strong> when you install a stocked part, log the service at that date/mileage, use this stored per-part cost, and reduce the quantity on hand. That keeps purchase cost separate from maintenance history.</div>`;
  }

  const baseRenderParts = window.renderParts;
  if(typeof baseRenderParts === 'function'){
    window.renderParts = function(){
      const out = baseRenderParts.apply(this, arguments);
      try{ renderStockOnHand(); }catch(err){}
      return out;
    };
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
    try{
      renderStockOnHand();
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
    }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
