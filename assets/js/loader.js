/* ============================================================
   loader.js — Loader de page KreditProfi Deutschland
   Corrections :
   - Retour navigateur (bfcache / pageshow) → masque le loader
   - Fallback ultra-court (1.5s max au lieu de 4s)
   - Pas de re-inject si déjà dans le DOM
   ============================================================ */

(function () {
  'use strict';

  const LOADER_HTML = `
    <div id="page-loader" role="status" aria-label="Seite wird geladen">
      <div class="loader-logo">
        <div class="loader-logo-icon">💰</div>
        <div class="loader-logo-text">KreditProfi<span>Deutschland</span></div>
      </div>
      <div class="loader-spinner-wrap">
        <div class="loader-spinner"></div>
        <div class="loader-spinner-inner"></div>
      </div>
      <div class="loader-progress-bar">
        <div class="loader-progress-fill"></div>
      </div>
    </div>`;

  let _loaderVisible = false;
  let _hideTimer = null;

  // ── Masquer le loader ──────────────────────────────────────
  function hideLoader(delay) {
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(function () {
      const loader = document.getElementById('page-loader');
      if (!loader) return;
      loader.classList.add('hidden');
      _loaderVisible = false;
      document.body.classList.remove('page-transitioning');
      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 480);
    }, delay !== undefined ? delay : 260);
  }

  // ── Injecter le loader au chargement initial ───────────────
  function injectLoader() {
    if (document.getElementById('page-loader')) return;
    document.body.insertAdjacentHTML('afterbegin', LOADER_HTML);
    _loaderVisible = true;
  }

  document.addEventListener('DOMContentLoaded', injectLoader);

  // ── Masquer quand la page est prête ───────────────────────
  if (document.readyState === 'complete') {
    // Page déjà chargée (ex: retour bfcache instantané)
    hideLoader(0);
  } else {
    window.addEventListener('load', function () { hideLoader(260); });
    // Fallback court : 1.5s max, évite le loader infini
    setTimeout(function () { hideLoader(0); }, 1500);
  }

  // ── FIX RETOUR NAVIGATEUR (bfcache / pageshow) ───────────
  // C'est la vraie cause du loader infini : quand on revient
  // via le bouton retour, le bfcache restaure la page avec
  // le loader visible. On le masque immédiatement.
  window.addEventListener('pageshow', function (e) {
    // persisted = true → page restaurée depuis le cache navigateur (bfcache)
    if (e.persisted || (window.performance && performance.navigation.type === 2)) {
      hideLoader(0);
      // Sécurité : enlever aussi tout éventuel css-loading sur le body
      document.body.style.visibility = '';
      document.body.style.opacity = '';
      document.body.classList.remove('css-loading');
      document.body.classList.add('css-ready');
    }
  });

  // ── Loader sur navigation interne ─────────────────────────
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignorer les liens non-navigants
    if (
      href.startsWith('http') || href.startsWith('//') ||
      href.startsWith('#')    || href.startsWith('mailto:') ||
      href.startsWith('tel:') || href.startsWith('javascript:') ||
      link.getAttribute('target') === '_blank' ||
      link.hasAttribute('download') ||
      e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
    ) return;

    // Même page → pas de loader
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (href === currentPage || href === '#') return;

    e.preventDefault();
    showTransitionLoader(href);
  });

  function showTransitionLoader(href) {
    if (_loaderVisible) return;

    if (!document.getElementById('page-loader')) {
      document.body.insertAdjacentHTML('afterbegin', LOADER_HTML);
    } else {
      document.getElementById('page-loader').classList.remove('hidden');
    }
    _loaderVisible = true;
    document.body.classList.add('page-transitioning');

    setTimeout(function () { window.location.href = href; }, 200);
  }

})();
