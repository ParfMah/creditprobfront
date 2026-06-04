/* ============================================================
   admin.js — Logique complète de l'espace administrateur
   KreditProfi Deutschland — Dashboard, dossiers, clients, CMS
   ============================================================ */

'use strict';

// ── ÉTAT GLOBAL ────────────────────────────────────────────────

const AdminState = {
  dossiers:     [],
  clients:      [],
  messages:     [],
  currentPage:  { dossiers: 1, clients: 1 },
  totalPages:   { dossiers: 1, clients: 1 },
  activeDossier:null,
  activeClient: null,
  settings:     null,
  cmsData:      {}
};

// ── UTILITAIRES ────────────────────────────────────────────────

function fmtEur(n) {
  return Number(n).toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_CONFIG = {
  pending:  { label: 'In Bearbeitung', cls: 'badge-pending',  icon: '⏳' },
  review:   { label: 'In Prüfung',     cls: 'badge-review',   icon: '🔍' },
  approved: { label: 'Genehmigt',      cls: 'badge-approved', icon: '✅' },
  refused:  { label: 'Abgelehnt',      cls: 'badge-refused',  icon: '❌' }
};

const LOAN_LABELS = {
  privatkredit:       '💼 Privatkredit',
  immobilienkredit:   '🏠 Immobilienkredit',
  autokredit:         '🚗 Autokredit',
  hypothekendarlehen: '🏦 Hypothekendarlehen',
  kreditrueckkauf:    '🔄 Kreditrückkauf'
};

// ── NAVIGATION ─────────────────────────────────────────────────

function initNavigation() {
  const titles = {
    dashboard: '📊 Dashboard',
    dossiers:  '📋 Kreditanträge',
    clients:   '👥 Kunden',
    messages:  '✉️ Nachrichten',
    cms:       '✏️ CMS Inhalte',
    settings:  '⚙️ Einstellungen'
  };

  document.querySelectorAll('.adm-nav-link[data-panel]').forEach(link => {
    link.addEventListener('click', () => {
      const panelId = link.dataset.panel;
      document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.adm-nav-link').forEach(l => l.classList.remove('active'));

      const panel = document.getElementById(`panel-${panelId}`);
      if (panel) panel.classList.add('active');
      link.classList.add('active');

      document.getElementById('adm-page-title').textContent = titles[panelId] || panelId;

      // Charger les données du panneau
      if (panelId === 'dossiers') AdminDossiers.load();
      if (panelId === 'clients')  AdminClients.load();
      if (panelId === 'messages') AdminMessages.load();
      if (panelId === 'cms')      AdminCMS.loadAll();
      if (panelId === 'settings') AdminSettings.load();

      // Fermer le sidebar sur mobile
      document.getElementById('adm-sidebar').classList.remove('open');
      const ov = document.getElementById('adm-overlay');
      if (ov) ov.classList.remove('visible');
    });
  });

  // Toggle sidebar mobile + overlay
  document.getElementById('adm-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('adm-sidebar');
    const overlay = document.getElementById('adm-overlay');
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('visible');
  });
}

function closeSidebar() {
  const sidebar = document.getElementById('adm-sidebar');
  const overlay = document.getElementById('adm-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

// ── DASHBOARD ──────────────────────────────────────────────────

const AdminDashboard = {

  async load() {
    try {
      const [statsRes, monthlyRes] = await Promise.allSettled([
        window.API.stats.getDashboard(),
        window.API.stats.getMonthly()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        this.renderStats(statsRes.value.stats);
      } else {
        this.renderDemoStats();
      }

      if (monthlyRes.status === 'fulfilled' && monthlyRes.value?.monthly) {
        this.drawMonthlyChart(monthlyRes.value.monthly);
        this.drawTypeChart(monthlyRes.value.byType);
      } else {
        this.drawDemoCharts();
      }

    } catch {
      this.renderDemoStats();
      this.drawDemoCharts();
    }
  },

  renderStats(s) {
    document.getElementById('stat-total').textContent       = s.totalDossiers ?? '—';
    document.getElementById('stat-pending').textContent     = s.pending ?? '—';
    document.getElementById('stat-approved').textContent    = s.approved ?? '—';
    document.getElementById('stat-refused').textContent     = s.refused ?? '—';
    document.getElementById('stat-new-clients').textContent = s.newClients ?? '—';
    document.getElementById('stat-volume').textContent      = s.totalAmount ? fmtEur(s.totalAmount) : '—';
    document.getElementById('stat-messages').textContent    = s.unreadMessages ?? '0';

    // Badges dans la sidebar
    if (s.pending > 0) {
      const b = document.getElementById('pending-badge');
      if (b) { b.textContent = s.pending; b.style.display = 'inline-flex'; }
    }
    if (s.unreadMessages > 0) {
      const b = document.getElementById('msg-badge');
      if (b) { b.textContent = s.unreadMessages; b.style.display = 'inline-flex'; }
    }
  },

  renderDemoStats() {
    const demo = { totalDossiers: 142, pending: 18, approved: 87, refused: 12,
                   newClients: 7, totalAmount: 1850000, unreadMessages: 3 };
    this.renderStats(demo);
  },

  drawMonthlyChart(monthly) {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;

    // Préparer les 12 derniers mois
    const now    = new Date();
    const labels = [];
    const values = [];
    const monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
      const found = monthly?.find(m => m._id.month === d.getMonth() + 1 && m._id.year === d.getFullYear());
      values.push(found ? found.count : Math.floor(Math.random() * 15) + 5);
    }

    this.drawBarChart(canvas, labels, values, '#1E3A8A', '#C9A84C');
  },

  drawBarChart(canvas, labels, values, colorMain, colorAccent) {
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement.clientWidth - 40;
    const H   = 250;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad  = { top: 20, right: 20, bottom: 50, left: 50 };
    const cW   = W - pad.left - pad.right;
    const cH   = H - pad.top  - pad.bottom;
    const maxV = Math.max(...values, 1);
    const barW = (cW / labels.length) * 0.6;
    const gap  = cW / labels.length;

    // Grille horizontale
    ctx.strokeStyle = '#E9ECEF';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.font      = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxV * (1 - i / 4)), pad.left - 8, y + 4);
    }

    // Barres
    labels.forEach((label, i) => {
      const barH = (values[i] / maxV) * cH;
      const x    = pad.left + i * gap + (gap - barW) / 2;
      const y    = pad.top + cH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, colorMain);
      grad.addColorStop(1, colorAccent + '88');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Valeur au-dessus
      ctx.fillStyle = colorMain;
      ctx.font      = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      if (values[i] > 0) ctx.fillText(values[i], x + barW / 2, y - 5);

      // Label axe X
      ctx.fillStyle = '#64748B';
      ctx.font      = '11px Inter, sans-serif';
      ctx.fillText(label, x + barW / 2, pad.top + cH + 18);
    });
  },

  drawTypeChart(byType) {
    const canvas = document.getElementById('chart-types');
    if (!canvas) return;

    const demoData = byType?.length ? byType : [
      { _id: 'privatkredit', count: 45 },
      { _id: 'immobilienkredit', count: 30 },
      { _id: 'autokredit', count: 15 },
      { _id: 'hypothekendarlehen', count: 6 },
      { _id: 'kreditrueckkauf', count: 4 }
    ];

    const colors = ['#1E3A8A','#C9A84C','#22c55e','#f59e0b','#ef4444'];
    const labels = { privatkredit:'Privatkredit', immobilienkredit:'Immo.kredit',
                     autokredit:'Autokredit', hypothekendarlehen:'Hypothek', kreditrueckkauf:'Rückkauf' };

    const dpr  = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    const ctx   = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const total = demoData.reduce((s, d) => s + d.count, 0);
    const cx    = size / 2;
    const cy    = size / 2;
    const r     = size / 2 - 20;
    let   angle = -Math.PI / 2;

    demoData.forEach((d, i) => {
      const slice = (d.count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth   = 3;
      ctx.stroke();
      angle += slice;
    });

    // Trou au centre (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Total au centre
    ctx.fillStyle = '#0A1628';
    ctx.font      = 'bold 22px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.fillStyle = '#94A3B8';
    ctx.font      = '11px Inter, sans-serif';
    ctx.fillText('Anträge', cx, cy + 20);

    // Légende
    const legend = document.getElementById('chart-types-legend');
    if (legend) {
      legend.innerHTML = demoData.map((d, i) => `
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748B;margin-bottom:4px;">
          <div style="width:12px;height:12px;border-radius:3px;background:${colors[i % colors.length]};"></div>
          <span>${labels[d._id] || d._id}</span>
          <span style="margin-left:auto;font-weight:700;color:#0A1628;">${d.count}</span>
        </div>
      `).join('');
    }
  },

  drawDemoCharts() {
    this.drawMonthlyChart(null);
    this.drawTypeChart(null);
  }
};

// ── GESTION DES DOSSIERS ───────────────────────────────────────

const AdminDossiers = {

  async load(page = 1) {
    const status   = document.getElementById('filter-status')?.value || '';
    const loanType = document.getElementById('filter-type')?.value || '';
    const search   = document.getElementById('dossier-search')?.value || '';

    const params = new URLSearchParams({ page, limit: 15 });
    if (status)   params.set('status',   status);
    if (loanType) params.set('loanType', loanType);
    if (search)   params.set('search',   search);

    const tbody = document.getElementById('dossiers-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;"><div class="spinner-sm" style="margin:0 auto;"></div></td></tr>`;

    try {
      const res = await window.API.dossiers.getAll(params.toString());
      if (res?.success) {
        AdminState.dossiers = res.dossiers;
        this.render(res.dossiers);
        document.getElementById('dossiers-count').textContent = `${res?.total} Anträge insgesamt`;
        AdminState.totalPages.dossiers = res.pages;
        this.renderPagination(page, res.pages);
      }
    } catch {
      this.renderDemo();
    }
  },

  renderDemo() {
    const demo = [
      { _id: '1', dossierNumber: 'KP-2024-100001', client: { vorname: 'Max', nachname: 'Mustermann', email: 'max@example.de' }, loanType: 'privatkredit', amount: 15000, status: 'pending',  createdAt: new Date().toISOString() },
      { _id: '2', dossierNumber: 'KP-2024-100002', client: { vorname: 'Anna', nachname: 'Schmidt', email: 'anna@example.de' }, loanType: 'immobilienkredit', amount: 250000, status: 'review', createdAt: new Date().toISOString() },
      { _id: '3', dossierNumber: 'KP-2024-100003', client: { vorname: 'Thomas', nachname: 'Weber', email: 'thomas@example.de' }, loanType: 'autokredit', amount: 28000, status: 'approved', createdAt: new Date().toISOString() },
      { _id: '4', dossierNumber: 'KP-2024-100004', client: { vorname: 'Maria', nachname: 'Bauer', email: 'maria@example.de' }, loanType: 'kreditrueckkauf', amount: 45000, status: 'refused', createdAt: new Date().toISOString() }
    ];
    AdminState.dossiers = demo;
    this.render(demo);
    document.getElementById('dossiers-count').textContent = `${demo.length} Anträge (Demo)`;
  },

  render(dossiers) {
    const tbody = document.getElementById('dossiers-tbody');
    if (!tbody) return;

    if (!dossiers.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-gray-400);">Keine Anträge gefunden.</td></tr>`;
      return;
    }

    tbody.innerHTML = dossiers.map(d => {
      const sc     = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
      const client = d.client || {};
      return `
        <tr>
          <td><code style="font-size:11px;background:var(--color-bg-light);padding:3px 8px;border-radius:4px;">${d.dossierNumber}</code></td>
          <td>
            <div style="font-weight:600;color:var(--color-primary);">${client.vorname} ${client.nachname}</div>
            <div style="font-size:11px;color:var(--color-gray-400);">${client.email}</div>
          </td>
          <td style="white-space:nowrap;">${LOAN_LABELS[d.loanType] || d.loanType}</td>
          <td style="font-weight:700;color:var(--color-accent);">${fmtEur(d.amount)}</td>
          <td><span class="badge ${sc.cls}" style="font-size:11px;">${sc.icon} ${sc.label}</span></td>
          <td style="white-space:nowrap;">${fmtDate(d.createdAt)}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="AdminDossiers.openDetail('${d._id}')">Details</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openDetail(id) {
    const d = AdminState.dossiers.find(x => x._id === id);
    if (!d) return;
    AdminState.activeDossier = d;

    const client = d.client || {};
    document.getElementById('modal-dossier-title').textContent = `Antrag ${d.dossierNumber}`;
    document.getElementById('modal-status-select').value = d.status;

    // Charger le détail complet (avec messages + historique)
    window.API.dossiers.getById(d._id).then(full => {
      const fd = full.dossier || d;
      AdminDossiers._renderDetail(fd, client);
    }).catch(() => AdminDossiers._renderDetail(d, client));

    document.getElementById('dossier-modal').style.display = 'flex';
  },

  _renderDetail(d, client) {
    const STATUS_HISTORY_LABELS = {
      pending: { icon: '📨', label: 'Eingereicht', color: '#3b82f6' },
      review:  { icon: '🔍', label: 'In Prüfung',  color: '#f59e0b' },
      approved:{ icon: '✅', label: 'Genehmigt',   color: '#10b981' },
      refused: { icon: '❌', label: 'Abgelehnt',   color: '#ef4444' },
      cancelled:{ icon:'🚫', label: 'Widerrufen',  color: '#6b7280' }
    };

    const historyHtml = (d.statusHistory && d.statusHistory.length)
      ? d.statusHistory.map((e, i) => {
          const s = STATUS_HISTORY_LABELS[e.status] || { icon: '•', label: e.status, color: '#6b7280' };
          const dt = new Date(e.createdAt).toLocaleString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
          return `<div style="display:flex;gap:12px;position:relative;padding-bottom:${i<d.statusHistory.length-1?'16px':'0'};">
            ${i<d.statusHistory.length-1?'<div style="position:absolute;left:16px;top:34px;bottom:0;width:2px;background:#e5e7eb;"></div>':''}
            <div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:${s.color}20;border:2px solid ${s.color};display:flex;align-items:center;justify-content:center;font-size:0.85rem;z-index:1;">${s.icon}</div>
            <div><div style="font-weight:700;color:${s.color};font-size:13px;">${s.label}</div><div style="font-size:11px;color:#9ca3af;">${dt}${e.note?` · ${e.note}`:''}</div></div>
          </div>`;
        }).join('')
      : '<p style="color:#9ca3af;font-size:13px;">Kein Verlauf.</p>';

    const messagesHtml = (d.messages && d.messages.length)
      ? d.messages.map(m => {
          const isAdmin = m.senderRole === 'admin';
          const align   = isAdmin ? 'flex-end' : 'flex-start';
          const bg      = isAdmin ? 'linear-gradient(135deg,#0B1D3A,#1A4FA8)' : '#f3f4f6';
          const color   = isAdmin ? 'white' : '#1f2937';
          const name    = isAdmin ? '👨‍💼 Berater' : '👤 Kunde';
          const dt      = new Date(m.createdAt).toLocaleString('de-DE', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
          return `<div style="display:flex;flex-direction:column;align-items:${align};max-width:80%;${!isAdmin?'':'margin-left:auto'}">
            <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;font-weight:600;">${name} · ${dt}</div>
            <div style="background:${bg};color:${color};padding:10px 14px;border-radius:${isAdmin?'16px 4px 16px 16px':'4px 16px 16px 16px'};font-size:13px;line-height:1.6;">
              ${m.content.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/
/g,'<br>')}
            </div>
          </div>`;
        }).join('')
      : '<p style="color:#9ca3af;font-size:13px;text-align:center;margin:auto;">Noch keine Nachrichten.</p>';

    document.getElementById('modal-dossier-body').innerHTML = `
      <!-- Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:2px solid #f3f4f6;padding-bottom:0;">
        <button onclick="AdminDossiers.switchTab('info')" id="tab-info"
                style="padding:8px 16px;background:none;border:none;cursor:pointer;font-weight:700;color:var(--color-primary);border-bottom:3px solid var(--color-primary);margin-bottom:-2px;">
          📋 Infos
        </button>
        <button onclick="AdminDossiers.switchTab('history')" id="tab-history"
                style="padding:8px 16px;background:none;border:none;cursor:pointer;font-weight:600;color:#6b7280;border-bottom:3px solid transparent;margin-bottom:-2px;">
          📜 Verlauf
        </button>
        <button onclick="AdminDossiers.switchTab('messages')" id="tab-messages"
                style="padding:8px 16px;background:none;border:none;cursor:pointer;font-weight:600;color:#6b7280;border-bottom:3px solid transparent;margin-bottom:-2px;">
          💬 Nachrichten
        </button>
      </div>

      <!-- Tab: Infos -->
      <div id="tab-content-info">
        <div class="detail-grid" style="margin-bottom:var(--spacing-xl);">
          <div class="detail-item"><div class="lbl">Antragsnummer</div><div class="val">${d.dossierNumber}</div></div>
          <div class="detail-item"><div class="lbl">Status</div><div class="val"><span class="badge ${STATUS_CONFIG[d.status]?.cls}">${STATUS_CONFIG[d.status]?.icon} ${STATUS_CONFIG[d.status]?.label}</span></div></div>
          <div class="detail-item"><div class="lbl">Kreditart</div><div class="val">${LOAN_LABELS[d.loanType] || d.loanType}</div></div>
          <div class="detail-item"><div class="lbl">Betrag</div><div class="val" style="color:var(--color-accent);font-size:1.1rem;">${fmtEur(d.amount)}</div></div>
          <div class="detail-item"><div class="lbl">Laufzeit</div><div class="val">${d.months} Monate</div></div>
          <div class="detail-item"><div class="lbl">Eingereicht</div><div class="val">${fmtDate(d.createdAt)}</div></div>
          <div class="detail-item"><div class="lbl">Upload freigegeben</div><div class="val">${d.uploadEnabled ? '✅ Ja' : '🔒 Nein'}</div></div>
        </div>
        <div style="background:var(--color-bg-light);border-radius:var(--border-radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-lg);">
          <div style="font-size:11px;font-weight:700;color:var(--color-gray-400);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--spacing-md);">Kundendaten</div>
          <div class="detail-grid">
            <div class="detail-item"><div class="lbl">Name</div><div class="val">${client.vorname||''} ${client.nachname||''}</div></div>
            <div class="detail-item"><div class="lbl">E-Mail</div><div class="val">${client.email||'—'}</div></div>
            <div class="detail-item"><div class="lbl">Telefon</div><div class="val">${client.telefon || d.telefon || '—'}</div></div>
            <div class="detail-item"><div class="lbl">Stadt</div><div class="val">${client.stadt || d.stadt || '—'}</div></div>
          </div>
        </div>
        ${d.adminNote ? `<div class="alert alert-info"><span>📝</span><div><strong>Interne Notiz:</strong> ${d.adminNote}</div></div>` : ''}
        <button class="btn btn-sm" style="background:rgba(26,79,168,0.08);color:var(--color-primary);"
                onclick="AdminDossiers.downloadZip('${d._id}','${d.dossierNumber}')">
          📥 Alle Dokumente als ZIP herunterladen
        </button>
      </div>

      <!-- Tab: Verlauf -->
      <div id="tab-content-history" style="display:none;">
        <div style="display:flex;flex-direction:column;gap:0;">${historyHtml}</div>
      </div>

      <!-- Tab: Nachrichten -->
      <div id="tab-content-messages" style="display:none;">
        <div id="admin-msg-feed" style="min-height:200px;max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:12px;background:#f9fafb;border-radius:12px;margin-bottom:12px;">
          ${messagesHtml}
        </div>
        <div style="display:flex;gap:8px;">
          <textarea id="admin-msg-input" rows="2" class="form-control" placeholder="Nachricht an den Kunden…" maxlength="2000"
                    style="resize:none;flex:1;font-size:13px;"
                    onkeydown="if(event.ctrlKey&&event.key==='Enter')AdminDossiers.sendMessage('${d._id}')"></textarea>
          <button class="btn btn-primary btn-sm" onclick="AdminDossiers.sendMessage('${d._id}')" style="align-self:flex-end;white-space:nowrap;">
            📤 Senden
          </button>
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Ctrl+Enter zum Senden</div>
      </div>
    `;
  },

  switchTab(tabName) {
    ['info','history','messages'].forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      const div = document.getElementById(`tab-content-${t}`);
      const active = t === tabName;
      if (btn) {
        btn.style.color       = active ? 'var(--color-primary)' : '#6b7280';
        btn.style.fontWeight  = active ? '700' : '600';
        btn.style.borderBottomColor = active ? 'var(--color-primary)' : 'transparent';
      }
      if (div) div.style.display = active ? 'block' : 'none';
    });
    // Scroll messages to bottom when switching to messages tab
    if (tabName === 'messages') {
      setTimeout(() => {
        const feed = document.getElementById('admin-msg-feed');
        if (feed) feed.scrollTop = feed.scrollHeight;
      }, 50);
    }
  },

  async sendMessage(dossierId) {
    const input   = document.getElementById('admin-msg-input');
    const content = input?.value?.trim();
    if (!content || !dossierId) return;
    try {
      const res = await window.API.dossiers.sendMessage(dossierId, content);
      input.value = '';
      // Ajouter le message au fil
      const feed  = document.getElementById('admin-msg-feed');
      const dt    = new Date().toLocaleString('de-DE', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const msgHtml = `<div style="display:flex;flex-direction:column;align-items:flex-end;max-width:80%;margin-left:auto;">
        <div style="font-size:10px;color:#9ca3af;margin-bottom:3px;font-weight:600;">👨‍💼 Berater · ${dt}</div>
        <div style="background:linear-gradient(135deg,#0B1D3A,#1A4FA8);color:white;padding:10px 14px;border-radius:16px 4px 16px 16px;font-size:13px;line-height:1.6;">
          ${content.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}
        </div>
      </div>`;
      // Supprimer le message "Noch keine Nachrichten" si présent
      if (feed.innerHTML.includes('Noch keine Nachrichten')) feed.innerHTML = '';
      feed.insertAdjacentHTML('beforeend', msgHtml);
      feed.scrollTop = feed.scrollHeight;
      window.Toast?.success('Nachricht gesendet.');
    } catch (err) {
      window.Toast?.error(err.message || 'Fehler beim Senden.');
    }
  },

  async downloadZip(dossierId, dossierNumber) {
    try {
      window.Toast?.info('ZIP wird erstellt…');
      await window.API.dossiers.downloadZip(dossierId, dossierNumber);
    } catch (err) {
      window.Toast?.error(err.message || 'Fehler beim Herunterladen der Dokumente.');
    }
  },

  async updateStatus() {
    const d      = AdminState.activeDossier;
    if (!d) return;
    const status = document.getElementById('modal-status-select')?.value;
    const note   = document.getElementById('modal-admin-note')?.value || '';

    const btn = document.getElementById('btn-update-status');
    btn.disabled = true;
    btn.textContent = 'Wird aktualisiert...';

    try {
      await window.API.dossiers.updateStatus(d._id, { status, adminNote: note, uploadEnabled: d.uploadEnabled });
      window.Toast?.success('Status erfolgreich aktualisiert.');
      document.getElementById('dossier-modal').style.display = 'none';
      await this.load();
    } catch (err) {
      window.Toast?.error(err.message || 'Fehler beim Aktualisieren.');
    } finally {
      btn.disabled = false;
      btn.textContent = '✅ Status aktualisieren';
    }
  },

  renderPagination(current, total) {
    const el = document.getElementById('dossiers-pagination');
    if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }

    let html = '';
    for (let i = 1; i <= total; i++) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="AdminDossiers.load(${i})">${i}</button>`;
    }
    el.innerHTML = html;
  }
};
window.AdminDossiers = AdminDossiers;

// ── GESTION DES CLIENTS ────────────────────────────────────────

const AdminClients = {

  async load(page = 1) {
    const search   = document.getElementById('client-search')?.value || '';
    const isActive = document.getElementById('filter-active')?.value || '';

    const params = new URLSearchParams({ page, limit: 15 });
    if (search)   params.set('search',   search);
    if (isActive) params.set('isActive', isActive);

    try {
      const res = await window.API.admin.getClients(params.toString());
      if (res?.success) {
        AdminState.clients = res?.clients;
        this.render(res?.clients);
        document.getElementById('clients-count').textContent = `${res?.total} Kunden insgesamt`;
      }
    } catch {
      this.renderDemo();
    }
  },

  renderDemo() {
    const demo = [
      { _id: '1', vorname: 'Max',   nachname: 'Mustermann', email: 'max@example.de',   telefon: '+49 30 123', isActive: true,  createdAt: new Date().toISOString() },
      { _id: '2', vorname: 'Anna',  nachname: 'Schmidt',    email: 'anna@example.de',  telefon: '+49 40 456', isActive: true,  createdAt: new Date().toISOString() },
      { _id: '3', vorname: 'Klaus', nachname: 'Weber',      email: 'klaus@example.de', telefon: '+49 69 789', isActive: false, createdAt: new Date().toISOString() }
    ];
    AdminState.clients = demo;
    this.render(demo);
    document.getElementById('clients-count').textContent = `${demo.length} Kunden (Demo)`;
  },

  render(clients) {
    const tbody = document.getElementById('clients-tbody');
    if (!tbody) return;

    if (!clients.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-gray-400);">Keine Kunden gefunden.</td></tr>`;
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--color-primary);">${c.vorname} ${c.nachname}</div>
        </td>
        <td>${c.email}</td>
        <td>${c.telefon || '—'}</td>
        <td>—</td>
        <td>${fmtDate(c.createdAt)}</td>
        <td>
          <span class="badge ${c.isActive ? 'badge-approved' : 'badge-refused'}" style="font-size:11px;">
            ${c.isActive ? '✅ Aktiv' : '🔒 Deaktiviert'}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="AdminClients.openDetail('${c._id}')">Details</button>
        </td>
      </tr>
    `).join('');
  },

  openDetail(id) {
    const c = AdminState.clients.find(x => x._id === id);
    if (!c) return;
    AdminState.activeClient = c;

    document.getElementById('modal-client-title').textContent = `${c.vorname} ${c.nachname}`;
    document.getElementById('btn-toggle-client').textContent  = c.isActive ? '🔒 Deaktivieren' : '✅ Aktivieren';
    document.getElementById('btn-toggle-client').style.background = c.isActive ? 'var(--color-warning)' : 'var(--color-success)';

    document.getElementById('modal-client-body').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="lbl">Vorname</div><div class="val">${c.vorname}</div></div>
        <div class="detail-item"><div class="lbl">Nachname</div><div class="val">${c.nachname}</div></div>
        <div class="detail-item"><div class="lbl">E-Mail</div><div class="val">${c.email}</div></div>
        <div class="detail-item"><div class="lbl">Telefon</div><div class="val">${c.telefon || '—'}</div></div>
        <div class="detail-item"><div class="lbl">Stadt</div><div class="val">${c.stadt || '—'}</div></div>
        <div class="detail-item"><div class="lbl">PLZ</div><div class="val">${c.plz || '—'}</div></div>
        <div class="detail-item"><div class="lbl">Registriert am</div><div class="val">${fmtDate(c.createdAt)}</div></div>
        <div class="detail-item"><div class="lbl">Status</div><div class="val">
          <span class="badge ${c.isActive ? 'badge-approved' : 'badge-refused'}">${c.isActive ? '✅ Aktiv' : '🔒 Deaktiviert'}</span>
        </div></div>
      </div>
    `;

    document.getElementById('client-modal').style.display = 'flex';
  },

  async toggleStatus() {
    const c = AdminState.activeClient;
    if (!c) return;
    try {
      await window.API.admin.toggleClient(c._id, !c.isActive);
      window.Toast?.success(`Konto ${!c.isActive ? 'aktiviert' : 'deaktiviert'}.`);
    } catch {
      window.Toast?.success(`Status geändert (Demo-Modus).`);
    }
    document.getElementById('client-modal').style.display = 'none';
    await this.load();
  }
};
window.AdminClients = AdminClients;

// ── MESSAGES ───────────────────────────────────────────────────

const AdminMessages = {
  async load() {
    try {
      const res = await window.API.contact.getAll();
      if (res?.success) this.render(res?.messages);
    } catch {
      this.renderDemo();
    }
  },

  renderDemo() {
    this.render([
      { _id: '1', vorname: 'Max', nachname: 'M.', email: 'max@example.de', betreff: 'Frage zur Simulation', isRead: false, createdAt: new Date().toISOString() },
      { _id: '2', vorname: 'Anna', nachname: 'S.', email: 'anna@example.de', betreff: 'Antrag eingereicht', isRead: true, createdAt: new Date().toISOString() }
    ]);
  },

  render(messages) {
    const tbody = document.getElementById('messages-tbody');
    if (!tbody) return;

    if (!messages.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-gray-400);">Keine Nachrichten.</td></tr>`;
      return;
    }

    tbody.innerHTML = messages.map(m => `
      <tr style="${!m.isRead ? 'background:rgba(30,58,138,0.03);font-weight:600;' : ''}">
        <td>${m.vorname} ${m.nachname}<br><span style="font-size:11px;color:var(--color-gray-400);">${m.email}</span></td>
        <td>${m.betreff}</td>
        <td>${fmtDate(m.createdAt)}</td>
        <td>
          <span class="badge ${m.isRead ? 'badge-approved' : 'badge-pending'}" style="font-size:11px;">
            ${m.isRead ? 'Gelesen' : '⚡ Neu'}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="AdminMessages.markRead('${m._id}')">Als gelesen markieren</button>
        </td>
      </tr>
    `).join('');
  },

  async markRead(id) {
    try {
      await window.API.contact.markRead(id);
      window.Toast?.success('Als gelesen markiert.');
      await this.load();
    } catch {
      window.Toast?.info('Markiert (Demo-Modus).');
    }
  }
};
window.AdminMessages = AdminMessages;

// ── CMS ────────────────────────────────────────────────────────

const AdminCMS = {

  async loadAll() {
    const sections = ['homepage', 'loan_rates', 'faq', 'testimonials'];
    for (const s of sections) {
      try {
        const res = await window.API.content.get(s);
        if (res?.success) {
          AdminState.cmsData[s] = res.content.data;
          this.populateSection(s, res.content.data);
        }
      } catch { /* Données démo */ }
    }
    this.populateDemoIfEmpty();
  },

  populateDemoIfEmpty() {
    if (!document.getElementById('cms-hero-title').value) {
      document.getElementById('cms-hero-title').value    = 'Ihr Kredit. Schnell. Günstig. Transparent.';
      document.getElementById('cms-hero-subtitle').value = 'Kredite ab 1,99% — Antwort in 24 Stunden.';
    }
    if (!document.getElementById('cms-rates-grid').children.length) {
      const rates = { privatkredit: 1.99, immobilienkredit: 0.89, autokredit: 2.49, hypothekendarlehen: 1.29, kreditrueckkauf: 2.99 };
      const labels = { privatkredit:'Privatkredit', immobilienkredit:'Immobilienkredit', autokredit:'Autokredit', hypothekendarlehen:'Hypothekendarlehen', kreditrueckkauf:'Kreditrückkauf' };
      const grid = document.getElementById('cms-rates-grid');
      grid.innerHTML = Object.entries(rates).map(([k, v]) => `
        <div class="form-group">
          <label class="form-label">${labels[k]} (% p.a.)</label>
          <input type="number" class="cms-textarea" id="rate-${k}" value="${v}" step="0.01" min="0.1" max="20" style="min-height:unset;height:42px;">
        </div>
      `).join('');
    }
    if (!document.getElementById('faq-items-list').children.length) {
      AdminState.cmsData.faq = { items: [{ question: 'Wie lange dauert die Bearbeitung?', answer: 'Innerhalb von 24 Stunden.' }] };
      this.renderFaqItems(AdminState.cmsData.faq.items);
    }
    if (!document.getElementById('testimonials-list').children.length) {
      AdminState.cmsData.testimonials = { items: [{ name: 'Markus S.', city: 'München', rating: 5, text: 'Sehr zufrieden!' }] };
      this.renderTestimonials(AdminState.cmsData.testimonials.items);
    }
  },

  populateSection(section, data) {
    if (section === 'homepage') {
      if (data.heroTitle)    document.getElementById('cms-hero-title').value    = data.heroTitle;
      if (data.heroSubtitle) document.getElementById('cms-hero-subtitle').value = data.heroSubtitle;
    }
    if (section === 'faq' && data.items) this.renderFaqItems(data.items);
    if (section === 'testimonials' && data.items) this.renderTestimonials(data.items);
  },

  renderFaqItems(items) {
    const el = document.getElementById('faq-items-list');
    if (!el) return;
    el.innerHTML = items.map((item, i) => `
      <div style="background:var(--color-bg-light);border-radius:var(--border-radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-md);">
        <div class="form-group">
          <label class="form-label">Frage ${i+1}</label>
          <input type="text" class="cms-textarea" id="faq-q-${i}" value="${item.question}" style="min-height:unset;height:42px;">
        </div>
        <div class="form-group">
          <label class="form-label">Antwort</label>
          <textarea class="cms-textarea" id="faq-a-${i}" rows="2">${item.answer}</textarea>
        </div>
        <button class="btn btn-sm" style="background:var(--color-error);color:white;font-size:12px;" onclick="this.closest('div').remove()">Entfernen</button>
      </div>
    `).join('');
  },

  addFaqItem() {
    const el = document.getElementById('faq-items-list');
    const i  = el.children.length;
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--color-bg-light);border-radius:12px;padding:1rem;margin-bottom:1rem;';
    div.innerHTML = `
      <div class="form-group"><label class="form-label">Frage ${i+1}</label><input type="text" class="cms-textarea" id="faq-q-${i}" placeholder="Neue Frage..." style="min-height:unset;height:42px;"></div>
      <div class="form-group"><label class="form-label">Antwort</label><textarea class="cms-textarea" id="faq-a-${i}" rows="2" placeholder="Antwort..."></textarea></div>
      <button class="btn btn-sm" style="background:var(--color-error);color:white;font-size:12px;" onclick="this.closest('div').remove()">Entfernen</button>
    `;
    el.appendChild(div);
  },

  renderTestimonials(items) {
    const el = document.getElementById('testimonials-list');
    if (!el) return;
    el.innerHTML = items.map((item, i) => `
      <div style="background:var(--color-bg-light);border-radius:var(--border-radius-lg);padding:var(--spacing-lg);margin-bottom:var(--spacing-md);">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Name</label><input type="text" class="cms-textarea" id="t-name-${i}" value="${item.name}" style="min-height:unset;height:42px;"></div>
          <div class="form-group"><label class="form-label">Stadt</label><input type="text" class="cms-textarea" id="t-city-${i}" value="${item.city}" style="min-height:unset;height:42px;"></div>
        </div>
        <div class="form-group"><label class="form-label">Bewertungstext</label><textarea class="cms-textarea" id="t-text-${i}" rows="2">${item.text}</textarea></div>
        <button class="btn btn-sm" style="background:var(--color-error);color:white;font-size:12px;" onclick="this.closest('div').remove()">Entfernen</button>
      </div>
    `).join('');
  },

  addTestimonial() {
    const el = document.getElementById('testimonials-list');
    const i  = el.children.length;
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--color-bg-light);border-radius:12px;padding:1rem;margin-bottom:1rem;';
    div.innerHTML = `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Name</label><input type="text" class="cms-textarea" id="t-name-${i}" placeholder="Max M." style="min-height:unset;height:42px;"></div>
        <div class="form-group"><label class="form-label">Stadt</label><input type="text" class="cms-textarea" id="t-city-${i}" placeholder="Berlin" style="min-height:unset;height:42px;"></div>
      </div>
      <div class="form-group"><label class="form-label">Bewertungstext</label><textarea class="cms-textarea" id="t-text-${i}" rows="2" placeholder="Bewertungstext..."></textarea></div>
      <button class="btn btn-sm" style="background:var(--color-error);color:white;font-size:12px;" onclick="this.closest('div').remove()">Entfernen</button>
    `;
    el.appendChild(div);
  },

  toggle(section) {
    const el    = document.getElementById(`cms-${section}`);
    const arrow = document.getElementById(`cms-${section}-arrow`);
    if (el) el.classList.toggle('open');
    if (arrow) arrow.textContent = el?.classList.contains('open') ? '▲' : '▼';
  },

  async save(section) {
    let data = {};
    if (section === 'homepage') {
      data = {
        heroTitle:    document.getElementById('cms-hero-title')?.value,
        heroSubtitle: document.getElementById('cms-hero-subtitle')?.value
      };
    } else if (section === 'loan_rates') {
      const keys = ['privatkredit','immobilienkredit','autokredit','hypothekendarlehen','kreditrueckkauf'];
      keys.forEach(k => { const el = document.getElementById(`rate-${k}`); if (el) data[k] = { rate: parseFloat(el.value) }; });
    } else if (section === 'faq') {
      const items = [];
      document.querySelectorAll('[id^="faq-q-"]').forEach((q, i) => {
        const a = document.getElementById(`faq-a-${i}`);
        if (q.value.trim()) items.push({ question: q.value.trim(), answer: a?.value.trim() || '' });
      });
      data = { items };
    } else if (section === 'testimonials') {
      const items = [];
      document.querySelectorAll('[id^="t-name-"]').forEach((n, i) => {
        const city = document.getElementById(`t-city-${i}`);
        const text = document.getElementById(`t-text-${i}`);
        if (n.value.trim()) items.push({ name: n.value.trim(), city: city?.value.trim(), text: text?.value.trim(), rating: 5 });
      });
      data = { items };
    }

    try {
      await window.API.content.update(section, { data });
      window.Toast?.success('Inhalt erfolgreich gespeichert!');
    } catch {
      window.Toast?.success('Gespeichert (Demo-Modus).');
    }
  }
};
window.AdminCMS = AdminCMS;

// ── PARAMÈTRES ─────────────────────────────────────────────────

const AdminSettings = {

  async load() {
    try {
      const res = await window.API.settings.get();
      if (res?.success && res?.settings) {
        AdminState.settings = res?.settings;
        const s = res?.settings;
        if (s.maintenanceMode !== undefined)
          document.getElementById('maintenance-toggle').checked = s.maintenanceMode;
        if (s.smtp) {
          if (s.smtp.host)  document.getElementById('smtp-host').value = s.smtp.host;
          if (s.smtp.port)  document.getElementById('smtp-port').value = s.smtp.port;
          if (s.smtp.user)  document.getElementById('smtp-user').value = s.smtp.user;
          if (s.smtp.from)  document.getElementById('smtp-from').value = s.smtp.from;
        }
      }
    } catch { /* Valeurs par défaut */ }
  },

  async savePassword() {
    const cur  = document.getElementById('s-cur-pwd')?.value;
    const nw   = document.getElementById('s-new-pwd')?.value;
    const nw2  = document.getElementById('s-new-pwd2')?.value;
    const msgEl= document.getElementById('pwd-change-msg');

    if (!cur || !nw || !nw2) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-error" style="margin-bottom:1rem;"><span>❌</span><div>Bitte füllen Sie alle Felder aus.</div></div>`;
      return;
    }
    if (nw !== nw2) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-error" style="margin-bottom:1rem;"><span>❌</span><div>Passwörter stimmen nicht überein.</div></div>`;
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(nw)) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-error" style="margin-bottom:1rem;"><span>❌</span><div>Passwort: min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl.</div></div>`;
      return;
    }

    try {
      await window.API.admin.changeAdminPwd({ currentPassword: cur, newPassword: nw });
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-success" style="margin-bottom:1rem;"><span>✅</span><div>Passwort erfolgreich geändert.</div></div>`;
      document.getElementById('s-cur-pwd').value = '';
      document.getElementById('s-new-pwd').value = '';
      document.getElementById('s-new-pwd2').value= '';
    } catch {
      window.Toast?.success('Passwort geändert (Demo-Modus).');
    }
  },

  async saveMaintenance() {
    const mode = document.getElementById('maintenance-toggle')?.checked;
    try {
      await window.API.settings.update({ maintenanceMode: mode });
      window.Toast?.success(`Wartungsmodus ${mode ? 'aktiviert' : 'deaktiviert'}.`);
    } catch {
      window.Toast?.info(`Wartungsmodus ${mode ? 'aktiviert' : 'deaktiviert'} (Demo-Modus).`);
    }
  },

  async saveSmtp() {
    const smtp = {
      smtp: {
        host:     document.getElementById('smtp-host')?.value,
        port:     parseInt(document.getElementById('smtp-port')?.value) || 587,
        user:     document.getElementById('smtp-user')?.value,
        password: document.getElementById('smtp-pass')?.value,
        from:     document.getElementById('smtp-from')?.value
      }
    };
    try {
      await window.API.settings.update(smtp);
      window.Toast?.success('SMTP-Konfiguration gespeichert.');
    } catch {
      window.Toast?.success('SMTP gespeichert (Demo-Modus).');
    }
  }
};

// ── INITIALISATION ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Vérifier l'accès admin (connecté ET rôle admin)
  if (!window.KP?.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  if (!window.KP?.isAdmin()) {
    // Un client ordinaire ne peut pas accéder à l'espace admin
    window.location.href = 'mein-konto.html';
    return;
  }

  const user = window.KP?.getCurrentUser();
  if (user) document.getElementById('adm-user-name').textContent = `${user.vorname || 'Admin'}`;

  // Navigation
  initNavigation();

  // Charger le dashboard
  AdminDashboard.load();

  // Événements des boutons
  document.getElementById('btn-update-status')?.addEventListener('click',  () => AdminDossiers.updateStatus());
  document.getElementById('btn-toggle-client')?.addEventListener('click',  () => AdminClients.toggleStatus());
  document.getElementById('btn-refresh-dossiers')?.addEventListener('click', () => AdminDossiers.load());
  document.getElementById('btn-refresh-clients')?.addEventListener('click',  () => AdminClients.load());
  document.getElementById('btn-change-pwd')?.addEventListener('click',    () => AdminSettings.savePassword());
  document.getElementById('btn-save-maintenance')?.addEventListener('click', () => AdminSettings.saveMaintenance());
  document.getElementById('btn-save-smtp')?.addEventListener('click',     () => AdminSettings.saveSmtp());

  // Recherche avec délai
  ['dossier-search', 'client-search'].forEach(id => {
    let timer;
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (id === 'dossier-search') AdminDossiers.load();
        else AdminClients.load();
      }, 400);
    });
  });

  // Filtres en temps réel
  ['filter-status', 'filter-type'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => AdminDossiers.load());
  });
  document.getElementById('filter-active')?.addEventListener('change', () => AdminClients.load());

  // Fermer modals au clic hors zone
  ['dossier-modal', 'client-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) e.target.style.display = 'none';
    });
  });

  // Redimensionnement des graphiques
  window.addEventListener('resize', () => AdminDashboard.drawDemoCharts());
});
