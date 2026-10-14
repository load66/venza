/* The app release takes precedence over historical data-patch version badges. */
(function(){
  window.VENZA_RUNTIME_VERSION=APP_VERSION;
  window.VENZA_RUNTIME_BUILD=APP_BUILD;
  window.VENZA_RUNTIME_UPDATED=APP_UPDATED;
  const previous=window.renderAppVersion;
  window.renderAppVersion=function(){
    if(typeof previous==='function')previous();
    const short='APP v'+APP_VERSION+' · '+APP_UPDATED;
    const full=short+' · build '+APP_BUILD;
    const badge=document.getElementById('appVersionBadge');
    if(badge){badge.textContent=short;badge.title=full;}
    const backup=document.getElementById('bkVersion');if(backup)backup.textContent=full;
    document.documentElement.dataset.appVersion=APP_VERSION;
  };
  renderAppVersion();
})();
