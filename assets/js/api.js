/* ============================================================
   api.js — Wrapper fetch() centralisé vers le backend
   KreditProfi Deutschland — Toutes les routes API
   ============================================================ */

'use strict';

const API = {

  /** Récupère le token JWT depuis localStorage */
  _getToken() {
    return localStorage.getItem(window.KP?.JWT_KEY || 'kreditprofi_token');
  },

  /** Construit les headers communs */
  _headers(withAuth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (withAuth) {
      const token = this._getToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  },

  /** Requête générique */
  async _request(method, endpoint, body = null, auth = false) {
    const base = window.KP?.API_BASE_URL || 'http://localhost:5000/api';
    const opts = { method, headers: this._headers(auth) };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res  = await fetch(`${base}${endpoint}`, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) window.KP?.logout?.();
        throw new Error(data.message || `Fehler ${res.status}`);
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  // ── AUTH ──────────────────────────────────────────────────
  auth: {
    login:              (email, password) => API._request('POST', '/auth/login', { email, password }),
    register:           (payload)         => API._request('POST', '/auth/register', payload),
    me:                 ()                => API._request('GET',  '/auth/me', null, true),
    logout:             ()                => API._request('POST', '/auth/logout', null, true),
    forgotPassword:     (email)           => API._request('POST', '/auth/forgot-password', { email }),
    resetPassword:      (token, password) => API._request('POST', '/auth/reset-password', { token, password }),
    sendEmailOtp:       ()                => API._request('POST', '/auth/send-email-otp', null, true),
    verifyEmailOtp:     (otp)             => API._request('POST', '/auth/verify-email-otp', { otp }, true),
    sendPhoneOtp:       (telefon)         => API._request('POST', '/auth/send-phone-otp', { telefon }, true),
    verifyPhoneOtp:     (otp)             => API._request('POST', '/auth/verify-phone-otp', { otp }, true),
    resendVerification: ()                => API._request('POST', '/auth/resend-verification', null, true)
  },

  // ── CLIENT ────────────────────────────────────────────────
  client: {
    getProfile:       ()     => API._request('GET',  '/client/profile', null, true),
    updateProfile:    (data) => API._request('PUT',  '/client/profile', data, true),
    changePassword:   (data) => API._request('PUT',  '/client/change-password', data, true),
    getDossiers:      ()     => API._request('GET',  '/client/dossiers', null, true),
    getNotifs:        ()     => API._request('GET',  '/client/notifications', null, true),
    markNotifRead:    (id)   => API._request('PUT',  `/client/notifications/${id}/read`, null, true),
    markAllNotifsRead:()     => API._request('PUT',  '/client/notifications/read-all', null, true)
  },

  // ── DOSSIERS ──────────────────────────────────────────────
  dossiers: {
    getAll:        (params = '')    => API._request('GET',  `/dossiers?${params}`, null, true),
    getById:       (id)             => API._request('GET',  `/dossiers/${id}`, null, true),
    create:        (data)           => API._request('POST', '/dossiers', data, true),
    updateStatus:  (id, data)       => API._request('PUT',  `/dossiers/${id}/status`, data, true),
    cancel:        (id, reason)     => API._request('POST', `/dossiers/${id}/cancel`, { reason }, true),
    getMessages:   (id)             => API._request('GET',  `/dossiers/${id}/messages`, null, true),
    sendMessage:   (id, content)    => API._request('POST', `/dossiers/${id}/messages`, { content }, true),
    getUnreadCount:(id)             => API._request('GET',  `/dossiers/${id}/unread-count`, null, true),
    downloadZip:   (id, number)     => {
      const token = localStorage.getItem(window.KP?.JWT_KEY || 'kreditprofi_token');
      return fetch(`${API.BASE}/dossiers/${id}/documents/zip`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => { if (!r.ok) throw new Error('ZIP download fehlgeschlagen'); return r.blob(); })
        .then(blob => {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = `Dokumente_${number || id}.zip`;
          document.body.appendChild(link); link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    }
  },

  // ── DOCUMENTS ─────────────────────────────────────────────
  documents: {
    getByDossier: (dossierId) => API._request('GET', `/documents/${dossierId}`, null, true),
    delete:       (id)        => API._request('DELETE', `/documents/${id}`, null, true)
  },

  // ── CONTACT ───────────────────────────────────────────────
  contact: {
    send:    (data) => API._request('POST', '/contact', data),
    getAll:  ()     => API._request('GET',  '/contact', null, true),
    markRead:(id)   => API._request('PUT',  `/contact/${id}/read`, null, true)
  },

  // ── CONTENU CMS ───────────────────────────────────────────
  content: {
    get:    (section) => API._request('GET',  `/content/${section}`),
    update: (section, data) => API._request('PUT', `/content/${section}`, data, true)
  },

  // ── STATS ADMIN ───────────────────────────────────────────
  stats: {
    getDashboard: () => API._request('GET', '/stats/dashboard', null, true),
    getMonthly:   () => API._request('GET', '/stats/monthly', null, true)
  },

  // ── PARAMÈTRES ────────────────────────────────────────────
  settings: {
    get:    ()     => API._request('GET',  '/settings', null, true),
    update: (data) => API._request('PUT',  '/settings', data, true)
  },

  // ── ADMIN : gestion clients ───────────────────────────────
  admin: {
    getClients:      (params = '') => API._request('GET',  `/admin/clients?${params}`, null, true),
    getClientById:   (id)          => API._request('GET',  `/admin/clients/${id}`, null, true),
    toggleClient:    (id, active)  => API._request('PUT',  `/admin/clients/${id}/toggle`, { active }, true),
    resetPassword:   (id)          => API._request('POST', `/admin/clients/${id}/reset-password`, null, true),
    changeAdminPwd:  (data)        => API._request('PUT',  '/admin/change-password', data, true)
  }
};

// Export global
window.API = API;
