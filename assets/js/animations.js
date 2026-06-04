/* ============================================================
   animations.js — Intersection Observer et compteurs animés
   KreditProfi Deutschland — Effets d'apparition au scroll
   ============================================================ */

'use strict';

// ── INTERSECTION OBSERVER — APPARITION AU SCROLL ─────────────

const ScrollAnimator = {

  _observer: null,

  // Initialise l'observer sur tous les éléments marqués `.animate-on-scroll`
  init(selector = '.animate-on-scroll') {
    if (!('IntersectionObserver' in window)) {
      // Fallback : rendre tout visible immédiatement
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Ne plus observer une fois visible (animation unique)
            this._observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,       // Déclenche quand 12% de l'élément est visible
        rootMargin: '0px 0px -60px 0px' // Marge basse pour retarder légèrement
      }
    );

    document.querySelectorAll(selector).forEach(el => {
      this._observer.observe(el);
    });
  },

  // Ajouter de nouveaux éléments à observer (pour le contenu chargé dynamiquement)
  observe(elements) {
    if (!this._observer) return;
    elements.forEach(el => this._observer.observe(el));
  }
};


// ── COMPTEURS ANIMÉS ─────────────────────────────────────────

const CounterAnimator = {

  _observer: null,
  _animated: new Set(),

  // Lance l'animation de comptage pour un élément
  // data-target : valeur finale
  // data-suffix : suffixe (€, +, %, etc.)
  // data-prefix : préfixe
  // data-duration : durée en ms (défaut 2000)
  _animateCounter(el) {
    const target   = parseFloat(el.getAttribute('data-target')) || 0;
    const suffix   = el.getAttribute('data-suffix') || '';
    const prefix   = el.getAttribute('data-prefix') || '';
    const duration = parseInt(el.getAttribute('data-duration')) || 2000;
    const decimals = parseInt(el.getAttribute('data-decimals')) || 0;

    const startTime = performance.now();
    const startVal  = 0;

    // Fonction d'easing (ease-out cubic)
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(currentTime) {
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedVal = easeOut(progress);
      const current  = startVal + (target - startVal) * easedVal;

      // Formatage selon la locale allemande
      const formatted = current.toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });

      el.textContent = prefix + formatted + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Valeur finale exacte
        const finalFormatted = target.toLocaleString('de-DE', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
        el.textContent = prefix + finalFormatted + suffix;
      }
    }

    requestAnimationFrame(step);
  },

  // Initialise l'observation des compteurs
  init(selector = '[data-counter]') {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => this._animateCounter(el));
      return;
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this._animated.has(entry.target)) {
            this._animated.add(entry.target);
            this._animateCounter(entry.target);
            this._observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    elements.forEach(el => this._observer.observe(el));
  }
};


// ── BARRE DE PROGRESSION DU SIMULATEUR ───────────────────────

function animateProgressBar(barEl, targetPct, duration = 800) {
  const start = performance.now();
  const from  = parseFloat(barEl.style.width) || 0;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    barEl.style.width = (from + (targetPct - from) * ease) + '%';
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}


// ── EFFET DE PARALLAXE LÉGER SUR LE HERO ─────────────────────

function initParallaxHero() {
  // Parallaxe CSS-only via will-change + transform3d — plus performant que JS scroll
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) return;
  // On utilise IntersectionObserver au lieu d'un scroll listener
  // pour savoir si la section est visible, rien de plus
}


// ── ANIMATION DE SAISIE (effet machine à écrire) ─────────────

function typeWriter(el, text, speed = 60, onComplete = null) {
  el.textContent = '';
  let i = 0;

  function type() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, speed);
    } else if (onComplete) {
      onComplete();
    }
  }

  type();
}


// ── ENTRÉE EN CASCADE POUR LES GRILLES DE CARTES ─────────────

function initStaggeredCards() {
  const grids = document.querySelectorAll('.stagger-children');
  grids.forEach(grid => {
    const children = Array.from(grid.children);
    children.forEach((child, i) => {
      child.classList.add('animate-on-scroll', 'fade-up');
      child.style.transitionDelay = `${i * 0.1}s`;
    });
  });
  // Re-observer les nouveaux éléments
  ScrollAnimator.observe(grids);
}


// ── BARRE DE CHARGEMENT PAGE (top bar) ───────────────────────

const PageLoader = {
  _bar: null,

  start() {
    if (!this._bar) {
      this._bar = document.createElement('div');
      this._bar.className = 'page-loader-bar';
      this._bar.style.width = '0%';
      document.body.appendChild(this._bar);
    }
    animateProgressBar(this._bar, 70, 500);
  },

  finish() {
    if (!this._bar) return;
    animateProgressBar(this._bar, 100, 300);
    setTimeout(() => {
      if (this._bar) {
        this._bar.style.opacity = '0';
        this._bar.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (this._bar && this._bar.parentNode) {
            this._bar.parentNode.removeChild(this._bar);
            this._bar = null;
          }
        }, 300);
      }
    }, 400);
  }
};


// ── ANIMATION DE L'ICÔNE DE STATISTIQUE ──────────────────────

function initStatIcons() {
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    card.classList.add('animate-on-scroll', 'zoom-in');
  });
}


// ── SCROLL TO TOP BUTTON ──────────────────────────────────────

function initScrollToTop() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


// ── INITIALISATION GLOBALE ────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  ScrollAnimator.init();
  CounterAnimator.init();
  initParallaxHero();
  initStaggeredCards();
  initScrollToTop();
  initStatIcons();
});

// Export global
window.Animations = {
  ScrollAnimator,
  CounterAnimator,
  PageLoader,
  animateProgressBar,
  typeWriter
};
