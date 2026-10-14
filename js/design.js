/* Venza Garage: presentation only. Saved records and calculations stay in the app engine. */
(function(){
  'use strict';
  const titles={dash:['Your garage','2021 Toyota Venza · Hybrid AWD'],log:['Service history','Every visit, part and receipt in one place.'],add:['Log a service','Keep your next reminder accurate.'],upcoming:['Maintenance schedule','See what is due and what needs attention.'],parts:['Parts & supplies','Your inventory, purchase sources and service essentials.'],guides:['DIY guides','Find the steps and specifications for your next service.'],warranty:['Warranty coverage','Vehicle protection and service contacts.'],specs:['Vehicle reference','Specifications and service essentials.'],backup:['Settings & cloud','Your account, cloud saves and data controls.'],printlog:['Service report','Prepare a clean record for your files or service shop.']};
  const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const icons={dash:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',log:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',upcoming:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18m-11 5 2 2 4-4"/>',parts:'<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5m-9 5v9m-4-16 9 5"/>'};
  const q=s=>document.querySelector(s);
  Object.entries(titles).forEach(([id,[title,subtitle]])=>{
    const page=document.getElementById('page-'+id);if(!page)return;
    const header=document.createElement('div');header.className='garage-page-heading';
    const copy=document.createElement('div'),h=document.createElement('h1'),p=document.createElement('p');h.textContent=title;p.textContent=subtitle;copy.append(h,p);header.append(copy);page.prepend(header);
    if(id==='dash'){const b=document.createElement('button');b.className='garage-cloud-pill';b.id='cloudStatusInline';b.type='button';b.onclick=()=>go('backup');b.textContent='Connect cloud';header.append(b);}
  });
  document.querySelectorAll('.nav-btn[data-page]').forEach(b=>{
    if(!icons[b.dataset.page])return;
    const text=b.textContent;b.innerHTML=icon(icons[b.dataset.page])+'<span>'+text+'</span>';
  });
  const more=q('#garageMoreLabel');if(more)more.innerHTML=icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')+'<span>More</span>';
  const logo=q('.header-logo');if(logo)logo.innerHTML='<span class="garage-brand-mark">'+icon('<path d="m5 10 2-5h10l2 5M3 10h18v8H3Zm3 8v2m12-2v2M6 14h2m8 0h2"/>')+'</span><span>Venza<span class="garage-brand-accent"> Garage</span><small>YOUR MAINTENANCE COMPANION</small></span>';
  const cloud=q('.garage-cloud-card');if(cloud){const settings=q('#page-backup');settings.insertBefore(cloud,settings.children[1]);}
  const home=q('#page-dash'),hero=q('#page-dash .hero'),gauges=q('#page-dash .gauges'),quick=q('.garage-quick-actions');
  if(hero&&gauges){const overview=document.createElement('div');overview.className='garage-overview';home.insertBefore(overview,hero);overview.append(hero,gauges);if(quick)overview.after(quick);}
  const specs=[...home.querySelectorAll('.section-label')].find(el=>el.textContent==='Quick Specs');
  if(specs){const details=document.createElement('details');details.className='garage-disclosure';const summary=document.createElement('summary');summary.textContent='Vehicle essentials & last inspection';details.append(summary);const body=document.createElement('div');body.className='garage-disclosure-body';let el=specs;while(el){const next=el.nextSibling;body.append(el);el=next;}details.append(body);home.append(details);}
  const recent=document.createElement('section');recent.className='garage-recent';recent.innerHTML='<div class="garage-section-head"><h2>Recent maintenance</h2><button type="button" onclick="go(\'log\')">View history <span aria-hidden="true">↗</span></button></div><div id="garageRecentList"></div>';
  home.insertBefore(recent,home.querySelector('.garage-disclosure'));
  const review=document.createElement('button');review.id='garageScheduleReview';review.className='garage-review-note';review.type='button';review.hidden=true;review.onclick=()=>go('upcoming');overviewAfter();
  function overviewAfter(){if(quick)quick.after(review);else home.append(review);}
  function wrapReference(pageId,label){
    const page=document.getElementById('page-'+pageId);const first=[...page.querySelectorAll(':scope > .section-label')].find(x=>x.textContent.includes(label));if(!first)return;
    const details=document.createElement('details');details.className='garage-disclosure';const summary=document.createElement('summary');summary.textContent=pageId==='backup'?'Advanced data tools & reset controls':label;details.append(summary);const body=document.createElement('div');body.className='garage-disclosure-body';let el=first;while(el){const next=el.nextSibling;body.append(el);el=next;}details.append(body);page.append(details);
  }
  wrapReference('upcoming','Official Toyota Schedule');
  wrapReference('backup','For ChatGPT');
  const advanced=q('#page-backup .garage-disclosure-body');
  if(advanced){
    const danger=[...advanced.children].find(el=>el.classList.contains('section-label')&&el.textContent==='Danger Zone');
    if(danger){while(advanced.firstChild&&advanced.firstChild!==danger)advanced.firstChild.remove();danger.textContent='Reset controls';}
  }
  // Show the actionable service list before interval customization.
  const schedule=q('#page-upcoming'),controls=q('#scheduleControlsToggle')?.closest('.card');
  if(controls){const heading=controls.previousElementSibling?.previousElementSibling;const intro=controls.previousElementSibling;const reference=schedule.querySelector('.garage-disclosure');if(heading?.classList.contains('section-label'))schedule.insertBefore(heading,reference);if(intro?.classList.contains('alert'))intro.remove();schedule.insertBefore(controls,reference);}
  const search=document.createElement('div');search.className='garage-search';search.innerHTML='<label for="garageHistorySearch">Find a service</label><input id="garageHistorySearch" type="search" placeholder="Search service, shop or notes…" autocomplete="off"><div id="garageHistoryCount" class="garage-search-count"></div>';
  const log=q('#page-log');log.insertBefore(search,q('#logList'));search.querySelector('input').addEventListener('input',filterHistory);
  function filterHistory(){const value=search.querySelector('input').value.trim().toLowerCase();let count=0;document.querySelectorAll('#logList > .log-item').forEach(item=>{const visible=item.textContent.toLowerCase().includes(value);item.hidden=!visible;if(visible)count++;});q('#garageHistoryCount').textContent=count+' service record'+(count===1?'':'s')+(value?' found':'');}
  const guideSearch=document.createElement('div');guideSearch.className='garage-search';guideSearch.innerHTML='<label for="garageGuideSearch">Find a guide</label><input id="garageGuideSearch" type="search" placeholder="Oil, filters, battery, tires…" autocomplete="off"><div class="garage-search-count" id="garageGuideCount"></div>';q('#page-guides').insertBefore(guideSearch,q('#page-guides').children[1]);
  guideSearch.querySelector('input').addEventListener('input',()=>{const value=guideSearch.querySelector('input').value.toLowerCase().trim();let count=0;q('#page-guides').querySelectorAll('.guide-item').forEach(item=>{item.hidden=!item.textContent.toLowerCase().includes(value);if(!item.hidden)count++;});q('#garageGuideCount').textContent=count+' guide'+(count===1?'':'s')+' found';});
  function polishHistory(){
    document.querySelectorAll('#logList .log-item').forEach(item=>{
      if(item.querySelector('.garage-log-details'))return;
      const nodes=[...item.children].filter(el=>el.matches('.log-desc,.log-parts-summary,.log-parts-grid,.log-photo-wrap,.photo-wrap,.photo-actions'));
      if(!nodes.length)return;
      const details=document.createElement('details');details.className='garage-log-details';const summary=document.createElement('summary');summary.textContent='Service details & receipts';details.append(summary);nodes.forEach(el=>details.append(el));item.append(details);
      const del=item.querySelector('.delete-btn');if(del){del.setAttribute('aria-label','Delete this service record');del.title='Delete this service record';}
    });filterHistory();
  }
  function refreshHome(){
    const entries=[...getData()].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.mi)-Number(a.mi));
    const list=q('#garageRecentList');list.replaceChildren();
    entries.slice(0,3).forEach(entry=>{const button=document.createElement('button');button.type='button';button.className='garage-recent-item';button.onclick=()=>go('log');const main=document.createElement('span');const title=document.createElement('strong');title.textContent=LABELS[entry.type]||'Service';const note=document.createElement('small');note.textContent=new Date(entry.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' · '+Number(entry.mi).toLocaleString()+' mi';main.append(title,note);const cost=document.createElement('b');cost.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(getEntryDisplayCost(entry));button.append(main,cost);list.append(button);});
    if(!entries.length){const p=document.createElement('p');p.className='garage-empty';p.textContent='Your service history starts with your first entry.';list.append(p);}
    const state=getRecurringServicesState();const unknown=state.rules.filter(r=>!r.watchOnly&&!r.nextDueDate&&r.nextDueMileage===null);review.hidden=!unknown.length;review.textContent=unknown.length+' service reminder'+(unknown.length===1?' needs':'s need')+' a completed-service date · Review schedule ↗';
    const label=q('#dHeroLabel');if(label)label.textContent=label.textContent.replace('⭐ True Next Due','Next service');
  }
  const originalLog=window.renderLog;window.renderLog=function(){originalLog.apply(this,arguments);polishHistory();};
  const originalDash=window.renderDash;window.renderDash=function(){originalDash.apply(this,arguments);refreshHome();};
  const originalUpcoming=window.renderUpcoming;window.renderUpcoming=function(){originalUpcoming.apply(this,arguments);document.querySelectorAll('#upcomingRecurringList .svc-item').forEach(item=>{if(item.textContent.includes('Schedule unavailable')){item.classList.add('garage-needs-review');const badge=item.querySelector('.badge');if(badge)badge.textContent='Needs a date';}});};
  refreshHome();polishHistory();window.renderUpcoming();
  window.addEventListener('load',()=>{
    document.querySelectorAll('.page').forEach(page=>{const heading=page.querySelector(':scope > .garage-page-heading');if(heading)page.prepend(heading);});
    refreshHome();
  });
})();
