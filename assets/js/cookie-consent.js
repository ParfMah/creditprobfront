/* cookie-consent.js — Consentement cookies DSGVO KreditProfi Deutschland */
(function(){
  'use strict';
  const KEY='kp_cookie_consent', VER='1.0';
  const HTML=`<div id="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-live="polite">
  <div class="cookie-inner">
    <div class="cookie-icon">🍪</div>
    <div class="cookie-text">
      <strong id="cookie-title">Wir verwenden Cookies</strong>
      <p>Wir nutzen technisch notwendige Cookies sowie optionale Analyse-Cookies. Weitere Infos in unserer <a href="datenschutz.html">Datenschutzerklärung</a> und <a href="cookie-richtlinie.html">Cookie-Richtlinie</a>.</p>
    </div>
    <div class="cookie-actions">
      <button class="cookie-btn cookie-btn-accept" id="cookie-accept-all">✓ Alle akzeptieren</button>
      <button class="cookie-btn cookie-btn-essential" id="cookie-accept-essential">Nur notwendige</button>
      <button class="cookie-btn cookie-btn-settings" id="cookie-open-settings">⚙ Einstellungen</button>
    </div>
  </div>
</div>
<div id="cookie-settings-modal" role="dialog" aria-modal="true">
  <div class="cookie-modal-box">
    <div class="cookie-modal-header">
      <h3>Cookie-Einstellungen</h3>
      <button class="cookie-modal-close" id="cookie-modal-close">×</button>
    </div>
    <div class="cookie-modal-body">
      <p style="font-size:.85rem;color:#6b7280;margin-bottom:16px;">Wählen Sie aus, welche Cookies Sie zulassen möchten.</p>
      <div class="cookie-category">
        <div class="cookie-category-header"><span class="cookie-category-title">✅ Notwendige Cookies</span><label class="cookie-toggle"><input type="checkbox" checked disabled><span class="cookie-toggle-slider"></span></label></div>
        <p>Sitzungsverwaltung, Sicherheitstoken. Können nicht deaktiviert werden.</p>
      </div>
      <div class="cookie-category">
        <div class="cookie-category-header"><span class="cookie-category-title">📊 Analyse-Cookies</span><label class="cookie-toggle"><input type="checkbox" id="consent-analytics"><span class="cookie-toggle-slider"></span></label></div>
        <p>Helfen uns die Website-Nutzung zu verstehen (anonymisiert).</p>
      </div>
      <div class="cookie-category">
        <div class="cookie-category-header"><span class="cookie-category-title">🎯 Marketing-Cookies</span><label class="cookie-toggle"><input type="checkbox" id="consent-marketing"><span class="cookie-toggle-slider"></span></label></div>
        <p>Für personalisierte Werbung auf externen Plattformen.</p>
      </div>
    </div>
    <div class="cookie-modal-footer">
      <button class="cookie-btn cookie-btn-essential" id="cookie-save-settings" style="flex:none;">Auswahl speichern</button>
      <button class="cookie-btn cookie-btn-accept" id="cookie-accept-all-modal" style="flex:none;">✓ Alle akzeptieren</button>
    </div>
  </div>
</div>`;

  function getConsent(){try{const s=localStorage.getItem(KEY);if(!s)return null;const p=JSON.parse(s);return p.version===VER?p:null;}catch{return null;}}
  function save(a,m){try{localStorage.setItem(KEY,JSON.stringify({version:VER,date:new Date().toISOString(),necessary:true,analytics:!!a,marketing:!!m}));}catch{}}
  function hide(){const b=document.getElementById('cookie-banner');if(b){b.classList.remove('visible');setTimeout(()=>b.parentNode&&b.parentNode.removeChild(b),500);}const m=document.getElementById('cookie-settings-modal');if(m)m.classList.remove('open');}
  function show(){
    document.body.insertAdjacentHTML('beforeend',HTML);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=document.getElementById('cookie-banner');if(b)b.classList.add('visible');}));
    document.getElementById('cookie-accept-all')?.addEventListener('click',()=>{save(true,true);hide();});
    document.getElementById('cookie-accept-essential')?.addEventListener('click',()=>{save(false,false);hide();});
    document.getElementById('cookie-open-settings')?.addEventListener('click',()=>{document.getElementById('cookie-settings-modal')?.classList.add('open');});
    document.getElementById('cookie-modal-close')?.addEventListener('click',()=>{document.getElementById('cookie-settings-modal')?.classList.remove('open');});
    document.getElementById('cookie-settings-modal')?.addEventListener('click',(e)=>{if(e.target.id==='cookie-settings-modal')e.target.classList.remove('open');});
    document.getElementById('cookie-save-settings')?.addEventListener('click',()=>{save(document.getElementById('consent-analytics')?.checked,document.getElementById('consent-marketing')?.checked);hide();});
    document.getElementById('cookie-accept-all-modal')?.addEventListener('click',()=>{save(true,true);hide();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')document.getElementById('cookie-settings-modal')?.classList.remove('open');});
  }
  window.CookieConsent={hasConsent:()=>!!getConsent(),canAnalytics:()=>getConsent()?.analytics===true,canMarketing:()=>getConsent()?.marketing===true,reset:()=>{localStorage.removeItem(KEY);location.reload();},showSettings:()=>{if(!document.getElementById('cookie-settings-modal'))show();setTimeout(()=>document.getElementById('cookie-settings-modal')?.classList.add('open'),100);}};
  if(!getConsent()){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>setTimeout(show,800));}else{setTimeout(show,800);}}
})();
