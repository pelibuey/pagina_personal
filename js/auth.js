/**
 * CRIS Platform - Authentication & Access Code Manager (js/auth.js)
 * Sistema de protección y bloqueo de acceso mediante código PIN de seguridad.
 * Funciona 100% offline, compatible con protocolo file:// y sin dependencias externas.
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

  // --- Constantes del Módulo ---
  const SALT = 'cris_studyflow_v2026_salt_9x';
  const DEFAULT_PIN = '1234';
  const STORAGE_HASH_KEY = 'cris_auth_pin_hash';
  const STORAGE_PIN_LEN_KEY = 'cris_auth_pin_len';
  const STORAGE_ENABLED_KEY = 'cris_auth_enabled';
  const STORAGE_REMEMBER_KEY = 'cris_auth_remembered';
  const SESSION_UNLOCKED_KEY = 'cris_auth_unlocked';

  class AuthModule {
    constructor() {
      this.currentInput = '';
      this.isSubmitting = false;
      this.isLocked = true;
      this.ensureInitialSetup();
    }

    _hash(pin) {
      return sha256(String(pin).trim() + ':' + SALT);
    }

    ensureInitialSetup() {
      try {
        if (!localStorage.getItem(STORAGE_HASH_KEY)) {
          localStorage.setItem(STORAGE_HASH_KEY, this._hash(DEFAULT_PIN));
          localStorage.setItem(STORAGE_PIN_LEN_KEY, String(DEFAULT_PIN.length));
        }
        if (localStorage.getItem(STORAGE_ENABLED_KEY) === null) {
          localStorage.setItem(STORAGE_ENABLED_KEY, 'true');
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

    getExpectedLength() {
      try {
        const len = parseInt(localStorage.getItem(STORAGE_PIN_LEN_KEY), 10);
        return (len >= 4 && len <= 8) ? len : 4;
      } catch (e) {
        return 4;
      }
    }

    isSessionValid() {
      if (!this.isAuthEnabled()) return true;
      try {
        const sessionActive = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
        const remembered = localStorage.getItem(STORAGE_REMEMBER_KEY) === 'true';
        return sessionActive || remembered;
      } catch (e) {
        return false;
      }
    }

    init() {
      this.cacheDOMElements();
      this.renderDots();
      this.setupEventListeners();
      this.setupSettingsBindings();

      if (this.isSessionValid()) {
        this.unlock(false, true); // silent unlock
      } else {
        this.lock(true); // initial lock
      }

      // Asegurar foco inmediato en el campo de entrada al cargar la página
      setTimeout(() => {
        if (this.isLocked && this.inputEl) {
          try {
            this.inputEl.focus();
            this.inputEl.select();
          } catch (e) {}
        }
      }, 80);
      setTimeout(() => {
        if (this.isLocked && this.inputEl) {
          try {
            this.inputEl.focus();
          } catch (e) {}
        }
      }, 300);
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
      // 1. Escritura directa en el campo de entrada (TECLADO FÍSICO)
      if (this.inputEl) {
        this.inputEl.addEventListener('input', () => {
          this.currentInput = this.inputEl.value.trim();
          this.hideError();
          this.updateDots();

          // Auto-verificar si se ha alcanzado la longitud del PIN
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

      // 2. Clics en el teclado numérico en pantalla
      const keypad = document.getElementById('cris-auth-keypad');
      if (keypad) {
        keypad.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-key]');
          if (!btn) return;
          const key = btn.getAttribute('data-key');
          this.handleKey(key);
        });
      }

      // 3. Captura global de teclado cuando la pantalla de bloqueo está visible
      document.addEventListener('keydown', (e) => {
        if (!this.isLocked || !this.screenEl || this.screenEl.style.display === 'none' || document.documentElement.classList.contains('cris-unlocked')) {
          return;
        }

        // Si se presiona Enter en cualquier parte
        if (e.key === 'Enter') {
          e.preventDefault();
          this.verify();
          return;
        }

        // Si el usuario empieza a escribir en el teclado y el cursor no está en el input, enfocarlo
        if (document.activeElement !== this.inputEl && this.inputEl) {
          if ((e.key >= '0' && e.key <= '9') || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) {
            this.inputEl.focus();
          }
        }
      });

      // 4. Botón Ver / Ocultar código (Icono de Ojo)
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

      // 5. Botón de desbloqueo explícito
      if (this.btnUnlock) {
        this.btnUnlock.addEventListener('click', () => {
          this.verify();
        });
      }

      // 6. Clic en la tarjeta para mantener el foco en el campo
      if (this.cardEl && this.inputEl) {
        this.cardEl.addEventListener('click', (e) => {
          if (!e.target.closest('button') && !e.target.closest('input')) {
            try { this.inputEl.focus(); } catch (err) {}
          }
        });
      }

      // 7. Botones globales de bloqueo
      const btnLockSession = document.getElementById('btn-lock-session');
      if (btnLockSession) {
        btnLockSession.addEventListener('click', () => this.lock());
      }
      const btnSidebarLock = document.getElementById('btn-sidebar-lock');
      if (btnSidebarLock) {
        btnSidebarLock.addEventListener('click', () => this.lock());
      }
    }

    handleKey(key) {
      if (this.isSubmitting || !this.inputEl) return;

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
    }

    verify() {
      if (this.isSubmitting) return;

      if (this.inputEl) {
        this.currentInput = this.inputEl.value.trim();
      }

      if (!this.currentInput) {
        this.showError('Introduce tu código de acceso');
        if (this.inputEl) this.inputEl.focus();
        return;
      }

      this.isSubmitting = true;
      const inputHash = this._hash(this.currentInput);
      const storedHash = localStorage.getItem(STORAGE_HASH_KEY);

      if (inputHash === storedHash) {
        this.onSuccess();
      } else {
        this.onError();
      }
    }

    onSuccess() {
      this.updateDots('success');
      if (this.inputEl) {
        this.inputEl.classList.remove('border-purple-500/70', 'focus:border-purple-400');
        this.inputEl.classList.add('border-emerald-500', 'text-emerald-400');
      }
      if (this.subtitleEl) {
        this.subtitleEl.textContent = '¡Código correcto! Entrando...';
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
        if (this.inputEl) {
          this.inputEl.value = '';
          this.inputEl.classList.remove('border-emerald-500', 'text-emerald-400');
          this.inputEl.classList.add('border-purple-500/70', 'focus:border-purple-400');
        }
      }, 350);
    }

    onError() {
      this.updateDots('error');
      if (this.cardEl) {
        this.cardEl.classList.remove('animate-shake');
        void this.cardEl.offsetWidth; // retrigger reflow
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

    showError(msg) {
      if (this.errorEl) {
        this.errorEl.textContent = msg;
        this.errorEl.classList.remove('hidden');
      }
      if (this.subtitleEl) {
        this.subtitleEl.textContent = 'Acceso Denegado';
        this.subtitleEl.className = 'text-xs text-rose-400 font-bold mt-2 text-center';
      }
    }

    hideError() {
      if (this.errorEl) {
        this.errorEl.classList.add('hidden');
      }
      if (this.subtitleEl) {
        this.subtitleEl.textContent = 'Introduce tu código de acceso';
        this.subtitleEl.className = 'text-xs text-slate-400 mt-2 text-center';
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

      this.currentInput = '';
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

    changePin(currentPin, newPin) {
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
        localStorage.setItem(STORAGE_HASH_KEY, this._hash(cleanNewPin));
        localStorage.setItem(STORAGE_PIN_LEN_KEY, String(cleanNewPin.length));
        this.renderDots();
        return { success: true, message: `¡Código actualizado a ${cleanNewPin.length} dígitos con éxito!` };
      } catch (e) {
        return { success: false, message: 'Error guardando en almacenamiento local.' };
      }
    }

    resetPinToDefault() {
      try {
        localStorage.setItem(STORAGE_HASH_KEY, this._hash(DEFAULT_PIN));
        localStorage.setItem(STORAGE_PIN_LEN_KEY, String(DEFAULT_PIN.length));
        this.renderDots();
        return { success: true, message: 'Código restablecido al por defecto (1234).' };
      } catch (e) {
        return { success: false, message: 'Error al restablecer código.' };
      }
    }

    forgotPinPrompt() {
      const confirmReset = window.confirm(
        "¿Has olvidado tu código de acceso?\n\n¿Deseas restablecer el código al predeterminado (1234)?"
      );
      if (confirmReset) {
        const res = this.resetPinToDefault();
        alert(res.message);
        this.lock();
      }
    }

    // --- Enlace con el Modal de Ajustes ---
    setupSettingsBindings() {
      const toggleAuth = document.getElementById('setting-auth-enabled');
      const pinContainer = document.getElementById('auth-code-change-container');
      const badgeStatus = document.getElementById('auth-code-status-badge');
      const inputCurrent = document.getElementById('auth-current-pin');
      const inputNew = document.getElementById('auth-new-pin');
      const btnSavePin = document.getElementById('btn-save-new-pin');
      const feedback = document.getElementById('auth-pin-feedback');

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
      };

      if (toggleAuth) {
        toggleAuth.addEventListener('change', (e) => {
          this.setAuthEnabled(e.target.checked);
          updateUI();
        });
      }

      if (btnSavePin) {
        btnSavePin.addEventListener('click', () => {
          const curVal = inputCurrent ? inputCurrent.value : '';
          const newVal = inputNew ? inputNew.value : '';

          if (!curVal || !newVal) {
            if (feedback) {
              feedback.textContent = 'Rellena ambos campos';
              feedback.className = 'text-[10px] text-rose-500 font-semibold';
            }
            return;
          }

          const res = this.changePin(curVal, newVal);
          if (feedback) {
            feedback.textContent = res.message;
            feedback.className = res.success ? 'text-[10px] text-emerald-500 font-semibold' : 'text-[10px] text-rose-500 font-semibold';
          }

          if (res.success) {
            if (inputCurrent) inputCurrent.value = '';
            if (inputNew) inputNew.value = '';
            updateUI();
            setTimeout(() => {
              if (feedback) feedback.textContent = '';
            }, 3500);
          }
        });
      }

      // Actualizar vista al abrir Ajustes
      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
          updateUI();
          if (feedback) feedback.textContent = '';
          if (inputCurrent) inputCurrent.value = '';
          if (inputNew) inputNew.value = '';
        });
      }

      updateUI();
    }
  }

  // Instanciar globalmente
  window.authModule = new AuthModule();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.authModule.init();
    });
  } else {
    window.authModule.init();
  }

})(window);
