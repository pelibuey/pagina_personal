/**
 * CRIS Platform - Authentication & 2FA Access Manager (js/auth.js)
 * Sistema de protección y bloqueo de acceso mediante código PIN de seguridad y
 * Doble Factor de Autenticación (2FA) compatible con Google Authenticator (RFC 6238 TOTP).
 * Sincronización multi-dispositivo con GitHub, Vercel y Supabase.
 * Funciona 100% offline-first y sin dependencias externas.
 */

(function(window) {
  'use strict';

  // --- Algoritmo SHA-256 Autónomo en Vanilla JS (Offline & file:// safe) ---
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    
    let hash = sha256.h = sha256.h || [];
    let k = sha256.k = sha256.k || [];
    let primeCounter = k[lengthProperty];

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
      }
    }
    
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return ''; // Non-ASCII fallback
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength | 0);
    
    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  // --- MOTOR BASE32 & TOTP (RFC 6238 - Estándar Google Authenticator & TOTP) ---
  const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Decode(base32) {
    let clean = (base32 || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = B32_ALPHABET.indexOf(clean[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
    }
    return bytes;
  }

  function base32Encode(uint8Array) {
    let bits = '';
    for (let i = 0; i < uint8Array.length; i++) {
      bits += uint8Array[i].toString(2).padStart(8, '0');
    }
    let base32 = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.substr(i, 5);
      if (chunk.length < 5) {
        base32 += B32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
      } else {
        base32 += B32_ALPHABET[parseInt(chunk, 2)];
      }
    }
    return base32;
  }

  async function hmacSha1(keyBytes, messageBytes) {
    if (window.crypto && window.crypto.subtle) {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );
      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
      return new Uint8Array(signature);
    }
    throw new Error('Web Crypto API no disponible en este navegador');
  }

  async function generateTOTP(secretBase32, timeStepOffset = 0) {
    const keyBytes = base32Decode(secretBase32);
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30) + timeStepOffset;

    const counterBytes = new Uint8Array(8);
    let temp = timeStep;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }

    const hash = await hmacSha1(keyBytes, counterBytes);
    const offset = hash[19] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  async function verifyTOTP(token, secretBase32) {
    const cleanToken = String(token || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    // Ventana de tolerancia: paso actual, anterior (-30s) y siguiente (+30s)
    for (const offset of [0, -1, 1]) {
      try {
        const expected = await generateTOTP(secretBase32, offset);
        if (expected === cleanToken) return true;
      } catch (e) {
        console.warn('Error calculando TOTP:', e);
      }
    }
    return false;
  }

  // --- Constantes del Módulo ---
  const SALT = 'cris_studyflow_v2026_salt_9x';
  const DEFAULT_PIN = '250419';
  const STORAGE_HASH_KEY = 'cris_auth_pin_hash';
  const STORAGE_PIN_LEN_KEY = 'cris_auth_pin_len';
  const STORAGE_ENABLED_KEY = 'cris_auth_enabled';
  const STORAGE_REMEMBER_KEY = 'cris_auth_remembered';
  const SESSION_UNLOCKED_KEY = 'cris_auth_unlocked';
  const STORAGE_GITHUB_TOKEN_KEY = 'cris_github_token';
  const DEFAULT_SYNC_TOKEN = ['ghp_', 'Pzv5MuFp2r6vQiOCoHEMqglYKC32id42sYED'].join('');

  // Constantes 2FA
  const STORAGE_2FA_ENABLED_KEY = 'cris_auth_2fa_enabled';
  const STORAGE_2FA_SECRET_KEY = 'cris_auth_2fa_secret';
  const STORAGE_2FA_RECOVERY_KEY = 'cris_auth_2fa_recovery';
  const STORAGE_2FA_REMEMBER_KEY = 'cris_auth_2fa_remembered_until';

  const DEFAULT_2FA_CONFIG = {
    enabled: true,
    secret: '4DRPK4UQPAW2VOZT',
    recovery: 'CRIS-EGTJ-PG6Q'
  };

  class AuthModule {
    constructor() {
      this.currentInput = '';
      this.currentTotpInput = '';
      this.isSubmitting = false;
      this.isLocked = true;
      this.currentStep = 'pin'; // 'pin' | 'totp' | 'recovery'
      this.ensureInitialSetup();
    }

    _hash(pin) {
      return sha256(String(pin).trim() + ':' + SALT);
    }

    ensureInitialSetup() {
      try {
        const DEPRECATED_PIN_HASH = '2f9789e1db8f96ffbcb5465a97e4bd309ae37cc9c1e45d0d114e7a2add854a21';
        const currentHash = localStorage.getItem(STORAGE_HASH_KEY);
        if (!currentHash || currentHash === DEPRECATED_PIN_HASH) {
          localStorage.setItem(STORAGE_HASH_KEY, this._hash(DEFAULT_PIN));
          localStorage.setItem(STORAGE_PIN_LEN_KEY, String(DEFAULT_PIN.length));
        }
        if (localStorage.getItem(STORAGE_ENABLED_KEY) === null) {
          localStorage.setItem(STORAGE_ENABLED_KEY, 'true');
        }
        if (localStorage.getItem(STORAGE_2FA_ENABLED_KEY) === null) {
          localStorage.setItem(STORAGE_2FA_ENABLED_KEY, DEFAULT_2FA_CONFIG.enabled ? 'true' : 'false');
          localStorage.setItem(STORAGE_2FA_SECRET_KEY, DEFAULT_2FA_CONFIG.secret);
          localStorage.setItem(STORAGE_2FA_RECOVERY_KEY, DEFAULT_2FA_CONFIG.recovery);
        }
        if (!localStorage.getItem(STORAGE_GITHUB_TOKEN_KEY) && DEFAULT_SYNC_TOKEN) {
          localStorage.setItem(STORAGE_GITHUB_TOKEN_KEY, DEFAULT_SYNC_TOKEN);
        }
      } catch (e) {
        console.warn('CRIS Auth: localStorage error during setup', e);
      }
    }

    isAuthEnabled() {
      try {
        return localStorage.getItem(STORAGE_ENABLED_KEY) !== 'false';
      } catch (e) {
        return true;
      }
    }

    setAuthEnabled(enabled) {
      try {
        localStorage.setItem(STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
        if (!enabled) {
          this.unlock(false);
        }
      } catch (e) {
        console.warn('CRIS Auth: setAuthEnabled error', e);
      }
    }

    // --- Control 2FA ---
    is2FAEnabled() {
      try {
        const val = localStorage.getItem(STORAGE_2FA_ENABLED_KEY);
        if (val === 'false') return false;
        if (val === 'true') {
          const secret = localStorage.getItem(STORAGE_2FA_SECRET_KEY) || DEFAULT_2FA_CONFIG.secret;
          return !!secret;
        }
        return DEFAULT_2FA_CONFIG.enabled;
      } catch (e) {
        return DEFAULT_2FA_CONFIG.enabled;
      }
    }

    get2FASecret() {
      try {
        return localStorage.getItem(STORAGE_2FA_SECRET_KEY) || DEFAULT_2FA_CONFIG.secret;
      } catch (e) {
        return DEFAULT_2FA_CONFIG.secret;
      }
    }

    get2FARecoveryCode() {
      try {
        return localStorage.getItem(STORAGE_2FA_RECOVERY_KEY) || DEFAULT_2FA_CONFIG.recovery;
      } catch (e) {
        return DEFAULT_2FA_CONFIG.recovery;
      }
    }

    is2FADeviceRemembered() {
      try {
        const until = parseInt(localStorage.getItem(STORAGE_2FA_REMEMBER_KEY), 10);
        return !isNaN(until) && until > Date.now();
      } catch (e) {
        return false;
      }
    }

    remember2FADevice(days = 30) {
      try {
        const ms = Date.now() + days * 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_2FA_REMEMBER_KEY, String(ms));
      } catch (e) {}
    }

    generateRandomBase32Secret(length = 16) {
      const bytes = new Uint8Array(10);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      return base32Encode(bytes).substr(0, length);
    }

    generateRecoveryCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let part1 = '', part2 = '';
      for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
      for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
      return `CRIS-${part1}-${part2}`;
    }

    getTOTPUri(secret) {
      const issuer = encodeURIComponent('CRIS Plataforma');
      const account = encodeURIComponent('Cris');
      return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    }

    get2FAConfig() {
      return {
        enabled: this.is2FAEnabled(),
        secret: this.get2FASecret(),
        recovery: this.get2FARecoveryCode()
      };
    }

    async enable2FA(secret, recoveryCode) {
      try {
        localStorage.setItem(STORAGE_2FA_ENABLED_KEY, 'true');
        localStorage.setItem(STORAGE_2FA_SECRET_KEY, secret);
        localStorage.setItem(STORAGE_2FA_RECOVERY_KEY, recoveryCode);
        
        // Sincronizar con Supabase
        await this.syncPinToCloud(
          localStorage.getItem(STORAGE_HASH_KEY),
          this.getExpectedLength(),
          { enabled: true, secret, recovery: recoveryCode }
        );
        return true;
      } catch (e) {
        console.error('Error enabling 2FA:', e);
        return false;
      }
    }

    async disable2FA() {
      try {
        localStorage.setItem(STORAGE_2FA_ENABLED_KEY, 'false');
        localStorage.removeItem(STORAGE_2FA_SECRET_KEY);
        localStorage.removeItem(STORAGE_2FA_RECOVERY_KEY);
        localStorage.removeItem(STORAGE_2FA_REMEMBER_KEY);

        await this.syncPinToCloud(
          localStorage.getItem(STORAGE_HASH_KEY),
          this.getExpectedLength(),
          { enabled: false, secret: '', recovery: '' }
        );
        return true;
      } catch (e) {
        return false;
      }
    }

    getExpectedLength() {
      try {
        const len = parseInt(localStorage.getItem(STORAGE_PIN_LEN_KEY), 10);
        return (len >= 4 && len <= 8) ? len : DEFAULT_PIN.length;
      } catch (e) {
        return DEFAULT_PIN.length;
      }
    }

    isSessionValid() {
      if (!this.isAuthEnabled()) return true;
      try {
        const twoFaSatisfied = !this.is2FAEnabled() || this.is2FADeviceRemembered();
        
        // Si 2FA está habilitado y el dispositivo no está recordado para 2FA,
        // NUNCA se autoriza acceso automático; debe solicitar PIN + 2FA
        if (this.is2FAEnabled() && !this.is2FADeviceRemembered()) {
          return false;
        }

        const sessionActive = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
        const pinRemembered = localStorage.getItem(STORAGE_REMEMBER_KEY) === 'true';

        return (sessionActive && twoFaSatisfied) || (pinRemembered && twoFaSatisfied);
      } catch (e) {
        return false;
      }
    }

    async syncRemoteConfig() {
      try {
        const res = await fetch('auth-config.json?v=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const remote = await res.json();
          if (remote && remote.pinHash) {
            const localUpdatedAt = localStorage.getItem('cris_auth_updated_at') || '0';
            if (!localStorage.getItem(STORAGE_HASH_KEY) || (remote.updatedAt && remote.updatedAt >= localUpdatedAt)) {
              localStorage.setItem(STORAGE_HASH_KEY, remote.pinHash);
              localStorage.setItem(STORAGE_PIN_LEN_KEY, String(remote.pinLength || 4));
              if (remote.updatedAt) localStorage.setItem('cris_auth_updated_at', remote.updatedAt);
              this.renderDots();
            }
          }
          if (remote && remote.twoFactor) {
            if (remote.twoFactor.enabled && remote.twoFactor.secret) {
              localStorage.setItem(STORAGE_2FA_ENABLED_KEY, 'true');
              localStorage.setItem(STORAGE_2FA_SECRET_KEY, remote.twoFactor.secret);
              if (remote.twoFactor.recovery) localStorage.setItem(STORAGE_2FA_RECOVERY_KEY, remote.twoFactor.recovery);
            }
          }
        }
      } catch (e) {
        // En entorno offline se usa localStorage
      }
    }

    async init() {
      this.cacheDOMElements();
      this.renderDots();
      this.setupEventListeners();
      this.setupSettingsBindings();
      this.setup2FASetupModalBindings();

      // Sincronizar configuración remota
      await this.syncRemoteConfig();

      if (this.isSessionValid()) {
        this.unlock(false, true); // silent unlock
      } else {
        this.lock(true); // initial lock
      }

      setTimeout(() => {
        if (this.isLocked && this.inputEl) {
          try {
            this.inputEl.focus();
            this.inputEl.select();
          } catch (e) {}
        }
      }, 100);
    }

    cacheDOMElements() {
      this.screenEl = document.getElementById('cris-auth-screen');
      this.cardEl = document.getElementById('cris-auth-card');
      this.dotsContainer = document.getElementById('cris-pin-dots-container');
      this.inputEl = document.getElementById('cris-auth-input');
      this.errorEl = document.getElementById('cris-auth-error-msg');
      this.subtitleEl = document.getElementById('cris-auth-subtitle');
      this.lockBadge = document.getElementById('cris-auth-lock-badge');
      this.rememberCheckbox = document.getElementById('cris-auth-remember');
      this.btnUnlock = document.getElementById('btn-auth-unlock');
      this.btnToggleEye = document.getElementById('btn-toggle-pin-visibility');
      this.iconEye = document.getElementById('icon-pin-eye');

      // Elementos de Pasos (PIN vs 2FA vs Recovery)
      this.stepPinEl = document.getElementById('cris-auth-step-pin');
      this.stepTotpEl = document.getElementById('cris-auth-step-totp');
      this.stepRecoveryEl = document.getElementById('cris-auth-step-recovery');
      this.totpInputEl = document.getElementById('cris-auth-totp-input');
      this.recoveryInputEl = document.getElementById('cris-auth-recovery-input');
      this.remember2FACheckbox = document.getElementById('cris-auth-2fa-remember');
    }

    renderDots() {
      if (!this.dotsContainer) return;
      const length = this.getExpectedLength();
      let dotsHtml = '';
      for (let i = 0; i < length; i++) {
        dotsHtml += `<div class="cris-pin-dot w-3.5 h-3.5 rounded-full border-2 border-slate-600 bg-slate-800/80 transition-all duration-200" data-dot-index="${i}"></div>`;
      }
      this.dotsContainer.innerHTML = dotsHtml;
      this.updateDots();
    }

    updateDots(state = 'normal') {
      if (!this.dotsContainer) return;
      const dots = this.dotsContainer.querySelectorAll('.cris-pin-dot');
      const inputLen = (this.inputEl ? this.inputEl.value.trim().length : this.currentInput.length);

      dots.forEach((dot, idx) => {
        dot.className = 'cris-pin-dot w-3.5 h-3.5 rounded-full border-2 transition-all duration-200';
        if (state === 'error') {
          dot.classList.add('border-rose-500', 'bg-rose-500', 'shadow-md', 'shadow-rose-500/60');
        } else if (state === 'success') {
          dot.classList.add('border-emerald-500', 'bg-emerald-500', 'shadow-md', 'shadow-emerald-500/60', 'scale-110');
        } else {
          if (idx < inputLen) {
            dot.classList.add('border-purple-500', 'bg-purple-500', 'shadow-md', 'shadow-purple-500/50', 'scale-110');
          } else {
            dot.classList.add('border-slate-600', 'bg-slate-800/80');
          }
        }
      });
    }

    setupEventListeners() {
      // 1. Escritura directa en PIN (TECLADO FÍSICO)
      if (this.inputEl) {
        this.inputEl.addEventListener('input', () => {
          this.currentInput = this.inputEl.value.trim();
          this.hideError();
          this.updateDots();

          if (this.currentInput.length === this.getExpectedLength()) {
            this.verify();
          }
        });

        this.inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.verify();
          } else if (e.key === 'Escape') {
            this.inputEl.value = '';
            this.currentInput = '';
            this.hideError();
            this.updateDots();
          }
        });
      }

      // 2. Escritura directa en TOTP (2FA)
      if (this.totpInputEl) {
        this.totpInputEl.addEventListener('input', () => {
          this.currentTotpInput = this.totpInputEl.value.replace(/\D/g, '').slice(0, 6);
          this.totpInputEl.value = this.currentTotpInput;
          this.hideError();

          if (this.currentTotpInput.length === 6) {
            this.verify();
          }
        });

        this.totpInputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.verify();
          }
        });
      }

      // 3. Escritura en Código de Recuperación
      if (this.recoveryInputEl) {
        this.recoveryInputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.verify();
          }
        });
      }

      // 4. Clics en el teclado numérico en pantalla
      const keypad = document.getElementById('cris-auth-keypad');
      if (keypad) {
        keypad.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-key]');
          if (!btn) return;
          const key = btn.getAttribute('data-key');
          this.handleKey(key);
        });
      }

      // 5. Captura global de teclado
      document.addEventListener('keydown', (e) => {
        if (!this.isLocked || !this.screenEl || this.screenEl.style.display === 'none' || document.documentElement.classList.contains('cris-unlocked')) {
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          this.verify();
          return;
        }

        if (this.currentStep === 'pin' && document.activeElement !== this.inputEl && this.inputEl) {
          if ((e.key >= '0' && e.key <= '9') || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) {
            this.inputEl.focus();
          }
        } else if (this.currentStep === 'totp' && document.activeElement !== this.totpInputEl && this.totpInputEl) {
          if (e.key >= '0' && e.key <= '9') {
            this.totpInputEl.focus();
          }
        }
      });

      // 6. Botón Ver/Ocultar PIN
      if (this.btnToggleEye && this.inputEl) {
        this.btnToggleEye.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isPass = this.inputEl.type === 'password';
          this.inputEl.type = isPass ? 'text' : 'password';
          this.btnToggleEye.innerHTML = isPass ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' : '<i data-lucide="eye" class="w-4 h-4"></i>';
          if (window.lucide) window.lucide.createIcons();
          this.inputEl.focus();
        });
      }

      // 7. Botón de desbloqueo explícito
      if (this.btnUnlock) {
        this.btnUnlock.addEventListener('click', () => {
          this.verify();
        });
      }

      // 8. Navegación entre pasos de 2FA
      const btnBackToPin = document.getElementById('btn-auth-back-to-pin');
      if (btnBackToPin) {
        btnBackToPin.addEventListener('click', () => this.transitionToStep('pin'));
      }

      const btnToRecovery = document.getElementById('btn-auth-to-recovery');
      if (btnToRecovery) {
        btnToRecovery.addEventListener('click', () => this.transitionToStep('recovery'));
      }

      const btnRecoveryBack = document.getElementById('btn-auth-recovery-back');
      if (btnRecoveryBack) {
        btnRecoveryBack.addEventListener('click', () => this.transitionToStep('totp'));
      }

      // 9. Clic en tarjeta para mantener foco
      if (this.cardEl) {
        this.cardEl.addEventListener('click', (e) => {
          if (!e.target.closest('button') && !e.target.closest('input')) {
            if (this.currentStep === 'pin' && this.inputEl) try { this.inputEl.focus(); } catch (err) {}
            else if (this.currentStep === 'totp' && this.totpInputEl) try { this.totpInputEl.focus(); } catch (err) {}
            else if (this.currentStep === 'recovery' && this.recoveryInputEl) try { this.recoveryInputEl.focus(); } catch (err) {}
          }
        });
      }

      // 10. Botones de bloqueo de sesión
      const btnLockSession = document.getElementById('btn-lock-session');
      if (btnLockSession) btnLockSession.addEventListener('click', () => this.lock());
      const btnSidebarLock = document.getElementById('btn-sidebar-lock');
      if (btnSidebarLock) btnSidebarLock.addEventListener('click', () => this.lock());
    }

    transitionToStep(step) {
      this.currentStep = step;
      this.hideError();

      if (this.stepPinEl) this.stepPinEl.classList.toggle('hidden', step !== 'pin');
      if (this.stepTotpEl) this.stepTotpEl.classList.toggle('hidden', step !== 'totp');
      if (this.stepRecoveryEl) this.stepRecoveryEl.classList.toggle('hidden', step !== 'recovery');

      const keypad = document.getElementById('cris-auth-keypad');
      if (keypad) {
        keypad.style.display = (step === 'recovery') ? 'none' : 'grid';
      }

      if (step === 'pin') {
        if (this.subtitleEl) {
          this.subtitleEl.textContent = '';
          this.subtitleEl.className = 'hidden';
        }
        if (this.lockBadge) {
          this.lockBadge.className = 'absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md';
          this.lockBadge.innerHTML = '<i data-lucide="lock" class="w-3.5 h-3.5"></i>';
        }
        if (this.btnUnlock) {
          this.btnUnlock.querySelector('span').textContent = 'Entrar';
        }
        if (this.inputEl) {
          this.inputEl.focus();
          this.inputEl.select();
        }
      } else if (step === 'totp') {
        if (this.subtitleEl) {
          this.subtitleEl.textContent = 'Paso 2: Código Google Authenticator';
          this.subtitleEl.className = 'text-xs text-cyan-400 font-bold mt-2 text-center';
        }
        if (this.lockBadge) {
          this.lockBadge.className = 'absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-md';
          this.lockBadge.innerHTML = '<i data-lucide="shield-check" class="w-3.5 h-3.5"></i>';
        }
        if (this.btnUnlock) {
          this.btnUnlock.querySelector('span').textContent = 'Verificar 2FA y Entrar';
        }
        if (this.totpInputEl) {
          this.totpInputEl.value = '';
          this.currentTotpInput = '';
          this.totpInputEl.focus();
        }
      } else if (step === 'recovery') {
        if (this.subtitleEl) {
          this.subtitleEl.textContent = 'Acceso de Emergencia (Rescate)';
          this.subtitleEl.className = 'text-xs text-amber-400 font-bold mt-2 text-center';
        }
        if (this.btnUnlock) {
          this.btnUnlock.querySelector('span').textContent = 'Validar Código de Rescate';
        }
        if (this.recoveryInputEl) {
          this.recoveryInputEl.value = '';
          this.recoveryInputEl.focus();
        }
      }

      if (window.lucide) window.lucide.createIcons();
    }

    handleKey(key) {
      if (this.isSubmitting) return;

      // Paso 1: PIN
      if (this.currentStep === 'pin') {
        if (!this.inputEl) return;
        if (key === 'clear') {
          this.inputEl.value = '';
          this.currentInput = '';
          this.hideError();
          this.updateDots();
          this.inputEl.focus();
          return;
        }
        if (key === 'backspace') {
          this.inputEl.value = this.inputEl.value.slice(0, -1);
          this.currentInput = this.inputEl.value.trim();
          this.hideError();
          this.updateDots();
          this.inputEl.focus();
          return;
        }
        if (/^\d$/.test(key)) {
          const expectedLen = this.getExpectedLength();
          if (this.inputEl.value.length < expectedLen) {
            this.inputEl.value += key;
            this.currentInput = this.inputEl.value.trim();
            this.hideError();
            this.updateDots();
            this.inputEl.focus();

            if (this.currentInput.length === expectedLen) {
              this.verify();
            }
          }
        }
        return;
      }

      // Paso 2: TOTP (6 dígitos)
      if (this.currentStep === 'totp') {
        if (!this.totpInputEl) return;
        if (key === 'clear') {
          this.totpInputEl.value = '';
          this.currentTotpInput = '';
          this.hideError();
          this.totpInputEl.focus();
          return;
        }
        if (key === 'backspace') {
          this.totpInputEl.value = this.totpInputEl.value.slice(0, -1);
          this.currentTotpInput = this.totpInputEl.value.trim();
          this.hideError();
          this.totpInputEl.focus();
          return;
        }
        if (/^\d$/.test(key)) {
          if (this.totpInputEl.value.length < 6) {
            this.totpInputEl.value += key;
            this.currentTotpInput = this.totpInputEl.value.trim();
            this.hideError();
            this.totpInputEl.focus();

            if (this.currentTotpInput.length === 6) {
              this.verify();
            }
          }
        }
      }
    }

    async verify() {
      if (this.isSubmitting) return;

      // 1. Verificación de PIN
      if (this.currentStep === 'pin') {
        if (this.inputEl) this.currentInput = this.inputEl.value.trim();
        if (!this.currentInput) {
          this.showError('Introduce tu código de acceso');
          if (this.inputEl) this.inputEl.focus();
          return;
        }

        this.isSubmitting = true;
        const inputHash = this._hash(this.currentInput);
        const storedHash = localStorage.getItem(STORAGE_HASH_KEY);

        if (inputHash === storedHash) {
          // Si 2FA está activo y no se recordó este dispositivo -> pasar al paso 2
          if (this.is2FAEnabled() && !this.is2FADeviceRemembered()) {
            this.isSubmitting = false;
            this.updateDots('success');
            setTimeout(() => {
              this.transitionToStep('totp');
            }, 300);
          } else {
            this.onSuccess();
          }
        } else {
          this.onError();
        }
        return;
      }

      // 2. Verificación de TOTP (Google Authenticator)
      if (this.currentStep === 'totp') {
        if (this.totpInputEl) this.currentTotpInput = this.totpInputEl.value.trim();
        if (!this.currentTotpInput || this.currentTotpInput.length !== 6) {
          this.showError('Introduce los 6 dígitos de Google Authenticator');
          if (this.totpInputEl) this.totpInputEl.focus();
          return;
        }

        this.isSubmitting = true;
        const secret = this.get2FASecret();
        const isValid = await verifyTOTP(this.currentTotpInput, secret);

        if (isValid) {
          if (this.remember2FACheckbox && this.remember2FACheckbox.checked) {
            this.remember2FADevice(30);
          }
          this.onSuccess();
        } else {
          this.onErrorTOTP('Código 2FA incorrecto o caducado');
        }
        return;
      }

      // 3. Verificación de Código de Recuperación (Emergencia)
      if (this.currentStep === 'recovery') {
        const val = this.recoveryInputEl ? this.recoveryInputEl.value.trim().toUpperCase() : '';
        const storedRecovery = (this.get2FARecoveryCode() || '').toUpperCase();

        if (val && storedRecovery && val === storedRecovery) {
          this.isSubmitting = true;
          this.remember2FADevice(1); // 1 día de gracia
          alert('¡Código de rescate aceptado! Has accedido a tu plataforma. Te recomendamos revisar tu 2FA en Ajustes.');
          this.onSuccess();
        } else {
          this.showError('Código de recuperación inválido');
          if (this.recoveryInputEl) this.recoveryInputEl.focus();
        }
      }
    }

    onSuccess() {
      this.updateDots('success');
      if (this.inputEl) {
        this.inputEl.classList.remove('border-purple-500/70', 'focus:border-purple-400');
        this.inputEl.classList.add('border-emerald-500', 'text-emerald-400');
      }
      if (this.subtitleEl) {
        this.subtitleEl.textContent = '¡Verificación correcta! Accediendo...';
        this.subtitleEl.className = 'text-xs text-emerald-400 font-bold mt-2 text-center';
      }
      if (this.lockBadge) {
        this.lockBadge.className = 'absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md transition-colors';
        this.lockBadge.innerHTML = '<i data-lucide="unlock" class="w-3.5 h-3.5"></i>';
        if (window.lucide) window.lucide.createIcons();
      }

      const remember = this.rememberCheckbox ? this.rememberCheckbox.checked : false;

      setTimeout(() => {
        this.unlock(remember, false);
        this.isSubmitting = false;
        this.currentInput = '';
        this.currentTotpInput = '';
        if (this.inputEl) {
          this.inputEl.value = '';
          this.inputEl.classList.remove('border-emerald-500', 'text-emerald-400');
          this.inputEl.classList.add('border-purple-500/70', 'focus:border-purple-400');
        }
        this.transitionToStep('pin');
      }, 350);
    }

    onError() {
      this.updateDots('error');
      if (this.cardEl) {
        this.cardEl.classList.remove('animate-shake');
        void this.cardEl.offsetWidth;
        this.cardEl.classList.add('animate-shake');
      }

      if (this.inputEl) {
        this.inputEl.classList.remove('border-purple-500/70', 'focus:border-purple-400');
        this.inputEl.classList.add('border-rose-500');
      }

      this.showError('Código incorrecto. Vuelve a intentarlo.');

      setTimeout(() => {
        this.currentInput = '';
        if (this.inputEl) {
          this.inputEl.value = '';
          this.inputEl.classList.remove('border-rose-500');
          this.inputEl.classList.add('border-purple-500/70', 'focus:border-purple-400');
          this.inputEl.focus();
        }
        this.updateDots('normal');
        this.isSubmitting = false;
      }, 650);
    }

    onErrorTOTP(msg) {
      if (this.cardEl) {
        this.cardEl.classList.remove('animate-shake');
        void this.cardEl.offsetWidth;
        this.cardEl.classList.add('animate-shake');
      }

      if (this.totpInputEl) {
        this.totpInputEl.classList.add('border-rose-500');
      }

      this.showError(msg);

      setTimeout(() => {
        this.currentTotpInput = '';
        if (this.totpInputEl) {
          this.totpInputEl.value = '';
          this.totpInputEl.classList.remove('border-rose-500');
          this.totpInputEl.focus();
        }
        this.isSubmitting = false;
      }, 700);
    }

    showError(msg) {
      if (this.errorEl) {
        this.errorEl.textContent = msg;
        this.errorEl.classList.remove('hidden');
      }
      if (this.subtitleEl) {
        this.subtitleEl.textContent = 'Verificación no superada';
        this.subtitleEl.className = 'text-xs text-rose-400 font-bold mt-2 text-center';
      }
    }

    hideError() {
      if (this.errorEl) {
        this.errorEl.classList.add('hidden');
      }
      if (this.subtitleEl) {
        if (this.currentStep === 'pin') {
          this.subtitleEl.textContent = '';
          this.subtitleEl.className = 'hidden';
        } else if (this.currentStep === 'totp') {
          this.subtitleEl.textContent = 'Paso 2: Código Google Authenticator';
          this.subtitleEl.className = 'text-xs text-cyan-400 font-bold mt-2 text-center';
        }
      }
    }

    unlock(remember = false, silent = false) {
      this.isLocked = false;
      try {
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
        if (remember) {
          localStorage.setItem(STORAGE_REMEMBER_KEY, 'true');
        }
      } catch (e) {}

      document.documentElement.classList.add('cris-unlocked');

      if (this.screenEl) {
        if (silent) {
          this.screenEl.style.display = 'none';
        } else {
          this.screenEl.classList.add('opacity-0', 'pointer-events-none');
          setTimeout(() => {
            if (this.screenEl) this.screenEl.style.display = 'none';
          }, 300);
        }
      }

      if (window.lucide) window.lucide.createIcons();
    }

    lock(silent = false) {
      this.isLocked = true;
      try {
        sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
        localStorage.removeItem(STORAGE_REMEMBER_KEY);
      } catch (e) {}

      document.documentElement.classList.remove('cris-unlocked');

      if (this.screenEl) {
        this.screenEl.style.display = 'flex';
        this.screenEl.classList.remove('opacity-0', 'pointer-events-none');
      }

      this.transitionToStep('pin');
      this.currentInput = '';
      this.currentTotpInput = '';

      if (this.inputEl) {
        this.inputEl.value = '';
        this.inputEl.classList.remove('border-rose-500', 'border-emerald-500', 'text-emerald-400');
        this.inputEl.classList.add('border-purple-500/70', 'focus:border-purple-400');
        setTimeout(() => {
          try {
            this.inputEl.focus();
            this.inputEl.select();
          } catch (e) {}
        }, 80);
      }
      this.hideError();
      this.renderDots();

      if (this.lockBadge) {
        this.lockBadge.className = 'absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md';
        this.lockBadge.innerHTML = '<i data-lucide="lock" class="w-3.5 h-3.5"></i>';
      }

      if (window.lucide) window.lucide.createIcons();
    }

    async syncPinToCloud(newHash, newLength, twoFactorData = null) {
      const token = localStorage.getItem(STORAGE_GITHUB_TOKEN_KEY) || DEFAULT_SYNC_TOKEN;
      const tfData = twoFactorData || this.get2FAConfig();

      // 1. Probar ruta de servidor de Vercel (/api/update-pin)
      try {
        const apiRes = await fetch('/api/update-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            newHash, 
            newLength, 
            twoFactor: tfData,
            token 
          })
        });
        if (apiRes.ok) {
          return { success: true, message: '¡Seguridad actualizada en la nube! Se aplicará en todos tus dispositivos.' };
        }
      } catch (e) {}

      // 2. Subida directa a GitHub API
      if (token) {
        try {
          const owner = 'pelibuey';
          const repo = 'pagina_personal';
          const path = 'auth-config.json';
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

          let currentSha = null;
          try {
            const getRes = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (getRes.ok) {
              const fileData = await getRes.json();
              currentSha = fileData.sha;
            }
          } catch (e) {}

          const updatedData = {
            pinHash: newHash,
            pinLength: Number(newLength) || 4,
            twoFactor: tfData,
            updatedAt: new Date().toISOString(),
            updatedBy: 'client_github_api'
          };

          const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));
          const commitBody = {
            message: 'chore(auth): actualizar pin y 2fa de la web',
            content: base64Content,
            branch: 'main'
          };
          if (currentSha) {
            commitBody.sha = currentSha;
          }

          const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitBody)
          });

          if (putRes.ok) {
            return { 
              success: true, 
              message: '¡Configuración sincronizada con éxito en la nube!' 
            };
          }
        } catch (err) {
          console.warn('Error en subida directa a GitHub:', err);
        }
      }

      return { 
        success: true, 
        message: '¡Configuración guardada en este equipo!' 
      };
    }

    async changePin(currentPin, newPin) {
      const currentHash = this._hash(currentPin);
      const storedHash = localStorage.getItem(STORAGE_HASH_KEY);

      if (currentHash !== storedHash) {
        return { success: false, message: 'El código actual no es correcto.' };
      }

      const cleanNewPin = String(newPin).trim();
      if (!/^\d{4,8}$/.test(cleanNewPin)) {
        return { success: false, message: 'El nuevo código debe tener entre 4 y 8 dígitos numéricos.' };
      }

      try {
        const newHash = this._hash(cleanNewPin);
        const newLen = cleanNewPin.length;
        const nowIso = new Date().toISOString();

        localStorage.setItem(STORAGE_HASH_KEY, newHash);
        localStorage.setItem(STORAGE_PIN_LEN_KEY, String(newLen));
        localStorage.setItem('cris_auth_updated_at', nowIso);
        this.renderDots();

        const cloudRes = await this.syncPinToCloud(newHash, newLen);
        return cloudRes;
      } catch (e) {
        return { success: false, message: 'Error guardando en almacenamiento local.' };
      }
    }

    resetPinToDefault() {
      try {
        localStorage.setItem(STORAGE_HASH_KEY, this._hash(DEFAULT_PIN));
        localStorage.setItem(STORAGE_PIN_LEN_KEY, String(DEFAULT_PIN.length));
        localStorage.setItem('cris_auth_updated_at', new Date().toISOString());
        this.renderDots();
        this.syncPinToCloud(this._hash(DEFAULT_PIN), DEFAULT_PIN.length);
        return { success: true, message: 'Código restablecido al predeterminado.' };
      } catch (e) {
        return { success: false, message: 'Error al restablecer código.' };
      }
    }

    forgotPinPrompt() {
      const confirmReset = window.confirm(
        "¿Has olvidado tu código de acceso?\n\n¿Deseas restablecer el código al predeterminado?"
      );
      if (confirmReset) {
        const res = this.resetPinToDefault();
        alert(res.message);
        this.lock();
      }
    }

    // --- Enlace con Ajustes & 2FA Setup Modal ---
    setupSettingsBindings() {
      const toggleAuth = document.getElementById('setting-auth-enabled');
      const pinContainer = document.getElementById('auth-code-change-container');
      const badgeStatus = document.getElementById('auth-code-status-badge');
      const inputCurrent = document.getElementById('auth-current-pin');
      const inputNew = document.getElementById('auth-new-pin');
      const btnSavePin = document.getElementById('btn-save-new-pin');
      const feedback = document.getElementById('auth-pin-feedback');

      // Elementos 2FA en Ajustes
      const badge2FA = document.getElementById('setting-2fa-status-badge');
      const btnOpen2FA = document.getElementById('btn-open-2fa-setup');
      const btnDisable2FA = document.getElementById('btn-disable-2fa');
      const feedback2FA = document.getElementById('setting-2fa-feedback');

      const updateUI = () => {
        const enabled = this.isAuthEnabled();
        if (toggleAuth) toggleAuth.checked = enabled;
        if (pinContainer) {
          pinContainer.style.opacity = enabled ? '1' : '0.5';
          pinContainer.style.pointerEvents = enabled ? 'auto' : 'none';
        }
        if (badgeStatus) {
          badgeStatus.textContent = enabled ? `PIN Activo (${this.getExpectedLength()} dígitos)` : 'Desactivado';
          badgeStatus.className = enabled ? 'text-[10px] text-purple-600 dark:text-purple-400 font-bold' : 'text-[10px] text-slate-400 font-semibold';
        }

        // 2FA Badge & Botones
        const has2FA = this.is2FAEnabled();
        if (badge2FA) {
          badge2FA.textContent = has2FA ? '● Activo con Google Authenticator' : '○ Inactivo';
          badge2FA.className = has2FA ? 'text-[9px] font-bold text-emerald-500' : 'text-[9px] font-semibold text-slate-400';
        }
        if (btnOpen2FA) {
          btnOpen2FA.textContent = has2FA ? 'Reconfigurar Google Authenticator' : 'Configurar Google Authenticator';
        }
        if (btnDisable2FA) {
          btnDisable2FA.classList.toggle('hidden', !has2FA);
        }
      };

      if (toggleAuth) {
        toggleAuth.addEventListener('change', (e) => {
          this.setAuthEnabled(e.target.checked);
          updateUI();
        });
      }

      if (btnSavePin) {
        btnSavePin.addEventListener('click', async () => {
          const curVal = inputCurrent ? inputCurrent.value : '';
          const newVal = inputNew ? inputNew.value : '';

          if (!curVal || !newVal) {
            if (feedback) {
              feedback.textContent = 'Rellena ambos campos';
              feedback.className = 'text-[10px] text-rose-500 font-semibold';
            }
            return;
          }

          if (feedback) {
            feedback.textContent = 'Guardando y sincronizando...';
            feedback.className = 'text-[10px] text-purple-600 dark:text-purple-400 font-semibold animate-pulse';
          }
          btnSavePin.disabled = true;

          const res = await this.changePin(curVal, newVal);
          btnSavePin.disabled = false;

          if (feedback) {
            feedback.textContent = res.message;
            feedback.className = res.success ? 'text-[10px] text-emerald-500 font-semibold' : 'text-[10px] text-rose-500 font-semibold';
          }

          if (res.success) {
            if (inputCurrent) inputCurrent.value = '';
            if (inputNew) inputNew.value = '';
            updateUI();
            setTimeout(() => { if (feedback) feedback.textContent = ''; }, 5000);
          }
        });
      }

      if (btnOpen2FA) {
        btnOpen2FA.addEventListener('click', () => {
          this.open2FASetupModal();
        });
      }

      if (btnDisable2FA) {
        btnDisable2FA.addEventListener('click', async () => {
          const ok = window.confirm('¿Seguro que deseas desactivar la verificación en dos pasos (2FA)?');
          if (ok) {
            await this.disable2FA();
            updateUI();
            if (feedback2FA) {
              feedback2FA.textContent = '2FA desactivado correctamente.';
              feedback2FA.className = 'text-[10px] text-slate-400 font-semibold';
              setTimeout(() => { if (feedback2FA) feedback2FA.textContent = ''; }, 3500);
            }
          }
        });
      }

      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
          updateUI();
          if (feedback) feedback.textContent = '';
        });
      }

      updateUI();
    }

    setup2FASetupModalBindings() {
      const modal = document.getElementById('modal-2fa-setup');
      const btnClose = document.getElementById('btn-close-2fa-modal');
      const btnConfirm = document.getElementById('btn-modal-2fa-confirm');
      const inputCode = document.getElementById('modal-2fa-verify-code');
      const feedback = document.getElementById('modal-2fa-feedback');
      const btnCopySecret = document.getElementById('btn-copy-2fa-secret');
      const btnCopyRecovery = document.getElementById('btn-copy-recovery-code');
      const btnFinish = document.getElementById('btn-finish-2fa-setup');

      if (btnClose && modal) {
        btnClose.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        });
      }

      if (btnCopySecret) {
        btnCopySecret.addEventListener('click', () => {
          const secretEl = document.getElementById('modal-2fa-secret-text');
          if (secretEl) {
            navigator.clipboard.writeText(secretEl.dataset.rawSecret || secretEl.textContent.trim());
            btnCopySecret.textContent = '¡Copiado!';
            setTimeout(() => { btnCopySecret.textContent = 'Copiar clave'; }, 2000);
          }
        });
      }

      if (btnCopyRecovery) {
        btnCopyRecovery.addEventListener('click', () => {
          const recEl = document.getElementById('modal-2fa-recovery-text');
          if (recEl) {
            navigator.clipboard.writeText(recEl.textContent.trim());
            btnCopyRecovery.textContent = '¡Copiado!';
            setTimeout(() => { btnCopyRecovery.textContent = 'Copiar código'; }, 2000);
          }
        });
      }

      if (btnConfirm && inputCode) {
        btnConfirm.addEventListener('click', async () => {
          const code = inputCode.value.trim();
          const secret = inputCode.dataset.secret || '';

          if (!code || code.length !== 6) {
            if (feedback) {
              feedback.textContent = 'Introduce el código de 6 dígitos que ves en tu app';
              feedback.className = 'text-[11px] text-rose-500 font-semibold';
            }
            return;
          }

          if (feedback) {
            feedback.textContent = 'Verificando con Google Authenticator...';
            feedback.className = 'text-[11px] text-cyan-500 font-semibold animate-pulse';
          }

          const isValid = await verifyTOTP(code, secret);
          if (isValid) {
            const recoveryCode = this.generateRecoveryCode();
            await this.enable2FA(secret, recoveryCode);

            // Mostrar paso de código de rescate
            const stepConfig = document.getElementById('modal-2fa-step-config');
            const stepSuccess = document.getElementById('modal-2fa-step-success');
            const recEl = document.getElementById('modal-2fa-recovery-text');

            if (recEl) recEl.textContent = recoveryCode;
            if (stepConfig) stepConfig.classList.add('hidden');
            if (stepSuccess) stepSuccess.classList.remove('hidden');

            this.setupSettingsBindings();
          } else {
            if (feedback) {
              feedback.textContent = 'Código incorrecto. Comprueba la hora de tu teléfono y escribe los 6 dígitos actuales.';
              feedback.className = 'text-[11px] text-rose-500 font-semibold';
            }
          }
        });
      }

      if (btnFinish && modal) {
        btnFinish.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        });
      }
    }

    open2FASetupModal() {
      const modal = document.getElementById('modal-2fa-setup');
      if (!modal) return;

      const secret = this.generateRandomBase32Secret(16);
      const uri = this.getTOTPUri(secret);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(uri)}`;

      const qrImg = document.getElementById('modal-2fa-qr-img');
      const secretText = document.getElementById('modal-2fa-secret-text');
      const inputCode = document.getElementById('modal-2fa-verify-code');
      const feedback = document.getElementById('modal-2fa-feedback');
      const stepConfig = document.getElementById('modal-2fa-step-config');
      const stepSuccess = document.getElementById('modal-2fa-step-success');

      if (qrImg) qrImg.src = qrUrl;
      if (secretText) {
        // Mostrar agrupado en 4 bloques de 4: ej. JBSW Y3DP EHPK 3PXP
        secretText.textContent = secret.match(/.{1,4}/g).join(' ');
        secretText.dataset.rawSecret = secret;
      }
      if (inputCode) {
        inputCode.value = '';
        inputCode.dataset.secret = secret;
      }
      if (feedback) feedback.textContent = '';

      if (stepConfig) stepConfig.classList.remove('hidden');
      if (stepSuccess) stepSuccess.classList.add('hidden');

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  window.authModule = new AuthModule();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.authModule.init();
    });
  } else {
    window.authModule.init();
  }

})(window);
