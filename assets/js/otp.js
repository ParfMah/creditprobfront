// otp.js — Système OTP 6 chiffres (email + téléphone)
'use strict';

const OTPSystem = {

  // ── Injecter les modals dans le DOM ───────────────────────────
  inject() {
    if (document.getElementById('otp-overlay')) return;

    const html = `
    <!-- ░░ OTP OVERLAY ░░ -->
    <div id="otp-overlay" style="display:none;position:fixed;inset:0;background:rgba(11,29,58,0.72);backdrop-filter:blur(6px);z-index:9999;align-items:center;justify-content:center;padding:1rem;">
      <div id="otp-modal" style="background:white;border-radius:24px;padding:2.5rem;width:100%;max-width:420px;box-shadow:0 32px 80px rgba(11,29,58,0.35);position:relative;animation:otp-pop 0.25s cubic-bezier(.34,1.4,.64,1);">

        <!-- Close -->
        <button onclick="OTPSystem.close()" style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;font-size:1.4rem;color:#9ca3af;line-height:1;">×</button>

        <!-- Icon -->
        <div id="otp-icon" style="width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1.2rem;"></div>

        <!-- Title -->
        <h2 id="otp-title" style="text-align:center;font-family:Georgia,serif;font-size:1.5rem;font-weight:700;color:#0B1D3A;margin:0 0 0.5rem;"></h2>
        <p id="otp-subtitle" style="text-align:center;font-size:0.875rem;color:#6b7280;margin:0 0 1.8rem;line-height:1.6;"></p>

        <!-- Code inputs -->
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:1.2rem;">
          ${[1,2,3,4,5,6].map(i => `
          <input id="otp-digit-${i}" type="text" inputmode="numeric" pattern="[0-9]" maxlength="1"
                 style="width:48px;height:56px;border:2px solid #e5e7eb;border-radius:12px;text-align:center;font-size:1.5rem;font-weight:700;color:#0B1D3A;font-family:Georgia,serif;outline:none;transition:border-color 0.15s,box-shadow 0.15s;-webkit-appearance:none;"
                 oninput="OTPSystem.handleInput(this,${i})"
                 onkeydown="OTPSystem.handleKey(event,${i})"
                 onpaste="OTPSystem.handlePaste(event)"
                 onfocus="this.style.borderColor='#1A4FA8';this.style.boxShadow='0 0 0 3px rgba(26,79,168,0.15)'"
                 onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
          `).join('')}
        </div>

        <!-- Error -->
        <div id="otp-error" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:10px 14px;text-align:center;font-size:0.8rem;color:#dc2626;margin-bottom:1rem;"></div>

        <!-- Timer / Resend -->
        <div style="text-align:center;margin-bottom:1.5rem;">
          <span id="otp-timer" style="font-size:0.8rem;color:#9ca3af;"></span>
          <button id="otp-resend-btn" onclick="OTPSystem.resend()" style="display:none;background:none;border:none;cursor:pointer;font-size:0.85rem;color:#1A4FA8;font-weight:600;text-decoration:underline;"></button>
        </div>

        <!-- Verify button -->
        <button id="otp-verify-btn" onclick="OTPSystem.verify()" style="width:100%;background:linear-gradient(135deg,#0B1D3A,#1A4FA8);color:white;border:none;border-radius:12px;padding:15px;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:Arial,sans-serif;">
          <span id="otp-verify-label">✅ Bestätigen</span>
        </button>

        <!-- Trust note -->
        <p style="text-align:center;font-size:0.72rem;color:#9ca3af;margin:14px 0 0;line-height:1.6;">
          🔒 Ihr Code wird sicher übertragen und niemals gespeichert.<br>Geben Sie diesen Code niemals weiter.
        </p>
      </div>
    </div>

    <style>
      @keyframes otp-pop {
        from { opacity:0; transform:scale(0.88) translateY(12px); }
        to   { opacity:1; transform:scale(1)    translateY(0); }
      }
      #otp-digit-1:focus,#otp-digit-2:focus,#otp-digit-3:focus,
      #otp-digit-4:focus,#otp-digit-5:focus,#otp-digit-6:focus {
        border-color:#1A4FA8 !important;
      }
      .otp-digit-filled { border-color:#0F7B6C !important; background:#f0fdf4; }
      .otp-digit-error  { border-color:#ef4444 !important; background:#fef2f2; animation:otp-shake 0.3s ease; }
      @keyframes otp-shake {
        0%,100% { transform:translateX(0); }
        20%,60% { transform:translateX(-4px); }
        40%,80% { transform:translateX(4px); }
      }
      @media (max-width:480px) {
        #otp-modal { padding:1.8rem 1.4rem; }
        #otp-digit-1,#otp-digit-2,#otp-digit-3,
        #otp-digit-4,#otp-digit-5,#otp-digit-6 { width:42px; height:50px; font-size:1.3rem; gap:6px; }
      }
      @media (max-width:360px) {
        #otp-digit-1,#otp-digit-2,#otp-digit-3,
        #otp-digit-4,#otp-digit-5,#otp-digit-6 { width:36px; height:44px; font-size:1.1rem; }
      }
    </style>`;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  // ── État interne ───────────────────────────────────────────────
  _type: null,       // 'email' | 'phone'
  _timerInterval: null,
  _timerSeconds: 0,
  _onSuccess: null,

  // ── Ouvrir modal ──────────────────────────────────────────────
  async open(type, onSuccess) {
    this.inject();
    this._type      = type;
    this._onSuccess = onSuccess || null;

    const isEmail = type === 'email';
    const icon    = document.getElementById('otp-icon');
    const title   = document.getElementById('otp-title');
    const sub     = document.getElementById('otp-subtitle');

    icon.style.background = isEmail ? 'rgba(26,79,168,0.1)' : 'rgba(15,123,108,0.1)';
    icon.textContent = isEmail ? '📧' : '📱';
    title.textContent = isEmail ? 'E-Mail bestätigen' : 'Telefon bestätigen';

    const user = window.KP?.getCurrentUser?.() || {};
    const dest = isEmail ? user.email : user.telefon;
    sub.textContent = `Wir haben einen 6-stelligen Code an ${dest || (isEmail ? 'Ihre E-Mail' : 'Ihre Telefonnummer')} gesendet.`;

    // Reset form
    this.clearInputs();
    document.getElementById('otp-error').style.display = 'none';

    const overlay = document.getElementById('otp-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => document.getElementById('otp-digit-1')?.focus(), 100);

    // Envoyer le code
    await this.sendCode(isEmail);
    this.startTimer(600); // 10 minutes
  },

  close() {
    const overlay = document.getElementById('otp-overlay');
    if (overlay) overlay.style.display = 'none';
    this.clearTimer();
  },

  // ── Envoyer le code ───────────────────────────────────────────
  async sendCode(isEmail) {
    try {
      if (isEmail) {
        await window.API.auth.sendEmailOtp();
      } else {
        const user = window.KP?.getCurrentUser?.() || {};
        await window.API.auth.sendPhoneOtp(user.telefon);
      }
    } catch (err) {
      this.showError(err.message || 'Fehler beim Senden.');
    }
  },

  // ── Resend ────────────────────────────────────────────────────
  async resend() {
    const btn = document.getElementById('otp-resend-btn');
    btn.style.display = 'none';
    await this.sendCode(this._type === 'email');
    this.clearInputs();
    document.getElementById('otp-error').style.display = 'none';
    this.startTimer(600);
    document.getElementById('otp-digit-1')?.focus();
    window.Toast?.success('Neuer Code wurde gesendet.');
  },

  // ── Timer 10 min ──────────────────────────────────────────────
  startTimer(seconds) {
    this.clearTimer();
    this._timerSeconds = seconds;
    const timerEl  = document.getElementById('otp-timer');
    const resendEl = document.getElementById('otp-resend-btn');
    resendEl.style.display = 'none';
    resendEl.textContent   = '🔄 Neuen Code senden';

    const tick = () => {
      if (this._timerSeconds <= 0) {
        timerEl.textContent    = '';
        resendEl.style.display = 'inline-block';
        return;
      }
      const m = String(Math.floor(this._timerSeconds / 60)).padStart(2, '0');
      const s = String(this._timerSeconds % 60).padStart(2, '0');
      timerEl.textContent = `Code gültig noch ${m}:${s}`;
      this._timerSeconds--;
      this._timerInterval = setTimeout(tick, 1000);
    };
    tick();
  },

  clearTimer() {
    if (this._timerInterval) clearTimeout(this._timerInterval);
  },

  // ── Input handling ────────────────────────────────────────────
  handleInput(el, index) {
    el.value = el.value.replace(/[^0-9]/g, '');
    if (el.value) {
      el.classList.add('otp-digit-filled');
      el.classList.remove('otp-digit-error');
      if (index < 6) document.getElementById(`otp-digit-${index + 1}`)?.focus();
      else this.verify();
    } else {
      el.classList.remove('otp-digit-filled');
    }
  },

  handleKey(e, index) {
    if (e.key === 'Backspace' && !e.target.value && index > 1) {
      document.getElementById(`otp-digit-${index - 1}`)?.focus();
    }
  },

  handlePaste(e) {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
    paste.slice(0, 6).split('').forEach((d, i) => {
      const el = document.getElementById(`otp-digit-${i + 1}`);
      if (el) { el.value = d; el.classList.add('otp-digit-filled'); }
    });
    if (paste.length === 6) this.verify();
  },

  getCode() {
    return [1,2,3,4,5,6].map(i => document.getElementById(`otp-digit-${i}`)?.value || '').join('');
  },

  clearInputs() {
    [1,2,3,4,5,6].forEach(i => {
      const el = document.getElementById(`otp-digit-${i}`);
      if (el) { el.value = ''; el.classList.remove('otp-digit-filled','otp-digit-error'); }
    });
  },

  showError(msg) {
    const err = document.getElementById('otp-error');
    if (err) { err.textContent = msg; err.style.display = 'block'; }
    [1,2,3,4,5,6].forEach(i => {
      const el = document.getElementById(`otp-digit-${i}`);
      if (el) { el.classList.add('otp-digit-error'); el.classList.remove('otp-digit-filled'); }
    });
    setTimeout(() => {
      [1,2,3,4,5,6].forEach(i => document.getElementById(`otp-digit-${i}`)?.classList.remove('otp-digit-error'));
    }, 800);
  },

  // ── Vérifier le code ─────────────────────────────────────────
  async verify() {
    const code = this.getCode();
    if (code.length !== 6) { this.showError('Bitte alle 6 Ziffern eingeben.'); return; }

    const btn   = document.getElementById('otp-verify-btn');
    const label = document.getElementById('otp-verify-label');
    btn.disabled = true;
    label.textContent = 'Wird geprüft…';

    try {
      const isEmail = this._type === 'email';
      await (isEmail
        ? window.API.auth.verifyEmailOtp(code)
        : window.API.auth.verifyPhoneOtp(code));

      // Succès
      [1,2,3,4,5,6].forEach(i => {
        const el = document.getElementById(`otp-digit-${i}`);
        if (el) { el.style.borderColor = '#10b981'; el.style.background = '#f0fdf4'; }
      });
      label.textContent = '✅ Bestätigt!';
      btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';

      // Mettre à jour l'état local
      const user = window.KP?.getCurrentUser?.() || {};
      if (isEmail) user.emailVerified = true;
      else         user.phoneVerified = true;
      if (window.KP?.USER_KEY) localStorage.setItem(window.KP.USER_KEY, JSON.stringify(user));

      this.clearTimer();
      window.Toast?.success(isEmail ? 'E-Mail bestätigt! ✅' : 'Telefon bestätigt! ✅');

      setTimeout(() => {
        this.close();
        if (this._onSuccess) this._onSuccess();
      }, 1200);

    } catch (err) {
      this.showError(err.message || 'Falscher Code. Bitte erneut versuchen.');
      btn.disabled = false;
      label.textContent = '✅ Bestätigen';
    }
  }
};

// Fermer avec Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') OTPSystem.close();
});

window.OTPSystem = OTPSystem;
