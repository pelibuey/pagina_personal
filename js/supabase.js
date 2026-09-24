/**
 * CRIS Platform - Supabase Realtime & Cloud Persistence Manager (js/supabase.js)
 * Sincronización bidireccional en tiempo real entre la plataforma web, el móvil y el Bot de Telegram.
 * Arquitectura Offline-First: Funciona sin interrupciones con localStorage y sincroniza con Supabase en la nube.
 */

(function(window) {
  'use strict';

  const STORAGE_SB_URL = 'cris_supabase_url';
  const STORAGE_SB_KEY = 'cris_supabase_anon_key';

  const DEFAULT_SB_URL = 'https://tkivferzuavjcfgxfihp.supabase.co';
  const DEFAULT_SB_KEY = 'sb_publishable_l6D1fMxIG5OhXhri9tw5iA_bLiMEtHG';

  class CrisSupabaseSync {
    constructor() {
      this.client = null;
      this.isRealtimeActive = false;
      this.syncDebounceTimers = {};
      this.modules = [
        { key: 'studyflow_data_v21', label: 'Estudios (ADE + Marketing FP)' },
        { key: 'cris_daily_habits_v2', label: 'Habit Tracker' },
        { key: 'cris_economia_data_v1', label: 'Gestión Económica' },
        { key: 'cris_menus_data_v1', label: 'Menús Semanales' },
        { key: 'cris_quick_notes', label: 'Notas Rápidas' },
        { key: 'auth_pin', label: 'Código PIN de Seguridad' }
      ];
    }

    init() {
      const url = localStorage.getItem(STORAGE_SB_URL) || DEFAULT_SB_URL;
      const key = localStorage.getItem(STORAGE_SB_KEY) || DEFAULT_SB_KEY;

      if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
          this.client = window.supabase.createClient(url.trim(), key.trim(), {
            auth: { persistSession: false }
          });
          this.setupRealtimeSubscription();
          this.pullAllFromCloud();
        } catch (e) {
          console.warn('CRIS Supabase: Error al inicializar cliente', e);
        }
      }

      this.setupSettingsBindings();
      this.hookModuleSavers();
    }

    isConnected() {
      return !!this.client;
    }

    getCredentials() {
      return {
        url: localStorage.getItem(STORAGE_SB_URL) || DEFAULT_SB_URL,
        key: localStorage.getItem(STORAGE_SB_KEY) || DEFAULT_SB_KEY
      };
    }

    setCredentials(url, key) {
      if (!url || !key) return false;
      try {
        localStorage.setItem(STORAGE_SB_URL, url.trim());
        localStorage.setItem(STORAGE_SB_KEY, key.trim());
        this.init();
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Sube un módulo a Supabase (con debounce de 400ms para no saturar peticiones)
     */
    pushState(key, data) {
      if (!this.client) return;

      if (this.syncDebounceTimers[key]) {
        clearTimeout(this.syncDebounceTimers[key]);
      }

      this.syncDebounceTimers[key] = setTimeout(async () => {
        try {
          const payload = (typeof data === 'string' && key !== 'cris_quick_notes') ? JSON.parse(data) : data;
          await this.client
            .from('cris_app_state')
            .upsert({
              key: key,
              data: payload,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) {
          console.warn(`CRIS Supabase: Error al sincronizar [${key}]`, e);
        }
      }, 400);
    }

    /**
     * Descarga todo el estado desde Supabase y actualiza los módulos locales
     */
    async pullAllFromCloud() {
      if (!this.client) return;
      try {
        const { data, error } = await this.client
          .from('cris_app_state')
          .select('key, data, updated_at');

        if (error || !data) return;

        data.forEach(item => {
          this.applyIncomingCloudState(item.key, item.data, false);
        });
      } catch (e) {
        console.warn('CRIS Supabase: Error en pullAllFromCloud', e);
      }
    }

    /**
     * Aplica el estado recibido desde la nube en la UI y localStorage
     */
    applyIncomingCloudState(key, incomingData, fromRealtime = true) {
      if (!incomingData) return;
      const strData = typeof incomingData === 'string' ? incomingData : JSON.stringify(incomingData);

      // 1. Estudios / ADE + Marketing FP
      if (key === 'studyflow_data_v21') {
        const current = localStorage.getItem('studyflow_data_v21');
        if (current !== strData) {
          localStorage.setItem('studyflow_data_v21', strData);
          if (window.studyStore) {
            window.studyStore._data = window.studyStore._load();
            window.dispatchEvent(new CustomEvent('studyflow:change'));
          }
        }
      }

      // 2. Habit Tracker
      else if (key === 'cris_daily_habits_v2') {
        const current = localStorage.getItem('cris_daily_habits_v2');
        if (current !== strData) {
          localStorage.setItem('cris_daily_habits_v2', strData);
          if (window.checklistModule) {
            if (incomingData.habits) window.checklistModule.habits = incomingData.habits;
            if (incomingData.history) window.checklistModule.history = incomingData.history;
            if (window.checklistModule.render) window.checklistModule.render();
          }
        }
      }

      // 3. Gestión Económica
      else if (key === 'cris_economia_data_v1') {
        const current = localStorage.getItem('cris_economia_data_v1');
        if (current !== strData) {
          localStorage.setItem('cris_economia_data_v1', strData);
          if (window.economiaModule) {
            window.economiaModule.data = incomingData;
            if (window.economiaModule.render) window.economiaModule.render();
          }
        }
      }

      // 4. Menús Semanales
      else if (key === 'cris_menus_data_v1') {
        const current = localStorage.getItem('cris_menus_data_v1');
        if (current !== strData) {
          localStorage.setItem('cris_menus_data_v1', strData);
          if (window.menusModule) {
            window.menusModule.data = incomingData;
            if (window.menusModule.render) window.menusModule.render();
          }
        }
      }

      // 5. Notas Rápidas (Scratchpad)
      else if (key === 'cris_quick_notes') {
        const val = typeof incomingData === 'string' ? incomingData : (incomingData.text || '');
        const current = localStorage.getItem('cris_quick_notes');
        if (current !== val) {
          localStorage.setItem('cris_quick_notes', val);
          const scratchpad = document.getElementById('cris-scratchpad-input') || document.getElementById('hub-scratchpad');
          if (scratchpad && scratchpad.value !== val) {
            scratchpad.value = val;
          }
        }
      }

      // 6. Código PIN de Seguridad y 2FA
      else if (key === 'auth_pin') {
        if (incomingData && incomingData.pinHash) {
          localStorage.setItem('cris_auth_pin_hash', incomingData.pinHash);
          localStorage.setItem('cris_auth_pin_len', String(incomingData.pinLength || 4));
          if (incomingData.twoFactor) {
            localStorage.setItem('cris_auth_2fa_enabled', incomingData.twoFactor.enabled ? 'true' : 'false');
            if (incomingData.twoFactor.secret) {
              localStorage.setItem('cris_auth_2fa_secret', incomingData.twoFactor.secret);
            }
            if (incomingData.twoFactor.recovery) {
              localStorage.setItem('cris_auth_2fa_recovery', incomingData.twoFactor.recovery);
            }
          }
          if (window.authModule) {
            if (typeof window.authModule.renderDots === 'function') window.authModule.renderDots();
            if (typeof window.authModule.setupSettingsBindings === 'function') window.authModule.setupSettingsBindings();
          }
        }
      }
    }

    /**
     * Suscripción en tiempo real (WebSockets de Supabase)
     */
    setupRealtimeSubscription() {
      if (!this.client || this.isRealtimeActive) return;

      try {
        this.client
          .channel('cris-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'cris_app_state' },
            (payload) => {
              if (payload.new && payload.new.key) {
                this.applyIncomingCloudState(payload.new.key, payload.new.data, true);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.isRealtimeActive = true;
              this.updateStatusBadge();
            }
          });
      } catch (e) {
        console.warn('CRIS Supabase: Error al suscribir realtime', e);
      }
    }

    /**
     * Intercepta de forma no invasiva los métodos de guardado de los módulos
     * para enviar automáticamente las copias a Supabase.
     */
    hookModuleSavers() {
      // 1. Hook para studyStore
      if (window.studyStore && !window.studyStore._supabaseHooked) {
        const origSave = window.studyStore._save.bind(window.studyStore);
        window.studyStore._save = (data) => {
          origSave(data);
          this.pushState('studyflow_data_v21', data);
        };
        window.studyStore._supabaseHooked = true;
      }

      // 2. Hook para checklistModule (Habits)
      if (window.checklistModule && !window.checklistModule._supabaseHooked) {
        const origSave = window.checklistModule.saveData.bind(window.checklistModule);
        window.checklistModule.saveData = (data) => {
          origSave(data);
          const payload = {
            habits: window.checklistModule.habits,
            history: window.checklistModule.history
          };
          this.pushState('cris_daily_habits_v2', payload);
        };
        window.checklistModule._supabaseHooked = true;
      }

      // 3. Hook para economiaModule
      if (window.economiaModule && !window.economiaModule._supabaseHooked) {
        const origSave = window.economiaModule.saveData.bind(window.economiaModule);
        window.economiaModule.saveData = () => {
          origSave();
          this.pushState('cris_economia_data_v1', window.economiaModule.data);
        };
        window.economiaModule._supabaseHooked = true;
      }

      // 4. Hook para menusModule
      if (window.menusModule && !window.menusModule._supabaseHooked) {
        const origSave = window.menusModule.saveData.bind(window.menusModule);
        window.menusModule.saveData = () => {
          origSave();
          this.pushState('cris_menus_data_v1', window.menusModule.data);
        };
        window.menusModule._supabaseHooked = true;
      }

      // 5. Hook para crisHub (Notas rápidas)
      if (window.crisHub && !window.crisHub._supabaseHooked) {
        const origSaveNotes = window.crisHub.saveQuickNotes.bind(window.crisHub);
        window.crisHub.saveQuickNotes = (content) => {
          origSaveNotes(content);
          this.pushState('cris_quick_notes', { text: content });
        };
        window.crisHub._supabaseHooked = true;
      }

      // 6. Hook para authModule (PIN & 2FA)
      if (window.authModule && !window.authModule._supabaseHooked) {
        const origSync = window.authModule.syncPinToCloud ? window.authModule.syncPinToCloud.bind(window.authModule) : null;
        if (origSync) {
          window.authModule.syncPinToCloud = async (hash, len, twoFactorData) => {
            const tf = twoFactorData || (window.authModule.get2FAConfig ? window.authModule.get2FAConfig() : null);
            this.pushState('auth_pin', { pinHash: hash, pinLength: len, twoFactor: tf });
            return await origSync(hash, len, tf);
          };
        }
        window.authModule._supabaseHooked = true;
      }
    }

    /**
     * Sube todos los datos locales actuales a Supabase (Migración inicial con 1 clic)
     */
    async uploadAllLocalToSupabase() {
      if (!this.client) return { success: false, message: 'Supabase no está conectado. Guarda primero la URL y Anon Key.' };

      try {
        const studyData = localStorage.getItem('studyflow_data_v21');
        const habitData = localStorage.getItem('cris_daily_habits_v2');
        const ecoData = localStorage.getItem('cris_economia_data_v1');
        const menuData = localStorage.getItem('cris_menus_data_v1');
        const notesData = localStorage.getItem('cris_quick_notes');
        const pinHash = localStorage.getItem('cris_auth_pin_hash');
        const pinLen = localStorage.getItem('cris_auth_pin_len');
        const twoFactorConfig = window.authModule && window.authModule.get2FAConfig ? window.authModule.get2FAConfig() : null;

        const rows = [];
        if (studyData) {
          try { rows.push({ key: 'studyflow_data_v21', data: JSON.parse(studyData) }); } catch(e){}
        }
        if (habitData) {
          try { rows.push({ key: 'cris_daily_habits_v2', data: JSON.parse(habitData) }); } catch(e){}
        }
        if (ecoData) {
          try { rows.push({ key: 'cris_economia_data_v1', data: JSON.parse(ecoData) }); } catch(e){}
        }
        if (menuData) {
          try { rows.push({ key: 'cris_menus_data_v1', data: JSON.parse(menuData) }); } catch(e){}
        }
        if (notesData) {
          rows.push({ key: 'cris_quick_notes', data: { text: notesData } });
        }
        if (pinHash) {
          rows.push({ key: 'auth_pin', data: { pinHash, pinLength: Number(pinLen) || 4, twoFactor: twoFactorConfig } });
        }

        if (rows.length === 0) {
          return { success: false, message: 'No hay datos locales para migrar todavía.' };
        }

        for (const row of rows) {
          row.updated_at = new Date().toISOString();
          const { error } = await this.client.from('cris_app_state').upsert(row, { onConflict: 'key' });
          if (error) throw error;
        }

        return { success: true, message: `¡${rows.length} módulos sincronizados con éxito en Supabase!` };
      } catch (e) {
        return { success: false, message: 'Error al subir: ' + (e.message || e) };
      }
    }

    updateStatusBadge() {
      const badge = document.getElementById('supabase-sync-badge');
      if (badge) {
        if (this.isConnected()) {
          badge.textContent = this.isRealtimeActive ? '● Supabase en vivo (Realtime)' : '● Conectado a Supabase';
          badge.className = 'text-[9px] font-bold text-emerald-600 dark:text-emerald-400';
        } else {
          badge.textContent = '○ Supabase no configurado';
          badge.className = 'text-[9px] font-semibold text-slate-400';
        }
      }
    }

    setupSettingsBindings() {
      const inputUrl = document.getElementById('setting-supabase-url');
      const inputKey = document.getElementById('setting-supabase-key');
      const btnSave = document.getElementById('btn-save-supabase');
      const btnMigrate = document.getElementById('btn-upload-local-supabase');
      const feedback = document.getElementById('supabase-feedback');

      const refreshInputs = () => {
        const creds = this.getCredentials();
        if (inputUrl) inputUrl.value = creds.url;
        if (inputKey) inputKey.value = creds.key;
        this.updateStatusBadge();
      };

      if (btnSave) {
        btnSave.addEventListener('click', () => {
          const url = inputUrl ? inputUrl.value.trim() : '';
          const key = inputKey ? inputKey.value.trim() : '';
          if (!url || !key) {
            if (feedback) {
              feedback.textContent = 'Introduce la URL y la Anon Key de Supabase';
              feedback.className = 'text-[10px] text-rose-500 font-semibold';
            }
            return;
          }
          this.setCredentials(url, key);
          this.updateStatusBadge();
          if (feedback) {
            feedback.textContent = '¡Credenciales guardadas y conectadas!';
            feedback.className = 'text-[10px] text-emerald-500 font-semibold';
            setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3500);
          }
        });
      }

      if (btnMigrate) {
        btnMigrate.addEventListener('click', async () => {
          if (!this.isConnected()) {
            if (feedback) {
              feedback.textContent = 'Conéctate a Supabase primero para poder subir los datos.';
              feedback.className = 'text-[10px] text-rose-500 font-semibold';
            }
            return;
          }
          if (feedback) {
            feedback.textContent = 'Subiendo todos tus datos a Supabase...';
            feedback.className = 'text-[10px] text-purple-600 dark:text-purple-400 font-semibold animate-pulse';
          }
          const res = await this.uploadAllLocalToSupabase();
          if (feedback) {
            feedback.textContent = res.message;
            feedback.className = res.success ? 'text-[10px] text-emerald-500 font-semibold' : 'text-[10px] text-rose-500 font-semibold';
          }
        });
      }

      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', refreshInputs);
      }

      // Re-intentar enganchar hooks tras cargar la app
      setTimeout(() => {
        this.hookModuleSavers();
        this.updateStatusBadge();
      }, 1000);

      refreshInputs();
    }
  }

  window.crisSupabase = new CrisSupabaseSync();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.crisSupabase.init();
    });
  } else {
    window.crisSupabase.init();
  }

})(window);
