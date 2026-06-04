/* ============================================================
   ui.js — Utilitaires interface utilisateur
   KreditProfi Deutschland — Notifications, modals, loaders
   ============================================================ */

'use strict';

// ── GESTIONNAIRE DE NOTIFICATIONS TOAST ──────────────────────

const Toast = {

  // Conteneur des toasts (créé au premier appel)
  _container: null,

  // Initialise ou retourne le conteneur
  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      this._container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  // Affiche un toast
  // type : 'success' | 'error' | 'warning' | 'info'
  show(message, type = 'info', title = null, duration = window.KP?.TOAST_DURATION || 5000) {
    const container = this._getContainer();

    // Icônes selon le type
    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️'
    };

    // Titres par défaut selon le type (en allemand)
    const defaultTitles = {
      success: 'Erfolg',
      error:   'Fehler',
      warning: 'Warnung',
      info:    'Hinweis'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitles[type] || type}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Schließen">×</button>
    `;

    // Bouton fermeture
    toastEl.querySelector('.toast-close').addEventListener('click', () => {
      this._dismiss(toastEl);
    });

    container.appendChild(toastEl);

    // Fermeture automatique après `duration` ms
    if (duration > 0) {
      setTimeout(() => this._dismiss(toastEl), duration);
    }

    return toastEl;
  },

  // Ferme un toast avec animation de sortie
  _dismiss(toastEl) {
    toastEl.style.animation = 'slideInRight 0.3s ease reverse';
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 300);
  },

  // Raccourcis
  success(msg, title = null) { return this.show(msg, 'success', title); },
  error(msg, title = null)   { return this.show(msg, 'error', title); },
  warning(msg, title = null) { return this.show(msg, 'warning', title); },
  info(msg, title = null)    { return this.show(msg, 'info', title); }
};


// ── GESTIONNAIRE DE LOADER ────────────────────────────────────

const Loader = {

  _overlay: null,

  // Affiche un loader plein écran
  show(message = 'Bitte warten...') {
    if (this._overlay) return;
    this._overlay = document.createElement('div');
    this._overlay.className = 'loader-overlay';
    this._overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1.5rem;">
        <div class="loader"></div>
        <p style="color:rgba(255,255,255,0.8);font-size:0.9rem;font-weight:500;">${message}</p>
      </div>
    `;
    document.body.appendChild(this._overlay);
    document.body.style.overflow = 'hidden';
  },

  // Masque le loader
  hide() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      this._overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        if (this._overlay && this._overlay.parentNode) {
          this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
        document.body.style.overflow = '';
      }, 200);
    }
  }
};


// ── GESTIONNAIRE DE MODALS ────────────────────────────────────

const Modal = {

  _current: null,

  // Crée et affiche une modal
  show({ title, content, footer = null, onClose = null, size = 'md' }) {
    this.close(); // Fermer toute modal existante

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal ${size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 style="margin:0;font-size:1.25rem;">${title}</h3>
          <button class="modal-close-btn" aria-label="Schließen"
            style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;line-height:1;padding:0;">
            ×
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    // Fermeture via bouton ×
    backdrop.querySelector('.modal-close-btn').addEventListener('click', () => {
      this.close();
      if (onClose) onClose();
    });

    // Fermeture via clic sur le backdrop
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.close();
        if (onClose) onClose();
      }
    });

    // Fermeture via Escape
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        if (onClose) onClose();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    this._current = backdrop;
    return backdrop;
  },

  // Ferme la modal active
  close() {
    if (this._current) {
      this._current.style.opacity = '0';
      this._current.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        if (this._current && this._current.parentNode) {
          this._current.parentNode.removeChild(this._current);
        }
        this._current = null;
        document.body.style.overflow = '';
      }, 200);
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },

  // Modal de confirmation simple
  confirm(message, onConfirm, onCancel = null) {
    this.show({
      title: 'Bestätigung',
      content: `<p style="color:#495057;margin:0;">${message}</p>`,
      footer: `
        <button class="btn btn-outline btn-sm" id="modal-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm">Bestätigen</button>
      `
    });
    setTimeout(() => {
      document.getElementById('modal-cancel')?.addEventListener('click', () => {
        this.close();
        if (onCancel) onCancel();
      });
      document.getElementById('modal-confirm')?.addEventListener('click', () => {
        this.close();
        onConfirm();
      });
    }, 50);
  }
};


// ── GESTION DES ACCORDÉONS ────────────────────────────────────

function initAccordions(selector = '.accordion-item') {
  const items = document.querySelectorAll(selector);
  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (!header) return;
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Fermer tous les autres
      items.forEach(i => i.classList.remove('open'));
      // Ouvrir celui-ci si était fermé
      if (!isOpen) item.classList.add('open');
    });
  });
}


// ── GESTION DES TABS ──────────────────────────────────────────

function initTabs(containerSelector = '.tabs-container') {
  const containers = document.querySelectorAll(containerSelector);
  containers.forEach(container => {
    const buttons = container.querySelectorAll('.tab-btn');
    const contents = container.querySelectorAll('.tab-content');

    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        if (contents[i]) contents[i].classList.add('active');
      });
    });
  });
}


// ── HEADER SCROLL EFFECT ──────────────────────────────────────

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const isTransparent = header.classList.contains('header-transparent');

  function handleScroll() {
    if (window.scrollY > 80) {
      header.classList.add('header-scrolled');
      header.classList.remove('header-transparent');
    } else if (isTransparent) {
      header.classList.remove('header-scrolled');
      header.classList.add('header-transparent');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Appel initial
}


// ── MENU MOBILE ───────────────────────────────────────────────

function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const menu    = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // iOS: prevent background scroll
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  toggle.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  // Fermer en cliquant sur un lien
  menu.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Fermer avec Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  // Fermer si on repasse en desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && menu.classList.contains('open')) closeMenu();
  });
}


// ── MARQUAGE DU LIEN ACTIF DANS LA NAV ───────────────────────

function markActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const allLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || href === './' + currentPath)) {
      link.classList.add('active');
    }
  });
}


// ── MISE À JOUR DU HEADER SELON L'ÉTAT DE CONNEXION ──────────

function updateNavAuth() {
  const loginBtn    = document.getElementById('nav-login-btn');
  const logoutBtn   = document.getElementById('nav-logout-btn');
  const accountLink = document.getElementById('nav-account-link');
  const notifArea   = document.getElementById('nav-notif-area');

  const loggedIn = window.KP?.isLoggedIn?.();

  if (loginBtn)    loginBtn.style.display    = loggedIn ? 'none' : '';
  if (logoutBtn)   logoutBtn.style.display   = loggedIn ? '' : 'none';
  if (accountLink) accountLink.style.display = loggedIn ? '' : 'none';
  if (notifArea)   notifArea.style.display   = loggedIn ? '' : 'none';

  // Afficher le nom de l'utilisateur connecté si disponible
  const user = window.KP?.getCurrentUser?.();
  const userNameEl = document.getElementById('nav-user-name');
  if (userNameEl && user) {
    userNameEl.textContent = user.vorname || user.email;
  }
}


// ── VALIDATION SIMPLE D'UN CHAMP ─────────────────────────────

function validateField(input) {
  const value   = input.value.trim();
  const type    = input.type;
  const name    = input.name;
  const required = input.required || input.hasAttribute('required');
  const msgs    = window.KP?.ERROR_MESSAGES || {};

  let error = '';

  // Champ requis vide
  if (required && !value) {
    error = msgs.required || 'Pflichtfeld';
  }
  // Email
  else if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error = msgs.email || 'Ungültige E-Mail';
  }
  // Téléphone
  else if (type === 'tel' && value && !/^[\d\s\+\-\(\)]{8,20}$/.test(value)) {
    error = msgs.phone || 'Ungültige Telefonnummer';
  }
  // Code postal allemand
  else if (name === 'plz' && value && !/^\d{5}$/.test(value)) {
    error = msgs.plz || 'Ungültige PLZ';
  }

  // Afficher ou masquer le message d'erreur
  const group = input.closest('.form-group');
  const errorEl = group?.querySelector('.form-error');

  if (error) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    if (errorEl) errorEl.textContent = error;
  } else if (value) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    if (errorEl) errorEl.textContent = '';
  }

  return !error;
}


// ── VALIDATION D'UN FORMULAIRE COMPLET ───────────────────────

function validateForm(formEl) {
  const inputs = formEl.querySelectorAll('input[required], select[required], textarea[required]');
  let valid = true;
  inputs.forEach(input => {
    if (!validateField(input)) valid = false;
  });
  return valid;
}


// ── FORMATAGE EN TEMPS RÉEL DES CHAMPS ───────────────────────

function initFieldFormatting() {
  // IBAN : espaces automatiques toutes les 4 lettres
  document.querySelectorAll('input[name="iban"]').forEach(input => {
    input.addEventListener('input', () => {
      const val = input.value.replace(/\s/g, '').toUpperCase();
      input.value = val.replace(/(.{4})/g, '$1 ').trim();
    });
  });

  // Montant : pas de saisie négative
  document.querySelectorAll('input[type="number"][min="0"]').forEach(input => {
    input.addEventListener('input', () => {
      if (parseFloat(input.value) < 0) input.value = 0;
    });
  });
}


// ── SMOOTH SCROLL POUR LES ANCRES ────────────────────────────

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = (window.innerWidth <= 768 ? 64 : 80) + 20; // hauteur header + marge
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}


// ── MISE À JOUR DU SLIDER DE RANGE ───────────────────────────

function updateSliderBackground(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right,
    var(--color-accent) 0%,
    var(--color-secondary) ${pct}%,
    var(--color-gray-200) ${pct}%,
    var(--color-gray-200) 100%
  )`;
}

function initRangeSliders() {
  document.querySelectorAll('.range-slider').forEach(slider => {
    updateSliderBackground(slider);
    slider.addEventListener('input', () => updateSliderBackground(slider));
  });
}


// ── INITIALISATION GLOBALE ────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  markActiveNavLink();
  updateNavAuth();
  initAccordions();
  initTabs();
  initSmoothScroll();
  initRangeSliders();
  initFieldFormatting();
});

// Export global pour utilisation dans d'autres modules
window.Toast  = Toast;
window.Loader = Loader;
window.Modal  = Modal;
window.UI = {
  validateField,
  validateForm,
  updateSliderBackground,
  updateNavAuth
};
