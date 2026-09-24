/**
 * CRIS Platform - Subproject: Habit Tracker (Hábitos Diarios y Bienestar)
 * Rebranding completo en Turquesa / Cian Glaciar (#06B6D4 / #0891B2).
 * 
 * Unificación en la misma vista:
 * - Cuadro / Matriz Semanal interactiva de Lunes a Domingo.
 * - Gráficas de Progreso en Vivo (Evolución diaria, éxito por hábito y distribución).
 * - Campos 100% editables: renombrar hábitos, editar objetivos, añadir y eliminar.
 */

class HabitTrackerModule {
  constructor() {
    this.storageKey = 'cris_daily_habits_v2';
    this.selectedDate = this.getTodayDateString();
    this.selectedWeekOffset = 0; // 0 = semana actual, -1 = anterior, etc.

    this.currentTab = 'dashboard'; // 'dashboard' | 'cuadro'

    this.charts = {
      trend: null,
      habits: null,
      categories: null
    };

    const initial = this.loadData();
    this.habits = initial.habits || this.getDefaultHabits();
    this.history = initial.history || {};

    this.init();
  }

  setTab(tab) {
    this.currentTab = (tab === 'cuadro' || tab === 'semanal') ? 'cuadro' : 'dashboard';
    this.render();
  }

  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const isToday = dateStr === this.getTodayDateString();
    return `${isToday ? 'Hoy, ' : ''}${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  getDefaultHabits() {
    return [
      {
        id: 'habit_leer',
        name: 'Leer',
        category: 'Mente',
        goal: '20-30 min al día',
        icon: 'book-open',
        color: 'cyan',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_skincare',
        name: 'Skincare',
        category: 'Autocuidado',
        goal: 'Rutina facial mañana / noche',
        icon: 'sparkles',
        color: 'teal',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_ejercicio',
        name: 'Ejercicio',
        category: 'Salud',
        goal: 'Entrenamiento o sesión activa',
        icon: 'activity',
        color: 'sky',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_agua',
        name: 'Hidratación',
        category: 'Salud',
        goal: 'Beber al menos 2 litros de agua',
        icon: 'droplet',
        color: 'cyan',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_estudio',
        name: 'Estudio / Enfoque',
        category: 'Académico',
        goal: 'Sesión de concentración (ADE / Mkt)',
        icon: 'graduation-cap',
        color: 'indigo',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_caminar',
        name: 'Paseo / Pasos activos',
        category: 'Salud',
        goal: 'Dar un paseo o 8.000 pasos',
        icon: 'footprints',
        color: 'teal',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_orden',
        name: '10 min de orden',
        category: 'Hogar',
        goal: 'Espacio y escritorio limpio',
        icon: 'check-check',
        color: 'sky',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_descanso',
        name: 'Descanso reparador',
        category: 'Bienestar',
        goal: 'Dormir 7-8h y desconectar',
        icon: 'moon',
        color: 'violet',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_comida_sana',
        name: 'Alimentación saludable',
        category: 'Nutrición',
        goal: 'Fruta, verdura y comida real',
        icon: 'apple',
        color: 'cyan',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'habit_calma',
        name: 'Momento de calma',
        category: 'Bienestar',
        goal: '5-10 min respiración o desconexión',
        icon: 'heart',
        color: 'teal',
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.habits)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error cargando datos de Habit Tracker:', e);
    }
    return { habits: this.getDefaultHabits(), history: {} };
  }

  saveData() {
    try {
      const data = {
        habits: this.habits,
        history: this.history
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('studyflow:change', { detail: { source: 'checklist' } }));
    } catch (e) {
      console.error('Error guardando datos de Habit Tracker:', e);
    }
  }

  init() {
    window.addEventListener('studyflow:change', (e) => {
      if (e && e.detail && e.detail.source === 'checklist') return;
      if (window.app && (window.app.currentView === 'checklist' || window.app.currentView === 'habits')) {
        this.render();
      }
    });
  }

  // --- NAVEGACIÓN SEMANAL ---
  getWeekDays(offset = 0) {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Ajustar para que la semana empiece el Lunes (0 = Lunes, 6 = Domingo)
    const mondayOffset = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayShort: dayShorts[i],
        dayFull: dayNames[i],
        isToday: dateStr === this.getTodayDateString(),
        isPast: dateStr < this.getTodayDateString(),
        isFuture: dateStr > this.getTodayDateString()
      });
    }
    return days;
  }

  getWeekLabel(offset = 0) {
    const days = this.getWeekDays(offset);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const start = days[0];
    const end = days[6];

    const dStart = new Date(start.dateStr);
    const dEnd = new Date(end.dateStr);

    if (offset === 0) return `Esta Semana (${dStart.getDate()} ${months[dStart.getMonth()]} - ${dEnd.getDate()} ${months[dEnd.getMonth()]})`;
    if (offset === -1) return `Semana Pasada (${dStart.getDate()} ${months[dStart.getMonth()]} - ${dEnd.getDate()} ${months[dEnd.getMonth()]})`;
    return `Semana del ${dStart.getDate()} ${months[dStart.getMonth()]} al ${dEnd.getDate()} ${months[dEnd.getMonth()]}`;
  }

  goToPreviousWeek() {
    this.selectedWeekOffset--;
    this.render();
  }

  goToNextWeek() {
    this.selectedWeekOffset++;
    this.render();
  }

  goToCurrentWeek() {
    this.selectedWeekOffset = 0;
    this.render();
  }

  // --- GESTIÓN DE MARCADOS ---
  isHabitDoneOnDate(habitId, dateStr = this.selectedDate) {
    return !!(this.history[dateStr] && this.history[dateStr][habitId]);
  }

  isHabitDoneToday(habitId) {
    return this.isHabitDoneOnDate(habitId, this.getTodayDateString());
  }

  toggleHabit(habitId, dateStr = this.selectedDate) {
    if (!this.history[dateStr]) {
      this.history[dateStr] = {};
    }

    const current = !!this.history[dateStr][habitId];
    if (current) {
      delete this.history[dateStr][habitId];
    } else {
      this.history[dateStr][habitId] = true;
    }

    this.saveData();
    this.render();

    // Feedback
    if (!current && window.confetti && this.getDayProgress(dateStr).percent === 100) {
      window.confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    return !current;
  }

  getDayProgress(dateStr = this.selectedDate) {
    const activeHabits = this.habits.filter(h => h.enabled);
    const total = activeHabits.length;
    if (total === 0) return { total: 0, completed: 0, percent: 0 };

    const dayRecord = this.history[dateStr] || {};
    const completed = activeHabits.filter(h => dayRecord[h.id]).length;
    const percent = Math.round((completed / total) * 100);

    return { total, completed, percent };
  }

  getStreak() {
    let streak = 0;
    const d = new Date();
    const todayStr = this.getTodayDateString();

    const todayProg = this.getDayProgress(todayStr);
    if (todayProg.completed > 0) {
      streak = 1;
    }

    d.setDate(d.getDate() - 1);
    while (true) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const prog = this.getDayProgress(dateStr);
      if (prog.completed > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // --- OPERACIONES: AÑADIR, EDITAR Y ELIMINAR HÁBITOS ---
  addHabit(name, category, goal, icon, color) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;

    const newHabit = {
      id: 'habit_' + Date.now(),
      name: trimmed,
      category: category || 'Personal',
      goal: goal || 'Objetivo diario',
      icon: icon || 'check-circle',
      color: color || 'cyan',
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.habits.push(newHabit);
    this.saveData();
    this.render();

    if (window.app && window.app.showToast) {
      window.app.showToast(`Hábito "${trimmed}" añadido al Habit Tracker`, 'success');
    }
  }

  editHabit(habitId, newName, newGoal, newCategory, newColor, newIcon) {
    const h = this.habits.find(item => item.id === habitId);
    if (!h) return false;

    if (newName && newName.trim()) h.name = newName.trim();
    if (newGoal !== undefined) h.goal = (newGoal || '').trim();
    if (newCategory) h.category = newCategory.trim();
    if (newColor) h.color = newColor;
    if (newIcon) h.icon = newIcon;

    this.saveData();
    this.render();

    if (window.app && window.app.showToast) {
      window.app.showToast(`Hábito "${h.name}" actualizado correctamente`, 'success');
    }
    return true;
  }

  toggleHabitEnabled(habitId) {
    const h = this.habits.find(item => item.id === habitId);
    if (!h) return;
    h.enabled = !h.enabled;
    this.saveData();
    this.render();
  }

  deleteHabit(habitId) {
    const h = this.habits.find(item => item.id === habitId);
    if (!h) return;
    if (!confirm(`¿Eliminar el hábito "${h.name}" del tracker?`)) return;

    this.habits = this.habits.filter(item => item.id !== habitId);
    this.saveData();
    this.render();

    if (window.app && window.app.showToast) {
      window.app.showToast(`Hábito "${h.name}" eliminado`, 'info');
    }
  }

  markAllDoneToday(dateStr = this.selectedDate) {
    if (!this.history[dateStr]) {
      this.history[dateStr] = {};
    }
    const activeHabits = this.habits.filter(h => h.enabled);
    activeHabits.forEach(h => {
      this.history[dateStr][h.id] = true;
    });
    this.saveData();
    this.render();
    if (window.confetti) {
      window.confetti({ particleCount: 85, spread: 80, origin: { y: 0.6 } });
    }
    if (window.app && window.app.showToast) {
      window.app.showToast('¡Todos los hábitos marcados para hoy! 🎉', 'success');
    }
  }

  unmarkAllToday(dateStr = this.selectedDate) {
    if (this.history[dateStr]) {
      delete this.history[dateStr];
    }
    this.saveData();
    this.render();
    if (window.app && window.app.showToast) {
      window.app.showToast('Progreso del día reiniciado', 'info');
    }
  }

  enableAllHabits() {
    this.habits.forEach(h => { h.enabled = true; });
    this.saveData();
    this.render();
    if (window.app && window.app.showToast) {
      window.app.showToast('¡Todos los hábitos activados!', 'success');
    }
  }

  // --- RENDERIZADO PRINCIPAL (TODO EN EL MISMO SITIO) ---
  render() {
    const container = document.getElementById('checklist-view-container');
    if (!container) return;

    const isDashboard = this.currentTab === 'dashboard';
    const isCuadro = this.currentTab === 'cuadro';

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto pb-12">
        <!-- 1. HERO BANNER: TURQUESA / CIAN GLACIAR -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 text-white p-6 md:p-8 shadow-2xl border border-cyan-800/40">
          <div class="absolute -right-16 -top-16 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -left-16 -bottom-16 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold backdrop-blur-md border border-white/10">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>SUBPROYECTO DE CRIS • HABIT TRACKER</span>
              </div>
              <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Habit Tracker</span>
                <span class="text-3xl">💎</span>
              </h1>
              <p class="text-cyan-100/80 text-xs md:text-sm max-w-2xl font-medium">
                Tu centro de hábitos diarios, constancia y bienestar personal.
              </p>
            </div>

            <!-- Botonera de cambio de pestaña (Dashboard / Cuadro Semanal) -->
            <div class="inline-flex p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 self-start md:self-auto flex-wrap">
              <button onclick="window.habitTrackerModule.setTab('dashboard')" class="px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isDashboard ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                <span>Dashboard</span>
              </button>
              <button onclick="window.habitTrackerModule.setTab('cuadro')" class="px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isCuadro ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>Cuadro Semanal</span>
              </button>
            </div>
          </div>
        </div>

        <!-- CONTENIDO DE LA PESTAÑA ACTIVA -->
        ${isDashboard ? this.renderTabDashboard() : this.renderTabCuadro()}
      </div>

      <!-- MODALES DE HABIT TRACKER -->
      ${this.renderModals()}
    `;

    if (window.lucide) window.lucide.createIcons();

    // Renderizar gráficas integradas si estamos en el Cuadro Semanal
    if (isCuadro) {
      setTimeout(() => this.renderCharts(), 40);
    }
  }

  // --- PESTAÑA 1: DASHBOARD (LIMPIO Y PREPARADO) ---
  renderTabDashboard() {
    return `
      <div class="space-y-6">
        <div class="rounded-3xl border-2 border-dashed border-cyan-200 dark:border-cyan-800/60 bg-white/50 dark:bg-slate-900/50 p-12 text-center shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
            📊
          </div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Dashboard de Habit Tracker</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Lienzo preparado y listo. Indícame qué métricas, resúmenes de rachas, gráficas o bloques interactivos deseas colocar en este panel.
          </p>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
            <i data-lucide="sparkles" class="w-4 h-4 text-cyan-500"></i>
            <span>Espacio reservado para personalizar tu Dashboard</span>
          </div>
        </div>
      </div>
    `;
  }

  // --- PESTAÑA 2: CUADRO SEMANAL (MATRIZ + GRÁFICAS + EDICIÓN) ---
  renderTabCuadro() {
    const streak = this.getStreak();
    const activeHabits = this.habits.filter(h => h.enabled);
    const todayProg = this.getDayProgress(this.getTodayDateString());

    const weekDays = this.getWeekDays(this.selectedWeekOffset);
    const weekLabel = this.getWeekLabel(this.selectedWeekOffset);
    const isCurrentWeek = this.selectedWeekOffset === 0;

    const avgWeek = Math.round(weekDays.reduce((acc, d) => acc + this.getDayProgress(d.dateStr).percent, 0) / 7);
    const totalChecks = weekDays.reduce((acc, d) => acc + this.getDayProgress(d.dateStr).completed, 0);

    const colorBgMap = {
      cyan: 'bg-cyan-600 text-white',
      teal: 'bg-teal-600 text-white',
      sky: 'bg-sky-600 text-white',
      indigo: 'bg-indigo-600 text-white',
      purple: 'bg-purple-600 text-white',
      pink: 'bg-pink-600 text-white',
      emerald: 'bg-emerald-600 text-white',
      amber: 'bg-amber-600 text-white',
      violet: 'bg-violet-600 text-white',
      rose: 'bg-rose-600 text-white'
    };

    return `
      <div class="space-y-6">
        <!-- 4 KPIS EN CUADRO SEMANAL -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 text-amber-500 flex items-center justify-center font-black text-2xl shadow-xs">
              🔥
            </div>
            <div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Racha Activa</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-slate-900 dark:text-white">${streak}</span>
                <span class="text-xs text-slate-400 font-semibold">${streak === 1 ? 'día' : 'días seguidos'}</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-cyan-400/20 border border-cyan-300/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-xl shadow-xs">
              ⚡
            </div>
            <div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Progreso Hoy</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-slate-900 dark:text-white">${todayProg.percent}%</span>
                <span class="text-xs text-slate-400 font-semibold">(${todayProg.completed}/${todayProg.total})</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-teal-400/20 border border-teal-300/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xl shadow-xs">
              📈
            </div>
            <div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Media Semanal</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-slate-900 dark:text-white">${avgWeek}%</span>
                <span class="text-xs text-teal-600 dark:text-teal-400 font-semibold">efectividad</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-indigo-400/20 border border-indigo-300/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-xs">
              🎯
            </div>
            <div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Hábitos Activos</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-slate-900 dark:text-white">${activeHabits.length}</span>
                <span class="text-xs text-slate-400 font-semibold">configurados</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. BARRA DE ACCIONES RÁPIDAS -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div class="flex items-center gap-2">
            <button onclick="window.habitTrackerModule.openAddHabitModal()" class="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md shadow-cyan-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Nuevo Hábito</span>
            </button>
            <button onclick="window.habitTrackerModule.markAllDoneToday()" class="px-4 py-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold text-xs flex items-center gap-2 transition cursor-pointer">
              <i data-lucide="check-check" class="w-4 h-4"></i>
              <span>Marcar todo hoy</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.habitTrackerModule.unmarkAllToday()" class="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5" title="Reiniciar marcas del día de hoy">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
              <span>Reiniciar hoy</span>
            </button>
            <span class="text-xs text-slate-400 font-medium hidden md:inline">💡 Haz clic en el lápiz ✏️ de cualquier fila para editar su nombre o meta.</span>
          </div>
        </div>

        <!-- 3. CUADRO / MATRIZ SEMANAL INTERACTIVA (LUNES A DOMINGO) -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <!-- Navegador de Semanas -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center gap-2">
              <button onclick="window.habitTrackerModule.goToPreviousWeek()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer" title="Semana anterior">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
              </button>
              <div class="text-left">
                <h3 class="text-base font-black text-slate-900 dark:text-white leading-tight">
                  ${weekLabel}
                </h3>
                <span class="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold">
                  ${isCurrentWeek ? 'Semana en curso' : 'Registro histórico'}
                </span>
              </div>
              <button onclick="window.habitTrackerModule.goToNextWeek()" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer" title="Semana siguiente">
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            </div>

            <div class="flex items-center gap-2">
              ${!isCurrentWeek ? `
                <button onclick="window.habitTrackerModule.goToCurrentWeek()" class="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 text-xs font-bold transition border border-cyan-200 dark:border-cyan-800 cursor-pointer flex items-center gap-1.5">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                  <span>Volver a Esta Semana</span>
                </button>
              ` : ''}
              <span class="text-[11px] text-slate-400 font-bold">${activeHabits.length} hábitos en seguimiento</span>
            </div>
          </div>

          <!-- Tabla Matriz / Cuadro -->
          <div class="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-black uppercase text-slate-500">
                  <th class="p-3.5 min-w-[240px]">Hábito (Clic ✏️ para editar)</th>
                  ${weekDays.map(d => `
                    <th class="p-3 text-center min-w-[65px] ${d.isToday ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black' : ''}">
                      <span class="block">${d.dayShort}</span>
                      <span class="text-sm font-extrabold ${d.isToday ? 'text-cyan-600 dark:text-cyan-400 underline underline-offset-4' : 'text-slate-800 dark:text-slate-200'}">${d.dayNum}</span>
                    </th>
                  `).join('')}
                  <th class="p-3 text-center min-w-[95px]">% Semana</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                ${activeHabits.map(habit => {
                  let habitWeekDone = 0;
                  return `
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition group">
                      <!-- Celda Hábito con Botón Editar -->
                      <td class="p-3">
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-xl ${colorBgMap[habit.color] || colorBgMap.cyan} flex items-center justify-center text-xs shadow-xs shrink-0">
                              <i data-lucide="${habit.icon || 'check-circle'}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                              <span class="font-black text-slate-900 dark:text-white block leading-tight truncate">${habit.name}</span>
                              <span class="text-[10px] text-slate-400 block truncate">${habit.goal || habit.category}</span>
                            </div>
                          </div>
                          <!-- Botón Editar Hábito -->
                          <button onclick="window.habitTrackerModule.openEditHabitModal('${habit.id}')" title="Editar '${habit.name}'" class="p-1.5 rounded-lg text-slate-300 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer shrink-0">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </td>

                      <!-- Celdas Lunes a Domingo -->
                      ${weekDays.map(d => {
                        const isDone = this.isHabitDoneOnDate(habit.id, d.dateStr);
                        if (isDone) habitWeekDone++;
                        return `
                          <td class="p-2 text-center ${d.isToday ? 'bg-cyan-500/5' : ''}">
                            <button type="button" onclick="window.habitTrackerModule.toggleHabit('${habit.id}', '${d.dateStr}')"
                              class="w-8 h-8 mx-auto rounded-xl border flex items-center justify-center transition cursor-pointer select-none active:scale-95 ${isDone ? 'bg-cyan-500 text-white border-transparent shadow-xs scale-105' : 'border-slate-300 dark:border-slate-600 hover:border-cyan-400 bg-slate-50/50 dark:bg-slate-700/30 text-slate-300 hover:text-cyan-500'}"
                              title="${habit.name} • ${d.dayFull} ${d.dayNum}: ${isDone ? 'Completado' : 'Pendiente'}">
                              ${isDone ? '<i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>' : '<span class="opacity-0 group-hover:opacity-60 text-xs font-bold">+</span>'}
                            </button>
                          </td>
                        `;
                      }).join('')}

                      <!-- % Semanal -->
                      <td class="p-3 text-center">
                        <div class="flex flex-col items-center gap-1">
                          <span class="font-black text-xs ${habitWeekDone === 7 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}">
                            ${Math.round((habitWeekDone / 7) * 100)}%
                          </span>
                          <div class="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-cyan-500 rounded-full" style="width: ${Math.round((habitWeekDone / 7) * 100)}%"></div>
                          </div>
                          <span class="text-[9px] text-slate-400 font-semibold">${habitWeekDone}/7 días</span>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <!-- Pie con Totales Diarios -->
              <tfoot>
                <tr class="bg-slate-50/90 dark:bg-slate-900/80 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <td class="p-3.5 text-slate-700 dark:text-slate-300">
                    <span class="font-black uppercase tracking-wider text-[10px] block text-slate-400">Total Día</span>
                    <span>Cumplimiento Diario</span>
                  </td>
                  ${weekDays.map(d => {
                    const prog = this.getDayProgress(d.dateStr);
                    const is100 = prog.percent === 100;
                    return `
                      <td class="p-2 text-center ${d.isToday ? 'bg-cyan-500/10' : ''}">
                        <span class="block text-xs font-black ${is100 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}">
                          ${prog.percent}%
                        </span>
                        <span class="text-[10px] text-slate-400 block">${prog.completed}/${prog.total}</span>
                      </td>
                    `;
                  }).join('')}
                  <td class="p-3 text-center">
                    <span class="text-[10px] font-black uppercase text-slate-400 block">Promedio</span>
                    <span class="text-xs font-black text-cyan-600 dark:text-cyan-400">
                      ${avgWeek}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- 4. GRÁFICAS DE PROGRESO INTEGRADAS EN LA MISMA VISTA -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="line-chart" class="w-5 h-5 text-cyan-500"></i>
                <span>Gráficas de Progreso y Constancia</span>
              </h3>
              <p class="text-xs text-slate-400">Analítica visual en tiempo real de tu evolución semanal y rendimiento por hábito.</p>
            </div>
            <div class="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span class="px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                ${totalChecks} hábitos cumplidos esta semana
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Gráfica 1: Evolución Diaria (7 de 12) -->
            <div class="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Evolución Diaria de Cumplimiento (%)</h4>
                <span class="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold">${avgWeek}% Promedio</span>
              </div>
              <div class="h-64 w-full relative">
                <canvas id="chart-checklist-trend"></canvas>
              </div>
            </div>

            <!-- Gráfica 2: Rendimiento por Hábito (5 de 12) -->
            <div class="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Constancia por Hábito (% Semanal)</h4>
                <span class="text-[11px] text-slate-400">7 días analizados</span>
              </div>
              <div class="h-64 w-full relative">
                <canvas id="chart-checklist-habits"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. PANEL DE GESTIÓN Y EDICIÓN DE HÁBITOS -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60 flex-wrap gap-2">
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-white">Gestión y Personalización de Hábitos (${this.habits.length})</h3>
              <p class="text-xs text-slate-400">Activa, desactiva, edita o renombra tus conceptos cuando lo desees</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.habitTrackerModule.enableAllHabits()" class="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span>Activar Todos</span>
              </button>
              <button onclick="window.habitTrackerModule.openAddHabitModal()" class="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Añadir Hábito</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${this.habits.map(habit => {
              return `
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-cyan-300 dark:hover:border-cyan-800 transition">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl ${colorBgMap[habit.color] || colorBgMap.cyan} flex items-center justify-center text-xs shrink-0 shadow-xs">
                      <i data-lucide="${habit.icon || 'check-circle'}" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                      <span class="font-extrabold text-slate-800 dark:text-slate-100 block text-xs truncate">${habit.name}</span>
                      <span class="text-[10px] text-slate-400 block truncate">${habit.goal || habit.category}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button onclick="window.habitTrackerModule.openEditHabitModal('${habit.id}')" title="Editar" class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer">
                      <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="window.habitTrackerModule.toggleHabitEnabled('${habit.id}')" class="px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${habit.enabled ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}">
                      ${habit.enabled ? 'Activo' : 'Pausado'}
                    </button>
                    <button onclick="window.habitTrackerModule.deleteHabit('${habit.id}')" class="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer" title="Eliminar">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // --- RENDERIZADO DE GRÁFICAS CHART.JS EN TONOS CIAN / TURQUESA ---
  renderCharts() {
    if (!window.Chart) return;
    const isDark = (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList)
      ? document.documentElement.classList.contains('dark')
      : false;
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

    // Destruir previas
    if (this.charts.trend) this.charts.trend.destroy();
    if (this.charts.habits) this.charts.habits.destroy();

    const weekDays = this.getWeekDays(this.selectedWeekOffset);
    const activeHabits = this.habits.filter(h => h.enabled);

    // 1. Gráfica de Tendencia Diaria (Línea / Área Turquesa Glaciar)
    const trendCanvas = document.getElementById('chart-checklist-trend');
    if (trendCanvas) {
      const labels = weekDays.map(d => `${d.dayShort} ${d.dayNum}`);
      const dataPercent = weekDays.map(d => this.getDayProgress(d.dateStr).percent);

      const ctx = trendCanvas.getContext('2d');
      let gradient = '#06B6D4';
      if (ctx && ctx.createLinearGradient) {
        gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      }

      try {
        this.charts.trend = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Cumplimiento (%)',
              data: dataPercent,
              borderColor: '#06B6D4',
              backgroundColor: gradient,
              fill: true,
              tension: 0.35,
              borderWidth: 3,
              pointBackgroundColor: '#0891B2',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                min: 0,
                max: 100,
                ticks: {
                  color: textColor,
                  callback: (val) => val + '%'
                },
                grid: { color: gridColor }
              },
              x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
              }
            }
          }
        });
      } catch (e) {
        console.warn('Error en gráfica de tendencia:', e);
      }
    }

    // 2. Gráfica de Éxito por Hábito (Barras Horizontales Cian / Teal)
    const habitsCanvas = document.getElementById('chart-checklist-habits');
    if (habitsCanvas && activeHabits.length > 0) {
      const habitLabels = activeHabits.map(h => h.name);
      const habitScores = activeHabits.map(h => {
        let score = 0;
        weekDays.forEach(d => {
          if (this.isHabitDoneOnDate(h.id, d.dateStr)) score++;
        });
        return Math.round((score / 7) * 100);
      });

      const ctx = habitsCanvas.getContext('2d');
      try {
        this.charts.habits = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: habitLabels,
            datasets: [{
              label: '% Semanal',
              data: habitScores,
              backgroundColor: '#0891B2',
              borderRadius: 6,
              barThickness: 14
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                min: 0,
                max: 100,
                ticks: {
                  color: textColor,
                  callback: (val) => val + '%'
                },
                grid: { color: gridColor }
              },
              y: {
                ticks: {
                  color: textColor,
                  font: { size: 10, weight: 'bold' }
                },
                grid: { display: false }
              }
            }
          }
        });
      } catch (e) {
        console.warn('Error en gráfica de hábitos:', e);
      }
    }
  }

  // --- MODALES: AÑADIR Y EDITAR HÁBITOS ---
  renderModals() {
    return `
      <!-- MODAL AÑADIR HÁBITO -->
      <div id="modal-add-habit" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4 text-cyan-600"></i>
              <span>Nuevo Hábito en el Tracker</span>
            </h3>
            <button onclick="window.habitTrackerModule.closeAddHabitModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.habitTrackerModule.handleAddHabitSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Hábito</label>
              <input type="text" id="new-habit-name" required placeholder="Ej. Meditación, Escribir diario, Caminar..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Meta u Objetivo Diario</label>
              <input type="text" id="new-habit-goal" placeholder="Ej. 15 minutos, 2 litros, 10 páginas..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select id="new-habit-category" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                  <option value="Autocuidado">Autocuidado</option>
                  <option value="Salud">Salud</option>
                  <option value="Mente">Mente</option>
                  <option value="Académico">Académico</option>
                  <option value="Bienestar">Bienestar</option>
                  <option value="Nutrición">Nutrición</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <select id="new-habit-color" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                  <option value="cyan">Cian Glaciar</option>
                  <option value="teal">Turquesa</option>
                  <option value="sky">Azul Cielo</option>
                  <option value="indigo">Índigo</option>
                  <option value="purple">Púrpura</option>
                  <option value="pink">Rosa</option>
                  <option value="emerald">Esmeralda</option>
                  <option value="amber">Ámbar</option>
                </select>
              </div>
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.habitTrackerModule.closeAddHabitModal()" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Hábito</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL EDITAR HÁBITO (CAMPOS EDITABLES) -->
      <div id="modal-edit-habit" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="edit-2" class="w-4 h-4 text-cyan-600"></i>
              <span>Editar Hábito</span>
            </h3>
            <button onclick="window.habitTrackerModule.closeEditHabitModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.habitTrackerModule.handleEditHabitSubmit(event)" class="space-y-3">
            <input type="hidden" id="edit-habit-id">

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Hábito</label>
              <input type="text" id="edit-habit-name" required placeholder="Nombre" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Meta u Objetivo Diario</label>
              <input type="text" id="edit-habit-goal" placeholder="Objetivo diario" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select id="edit-habit-category" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                  <option value="Autocuidado">Autocuidado</option>
                  <option value="Salud">Salud</option>
                  <option value="Mente">Mente</option>
                  <option value="Académico">Académico</option>
                  <option value="Bienestar">Bienestar</option>
                  <option value="Nutrición">Nutrición</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <select id="edit-habit-color" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                  <option value="cyan">Cian Glaciar</option>
                  <option value="teal">Turquesa</option>
                  <option value="sky">Azul Cielo</option>
                  <option value="indigo">Índigo</option>
                  <option value="purple">Púrpura</option>
                  <option value="pink">Rosa</option>
                  <option value="emerald">Esmeralda</option>
                  <option value="amber">Ámbar</option>
                </select>
              </div>
            </div>

            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.habitTrackerModule.closeEditHabitModal()" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  openAddHabitModal() {
    const el = document.getElementById('modal-add-habit');
    if (el) {
      el.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  closeAddHabitModal() {
    const el = document.getElementById('modal-add-habit');
    if (el) el.classList.add('hidden');
  }

  openEditHabitModal(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    const idInput = document.getElementById('edit-habit-id');
    const nameInput = document.getElementById('edit-habit-name');
    const goalInput = document.getElementById('edit-habit-goal');
    const catInput = document.getElementById('edit-habit-category');
    const colorInput = document.getElementById('edit-habit-color');

    if (idInput) idInput.value = habit.id;
    if (nameInput) nameInput.value = habit.name;
    if (goalInput) goalInput.value = habit.goal || '';
    if (catInput) catInput.value = habit.category || 'Personal';
    if (colorInput) colorInput.value = habit.color || 'cyan';

    const modal = document.getElementById('modal-edit-habit');
    if (modal) {
      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  closeEditHabitModal() {
    const el = document.getElementById('modal-edit-habit');
    if (el) el.classList.add('hidden');
  }

  handleAddHabitSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById('new-habit-name')?.value;
    const goal = document.getElementById('new-habit-goal')?.value;
    const cat = document.getElementById('new-habit-category')?.value;
    const color = document.getElementById('new-habit-color')?.value;

    this.addHabit(name, cat, goal, 'check-circle', color);
    this.closeAddHabitModal();
  }

  handleEditHabitSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('edit-habit-id')?.value;
    const name = document.getElementById('edit-habit-name')?.value;
    const goal = document.getElementById('edit-habit-goal')?.value;
    const cat = document.getElementById('edit-habit-category')?.value;
    const color = document.getElementById('edit-habit-color')?.value;

    if (this.editHabit(id, name, goal, cat, color)) {
      this.closeEditHabitModal();
    }
  }

  // Retrocompatibilidad con antiguos métodos
  setViewMode(mode) {
    this.render();
  }
}

// Instanciar globalmente
window.habitTrackerModule = new HabitTrackerModule();
window.checklistModule = window.habitTrackerModule; // Alias completo
