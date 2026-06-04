/* ============================================================
   simulator.js — Logique complète du simulateur de crédit
   KreditProfi Deutschland — Calculs en temps réel, graphique,
   tableau d'amortissement, transmission vers le formulaire
   ============================================================ */

'use strict';

// ── CONFIGURATION DES TYPES DE PRÊTS ─────────────────────────

const LOAN_CONFIGS = {
  privatkredit:       { label: 'Privatkredit',       icon: '💼', min: 1000,   max: 75000,   minMonths: 12, maxMonths: 120, defaultRate: 1.99,  defaultAmount: 10000, defaultMonths: 36  },
  immobilienkredit:   { label: 'Immobilienkredit',   icon: '🏠', min: 50000,  max: 1000000, minMonths: 60, maxMonths: 360, defaultRate: 0.89,  defaultAmount: 200000,defaultMonths: 180 },
  autokredit:         { label: 'Autokredit',         icon: '🚗', min: 5000,   max: 100000,  minMonths: 12, maxMonths: 96,  defaultRate: 2.49,  defaultAmount: 15000, defaultMonths: 48  },
  hypothekendarlehen: { label: 'Hypothekendarlehen', icon: '🏦', min: 100000, max: 2000000, minMonths: 60, maxMonths: 480, defaultRate: 1.29,  defaultAmount: 300000,defaultMonths: 240 },
  kreditrueckkauf:    { label: 'Kreditrückkauf',     icon: '🔄', min: 5000,   max: 500000,  minMonths: 12, maxMonths: 300, defaultRate: 2.99,  defaultAmount: 20000, defaultMonths: 60  }
};

// ── ÉTAT COURANT DU SIMULATEUR ────────────────────────────────

let state = {
  type:     'privatkredit',
  amount:   10000,
  months:   36,
  rate:     1.99
};

// ── ÉLÉMENTS DOM ──────────────────────────────────────────────

const amountSlider   = document.getElementById('amount-slider');
const durationSlider = document.getElementById('duration-slider');
const rateSlider     = document.getElementById('rate-slider');

const amountDisplay   = document.getElementById('amount-display');
const durationDisplay = document.getElementById('duration-display');
const rateDisplay     = document.getElementById('rate-display');

const amountMinLabel  = document.getElementById('amount-min-label');
const amountMaxLabel  = document.getElementById('amount-max-label');
const durationMinLabel= document.getElementById('duration-min-label');
const durationMaxLabel= document.getElementById('duration-max-label');

// Résultats
const resultMonthly   = document.getElementById('result-monthly');
const resultPrincipal = document.getElementById('result-principal');
const resultRate      = document.getElementById('result-rate');
const resultTotalInt  = document.getElementById('result-total-interest');
const resultDuration  = document.getElementById('result-duration');
const resultTotal     = document.getElementById('result-total');

// Décomposition
const decompCapital     = document.getElementById('decomp-capital');
const decompInterest    = document.getElementById('decomp-interest');
const decompCapitalPct  = document.getElementById('decomp-capital-pct');
const decompInterestPct = document.getElementById('decomp-interest-pct');

// Résumé
const summaryType = document.getElementById('summary-type');
const summaryRate = document.getElementById('summary-rate');

// Tableau récapitulatif
const sumType     = document.getElementById('sum-type');
const sumAmount   = document.getElementById('sum-amount');
const sumDuration = document.getElementById('sum-duration');
const sumRate     = document.getElementById('sum-rate');
const sumMonthly  = document.getElementById('sum-monthly');
const sumTotal    = document.getElementById('sum-total');

// ── CALCULS FINANCIERS ────────────────────────────────────────

/**
 * Calcule la mensualité d'un crédit (formule annuité constante)
 * @param {number} principal - Montant emprunté
 * @param {number} annualRate - Taux annuel en %
 * @param {number} months - Durée en mois
 * @returns {number} Mensualité
 */
function calculateMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12; // Taux mensuel
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Génère le plan d'amortissement complet
 * @returns {Array} Tableau des lignes d'amortissement
 */
function generateAmortizationSchedule() {
  const { amount, months, rate } = state;
  const r = rate / 100 / 12;
  const monthly = calculateMonthlyPayment(amount, rate, months);

  let balance = amount;
  const schedule = [];

  for (let m = 1; m <= months; m++) {
    const interestPayment  = balance * r;
    const principalPayment = monthly - interestPayment;
    balance -= principalPayment;
    if (balance < 0) balance = 0;

    schedule.push({
      month:     m,
      payment:   monthly,
      principal: principalPayment,
      interest:  interestPayment,
      balance:   balance
    });
  }

  return schedule;
}

// ── FORMATAGE ─────────────────────────────────────────────────

/**
 * Formate un nombre en format monétaire EUR (locale allemande)
 */
function fmtEur(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtEurWhole(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function fmtPct(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
}

// ── MISE À JOUR DE L'INTERFACE ────────────────────────────────

/**
 * Recalcule et met à jour tous les affichages en temps réel
 */
function updateSimulator() {
  const { amount, months, rate } = state;
  const monthly      = calculateMonthlyPayment(amount, rate, months);
  const totalPayment = monthly * months;
  const totalInterest= totalPayment - amount;

  // Mise à jour des affichages de valeur
  amountDisplay.textContent   = fmtEurWhole(amount);
  durationDisplay.textContent = months + ' Monate';
  rateDisplay.textContent     = fmtPct(rate);

  // Résultats principaux avec animation de transition
  animateResultValue(resultMonthly,  fmtEur(monthly));
  animateResultValue(resultTotal,    fmtEur(totalPayment));
  animateResultValue(resultTotalInt, fmtEur(totalInterest));

  resultPrincipal.textContent = fmtEurWhole(amount);
  resultRate.textContent      = fmtPct(rate);
  resultDuration.textContent  = months + ' Monate';

  // Décomposition capital / intérêts
  const capitalPct  = (amount / totalPayment) * 100;
  const interestPct = 100 - capitalPct;

  decompCapital.style.width    = capitalPct.toFixed(1) + '%';
  decompCapitalPct.textContent = capitalPct.toFixed(1) + '%';
  decompInterestPct.textContent= interestPct.toFixed(1) + '%';

  // Résumé compact
  const cfg = LOAN_CONFIGS[state.type];
  summaryType.textContent = cfg ? cfg.label : state.type;
  summaryRate.textContent = fmtPct(rate);

  // Tableau récapitulatif
  if (sumType)     sumType.textContent     = cfg ? cfg.icon + ' ' + cfg.label : state.type;
  if (sumAmount)   sumAmount.textContent   = fmtEurWhole(amount);
  if (sumDuration) sumDuration.textContent = months + ' Monate';
  if (sumRate)     sumRate.textContent     = fmtPct(rate);
  if (sumMonthly)  sumMonthly.innerHTML    = `<strong style="color:var(--color-accent);">${fmtEur(monthly)}</strong>`;
  if (sumTotal)    sumTotal.textContent    = fmtEur(totalPayment);

  // Mise à jour du texte légal en bas du panneau de résultats
  updateRepresentativeText(amount, months, rate, monthly, totalPayment);

  // Mise à jour du graphique
  drawAmortizationChart();

  // Mise à jour du tableau d'amortissement si ouvert
  const tableWrap = document.getElementById('amortization-table');
  if (tableWrap && tableWrap.classList.contains('open')) {
    renderAmortizationTable();
  }

  // Mise à jour des backgrounds des sliders
  [amountSlider, durationSlider, rateSlider].forEach(s => {
    if (s && window.UI) window.UI.updateSliderBackground(s);
  });
}

/**
 * Anime la transition d'une valeur dans un élément DOM
 */
function animateResultValue(el, newValue) {
  if (!el) return;
  el.style.transform = 'scale(0.95)';
  el.style.opacity = '0.7';
  el.textContent = newValue;
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
    }, 50);
  });
}

/**
 * Met à jour le texte représentatif en bas du simulateur
 */
function updateRepresentativeText(amount, months, rate, monthly, total) {
  const repEl = document.querySelector('.simulator-results p:last-child');
  if (!repEl) return;
  const cfg = LOAN_CONFIGS[state.type];
  repEl.textContent =
    `Unverbindliche Berechnung. Repräsentatives Beispiel: ` +
    `Nettokreditbetrag ${fmtEurWhole(amount)}, ` +
    `Laufzeit ${months} Monate, ` +
    `Sollzinssatz ${fmtPct(rate)} (fest), ` +
    `effektiver Jahreszins ${fmtPct(rate)}. ` +
    `Gesamtbetrag: ${fmtEur(total)}. ` +
    `Monatliche Rate: ${fmtEur(monthly)}.`;
}

// ── GRAPHIQUE CANVAS D'AMORTISSEMENT ─────────────────────────

let chartInstance = null;

/**
 * Dessine le graphique d'évolution capital/intérêts/restschuld
 */
function drawAmortizationChart() {
  const canvas = document.getElementById('amortization-chart');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.parentElement.clientWidth - 48;
  const H      = 300;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const schedule = generateAmortizationSchedule();
  const months   = schedule.length;

  // Couleurs
  const colorCapital  = '#1E3A8A';
  const colorInterest = '#C9A84C';
  const colorBalance  = '#CBD5E1';

  // Marges
  const pad = { top: 20, right: 20, bottom: 50, left: 70 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Fond
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, W, H);

  // Grille horizontale
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth   = 1;
  const maxVal = state.amount;

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i / 4) * cH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();

    // Étiquettes axe Y
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const labelVal = (maxVal * i / 4);
    ctx.fillText(fmtEurWhole(labelVal), pad.left - 8, y + 4);
  }

  // Nombre de points à afficher (max 60 pour lisibilité)
  const step   = Math.max(1, Math.floor(months / 60));
  const points = [];
  for (let i = 0; i < months; i += step) {
    points.push(schedule[i]);
  }
  if (points[points.length - 1] !== schedule[months - 1]) {
    points.push(schedule[months - 1]);
  }

  const n = points.length;

  /**
   * Convertit une valeur et un index en coordonnées canvas
   */
  function toX(idx) { return pad.left + (idx / (n - 1)) * cW; }
  function toY(val) { return pad.top + cH - (val / maxVal) * cH; }

  // ── Aire de la restschuld (fond gris clair) ──
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].balance));
  points.forEach((p, i) => { ctx.lineTo(toX(i), toY(p.balance)); });
  ctx.lineTo(toX(n - 1), pad.top + cH);
  ctx.lineTo(toX(0),     pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(203,213,225,0.35)';
  ctx.fill();

  // ── Courbe restschuld ──
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].balance));
  points.forEach((p, i) => { ctx.lineTo(toX(i), toY(p.balance)); });
  ctx.strokeStyle = colorBalance;
  ctx.lineWidth   = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Aire part capital (bleu) ──
  const capitalCum = [];
  let cumCap = 0;
  points.forEach(p => {
    cumCap += p.principal;
    capitalCum.push(Math.min(cumCap, maxVal));
  });

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(0));
  capitalCum.forEach((v, i) => { ctx.lineTo(toX(i), toY(v)); });
  ctx.lineTo(toX(n - 1), pad.top + cH);
  ctx.lineTo(toX(0),     pad.top + cH);
  ctx.closePath();
  const gradCapital = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  gradCapital.addColorStop(0, 'rgba(30,58,138,0.7)');
  gradCapital.addColorStop(1, 'rgba(30,58,138,0.1)');
  ctx.fillStyle = gradCapital;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(0));
  capitalCum.forEach((v, i) => { ctx.lineTo(toX(i), toY(v)); });
  ctx.strokeStyle = colorCapital;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // ── Aire part intérêts (or) ──
  const interestCum = [];
  let cumInt = 0;
  points.forEach(p => {
    cumInt += p.interest;
    interestCum.push(Math.min(cumCap + cumInt, maxVal * 1.2));
  });

  // ── Axe X (mois) ──
  ctx.fillStyle   = '#94A3B8';
  ctx.font        = '11px Inter, sans-serif';
  ctx.textAlign   = 'center';
  const labelStep = Math.max(1, Math.ceil(n / 8));

  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === n - 1) {
      const x = toX(i);
      ctx.beginPath();
      ctx.moveTo(x, pad.top + cH);
      ctx.lineTo(x, pad.top + cH + 5);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText('M' + p.month, x, pad.top + cH + 18);
    }
  });

  // Label axe X
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('Monat', pad.left + cW / 2, H - 5);
}

// ── TABLEAU D'AMORTISSEMENT ───────────────────────────────────

/**
 * Génère et affiche le tableau HTML d'amortissement
 */
function renderAmortizationTable() {
  const tbody = document.getElementById('amortization-tbody');
  if (!tbody) return;

  const schedule = generateAmortizationSchedule();
  const rows = [];

  // Couleur alternée pour les lignes et mise en évidence du mi-parcours
  schedule.forEach((row, idx) => {
    const isHalf    = idx === Math.floor(schedule.length / 2);
    const isLast    = idx === schedule.length - 1;
    const highlight = isHalf || isLast;

    rows.push(`
      <tr style="${highlight ? 'background:rgba(30,58,138,0.04);font-weight:700;' : ''}">
        <td style="font-weight:600;color:var(--color-accent);">
          ${isHalf ? '⭐ ' : ''}${isLast ? '🏁 ' : ''}${row.month}
        </td>
        <td>${fmtEur(row.payment)}</td>
        <td style="color:var(--color-accent);">${fmtEur(row.principal)}</td>
        <td style="color:var(--color-secondary-dark);">${fmtEur(row.interest)}</td>
        <td style="font-weight:${isLast ? '800' : '400'};color:${isLast ? 'var(--color-success)' : 'inherit'};">
          ${isLast ? '✓ ' : ''}${fmtEur(Math.max(0, row.balance))}
        </td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('');
}

// ── GESTION DES ÉVÉNEMENTS ────────────────────────────────────

/**
 * Initialise le sélecteur de type de prêt
 */
function initLoanTypeSelector() {
  const buttons = document.querySelectorAll('.loan-type-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Activer ce bouton
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Récupérer la config du type sélectionné
      const type = btn.dataset.type;
      const cfg  = LOAN_CONFIGS[type];
      if (!cfg) return;

      state.type   = type;
      state.rate   = cfg.defaultRate;

      // Mettre à jour les limites des sliders
      amountSlider.min   = cfg.min;
      amountSlider.max   = cfg.max;
      amountSlider.step  = cfg.max >= 100000 ? 5000 : 500;
      amountSlider.value = Math.min(Math.max(state.amount, cfg.min), cfg.max);

      durationSlider.min   = cfg.minMonths;
      durationSlider.max   = cfg.maxMonths;
      durationSlider.step  = cfg.maxMonths >= 240 ? 12 : 6;
      durationSlider.value = Math.min(Math.max(state.months, cfg.minMonths), cfg.maxMonths);

      rateSlider.value = cfg.defaultRate;
      rateSlider.min   = 0.5;
      rateSlider.max   = Math.max(15, cfg.defaultRate + 5);

      // Mettre à jour les labels min/max
      amountMinLabel.textContent    = fmtEurWhole(cfg.min);
      amountMaxLabel.textContent    = fmtEurWhole(cfg.max);
      durationMinLabel.textContent  = cfg.minMonths + ' Monate';
      durationMaxLabel.textContent  = cfg.maxMonths + ' Monate';

      // Mettre à jour l'état
      state.amount = parseFloat(amountSlider.value);
      state.months = parseInt(durationSlider.value);
      state.rate   = cfg.defaultRate;

      updateSimulator();
    });
  });
}

/**
 * Initialise les sliders et leur écoute d'événements
 */
function initSliders() {
  if (!amountSlider || !durationSlider || !rateSlider) return;

  // Montant
  amountSlider.addEventListener('input', () => {
    state.amount = parseFloat(amountSlider.value);
    updateSimulator();
  });

  // Durée
  durationSlider.addEventListener('input', () => {
    state.months = parseInt(durationSlider.value);
    updateSimulator();
  });

  // Taux
  rateSlider.addEventListener('input', () => {
    state.rate = parseFloat(rateSlider.value);
    updateSimulator();
  });
}

/**
 * Initialise le bouton d'affichage du tableau d'amortissement
 */
function initAmortizationToggle() {
  const toggle   = document.getElementById('amortization-toggle');
  const tableWrap= document.getElementById('amortization-table');
  const arrow    = document.getElementById('toggle-arrow');
  if (!toggle || !tableWrap) return;

  toggle.addEventListener('click', () => {
    const isOpen = tableWrap.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen.toString());
    if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
    if (isOpen) {
      renderAmortizationTable();
      setTimeout(() => {
        tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  });
}

// ── TRANSMISSION VERS LE FORMULAIRE DE DEMANDE ────────────────

/**
 * Passe les paramètres de simulation à la page de demande via sessionStorage
 */
function sendToApplication() {
  const simData = {
    type:    state.type,
    amount:  state.amount,
    months:  state.months,
    rate:    state.rate,
    monthly: calculateMonthlyPayment(state.amount, state.rate, state.months)
  };

  // Stocker les données pour récupération dans le formulaire
  try {
    sessionStorage.setItem('kreditprofi_sim', JSON.stringify(simData));
  } catch (e) {
    console.warn('sessionStorage non disponible');
  }

  // Rediriger vers la page de demande avec les paramètres en URL
  const params = new URLSearchParams({
    type:   simData.type,
    amount: simData.amount,
    months: simData.months
  });

  window.location.href = `beantragen.html?${params.toString()}`;
}

// ── LECTURE DES PARAMÈTRES URL ────────────────────────────────

/**
 * Pré-remplit le simulateur si des paramètres sont passés en URL
 * Exemple : simulation.html?type=autokredit
 */
function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  const typeParam = params.get('type');

  if (typeParam && LOAN_CONFIGS[typeParam]) {
    // Simuler un clic sur le bon bouton
    const btn = document.querySelector(`.loan-type-btn[data-type="${typeParam}"]`);
    if (btn) btn.click();
  }

  // Restaurer depuis sessionStorage si retour depuis le formulaire
  try {
    const stored = sessionStorage.getItem('kreditprofi_sim');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.type && LOAN_CONFIGS[data.type]) {
        const btn = document.querySelector(`.loan-type-btn[data-type="${data.type}"]`);
        if (btn) btn.click();
      }
    }
  } catch (e) { /* silencieux */ }
}

// ── REDIMENSIONNEMENT DU GRAPHIQUE ────────────────────────────

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawAmortizationChart();
  }, 200);
}, { passive: true });

// ── INITIALISATION ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initLoanTypeSelector();
  initSliders();
  initAmortizationToggle();
  readURLParams();

  // Premier rendu complet
  updateSimulator();

  // Mettre à jour les backgrounds des sliders
  [amountSlider, durationSlider, rateSlider].forEach(s => {
    if (s && window.UI) window.UI.updateSliderBackground(s);
  });

  // Mettre à jour le bouton d'application avec les données de simulation
  const applyBtn = document.getElementById('hero-apply-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendToApplication();
    });
  }
});

// Export pour accès depuis d'autres modules (ex: wizard.js)
window.Simulator = {
  getState: () => ({ ...state }),
  sendToApplication
};
