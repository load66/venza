/* Venza Garage runtime patch: make purchase source + restock link visible for stocked parts. */
(function(){
  const PATCH_VERSION = '1.6.2';
  const PATCH_BUILD = '2026.09.15.4';
  const PATCH_UPDATED = 'Sep 15, 2026';

  window.VENZA_RUNTIME_VERSION = PATCH_VERSION;
  window.VENZA_RUNTIME_BUILD = PATCH_BUILD;
  window.VENZA_RUNTIME_UPDATED = PATCH_UPDATED;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function safeUrl(v){
    const s = String(v || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function getStock(){
    try{
      if(typeof getInventory !== 'function') return [];
      return getInventory().filter(item=>Number(item.qtyOnHand || 0) > 0);
    }catch(err){ return []; }
  }

  function sourceReference(item){
    const note = String(item?.note || '');
    const bits = [];
    const order = note.match(/(?:Amazon|Toyota|RockAuto)?\s*order\s*#([A-Z0-9-]+)/i);
    const purchased = note.match(/Purchased\s+([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i);
    const orderedIso = note.match(/ordered\s+(\d{4}-\d{2}-\d{2})/i);
    if(order) bits.push('Order #' + order[1]);
    if(purchased) bits.push(purchased[1]);
    else if(orderedIso) bits.push(orderedIso[1]);
    return bits.join(' · ');
  }

  function addStyles(){
    if(document.getElementById('vzRestockSourceStyles')) return;
    const s = document.createElement('style');
    s.id = 'vzRestockSourceStyles';
    s.textContent = `
      .vz-restock-source{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;padding:10px 11px;border-radius:10px;background:var(--bg3,#1d2027);border:1px solid var(--border,#353945)}
      .vz-restock-source-main{min-width:0}
      .vz-restock-source-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3,#8d93a5)}
      .vz-restock-source-store{font-size:12px;font-weight:700;color:var(--text,#f4f5f7);margin-top:3px;line-height:1.3}
      .vz-restock-source-ref{font-size:10px;color:var(--text3,#8d93a5);margin-top:3px;line-height:1.35}
      .vz-restock-link{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;text-decoration:none;font-size:11px;font-weight:700;padding:8px 10px;border-radius:9px;border:1px solid rgba(55,129,255,.32);background:rgba(55,129,255,.10);color:var(--blue,#6ea4ff)}
    `;
    document.head.appendChild(s);
  }

  function enhanceStockCards(){
    const wrap = document.getElementById('vzStockOnHand');
    if(!wrap) return;
    addStyles();
    const cards = Array.from(wrap.querySelectorAll('.vz-stock-card'));
    const stock = getStock();
    cards.forEach((card, index)=>{
      const item = stock[index];
      if(!item) return;
      let box = card.querySelector('.vz-restock-source');
      if(!box){
        box = document.createElement('div');
        box.className = 'vz-restock-source';
        card.appendChild(box);
      }
      const store = String(item.store || '').trim() || 'Purchase source not recorded';
      const ref = sourceReference(item);
      const url = safeUrl(item.link);
      box.innerHTML = `
        <div class="vz-restock-source-main">
          <div class="vz-restock-source-label">Bought from</div>
          <div class="vz-restock-source-store">${esc(store)}</div>
          ${ref ? `<div class="vz-restock-source-ref">${esc(ref)}</div>` : ''}
        </div>
        ${url ? `<a class="vz-restock-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Restock ↗</a>` : ''}
      `;
    });
  }

  const baseRenderParts = window.renderParts;
  if(typeof baseRenderParts === 'function'){
    window.renderParts = function(){
      const out = baseRenderParts.apply(this, arguments);
      try{ enhanceStockCards(); }catch(err){}
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
      if(typeof window.renderParts === 'function') window.renderParts();
      else enhanceStockCards();
      if(typeof window.renderAppVersion === 'function') window.renderAppVersion();
    }catch(err){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
