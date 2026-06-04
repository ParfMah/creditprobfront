/* ============================================================
   wizard.js — Logique du formulaire multi-étapes (wizard)
   KreditProfi Deutschland — 5 étapes, validation, soumission API
   ============================================================ */

'use strict';

// ── ÉTAT GLOBAL DU WIZARD ─────────────────────────────────────

const wizardState = {
  currentStep: 1,
  totalSteps: 5,
  data: {
    // Étape 1
    loanType: 'privatkredit',
    amount: 10000,
    months: 36,
    // Étape 2
    vorname: '', nachname: '', geburtsdatum: '',
    nationalitaet: '', strasse: '', plz: '', stadt: '',
    telefon: '', email: '',
    // Étape 3
    beschaeftigungsstatus: '', arbeitgeber: '',
    monatsgehalt: '', beschaeftigt_seit: '', branche: '',
    // Étape 4
    iban: '', bic: '', kontoinhaber: '',
    // Étape 5
    password: '', dsgvo: false, agb: false, schufa: false
  }
};

// Configurations des types de prêts
const WIZARD_LOAN_CONFIGS = {
  privatkredit:       { label: 'Privatkredit 💼',       min: 1000,   max: 75000,   minM: 12, maxM: 120, rate: 1.99  },
  immobilienkredit:   { label: 'Immobilienkredit 🏠',   min: 50000,  max: 1000000, minM: 60, maxM: 360, rate: 0.89  },
  autokredit:         { label: 'Autokredit 🚗',         min: 5000,   max: 100000,  minM: 12, maxM: 96,  rate: 2.49  },
  hypothekendarlehen: { label: 'Hypothekendarlehen 🏦', min: 100000, max: 2000000, minM: 60, maxM: 480, rate: 1.29  },
  kreditrueckkauf:    { label: 'Kreditrückkauf 🔄',     min: 5000,   max: 500000,  minM: 12, maxM: 300, rate: 2.99  }
};

// ── UTILITAIRES ───────────────────────────────────────────────

/** Calcule la mensualité (annuité constante) */
function calcMonthly(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/** Formate un montant en EUR (locale allemande) */
function fmtEur(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtEurWhole(n) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

/** Affiche une erreur sur un champ */
function showError(fieldId, message) {
  const errEl = document.getElementById('err-' + fieldId);
  const input = document.querySelector(`[name="${fieldId}"], #s2-${fieldId}, #s3-${fieldId}, #s4-${fieldId}, #s5-${fieldId}`);
  if (errEl) errEl.textContent = message;
  if (input) input.classList.add('is-invalid');
}

/** Efface l'erreur d'un champ */
function clearError(fieldId) {
  const errEl = document.getElementById('err-' + fieldId);
  if (errEl) errEl.textContent = '';
}

/** Marque un champ comme valide */
function markValid(input) {
  if (input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  }
}

// ── TRACKING D'ABANDON ───────────────────────────────────────
const AbandonTracker = {
  timer: null, reported: false, DELAY_MS: 90000,
  start() {
    sessionStorage.setItem('kp_wizard_active', '1');
    this.reset();
  },
  reset() {
    clearTimeout(this.timer);
    this.reported = false;
    this.timer = setTimeout(() => this.trigger(), this.DELAY_MS);
  },
  stop() { clearTimeout(this.timer); this.reported = true; sessionStorage.removeItem('kp_wizard_active'); },
  trigger() {
    if (this.reported) return;
    this.reported = true;
    const token = localStorage.getItem(window.KP?.JWT_KEY || 'kreditprofi_token');
    const step  = wizardState.currentStep;
    if (token && step > 1) {
      fetch(`${window.KP?.API_BASE_URL || '/api'}/client/wizard-abandon`, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ step })
      }).catch(() => {});
    }
    if (step > 1) localStorage.setItem('kp_wizard_abandoned', JSON.stringify({ step, ts: Date.now() }));
  }
};

// ── NAVIGATION ENTRE ÉTAPES ───────────────────────────────────

/** Passe à l'étape suivante */
function goToStep(step) {
  AbandonTracker.reset();
  // Masquer l'étape courante
  const currentPanel = document.getElementById('step-' + wizardState.currentStep);
  if (currentPanel) currentPanel.classList.remove('active');

  // Afficher la nouvelle étape
  const newPanel = document.getElementById('step-' + step);
  if (newPanel) {
    newPanel.classList.add('active');
    // Scroll vers le haut du wizard
    newPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  wizardState.currentStep = step;
  updateProgressIndicator(step);
  updateProgressBar(step);
}

/** Met à jour les indicateurs d'étapes (cercles numérotés) */
function updateProgressIndicator(step) {
  const indicators = document.querySelectorAll('#wizard-steps-indicator .wizard-step');
  indicators.forEach((el, idx) => {
    const stepNum = idx + 1;
    el.classList.remove('active', 'completed');
    if (stepNum < step)  el.classList.add('completed');
    if (stepNum === step) el.classList.add('active');
    el.setAttribute('aria-current', stepNum === step ? 'step' : 'false');

    // Afficher une coche pour les étapes complétées
    const circle = el.querySelector('.wizard-step-circle');
    if (circle) {
      circle.textContent = stepNum < step ? '✓' : stepNum;
    }
  });
}

/** Met à jour la barre de progression en % */
function updateProgressBar(step) {
  const fill = document.getElementById('wizard-progress-fill');
  if (fill) {
    const pct = (step / wizardState.totalSteps) * 100;
    fill.style.width = pct + '%';
  }
}

// ── VALIDATION ÉTAPE 1 ────────────────────────────────────────

function validateStep1() {
  let valid = true;
  const cfg = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];

  // Validation montant
  const amount = parseFloat(document.getElementById('s1-amount')?.value) || 0;
  if (!amount || amount < cfg.min || amount > cfg.max) {
    showError('amount', `Betrag muss zwischen ${fmtEurWhole(cfg.min)} und ${fmtEurWhole(cfg.max)} liegen.`);
    valid = false;
  } else {
    clearError('amount');
    markValid(document.getElementById('s1-amount'));
    wizardState.data.amount = amount;
  }

  // Validation durée
  const months = parseInt(document.getElementById('s1-months')?.value) || 0;
  if (!months) {
    showError('months', 'Bitte wählen Sie eine Laufzeit.');
    valid = false;
  } else {
    clearError('months');
    wizardState.data.months = months;
  }

  return valid;
}

// ── VALIDATION ÉTAPE 2 ────────────────────────────────────────

function validateStep2() {
  let valid = true;

  const fields = [
    { id: 's2-vorname',      name: 'vorname',      label: 'Vorname',      minLen: 2 },
    { id: 's2-nachname',     name: 'nachname',      label: 'Nachname',     minLen: 2 },
    { id: 's2-geburtsdatum', name: 'geburtsdatum',  label: 'Geburtsdatum', type: 'date' },
    { id: 's2-nationalitaet',name: 'nationalitaet', label: 'Nationalität' },
    { id: 's2-strasse',      name: 'strasse',       label: 'Straße',       minLen: 5 },
    { id: 's2-plz',          name: 'plz',           label: 'PLZ',          pattern: /^\d{5}$/ },
    { id: 's2-stadt',        name: 'stadt',         label: 'Stadt',        minLen: 2 },
    { id: 's2-telefon',      name: 'telefon',       label: 'Telefon',      pattern: /^[\d\s\+\-\(\)]{8,20}$/ },
    { id: 's2-email',        name: 'email',         label: 'E-Mail',       type: 'email' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const val = el.value.trim();
    let errMsg = '';

    if (!val) {
      errMsg = `${f.label} ist erforderlich.`;
    } else if (f.minLen && val.length < f.minLen) {
      errMsg = `Mindestens ${f.minLen} Zeichen erforderlich.`;
    } else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errMsg = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    } else if (f.type === 'date') {
      const dob = new Date(val);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      if (dob > minAge) errMsg = 'Sie müssen mindestens 18 Jahre alt sein.';
    } else if (f.pattern && !f.pattern.test(val)) {
      errMsg = f.name === 'plz'
        ? 'Bitte geben Sie eine gültige 5-stellige Postleitzahl ein.'
        : 'Bitte geben Sie eine gültige Telefonnummer ein.';
    }

    if (errMsg) {
      const errKey = f.name;
      showError(errKey, errMsg);
      valid = false;
    } else {
      clearError(f.name);
      markValid(el);
      wizardState.data[f.name] = val;
    }
  });

  return valid;
}

// ── VALIDATION ÉTAPE 3 ────────────────────────────────────────

function validateStep3() {
  let valid = true;

  // Statut d'emploi obligatoire
  const status = document.getElementById('s3-status')?.value;
  if (!status) {
    showError('status', 'Bitte wählen Sie Ihren Beschäftigungsstatus.');
    valid = false;
  } else {
    clearError('status');
    wizardState.data.beschaeftigungsstatus = status;
  }

  // Salaire obligatoire
  const gehalt = parseFloat(document.getElementById('s3-gehalt')?.value) || 0;
  if (!gehalt || gehalt <= 0) {
    showError('gehalt', 'Bitte geben Sie Ihr monatliches Nettoeinkommen ein.');
    valid = false;
  } else {
    clearError('gehalt');
    wizardState.data.monatsgehalt = gehalt;
    markValid(document.getElementById('s3-gehalt'));
  }

  // Date d'emploi obligatoire
  const seit = document.getElementById('s3-seit')?.value;
  if (!seit) {
    showError('seit', 'Bitte geben Sie an, seit wann Sie beschäftigt sind.');
    valid = false;
  } else {
    clearError('seit');
    wizardState.data.beschaeftigt_seit = seit;
  }

  // Champs optionnels
  wizardState.data.arbeitgeber = document.getElementById('s3-arbeitgeber')?.value.trim() || '';
  wizardState.data.branche     = document.getElementById('s3-branche')?.value.trim() || '';

  return valid;
}

// ── VALIDATION ÉTAPE 4 ────────────────────────────────────────

function validateStep4() {
  let valid = true;

  // IBAN
  const iban = document.getElementById('s4-iban')?.value.replace(/\s/g, '').toUpperCase() || '';
  if (!iban) {
    showError('iban', 'Bitte geben Sie Ihre IBAN ein.');
    valid = false;
  } else if (!/^DE\d{20}$/.test(iban)) {
    showError('iban', 'Bitte geben Sie eine gültige deutsche IBAN ein (DE + 20 Ziffern).');
    valid = false;
  } else {
    clearError('iban');
    markValid(document.getElementById('s4-iban'));
    wizardState.data.iban = iban;
  }

  // BIC
  const bic = document.getElementById('s4-bic')?.value.trim().toUpperCase() || '';
  if (!bic) {
    showError('bic', 'Bitte geben Sie den BIC Ihrer Bank ein.');
    valid = false;
  } else if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    showError('bic', 'Bitte geben Sie einen gültigen BIC ein.');
    valid = false;
  } else {
    clearError('bic');
    markValid(document.getElementById('s4-bic'));
    wizardState.data.bic = bic;
  }

  // Titulaire du compte
  const kontoinhaber = document.getElementById('s4-kontoinhaber')?.value.trim() || '';
  if (!kontoinhaber || kontoinhaber.length < 3) {
    showError('kontoinhaber', 'Bitte geben Sie den Namen des Kontoinhabers ein.');
    valid = false;
  } else {
    clearError('kontoinhaber');
    markValid(document.getElementById('s4-kontoinhaber'));
    wizardState.data.kontoinhaber = kontoinhaber;
  }

  return valid;
}

// ── VALIDATION ÉTAPE 5 ────────────────────────────────────────

function validateStep5() {
  let valid = true;

  // Mot de passe
  const pwd  = document.getElementById('s5-password')?.value || '';
  const pwd2 = document.getElementById('s5-password2')?.value || '';
  const pwdRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!pwd) {
    showError('password', 'Bitte vergeben Sie ein Passwort.');
    valid = false;
  } else if (!pwdRegex.test(pwd)) {
    showError('password', 'Passwort: mindestens 8 Zeichen, 1 Großbuchstabe, 1 Zahl.');
    valid = false;
  } else {
    clearError('password');
    markValid(document.getElementById('s5-password'));
    wizardState.data.password = pwd;
  }

  if (pwd && pwd !== pwd2) {
    showError('password2', 'Die Passwörter stimmen nicht überein.');
    valid = false;
  } else if (pwd && pwd === pwd2) {
    clearError('password2');
    markValid(document.getElementById('s5-password2'));
  }

  // DSGVO obligatoire
  const dsgvo = document.getElementById('s5-dsgvo')?.checked;
  if (!dsgvo) {
    showError('dsgvo', 'Sie müssen den Datenschutzbestimmungen zustimmen.');
    valid = false;
  } else {
    clearError('dsgvo');
    wizardState.data.dsgvo = true;
  }

  // AGB obligatoire
  const agb = document.getElementById('s5-agb')?.checked;
  if (!agb) {
    showError('agb', 'Sie müssen die AGB akzeptieren.');
    valid = false;
  } else {
    clearError('agb');
    wizardState.data.agb = true;
  }

  wizardState.data.schufa = document.getElementById('s5-schufa')?.checked || false;

  return valid;
}

// ── SOUMISSION DU DOSSIER À L'API ────────────────────────────

async function submitApplication() {
  const submitBtn   = document.getElementById('btn-submit');
  const submitLabel = document.getElementById('submit-label');
  const errGlobal   = document.getElementById('err-global');

  submitBtn.disabled = true;
  submitLabel.textContent = 'Wird eingereicht...';
  submitBtn.classList.add('loading');
  if (errGlobal) errGlobal.textContent = '';

  const apiBase = window.KP?.API_BASE_URL || 'http://localhost:5000/api';
  const cfg     = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];
  const monthly = calcMonthly(wizardState.data.amount, cfg.rate, wizardState.data.months);
  const total   = monthly * wizardState.data.months;
  const interest= total - wizardState.data.amount;

  try {
    // ── ÉTAPE 1 : Créer le compte utilisateur ──
    const registerRes = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vorname:  wizardState.data.vorname,
        nachname: wizardState.data.nachname,
        email:    wizardState.data.email,
        password: wizardState.data.password,
        telefon:  wizardState.data.telefon
      })
    });

    const registerData = await registerRes.json();

    // Si l'email existe déjà, essayer de se connecter
    let token = registerData.token;

    if (!registerRes.ok) {
      // Email déjà enregistré → tenter une connexion silencieuse
      if (registerRes.status === 409) {
        // L'utilisateur existe déjà : lui demander de se connecter
        if (errGlobal) errGlobal.textContent =
          'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail.';
        submitBtn.disabled = false;
        submitLabel.textContent = '🚀 Antrag jetzt einreichen';
        submitBtn.classList.remove('loading');
        return;
      }
      throw new Error(registerData.message || 'Registrierung fehlgeschlagen.');
    }

    // Sauvegarder le token JWT
    localStorage.setItem(window.KP?.JWT_KEY || 'kreditprofi_token', token);
    localStorage.setItem(window.KP?.USER_KEY || 'kreditprofi_user', JSON.stringify(registerData.user));

    // ── ÉTAPE 2 : Soumettre le dossier de crédit ──
    const dossierRes = await fetch(`${apiBase}/dossiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        loanType:             wizardState.data.loanType,
        amount:               wizardState.data.amount,
        months:               wizardState.data.months,
        monthlyPayment:       parseFloat(monthly.toFixed(2)),
        totalCost:            parseFloat(total.toFixed(2)),
        totalInterest:        parseFloat(interest.toFixed(2)),
        interestRate:         cfg.rate,
        vorname:              wizardState.data.vorname,
        nachname:             wizardState.data.nachname,
        geburtsdatum:         wizardState.data.geburtsdatum,
        nationalitaet:        wizardState.data.nationalitaet,
        strasse:              wizardState.data.strasse,
        plz:                  wizardState.data.plz,
        stadt:                wizardState.data.stadt,
        telefon:              wizardState.data.telefon,
        email:                wizardState.data.email,
        beschaeftigungsstatus:wizardState.data.beschaeftigungsstatus,
        arbeitgeber:          wizardState.data.arbeitgeber,
        monatsgehalt:         parseFloat(wizardState.data.monatsgehalt) || 0,
        beschaeftigt_seit:    wizardState.data.beschaeftigt_seit,
        branche:              wizardState.data.branche,
        iban:                 wizardState.data.iban,
        bic:                  wizardState.data.bic,
        kontoinhaber:         wizardState.data.kontoinhaber
      })
    });

    const dossierData = await dossierRes.json();

    if (dossierRes.ok && dossierData.dossier) {
      showConfirmation(dossierData.dossier.dossierNumber);
    } else {
      // Compte créé mais dossier échoué : afficher l'erreur réelle
      if (errGlobal) {
        errGlobal.textContent = dossierData.message ||
          'Ihr Konto wurde erstellt, aber der Antrag konnte nicht eingereicht werden. Bitte melden Sie sich an und versuchen Sie es erneut.';
      }
      console.warn('Dossier submission issue:', dossierData.message);
    }

  } catch (err) {
    console.error('Antrag-Fehler:', err.message);
    // Afficher l'erreur réelle à l'utilisateur — ne pas simuler un faux succès
    if (errGlobal) {
      errGlobal.textContent = err.message ||
        'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns.';
    }
  } finally {
    // Remettre le bouton dans son état initial (toujours, succès ou erreur)
    submitBtn.disabled = false;
    submitLabel.textContent = '🚀 Antrag jetzt einreichen';
    submitBtn.classList.remove('loading');
  }
}

/** Génère un numéro de dossier local (fallback mode démo) */
function generateLocalDossierNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `KP-${year}-${rand}`;
}

/** Affiche la page de confirmation */
function showConfirmation(dossierNumber) {
  AbandonTracker.stop();
  // Masquer l'étape 5
  document.getElementById('step-5').classList.remove('active');

  // Afficher la confirmation
  const confirmPanel = document.getElementById('step-confirm');
  if (confirmPanel) {
    confirmPanel.classList.add('active');
    confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Afficher le numéro de dossier
  const numEl = document.getElementById('dossier-number-display');
  if (numEl) numEl.textContent = dossierNumber;

  // Masquer les badges de confiance et les indicateurs
  document.getElementById('trust-badges')?.style && (document.getElementById('trust-badges').style.display = 'none');
  document.getElementById('wizard-steps-indicator').style.display = 'none';
  document.querySelector('.wizard-progress-bar-outer').style.display = 'none';

  // Toast de succès
  window.Toast?.success('Ihr Antrag wurde erfolgreich eingereicht!');
}

// ── SÉLECTEUR DE TYPE DE PRÊT ─────────────────────────────────

function initLoanTypeOptions() {
  const options = document.querySelectorAll('.loan-type-option');
  const amountInput = document.getElementById('s1-amount');
  const monthsSelect= document.getElementById('s1-months');

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      wizardState.data.loanType = opt.dataset.type;

      const cfg = WIZARD_LOAN_CONFIGS[opt.dataset.type];
      if (!cfg || !amountInput || !monthsSelect) return;

      // Mettre à jour les limites du champ montant
      amountInput.min   = cfg.min;
      amountInput.max   = cfg.max;
      amountInput.step  = cfg.max >= 100000 ? 5000 : 500;

      const hint = document.getElementById('s1-amount-hint');
      if (hint) hint.textContent = `Zwischen ${fmtEurWhole(cfg.min)} und ${fmtEurWhole(cfg.max)}`;

      // Ajuster la valeur si hors limites
      const cur = parseFloat(amountInput.value) || 0;
      if (cur < cfg.min) amountInput.value = cfg.min;
      if (cur > cfg.max) amountInput.value = cfg.max;

      // Mettre à jour les options de durée
      populateMonthsOptions(cfg.minM, cfg.maxM);

      // Recalculer le résumé
      updateStep1Summary();
    });
  });
}

/** Popule les options du select de durée */
function populateMonthsOptions(minM, maxM) {
  const select = document.getElementById('s1-months');
  if (!select) return;

  const currentVal = parseInt(select.value) || 36;
  select.innerHTML = '';

  const step = maxM >= 240 ? 12 : 6;
  for (let m = minM; m <= maxM; m += step) {
    const opt = document.createElement('option');
    opt.value = m;
    const years = Math.floor(m / 12);
    const months = m % 12;
    let label = `${m} Monate`;
    if (years > 0 && months === 0) label += ` (${years} ${years === 1 ? 'Jahr' : 'Jahre'})`;
    else if (years > 0) label += ` (${years}J ${months}M)`;
    opt.textContent = label;
    select.appendChild(opt);
  }

  // Restaurer ou initialiser la valeur
  const targetVal = Math.min(Math.max(currentVal, minM), maxM);
  const closestOpt = Array.from(select.options).reduce((prev, cur) =>
    Math.abs(parseInt(cur.value) - targetVal) < Math.abs(parseInt(prev.value) - targetVal) ? cur : prev
  );
  if (closestOpt) closestOpt.selected = true;
}

/** Met à jour le résumé en temps réel à l'étape 1 */
function updateStep1Summary() {
  const amount = parseFloat(document.getElementById('s1-amount')?.value) || 0;
  const months = parseInt(document.getElementById('s1-months')?.value) || 36;
  const cfg    = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];

  if (!cfg || !amount) return;

  const monthly = calcMonthly(amount, cfg.rate, months);
  const total   = monthly * months;

  const s1Monthly = document.getElementById('s1-monthly');
  const s1Total   = document.getElementById('s1-total');
  const s1Rate    = document.getElementById('s1-rate');

  if (s1Monthly) s1Monthly.textContent = fmtEur(monthly);
  if (s1Total)   s1Total.textContent   = fmtEur(total);
  if (s1Rate)    s1Rate.textContent    = cfg.rate.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' %';

  // Synchroniser l'état
  wizardState.data.amount = amount;
  wizardState.data.months = months;
}

/** Met à jour le résumé final à l'étape 5 */
function updateFinalSummary() {
  const cfg = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];
  if (!cfg) return;

  const monthly = calcMonthly(wizardState.data.amount, cfg.rate, wizardState.data.months);

  const stf = document.getElementById('sum-type-final');
  const saf = document.getElementById('sum-amount-final');
  const smf = document.getElementById('sum-months-final');
  const smo = document.getElementById('sum-monthly-final');

  if (stf) stf.textContent = cfg.label;
  if (saf) saf.textContent = fmtEurWhole(wizardState.data.amount);
  if (smf) smf.textContent = wizardState.data.months + ' Monate';
  if (smo) smo.textContent = fmtEur(monthly);
}

// ── INDICATEUR FORCE DU MOT DE PASSE ─────────────────────────

function initPasswordStrength() {
  const pwdInput = document.getElementById('s5-password');
  if (!pwdInput) return;

  const bars   = [1,2,3,4].map(i => document.getElementById('pwd-bar-' + i));
  const label  = document.getElementById('pwd-strength-label');
  const colors = ['var(--color-error)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];
  const levels = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark'];

  pwdInput.addEventListener('input', () => {
    const pwd = pwdInput.value;
    let score = 0;
    if (pwd.length >= 8)             score++;
    if (/[A-Z]/.test(pwd))           score++;
    if (/\d/.test(pwd))              score++;
    if (/[^A-Za-z0-9]/.test(pwd))   score++;

    bars.forEach((bar, i) => {
      if (!bar) return;
      bar.style.background = i < score ? colors[Math.min(score - 1, 3)] : 'var(--color-gray-200)';
    });

    if (label) {
      label.textContent = pwd.length > 0 ? levels[Math.min(score - 1, 3)] || 'Sehr schwach' : '';
      label.style.color = colors[Math.min(score - 1, 3)] || 'var(--color-gray-400)';
    }
  });
}

// ── FORMATAGE IBAN EN TEMPS RÉEL ─────────────────────────────

function initIbanFormatting() {
  const ibanInput = document.getElementById('s4-iban');
  if (!ibanInput) return;

  ibanInput.addEventListener('input', () => {
    const raw = ibanInput.value.replace(/\s/g, '').toUpperCase();
    ibanInput.value = raw.replace(/(.{4})/g, '$1 ').trim();
  });

  const bicInput = document.getElementById('s4-bic');
  if (bicInput) {
    bicInput.addEventListener('input', () => {
      bicInput.value = bicInput.value.toUpperCase();
    });
  }
}

// ── AFFICHAGE DU CHAMP BRANCHE POUR INDÉPENDANTS ──────────────

function initSelbststaendigToggle() {
  const statusSelect = document.getElementById('s3-status');
  const extraInfo    = document.getElementById('selbststaendig-info');
  if (!statusSelect || !extraInfo) return;

  statusSelect.addEventListener('change', () => {
    extraInfo.style.display =
      statusSelect.value === 'selbststaendig' ? 'block' : 'none';
  });
}

// ── LECTURE DES PARAMÈTRES URL ────────────────────────────────

function readURLParams() {
  const params = new URLSearchParams(window.location.search);

  const type   = params.get('type');
  const amount = params.get('amount');
  const months = params.get('months');

  // Pré-sélectionner le type de prêt
  if (type && WIZARD_LOAN_CONFIGS[type]) {
    wizardState.data.loanType = type;
    document.querySelectorAll('.loan-type-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === type);
    });
    const cfg = WIZARD_LOAN_CONFIGS[type];
    populateMonthsOptions(cfg.minM, cfg.maxM);
    document.getElementById('s1-amount').min  = cfg.min;
    document.getElementById('s1-amount').max  = cfg.max;
  }

  // Pré-remplir le montant
  if (amount) {
    const amountEl = document.getElementById('s1-amount');
    if (amountEl) amountEl.value = parseFloat(amount) || 10000;
    wizardState.data.amount = parseFloat(amount) || 10000;
  }

  // Pré-remplir la durée
  if (months) {
    const select = document.getElementById('s1-months');
    if (select) {
      Array.from(select.options).forEach(opt => {
        if (parseInt(opt.value) === parseInt(months)) opt.selected = true;
      });
    }
    wizardState.data.months = parseInt(months) || 36;
  }

  // Restaurer depuis sessionStorage (depuis simulateur)
  try {
    const stored = sessionStorage.getItem('kreditprofi_sim');
    if (stored) {
      const sim = JSON.parse(stored);
      if (sim.type && WIZARD_LOAN_CONFIGS[sim.type]) {
        wizardState.data.loanType = sim.type;
        document.querySelectorAll('.loan-type-option').forEach(opt => {
          opt.classList.toggle('selected', opt.dataset.type === sim.type);
        });
      }
      if (sim.amount) {
        const el = document.getElementById('s1-amount');
        if (el) el.value = sim.amount;
        wizardState.data.amount = sim.amount;
      }
      if (sim.months) {
        const cfg = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];
        if (cfg) populateMonthsOptions(cfg.minM, cfg.maxM);
        const sel = document.getElementById('s1-months');
        if (sel) {
          Array.from(sel.options).forEach(opt => {
            if (parseInt(opt.value) === sim.months) opt.selected = true;
          });
        }
        wizardState.data.months = sim.months;
      }
    }
  } catch(e) { /* silencieux */ }

  updateStep1Summary();
}

// ── INITIALISATION ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  AbandonTracker.start();

  // Initialiser le select de durée avec la config par défaut
  const defCfg = WIZARD_LOAN_CONFIGS[wizardState.data.loanType];
  populateMonthsOptions(defCfg.minM, defCfg.maxM);

  // Initialiser les composants
  initLoanTypeOptions();
  initPasswordStrength();
  initIbanFormatting();
  initSelbststaendigToggle();
  readURLParams();

  // Recalcul du résumé étape 1 à chaque changement
  document.getElementById('s1-amount')?.addEventListener('input', updateStep1Summary);
  document.getElementById('s1-months')?.addEventListener('change', updateStep1Summary);

  // ── Boutons de navigation ──

  // Étape 1 → 2
  document.getElementById('btn-next-1')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });

  // Étape 2 → 1 et 2 → 3
  document.getElementById('btn-prev-2')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-next-2')?.addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });

  // Étape 3 → 2 et 3 → 4
  document.getElementById('btn-prev-3')?.addEventListener('click', () => goToStep(2));
  document.getElementById('btn-next-3')?.addEventListener('click', () => {
    if (validateStep3()) goToStep(4);
  });

  // Étape 4 → 3 et 4 → 5
  document.getElementById('btn-prev-4')?.addEventListener('click', () => goToStep(3));
  document.getElementById('btn-next-4')?.addEventListener('click', () => {
    if (validateStep4()) {
      goToStep(5);
      updateFinalSummary();
    }
  });

  // Étape 5 → 4 et soumission
  document.getElementById('btn-prev-5')?.addEventListener('click', () => goToStep(4));
  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    if (validateStep5()) await submitApplication();
  });

  // Validation en temps réel à la sortie des champs
  document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim() && input.required) {
        input.classList.remove('is-invalid');
        if (input.value.trim()) input.classList.add('is-valid');
      }
    });
  });

  // Calcul initial
  updateStep1Summary();
});
