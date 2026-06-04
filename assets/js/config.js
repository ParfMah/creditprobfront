/* ============================================================
   config.js — Configuration globale et constantes
   KreditProfi Deutschland — Paramètres centralisés du frontend
   ============================================================ */

'use strict';

// URL de base de l'API backend
// En local : serveur Express sur port 5000
// En production : même domaine Render (API + frontend sur le même service)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

// Clé utilisée pour stocker le token JWT dans localStorage
const JWT_KEY = 'kreditprofi_token';

// Clé pour les données utilisateur en cache
const USER_KEY = 'kreditprofi_user';

// Durée d'affichage des notifications toast (en millisecondes)
const TOAST_DURATION = 5000;

// Types de prêts disponibles (utilisés dans les formulaires et filtres)
const LOAN_TYPES = [
  { id: 'privatkredit',         label: 'Privatkredit',         icon: '💼', maxAmount: 75000,    minMonths: 12,  maxMonths: 120, rate: 1.99 },
  { id: 'immobilienkredit',     label: 'Immobilienkredit',     icon: '🏠', maxAmount: 1000000,  minMonths: 60,  maxMonths: 360, rate: 0.89 },
  { id: 'autokredit',           label: 'Autokredit',           icon: '🚗', maxAmount: 100000,   minMonths: 12,  maxMonths: 96,  rate: 2.49 },
  { id: 'hypothekendarlehen',   label: 'Hypothekendarlehen',   icon: '🏦', maxAmount: 2000000,  minMonths: 60,  maxMonths: 480, rate: 1.29 },
  { id: 'kreditrueckkauf',      label: 'Kreditrückkauf',       icon: '🔄', maxAmount: 500000,   minMonths: 12,  maxMonths: 300, rate: 2.99 }
];

// Statuts de dossier avec labels allemands et couleurs
const DOSSIER_STATUSES = {
  pending:  { label: 'In Bearbeitung',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '⏳' },
  review:   { label: 'In Prüfung',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: '🔍' },
  approved: { label: 'Genehmigt',        color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: '✅' },
  refused:  { label: 'Abgelehnt',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '❌' }
};

// Nationalités courantes pour le formulaire de demande
const NATIONALITIES = [
  'Deutsch', 'Österreichisch', 'Schweizerisch', 'Französisch',
  'Britisch', 'Italienisch', 'Spanisch', 'Polnisch', 'Türkisch',
  'Amerikanisch', 'Andere'
];

// Statuts professionnels pour le formulaire
const EMPLOYMENT_STATUSES = [
  { value: 'angestellt',      label: 'Angestellt (Vollzeit)' },
  { value: 'angestellt_tz',   label: 'Angestellt (Teilzeit)' },
  { value: 'selbststaendig',  label: 'Selbstständig / Freiberuflich' },
  { value: 'beamte',          label: 'Beamte/r' },
  { value: 'rentner',         label: 'Rentner/in' },
  { value: 'student',         label: 'Student/in' },
  { value: 'arbeitslos',      label: 'Arbeitssuchend' },
  { value: 'sonstige',        label: 'Sonstige' }
];

// Sujets du formulaire de contact
const CONTACT_SUBJECTS = [
  { value: 'antrag',       label: 'Kreditantrag' },
  { value: 'simulation',   label: 'Simulation / Beratung' },
  { value: 'konto',        label: 'Mein Konto' },
  { value: 'dokumente',    label: 'Dokumente hochladen' },
  { value: 'beschwerde',   label: 'Reklamation / Beschwerde' },
  { value: 'allgemein',    label: 'Allgemeine Anfrage' },
  { value: 'sonstige',     label: 'Sonstige' }
];

// Messages d'erreur en allemand pour la validation des formulaires
const ERROR_MESSAGES = {
  required:       'Dieses Feld ist erforderlich.',
  email:          'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  phone:          'Bitte geben Sie eine gültige Telefonnummer ein.',
  password:       'Das Passwort muss mindestens 8 Zeichen, einen Großbuchstaben und eine Zahl enthalten.',
  passwordMatch:  'Die Passwörter stimmen nicht überein.',
  iban:           'Bitte geben Sie eine gültige IBAN ein.',
  minLength:      (n) => `Mindestens ${n} Zeichen erforderlich.`,
  maxLength:      (n) => `Maximal ${n} Zeichen erlaubt.`,
  minAmount:      (n) => `Mindestbetrag: ${formatCurrency(n)}`,
  maxAmount:      (n) => `Höchstbetrag: ${formatCurrency(n)}`,
  plz:            'Bitte geben Sie eine gültige Postleitzahl (5 Ziffern) ein.',
  birthdate:      'Sie müssen mindestens 18 Jahre alt sein, um einen Antrag zu stellen.',
  terms:          'Sie müssen den Datenschutzbestimmungen zustimmen.',
  agb:            'Sie müssen die AGB akzeptieren.',
  serverError:    'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
  networkError:   'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
  unauthorized:   'Sitzung abgelaufen. Bitte melden Sie sich erneut an.',
  forbidden:      'Sie haben keine Berechtigung für diese Aktion.',
  notFound:       'Die angeforderte Ressource wurde nicht gefunden.'
};

// Messages de succès en allemand
const SUCCESS_MESSAGES = {
  login:          'Erfolgreich angemeldet. Willkommen!',
  logout:         'Sie wurden erfolgreich abgemeldet.',
  register:       'Ihr Konto wurde erfolgreich erstellt.',
  dossierSent:    'Ihr Kreditantrag wurde erfolgreich eingereicht!',
  contactSent:    'Ihre Nachricht wurde erfolgreich gesendet.',
  profileUpdated: 'Ihre Daten wurden erfolgreich aktualisiert.',
  docUploaded:    'Dokument erfolgreich hochgeladen.',
  passwordChanged:'Ihr Passwort wurde erfolgreich geändert.',
  statusUpdated:  'Status wurde erfolgreich aktualisiert.'
};

// Formatage devise Euro
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Formatage des nombres avec séparateur de milliers
function formatNumber(num) {
  return new Intl.NumberFormat('de-DE').format(num);
}

// Formatage date en allemand (JJ.MM.AAAA)
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Formatage date + heure
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Récupération du type de prêt par ID
function getLoanType(id) {
  return LOAN_TYPES.find(l => l.id === id) || null;
}

// Récupération du statut dossier
function getDossierStatus(key) {
  return DOSSIER_STATUSES[key] || { label: key, color: '#666', bg: '#eee', icon: '•' };
}

// Vérification si l'utilisateur est connecté (token valide présent)
function isLoggedIn() {
  const token = localStorage.getItem(JWT_KEY);
  if (!token) return false;
  // Si "session uniquement" (sans remember-me) et que sessionStorage est vide
  // (nouvel onglet / redémarrage navigateur), on déconnecte l'utilisateur
  const sessionOnly = localStorage.getItem('kp_session_only') === '1';
  if (sessionOnly && !sessionStorage.getItem('kp_session_only')) {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('kp_session_only');
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Récupération des données utilisateur depuis localStorage
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Déconnexion : vider le localStorage et rediriger
function logout() {
  localStorage.removeItem(JWT_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('kp_session_only');
  sessionStorage.removeItem('kp_session_only');
  window.location.href = '/login.html';
}

// Vérification si l'utilisateur est admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Export des constantes pour utilisation dans les autres modules
window.KP = {
  API_BASE_URL,
  JWT_KEY,
  USER_KEY,
  TOAST_DURATION,
  LOAN_TYPES,
  DOSSIER_STATUSES,
  NATIONALITIES,
  EMPLOYMENT_STATUSES,
  CONTACT_SUBJECTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  getLoanType,
  getDossierStatus,
  isLoggedIn,
  getCurrentUser,
  logout,
  isAdmin
};
