/* ============================================================
   auth.js — Gestion de l'authentification côté client
   KreditProfi Deutschland — JWT, connexion, déconnexion
   ============================================================ */

'use strict';

const Auth = {

  /** Connecte l'utilisateur et stocke le token */
  async login(email, password) {
    try {
      const data = await window.API.auth.login(email, password);
      if (data.token) {
        localStorage.setItem(window.KP.JWT_KEY, data.token);
        localStorage.setItem(window.KP.USER_KEY, JSON.stringify(data.user));
        return data;
      }
      throw new Error('Kein Token erhalten.');
    } catch (err) {
      throw err;
    }
  },

  /** Déconnecte l'utilisateur */
  logout() {
    localStorage.removeItem(window.KP.JWT_KEY);
    localStorage.removeItem(window.KP.USER_KEY);
    window.location.href = 'login.html';
  },

  /** Vérifie si le token est valide et non expiré */
  isAuthenticated() {
    return window.KP.isLoggedIn();
  },

  /** Retourne l'utilisateur courant */
  getCurrentUser() {
    return window.KP.getCurrentUser();
  },

  /** Redirige vers login si non connecté */
  requireAuth(redirectTo = 'login.html') {
    if (!this.isAuthenticated()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  /** Redirige vers login si non admin */
  requireAdmin(redirectTo = 'login.html') {
    if (!this.isAuthenticated() || !window.KP.isAdmin()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

window.Auth = Auth;
