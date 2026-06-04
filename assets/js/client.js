/* ============================================================
   client.js — Logique complète de l'espace client
   KreditProfi Deutschland — Dashboard, dossier, upload, profil
   ============================================================ */

'use strict';

// ── ÉTAT GLOBAL DE L'ESPACE CLIENT ────────────────────────────

const ClientState = {
  user:    null,
  dossier: null,
  docs:    []
};

// ── GESTION DES PANNEAUX ──────────────────────────────────────

const ClientUI = {

  /** Affiche un panneau et masque les autres */
  showPanel(panelId) {
    document.querySelectorAll('.client-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.client-nav-link').forEach(l => l.classList.remove('active'));

    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) panel.classList.add('active');

    const link = document.querySelector(`.client-nav-link[data-panel="${panelId}"]`);
    if (link) link.classList.add('active');

    // Charger les données du panneau si nécessaire
    if (panelId === 'documents') ClientDocs.load();
    if (panelId === 'history')   ClientHistory.load();
    if (panelId === 'dossier')   ClientDossier.renderDetails();
    if (panelId === 'messages' && typeof ClientMessages !== 'undefined' && ClientMessages.dossierId) {
      ClientMessages.loadMessages();
      const badge = document.getElementById('sidebar-msg-badge');
      if (badge) badge.style.display = 'none';
    }
    if (panelId === 'history' && typeof ClientActions !== 'undefined' && ClientState.dossier?.statusHistory) {
      ClientActions.renderHistory(ClientState.dossier.statusHistory);
    }
  },

  /** Met à jour le badge de notification dans la sidebar */
  updateNotifBadge(count) {
    const badge = document.getElementById('sidebar-notif-badge');
    const navBadge = document.getElementById('nav-notif-count');
    if (count > 0) {
      if (badge)    { badge.textContent = count; badge.style.display = 'inline-flex'; }
      if (navBadge) { navBadge.textContent = count; navBadge.style.display = 'inline-flex'; }
    } else {
      if (badge)    badge.style.display = 'none';
      if (navBadge) navBadge.style.display = 'none';
    }
  },

  /** Formate un montant EUR */
  fmtEur(n) {
    return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
  },

  /** Formate une date en allemand */
  fmtDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
};

// Rendre ClientUI accessible globalement (utilisé dans le HTML)
window.ClientUI = ClientUI;

// ── CHARGEMENT INITIAL DES DONNÉES ────────────────────────────

const ClientData = {

  async init() {
    // Vérifier l'authentification
    if (!window.KP?.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    // Un admin qui atterrit sur mein-konto.html est redirigé vers l'espace admin
    if (window.KP?.isAdmin()) {
      window.location.href = 'admin.html';
      return;
    }

    try {
      // Charger le profil utilisateur et ses dossiers en parallèle
      const [profileRes, dossiersRes, notifRes] = await Promise.allSettled([
        window.API.client.getProfile(),
        window.API.client.getDossiers(),
        window.API.client.getNotifs()
      ]);

      // Profil utilisateur
      if (profileRes.status === 'fulfilled' && profileRes.value?.user) {
        ClientState.user = profileRes.value.user;
        this.populateUserUI(ClientState.user);
        // Afficher la bannière vérification email si nécessaire
        ClientProfile.checkEmailVerification(ClientState.user);
        // Mettre à jour les cartes de sécurité OTP
        if (typeof ProfileSecurity !== 'undefined') ProfileSecurity.update(ClientState.user);
      }

      // Dossiers (prendre le plus récent)
      if (dossiersRes.status === 'fulfilled' && dossiersRes.value?.dossiers) {
        const dossiers = dossiersRes.value.dossiers;
        ClientState.dossier = dossiers.length > 0 ? dossiers[0] : null;
        ClientDashboard.render();

        const latest = ClientState.dossier;
        if (latest) {
          // Messagerie
          if (typeof ClientMessages !== 'undefined') {
            ClientMessages.dossierId = latest._id;
            const msgContainer = document.getElementById('messages-container');
            const noInfo       = document.getElementById('no-dossier-msg-info');
            if (msgContainer) msgContainer.style.display = 'block';
            if (noInfo)       noInfo.style.display       = 'none';
          }
          // Historique + annulation
          if (typeof ClientActions !== 'undefined') {
            ClientActions.dossierId = latest._id;
            ClientActions.showCancelCard(latest.status);
            if (latest.statusHistory) ClientActions.renderHistory(latest.statusHistory);
          }
          // Badge messages non lus
          window.API.dossiers.getUnreadCount(latest._id)
            .then(data => {
              const badge = document.getElementById('sidebar-msg-badge');
              if (badge && data.count > 0) {
                badge.textContent    = data.count;
                badge.style.display  = 'inline-flex';
              }
            }).catch(() => {});
        } else {
          const noInfo = document.getElementById('no-dossier-msg-info');
          if (noInfo) noInfo.style.display = 'block';
        }
      }

      // Notifications — unread OU count selon ce que retourne le backend
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        const count = notifRes.value.unread ?? notifRes.value.count ?? 0;
        ClientUI.updateNotifBadge(count);
      }

    } catch (err) {
      console.error('[ClientData.init]', err.message);
      // Mode démo : données fictives
      this.loadDemoData();
    } finally {
      // Masquer le loader et afficher le dashboard
      const loaderEl = document.getElementById('client-loader');
      if (loaderEl) loaderEl.style.display = 'none';
      ClientUI.showPanel('dashboard');
    }
  },

  /** Peuple les éléments UI avec les données du profil */
  populateUserUI(user) {
    if (!user) return;

    const initials = `${user.vorname?.[0] || ''}${user.nachname?.[0] || ''}`.toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initials || '👤';
    document.getElementById('sidebar-name').textContent   = `${user.vorname} ${user.nachname}`;
    document.getElementById('sidebar-email').textContent  = user.email;
    document.getElementById('welcome-name').textContent   = user.vorname;
    document.getElementById('nav-user-greeting').textContent = `Hallo, ${user.vorname}`;

    // Pré-remplir le formulaire profil
    const fields = ['vorname', 'nachname', 'telefon', 'strasse', 'plz', 'stadt'];
    fields.forEach(f => {
      const el = document.getElementById(`p-${f}`);
      if (el && user[f]) el.value = user[f];
    });
    const emailEl = document.getElementById('p-email');
    if (emailEl) emailEl.value = user.email;

    // Afficher IBAN/BIC masqués
    if (user.iban) {
      const masked = user.iban.replace(/(.{4})/g, '$1 ').trim();
      document.getElementById('profile-iban').textContent = masked;
    }
    if (user.bic) {
      document.getElementById('profile-bic').textContent = user.bic;
    }
  },

  /** Données de démonstration quand l'API n'est pas disponible */
  loadDemoData() {
    ClientState.user = {
      vorname: 'Max', nachname: 'Mustermann',
      email: 'max@example.de', telefon: '+49 30 123 456',
      strasse: 'Musterstraße 42', plz: '10117', stadt: 'Berlin',
      iban: 'DE12345678901234567890', bic: 'DEUTDEDB'
    };
    ClientState.dossier = {
      dossierNumber: 'KP-2024-123456',
      loanType:      'privatkredit',
      loanTypeLabel: 'Privatkredit',
      amount:        15000,
      months:        48,
      status:        'review',
      uploadEnabled: false,
      createdAt:     new Date().toISOString(),
      statusHistory: [
        { status: 'pending', changedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { status: 'review',  changedAt: new Date(Date.now() - 86400000).toISOString() }
      ]
    };
    this.populateUserUI(ClientState.user);
    ClientDashboard.render();
  }
};

// ── DASHBOARD ─────────────────────────────────────────────────

const ClientDashboard = {

  // Configuration de statut
  statusConfig: {
    pending:  { label: 'In Bearbeitung', cls: 'badge-pending',  fill: '33%',  icon: '⏳', msg: 'Ihr Antrag wurde eingereicht und wartet auf die erste Prüfung. Sie erhalten innerhalb von 24 Stunden eine Rückmeldung.' },
    review:   { label: 'In Prüfung',    cls: 'badge-review',   fill: '66%',  icon: '🔍', msg: 'Unser Expertenteam prüft Ihren Antrag derzeit eingehend. Wir melden uns bald mit dem Ergebnis.' },
    approved: { label: 'Genehmigt ✅',  cls: 'badge-approved', fill: '90%',  icon: '✅', msg: 'Ihr Kredit wurde genehmigt! Bitte laden Sie jetzt die erforderlichen Dokumente in Ihrem Kundenkonto hoch.' },
    refused:  { label: 'Abgelehnt',     cls: 'badge-refused',  fill: '100%', icon: '❌', msg: 'Leider konnte Ihr Antrag diesmal nicht bewilligt werden. Kontaktieren Sie uns für eine kostenlose Beratung.' }
  },

  render() {
    const d = ClientState.dossier;
    if (!d) {
      document.getElementById('dash-status-card').innerHTML = `
        <div style="text-align:center;padding:2rem;">
          <div style="font-size:3rem;margin-bottom:1rem;">📋</div>
          <p style="color:var(--color-gray-500);">Sie haben noch keinen Kreditantrag eingereicht.</p>
          <a href="beantragen.html" class="btn btn-primary" style="margin-top:1rem;">Jetzt beantragen →</a>
        </div>`;
      return;
    }

    // Informations de base
    document.getElementById('dash-dossier-number').textContent = d.dossierNumber || '—';
    document.getElementById('dash-amount').textContent         = ClientUI.fmtEur(d.amount);
    document.getElementById('dash-date').textContent           = ClientUI.fmtDate(d.createdAt);
    document.getElementById('dash-loan-type').textContent      = d.loanTypeLabel || d.loanType;

    // Badge de statut
    const cfg    = this.statusConfig[d.status] || this.statusConfig.pending;
    const badge  = document.getElementById('dash-status-badge');
    if (badge) {
      badge.textContent = `${cfg.icon} ${cfg.label}`;
      badge.className   = `badge ${cfg.cls}`;
    }

    // Message contextuel
    document.getElementById('status-message-text').textContent = cfg.msg;

    // Barre de progression de la timeline
    document.getElementById('status-fill').style.width = cfg.fill;

    // Coloriser la carte selon le statut
    const card = document.getElementById('dash-status-card');
    if (card) card.className = `dossier-status-card status-${d.status}`;

    // Mettre à jour les étapes
    this.updateTimeline(d.status);

    // Afficher l'onglet documents selon le statut d'upload
    const docNav = document.getElementById('nav-documents');
    if (docNav && d.uploadEnabled) {
      docNav.style.color = 'var(--color-success)';
      docNav.style.fontWeight = '700';
    }
  },

  updateTimeline(status) {
    const order  = ['pending', 'review', 'approved'];
    const idx    = order.indexOf(status);
    const steps  = ['step-pending', 'step-review', 'step-approved', 'step-payout'];

    steps.forEach((stepId, i) => {
      const el = document.getElementById(stepId);
      if (!el) return;
      el.classList.remove('done', 'current');

      if (status === 'refused') {
        if (i <= 1) el.classList.add('done');
      } else {
        if (i < idx)  el.classList.add('done');
        if (i === idx) el.classList.add('current');
        if (status === 'approved' && i === 3) el.classList.add('current');
      }
    });
  }
};

// ── DÉTAILS DU DOSSIER ────────────────────────────────────────

const ClientDossier = {

  renderDetails() {
    const d   = ClientState.dossier;
    const el  = document.getElementById('dossier-details');
    if (!el) return;

    if (!d) {
      el.innerHTML = `<p style="color:var(--color-gray-400);">Kein Antrag gefunden.</p>`;
      return;
    }

    const cfg    = ClientDashboard.statusConfig[d.status] || ClientDashboard.statusConfig.pending;
    const monthly = d.amount && d.months ? this.calcMonthly(d.amount, this.getRate(d.loanType), d.months) : 0;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-xl);margin-bottom:var(--spacing-2xl);">
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Antragsnummer</div>
          <div style="font-family:var(--font-heading);font-size:1.2rem;font-weight:800;color:var(--color-primary);">${d.dossierNumber}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Aktueller Status</div>
          <span class="badge ${cfg.cls}">${cfg.icon} ${cfg.label}</span>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Kreditart</div>
          <div style="font-weight:600;color:var(--color-primary);">${d.loanTypeLabel || d.loanType}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Beantragter Betrag</div>
          <div style="font-weight:700;color:var(--color-accent);font-size:1.2rem;">${ClientUI.fmtEur(d.amount)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Laufzeit</div>
          <div style="font-weight:600;color:var(--color-primary);">${d.months} Monate</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Monatliche Rate (ca.)</div>
          <div style="font-weight:700;color:var(--color-secondary-dark);font-size:1.1rem;">${monthly > 0 ? ClientUI.fmtEur(monthly).replace('€', '') + ' €' : '—'}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:var(--color-gray-400);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Eingereicht am</div>
          <div style="font-weight:600;color:var(--color-primary);">${ClientUI.fmtDate(d.createdAt)}</div>
        </div>
      </div>
      <div style="background:var(--color-bg-light);border-radius:var(--border-radius-lg);padding:var(--spacing-lg);">
        <p style="font-size:var(--font-size-sm);color:var(--color-gray-600);margin:0;">
          <strong>Hinweis:</strong> ${cfg.msg}
        </p>
      </div>
    `;
  },

  getRate(type) {
    const rates = {
      privatkredit: 1.99, immobilienkredit: 0.89,
      autokredit: 2.49, hypothekendarlehen: 1.29, kreditrueckkauf: 2.99
    };
    return rates[type] || 3.99;
  },

  calcMonthly(p, r, m) {
    if (r === 0) return p / m;
    const rm = r / 100 / 12;
    return p * (rm * Math.pow(1 + rm, m)) / (Math.pow(1 + rm, m) - 1);
  }
};

// ── UPLOAD DE DOCUMENTS ───────────────────────────────────────

const ClientDocs = {

  async load() {
    const d = ClientState.dossier;
    if (!d) return;

    // Afficher/masquer selon le statut d'upload
    const lockedMsg   = document.getElementById('upload-locked-msg');
    const unlockedMsg = document.getElementById('upload-unlocked-msg');
    const typeGroup   = document.getElementById('upload-type-group');
    const dropZone    = document.getElementById('drop-zone');
    const fileInput   = document.getElementById('file-input');

    if (d.uploadEnabled) {
      if (lockedMsg)   lockedMsg.style.display   = 'none';
      if (unlockedMsg) unlockedMsg.style.display  = 'flex';
      if (typeGroup)   typeGroup.style.display    = 'block';
      if (dropZone)    dropZone.classList.remove('locked');
      if (fileInput)   fileInput.disabled = false;
    } else {
      if (lockedMsg)   lockedMsg.style.display   = 'flex';
      if (unlockedMsg) unlockedMsg.style.display  = 'none';
      if (typeGroup)   typeGroup.style.display    = 'none';
      if (dropZone)    dropZone.classList.add('locked');
      if (fileInput)   fileInput.disabled = true;
    }

    // Charger la liste des documents existants
    await this.loadDocList();
  },

  async loadDocList() {
    const d      = ClientState.dossier;
    const listEl = document.getElementById('doc-list');
    if (!d || !listEl) return;

    try {
      const dossierId = d._id || d.id || d.dossierNumber;
      if (!dossierId) {
        listEl.innerHTML = `<p style="color:var(--color-gray-400);font-size:var(--font-size-sm);">Noch keine Dokumente hochgeladen.</p>`;
        return;
      }
      const res = await window.API.documents.getByDossier(dossierId);
      if (res?.documents && res.documents.length > 0) {
        ClientState.docs = res.documents;
        this.renderDocList(res.documents);
      } else {
        listEl.innerHTML = `<p style="color:var(--color-gray-400);font-size:var(--font-size-sm);">Noch keine Dokumente hochgeladen.</p>`;
      }
    } catch {
      listEl.innerHTML = `<p style="color:var(--color-gray-400);font-size:var(--font-size-sm);">Noch keine Dokumente hochgeladen.</p>`;
    }
  },

  renderDocList(docs) {
    const listEl = document.getElementById('doc-list');
    if (!listEl) return;

    const typeLabels = {
      personalausweis:   '🪪 Personalausweis',
      reisepass:         '🛂 Reisepass',
      gehaltsnachweis:   '💰 Gehaltsnachweis',
      kontoauszug:       '🏦 Kontoauszug',
      steuerbescheid:    '📄 Steuerbescheid',
      mietvertrag:       '🏠 Mietvertrag',
      arbeitsvertrag:    '📋 Arbeitsvertrag',
      sonstige:          '📎 Sonstiges'
    };

    listEl.innerHTML = docs.map(doc => `
      <div class="doc-list-item">
        <div class="doc-icon">📄</div>
        <div class="doc-info">
          <div class="doc-name">${doc.originalName}</div>
          <div class="doc-meta">
            ${typeLabels[doc.docType] || doc.docType} &bull;
            ${((doc.size || doc.fileSize || 0) / 1024 / 1024).toFixed(2)} MB &bull;
            ${new Date(doc.createdAt).toLocaleDateString('de-DE')}
          </div>
        </div>
        <span style="font-size:0.7rem;padding:4px 10px;border-radius:99px;background:rgba(34,197,94,0.1);color:#16a34a;font-weight:700;">✓ Hochgeladen</span>
      </div>
    `).join('');
  },

  /** Upload réel vers le backend avec FormData */
  async uploadFile(file) {
    const d = ClientState.dossier;
    if (!d || !d.uploadEnabled) {
      window.Toast?.warning('Upload noch nicht freigegeben. Warten Sie auf die Freigabe durch unsere Berater.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      window.Toast?.error('Datei zu groß. Maximale Dateigröße: 10 MB.');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      window.Toast?.error('Ungültiger Dateityp. Nur PDF, JPG und PNG erlaubt.');
      return;
    }

    // Afficher la barre de progression
    const progressWrap = document.getElementById('upload-progress-wrap');
    const progressBar  = document.getElementById('upload-bar');
    const pctEl        = document.getElementById('upload-pct');
    const filenameEl   = document.getElementById('upload-filename');

    if (progressWrap) progressWrap.classList.add('visible');
    if (filenameEl)   filenameEl.textContent = file.name;

    // Simuler la progression pendant l'upload réel
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12, 85);
      if (progressBar) progressBar.style.width = pct + '%';
      if (pctEl)       pctEl.textContent = Math.round(pct) + '%';
    }, 250);

    try {
      const docType  = document.getElementById('doc-type-select')?.value || 'sonstige';
      const dossierId = d._id || d.id;

      if (!dossierId) throw new Error('Dossier ID nicht gefunden.');

      const formData = new FormData();
      formData.append('file',      file);
      formData.append('dossierId', dossierId);
      formData.append('docType',   docType);

      const token   = localStorage.getItem(window.KP?.JWT_KEY || 'kreditprofi_token');
      const apiBase = window.KP?.API_BASE_URL || 'http://localhost:5000/api';

      const res = await fetch(`${apiBase}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
        // NOTE: pas de Content-Type — le navigateur le gère automatiquement pour FormData
      });

      clearInterval(interval);
      const data = await res.json();

      if (res.ok && data.success) {
        if (progressBar) progressBar.style.width = '100%';
        if (pctEl)       pctEl.textContent = '100%';
        setTimeout(() => {
          if (progressWrap) progressWrap.classList.remove('visible');
        }, 1500);
        window.Toast?.success(`"${file.name}" wurde erfolgreich hochgeladen!`);
        await this.loadDocList();
      } else {
        throw new Error(data.message || 'Upload fehlgeschlagen');
      }

    } catch (err) {
      clearInterval(interval);
      if (progressBar) progressBar.style.width = '0%';
      if (pctEl)       pctEl.textContent = '0%';
      setTimeout(() => {
        if (progressWrap) progressWrap.classList.remove('visible');
      }, 500);
      window.Toast?.error('Upload fehlgeschlagen: ' + err.message);
    }
  }
};

// ── HISTORIQUE ────────────────────────────────────────────────

const ClientHistory = {

  load() {
    const d  = ClientState.dossier;
    const el = document.getElementById('history-list');
    if (!el) return;

    if (!d || !d.statusHistory?.length) {
      el.innerHTML = `<p style="color:var(--color-gray-400);font-size:var(--font-size-sm);">Keine Einträge vorhanden.</p>`;
      return;
    }

    const statusLabels = {
      pending:  { label: 'Antrag eingereicht',     icon: '📋', color: '#f59e0b' },
      review:   { label: 'In Prüfung',             icon: '🔍', color: '#3b82f6' },
      approved: { label: 'Antrag genehmigt',       icon: '✅', color: '#22c55e' },
      refused:  { label: 'Antrag abgelehnt',       icon: '❌', color: '#ef4444' }
    };

    const entries = [...d.statusHistory].reverse();
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0;">
        ${entries.map((entry, i) => {
          const cfg = statusLabels[entry.status] || { label: entry.status, icon: '•', color: '#666' };
          return `
            <div style="display:flex;gap:var(--spacing-lg);padding:var(--spacing-lg);background:var(--color-white);
              border-radius:${i === 0 ? 'var(--border-radius-xl) var(--border-radius-xl) 0 0' : i === entries.length - 1 ? '0 0 var(--border-radius-xl) var(--border-radius-xl)' : '0'};
              border:1px solid var(--color-gray-200);${i > 0 ? 'border-top:none;' : ''}">
              <div style="width:40px;height:40px;min-width:40px;border-radius:50%;background:${cfg.color}15;
                display:flex;align-items:center;justify-content:center;font-size:1.1rem;border:2px solid ${cfg.color}30;">
                ${cfg.icon}
              </div>
              <div>
                <div style="font-weight:700;color:var(--color-primary);font-size:var(--font-size-sm);">${cfg.label}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-gray-400);margin-top:2px;">
                  ${ClientUI.fmtDate(entry.changedAt)}
                  ${entry.note ? `<br><em>${entry.note}</em>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
};

// ── PROFIL ────────────────────────────────────────────────────

const ClientProfile = {

  /** Affiche la bannière si l'email n'est pas vérifié */
  checkEmailVerification(user) {
    const banner = document.getElementById('email-verify-banner');
    if (!banner) return;
    if (user && user.emailVerified === false) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  },

  /** Renvoie l'email de vérification */
  async resendVerification() {
    const btn = document.getElementById('resend-verify-btn');
    if (!btn) return;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Wird gesendet…';
    try {
      await window.API.auth.resendVerification();
      btn.textContent = '✓ Gesendet!';
      window.Toast?.success('Bestätigungs-E-Mail wurde gesendet. Bitte prüfen Sie Ihren Posteingang.');
      setTimeout(() => { btn.disabled = false; btn.textContent = origText; }, 5000);
    } catch (err) {
      btn.textContent = origText;
      btn.disabled = false;
      window.Toast?.error(err.message || 'Fehler. Bitte versuchen Sie es erneut.');
    }
  },

  init() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Afficher la bannière email si non vérifié
    this.checkEmailVerification(ClientState.user);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn   = document.getElementById('profile-save-btn');
      const label = document.getElementById('profile-save-label');
      btn.disabled = true;
      label.textContent = 'Wird gespeichert...';

      const updates = {
        vorname: document.getElementById('p-vorname')?.value.trim(),
        nachname:document.getElementById('p-nachname')?.value.trim(),
        telefon: document.getElementById('p-telefon')?.value.trim(),
        strasse: document.getElementById('p-strasse')?.value.trim(),
        plz:     document.getElementById('p-plz')?.value.trim(),
        stadt:   document.getElementById('p-stadt')?.value.trim()
      };

      try {
        await window.API.client.updateProfile(updates);
        Object.assign(ClientState.user, updates);
        document.getElementById('sidebar-name').textContent = `${updates.vorname} ${updates.nachname}`;
        document.getElementById('welcome-name').textContent  = updates.vorname;
        document.getElementById('nav-user-greeting').textContent = `Hallo, ${updates.vorname}`;

        const successEl = document.getElementById('profile-success');
        if (successEl) {
          successEl.style.display = 'flex';
          setTimeout(() => successEl.style.display = 'none', 4000);
        }
        window.Toast?.success('Ihre Daten wurden erfolgreich aktualisiert.');
      } catch (err) {
        window.Toast?.error('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
      } finally {
        btn.disabled = false;
        label.textContent = '💾 Änderungen speichern';
      }
    });
  }
};

// ── INITIALISATION DES ÉVÉNEMENTS ────────────────────────────

function initEvents() {

  // Navigation sidebar
  document.querySelectorAll('.client-nav-link[data-panel]').forEach(link => {
    link.addEventListener('click', () => {
      ClientUI.showPanel(link.dataset.panel);
    });
  });

  // Navigation via hash URL
  const hash = window.location.hash.replace('#', '');
  const validPanels = ['dashboard','dossier','documents','history','profile','notifications','messages'];
  if (hash && validPanels.includes(hash)) {
    setTimeout(() => ClientUI.showPanel(hash), 500);
  }

  // Zone de drop (drag & drop)
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone) {
    dropZone.addEventListener('click', () => {
      if (!dropZone.classList.contains('locked')) fileInput?.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dropZone.classList.contains('locked')) dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (dropZone.classList.contains('locked')) return;
      const file = e.dataTransfer.files[0];
      if (file) ClientDocs.uploadFile(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        ClientDocs.uploadFile(file);
        fileInput.value = '';
      }
    });
  }
}

// ── DÉMARRAGE ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  ClientProfile.init();
  ClientData.init();
});
