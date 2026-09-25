/**
 * CRIS Platform - Central Dashboard & Subproject Coordinator (js/cris-hub.js)
 * Centro de mando maestro de la plataforma "CRIS".
 * Coordina los 4 subproyectos activos:
 * 1. Estudios (Púrpura) - Marketing FP + ADE UNED
 * 2. Habit Tracker (Cian Glaciar) - Cuadro semanal, gráficas de progreso y hábitos editables
 * 3. Gestión Económica (Esmeralda) - 1.1 Personal y 1.2 De Casa
 * 4. Menús Semanales (Ámbar) - Plan semanal L-D, Recetario y Lista de la compra
 * 
 * Sin etiquetas invasivas de "Desplegado" ni datos inventados.
 */

class CrisHubModule {
  constructor() {
    this.scratchpadKey = 'cris_quick_notes';
    this._scratchpadTimer = null;
    this.dashboardShowAllOptions = false;
    this.cardOptionsState = { estudios: false, checklist: false, economia: false, menus: false };

    this.subprojects = [
      {
        id: 'estudios',
        name: 'Estudios',
        category: 'Académico',
        subtitle: 'FP Marketing y Publicidad + Grado ADE (UNED)',
        description: 'Gestión curricular completa, calendario de exámenes, calificaciones de temas 1-9, proyecto TFG y horario semanal.',
        icon: 'graduation-cap',
        color: 'purple',
        badge: 'Activo',
        status: 'active',
        route: 'dashboard'
      },
      {
        id: 'checklist',
        name: 'Habit Tracker',
        category: 'Hábitos & Bienestar',
        subtitle: 'Hábitos diarios: Leer, Skincare, Ejercicio...',
        description: 'Cuadro semanal interactivo, métricas de racha diaria, gráficas de evolución en vivo y conceptos 100% editables.',
        icon: 'check-circle-2',
        color: 'cyan',
        badge: 'Activo',
        status: 'active',
        route: 'checklist'
      },
      {
        id: 'economia',
        name: 'Gestión Económica',
        category: 'Finanzas & Hogar',
        subtitle: '1.1 Personal y 1.2 De Casa',
        description: 'Control de ingresos, gastos personales y comunes del hogar, presupuestos mensuales y ahorro neto.',
        icon: 'wallet',
        color: 'emerald',
        badge: 'Activo',
        status: 'active',
        route: 'economia'
      },
      {
        id: 'menus',
        name: 'Menús Semanales',
        category: 'Alimentación & Hogar',
        subtitle: 'Plan semanal, recetario y lista de la compra',
        description: 'Planificación de comidas de lunes a domingo, catálogo de recetas e ingredientes directos al supermercado.',
        icon: 'utensils',
        color: 'amber',
        badge: 'Activo',
        status: 'active',
        route: 'menus'
      },
      {
        id: 'trabajo',
        name: 'Trabajo & Carrera',
        category: 'Profesional',
        subtitle: 'Espacio modular para proyectos y carrera laboral',
        description: 'Seguimiento de tareas profesionales, clientes y desarrollo laboral.',
        icon: 'briefcase',
        color: 'blue',
        badge: 'Próximamente',
        status: 'upcoming',
        route: null
      },
      {
        id: 'metas',
        name: 'Metas a Largo Plazo',
        category: 'Desarrollo Personal',
        subtitle: 'Retos anuales y objetivos estratégicos',
        description: 'Registro de metas a largo plazo, hitos de superación y planes anuales.',
        icon: 'target',
        color: 'indigo',
        badge: 'Próximamente',
        status: 'upcoming',
        route: null
      }
    ];

    this.init();
  }

  init() {
    // Escuchar cambios globales de la aplicación para refrescar el Dashboard en vivo
    window.addEventListener('studyflow:change', () => {
      if (window.app && (window.app.currentView === 'cris-hub' || window.app.currentView === 'cris-dashboard')) {
        this.renderDashboard();
      }
    });

    // Cargar subproyectos personalizados si existen
    this.loadCustomSubprojects();

    // Vincular handlers a nivel global en window para disponibilidad total
    window.toggleSubproject = (id, force) => this.toggleSubprojectCollapse(id, force);
    window.toggleSubprojectCollapse = (id, force) => this.toggleSubprojectCollapse(id, force);
    window.toggleAllSubprojects = (force) => this.toggleAllSubprojects(force);
    window.toggleSubprojectsDropdown = () => this.toggleSubprojectsDropdown();
    window.closeSubprojectsDropdown = () => this.closeSubprojectsDropdown();

    // Inicializar estado de compresión de subproyectos (recordado en localStorage)
    if (typeof document !== 'undefined') {
      const attachEvents = () => {
        const btnEst = document.getElementById('btn-subproject-estudios-toggle');
        if (btnEst) {
          btnEst.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.toggleSubprojectCollapse('estudios');
          };
        }
        const btnEco = document.getElementById('btn-subproject-economia-toggle');
        if (btnEco) {
          btnEco.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.toggleSubprojectCollapse('economia');
          };
        }
        const btnMenus = document.getElementById('btn-subproject-menus-toggle');
        if (btnMenus) {
          btnMenus.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.toggleSubprojectCollapse('menus');
          };
        }
        const btnChk = document.getElementById('btn-subproject-checklist-toggle');
        if (btnChk) {
          btnChk.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.toggleSubprojectCollapse('checklist');
          };
        }
        const btnAll = document.getElementById('btn-toggle-all-subprojects');
        if (btnAll) {
          btnAll.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.toggleAllSubprojects();
          };
        }
        const btnDrop = document.getElementById('btn-subprojects-dropdown');
        if (btnDrop) {
          btnDrop.onclick = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            this.toggleSubprojectsDropdown();
          };
        }
        this.initSubprojectsCollapse();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachEvents);
      } else {
        setTimeout(attachEvents, 20);
      }
    }
  }

  // --- CONTROL DE COMPRESIÓN / EXPANSIÓN SUAVE DE SUBPROYECTOS ---
  // Sin texto de "Desplegado" ni "Comprimido", solo rotación elegante del chevron
  toggleSubprojectCollapse(subprojectId, forceState) {
    const content = document.getElementById(`subproject-${subprojectId}-content`);
    const chevron = document.getElementById(`chevron-subproject-${subprojectId}`);
    if (!content) return;

    const isCurrentlyHidden = (content.style.display === 'none' || content.classList.contains('hidden'));
    const willCollapse = (typeof forceState === 'boolean') ? forceState : !isCurrentlyHidden;

    if (willCollapse) {
      content.style.display = 'none';
      content.classList.add('hidden');
      if (chevron) {
        chevron.style.transform = 'rotate(-90deg)';
        chevron.classList.add('-rotate-90');
        chevron.classList.remove('rotate-0');
      }
      try {
        localStorage.setItem(`cris_sub_${subprojectId}_collapsed`, 'true');
      } catch (e) {}
    } else {
      content.style.display = 'block';
      content.classList.remove('hidden');
      if (chevron) {
        chevron.style.transform = 'rotate(0deg)';
        chevron.classList.remove('-rotate-90');
        chevron.classList.add('rotate-0');
      }
      try {
        localStorage.setItem(`cris_sub_${subprojectId}_collapsed`, 'false');
      } catch (e) {}
    }

    this.updateAllSubprojectsBtnLabel();
  }

  expandSubproject(subprojectId) {
    this.toggleSubprojectCollapse(subprojectId, false);
  }

  collapseSubproject(subprojectId) {
    this.toggleSubprojectCollapse(subprojectId, true);
  }

  toggleAllSubprojects(forceState) {
    const contentEstudios = document.getElementById('subproject-estudios-content');
    const contentEconomia = document.getElementById('subproject-economia-content');
    const contentMenus = document.getElementById('subproject-menus-content');
    const contentChecklist = document.getElementById('subproject-checklist-content');

    const isEstOpen = contentEstudios && (contentEstudios.style.display !== 'none' && !contentEstudios.classList.contains('hidden'));
    const isEcoOpen = contentEconomia && (contentEconomia.style.display !== 'none' && !contentEconomia.classList.contains('hidden'));
    const isMenusOpen = contentMenus && (contentMenus.style.display !== 'none' && !contentMenus.classList.contains('hidden'));
    const isChkOpen = contentChecklist && (contentChecklist.style.display !== 'none' && !contentChecklist.classList.contains('hidden'));
    const anyOpen = isEstOpen || isEcoOpen || isMenusOpen || isChkOpen;

    const willCollapse = (typeof forceState === 'boolean') ? forceState : anyOpen;

    this.toggleSubprojectCollapse('estudios', willCollapse);
    this.toggleSubprojectCollapse('economia', willCollapse);
    this.toggleSubprojectCollapse('menus', willCollapse);
    this.toggleSubprojectCollapse('checklist', willCollapse);
  }

  updateAllSubprojectsBtnLabel() {
    const btn = document.getElementById('btn-toggle-all-subprojects');
    if (!btn) return;
    const contentEstudios = document.getElementById('subproject-estudios-content');
    const contentEconomia = document.getElementById('subproject-economia-content');
    const contentMenus = document.getElementById('subproject-menus-content');
    const contentChecklist = document.getElementById('subproject-checklist-content');

    const isEstClosed = !contentEstudios || contentEstudios.style.display === 'none' || contentEstudios.classList.contains('hidden');
    const isEcoClosed = !contentEconomia || contentEconomia.style.display === 'none' || contentEconomia.classList.contains('hidden');
    const isMenusClosed = !contentMenus || contentMenus.style.display === 'none' || contentMenus.classList.contains('hidden');
    const isChkClosed = !contentChecklist || contentChecklist.style.display === 'none' || contentChecklist.classList.contains('hidden');
    const allCollapsed = isEstClosed && isEcoClosed && isMenusClosed && isChkClosed;

    if (allCollapsed) {
      btn.textContent = 'Mostrar todo';
    } else {
      btn.textContent = 'Comprimir todo';
    }
  }

  initSubprojectsCollapse() {
    try {
      const estudiosCollapsed = localStorage.getItem('cris_sub_estudios_collapsed');
      if (estudiosCollapsed === 'true') {
        this.collapseSubproject('estudios');
      } else {
        this.expandSubproject('estudios');
      }
      const economiaCollapsed = localStorage.getItem('cris_sub_economia_collapsed');
      if (economiaCollapsed === 'true') {
        this.collapseSubproject('economia');
      } else {
        this.expandSubproject('economia');
      }
      const menusCollapsed = localStorage.getItem('cris_sub_menus_collapsed');
      if (menusCollapsed === 'true') {
        this.collapseSubproject('menus');
      } else {
        this.expandSubproject('menus');
      }
      const checklistCollapsed = localStorage.getItem('cris_sub_checklist_collapsed');
      if (checklistCollapsed === 'true') {
        this.collapseSubproject('checklist');
      } else {
        this.expandSubproject('checklist');
      }
      this.updateAllSubprojectsBtnLabel();
    } catch (e) {}
  }

  // --- CONTROL DEL MENÚ DESPLEGABLE DE SUBPROYECTOS (TOPBAR) ---
  toggleSubprojectsDropdown() {
    const menu = document.getElementById('subprojects-dropdown-menu');
    const chevron = document.getElementById('chevron-subprojects-dropdown');
    if (!menu) return;
    const isClosed = menu.style.display === 'none' || menu.classList.contains('hidden');
    if (isClosed) {
      menu.style.display = 'block';
      menu.classList.remove('hidden');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
      menu.style.display = 'none';
      menu.classList.add('hidden');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  }

  closeSubprojectsDropdown() {
    const menu = document.getElementById('subprojects-dropdown-menu');
    const chevron = document.getElementById('chevron-subprojects-dropdown');
    if (menu) {
      menu.style.display = 'none';
      menu.classList.add('hidden');
    }
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }

  // --- CONTROL DE OPCIONES EN EL DASHBOARD ---
  toggleDashboardSubprojectsView() {
    this.dashboardShowAllOptions = !this.dashboardShowAllOptions;
    this.renderDashboard();
  }

  toggleCardOptions(subprojectId) {
    this.cardOptionsState[subprojectId] = !this.cardOptionsState[subprojectId];
    this.renderDashboard();
  }

  isCardOptionsOpen(subprojectId) {
    return this.dashboardShowAllOptions || !!this.cardOptionsState[subprojectId];
  }

  loadCustomSubprojects() {
    try {
      const saved = localStorage.getItem('cris_custom_subprojects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (!this.subprojects.some(existing => existing.id === p.id)) {
              this.subprojects.push(p);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error cargando subproyectos de CRIS:', e);
    }
  }

  saveCustomSubproject(project) {
    try {
      this.subprojects.push(project);
      const customOnes = this.subprojects.filter(p => !['estudios', 'checklist', 'economia', 'menus', 'trabajo', 'metas'].includes(p.id));
      localStorage.setItem('cris_custom_subprojects', JSON.stringify(customOnes));
      this.renderDashboard();
      if (window.app && window.app.showToast) {
        window.app.showToast(`Subproyecto "${project.name}" añadido a CRIS`, 'success');
      }
    } catch (e) {
      console.error('Error guardando subproyecto:', e);
    }
  }

  // --- MÉTRICAS: ESTUDIOS ---
  getEstudiosMetrics() {
    const store = window.studyStore;
    if (!store) {
      return {
        activeSubjects: 5,
        totalTasks: 0,
        completedTasks: 0,
        nextExams: 0,
        marketingGradedTopics: 0,
        pomodoroSessions: 0,
        pomodoroMinutes: 0
      };
    }

    const mktSubs = store.getSubjects('marketing') || [];
    const activeSubs = mktSubs.filter(s => s.id !== 'mkt_sub_tfg');
    const tasks = store.getTasks('all') || [];
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const exams = store.getExams('all') || [];
    const pomodoroSessions = (store._data && Array.isArray(store._data.pomodoroSessions)) ? store._data.pomodoroSessions : [];
    const pomodoroMinutes = pomodoroSessions.reduce((acc, s) => acc + (s.duration || 25), 0);

    let gradedTopics = 0;
    activeSubs.forEach(s => {
      if (s.topics) {
        s.topics.forEach(t => {
          if ((t.task && t.task.score !== null) || (t.miniExam && t.miniExam.score !== null)) {
            gradedTopics++;
          }
        });
      }
    });

    return {
      activeSubjects: 5,
      totalTasks: tasks.length,
      completedTasks: completedTasks,
      nextExams: exams.length,
      marketingGradedTopics: gradedTopics,
      pomodoroSessions: pomodoroSessions.length,
      pomodoroMinutes: pomodoroMinutes
    };
  }

  // --- MÉTRICAS: HABIT TRACKER (CIAN GLACIAR) ---
  getHabitTrackerData() {
    let habits = [];
    let history = {};
    const today = new Date().toISOString().split('T')[0];

    if (window.habitTrackerModule) {
      habits = (window.habitTrackerModule.habits || []).filter(h => h.enabled !== false);
      history = window.habitTrackerModule.history || {};
    } else {
      try {
        const saved = localStorage.getItem('cris_daily_habits_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          habits = (parsed.habits || []).filter(h => h.enabled !== false);
          history = parsed.history || {};
        }
      } catch (e) {}
    }

    if (habits.length === 0) {
      habits = [
        { id: 'habit_leer', name: 'Leer', goal: '20-30 min', icon: 'book-open', color: 'cyan' },
        { id: 'habit_skincare', name: 'Skincare', goal: 'Rutina mañana/noche', icon: 'sparkles', color: 'teal' },
        { id: 'habit_ejercicio', name: 'Ejercicio', goal: 'Entrenamiento activo', icon: 'activity', color: 'sky' },
        { id: 'habit_agua', name: 'Hidratación', goal: '2L de agua', icon: 'droplet', color: 'cyan' }
      ];
    }

    const todayRecord = history[today] || {};
    const totalCount = habits.length;
    const completedCount = habits.filter(h => !!todayRecord[h.id]).length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Calcular racha actual
    let streak = 0;
    let checkDate = new Date();
    if (completedCount < totalCount) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 30; i++) {
      const dStr = checkDate.toISOString().split('T')[0];
      const rec = history[dStr];
      if (rec && habits.every(h => !!rec[h.id])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      habits: habits.map(h => ({
        id: h.id,
        name: h.name,
        goal: h.goal,
        category: h.category || 'Bienestar',
        icon: h.icon || 'check-circle',
        color: h.color || 'cyan',
        completed: !!todayRecord[h.id]
      })),
      totalCount,
      completedCount,
      percent,
      streak
    };
  }

  toggleHabitFromDashboard(habitId) {
    if (window.habitTrackerModule && typeof window.habitTrackerModule.toggleHabit === 'function') {
      window.habitTrackerModule.toggleHabit(habitId);
    } else {
      try {
        const today = new Date().toISOString().split('T')[0];
        const saved = JSON.parse(localStorage.getItem('cris_daily_habits_v2') || '{}');
        saved.history = saved.history || {};
        saved.history[today] = saved.history[today] || {};
        saved.history[today][habitId] = !saved.history[today][habitId];
        localStorage.setItem('cris_daily_habits_v2', JSON.stringify(saved));
      } catch (e) {}
    }
    this.renderDashboard();
  }

  // --- MÉTRICAS: GESTIÓN ECONÓMICA ---
  getEconomiaMetrics() {
    if (window.economiaModule && typeof window.economiaModule.getPersonalMetrics === 'function') {
      const personal = window.economiaModule.getPersonalMetrics();
      const casa = window.economiaModule.getCasaMetrics ? window.economiaModule.getCasaMetrics() : { totalGastos: 0 };
      return {
        personalGastos: personal.totalGastos,
        personalBalance: personal.balanceNeto,
        tasaAhorro: personal.tasaAhorro,
        casaGastos: casa.totalGastos,
        totalNeto: personal.balanceNeto
      };
    }
    try {
      const raw = localStorage.getItem('cris_economia_data_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const pGastos = (parsed.personal?.gastos || []).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
        const pIngresos = (parsed.personal?.ingresos || []).reduce((acc, i) => acc + (Number(i.importe) || 0), 0);
        const cGastos = (parsed.casa?.gastos || []).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
        const balance = pIngresos - pGastos;
        return {
          personalGastos: pGastos,
          personalBalance: balance,
          tasaAhorro: pIngresos > 0 ? Math.max(0, Math.round((balance / pIngresos) * 100)) : 0,
          casaGastos: cGastos,
          totalNeto: balance
        };
      }
    } catch (e) {}
    return {
      personalGastos: 0,
      personalBalance: 0,
      tasaAhorro: 0,
      casaGastos: 0,
      totalNeto: 0
    };
  }

  // --- MÉTRICAS: MENÚS SEMANALES ---
  getMenusMetrics() {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = days[new Date().getDay()];
    let lunch = '';
    let dinner = '';
    let recetasCount = 0;
    let comprasPendientes = 0;

    if (window.menusModule && window.menusModule.data) {
      const data = window.menusModule.data;
      const todayMenu = data.menuSemanal ? data.menuSemanal[todayName] : null;
      lunch = todayMenu?.almuerzo || '';
      dinner = todayMenu?.cena || '';
      recetasCount = (data.recetas || []).length;
      comprasPendientes = (data.listaCompra || []).filter(item => !item.comprado).length;
    } else {
      try {
        const raw = localStorage.getItem('cris_menus_data_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          const todayMenu = parsed.menuSemanal ? parsed.menuSemanal[todayName] : null;
          lunch = todayMenu?.almuerzo || '';
          dinner = todayMenu?.cena || '';
          recetasCount = (parsed.recetas || []).length;
          comprasPendientes = (parsed.listaCompra || []).filter(item => !item.comprado).length;
        }
      } catch (e) {}
    }

    return {
      todayName,
      lunch,
      dinner,
      recetasCount,
      comprasPendientes
    };
  }

  getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 13) return 'Buenos días';
    if (hour >= 13 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getFormattedDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('es-ES', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  // --- BLOC DE NOTAS RÁPIDAS (SCRATCHPAD) ---
  getQuickNotes() {
    try {
      return localStorage.getItem(this.scratchpadKey) || '';
    } catch (e) {
      return '';
    }
  }

  saveQuickNotes(content) {
    try {
      localStorage.setItem(this.scratchpadKey, content);
      const statusEl = document.getElementById('scratchpad-status');
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Guardado</span>';
        if (window.lucide) window.lucide.createIcons();
        if (typeof clearTimeout !== 'undefined') {
          clearTimeout(this._scratchpadTimer);
        }
        if (typeof setTimeout !== 'undefined') {
          this._scratchpadTimer = setTimeout(() => {
            if (statusEl) {
              statusEl.innerHTML = '<span class="text-slate-400 dark:text-slate-500">Autoguardado</span>';
            }
          }, 1800);
        }
      }
    } catch (e) {
      console.error('Error guardando notas rápidas:', e);
    }
  }

  clearQuickNotes() {
    if (confirm('¿Deseas vaciar el bloc de notas rápidas de Cris?')) {
      try {
        localStorage.removeItem(this.scratchpadKey);
        const textarea = document.getElementById('cris-scratchpad-input');
        if (textarea) textarea.value = '';
        const statusEl = document.getElementById('scratchpad-status');
        if (statusEl) {
          statusEl.innerHTML = '<span class="text-slate-400 dark:text-slate-500">Bloc vacío</span>';
        }
      } catch (e) {}
    }
  }

  // --- NAVEGACIÓN Y ACCIONES ---
  navigateToHub() {
    if (window.app) {
      window.app.navigateTo('cris-hub');
    }
  }

  navigateToModule(moduleId, subParam) {
    if (moduleId === 'estudios') {
      if (window.app) window.app.navigateTo('dashboard');
    } else if (moduleId === 'checklist') {
      if (window.app) window.app.navigateTo('checklist', subParam || 'dashboard');
    } else if (moduleId === 'economia') {
      if (window.app) window.app.navigateTo('economia', subParam || 'dashboard');
    } else if (moduleId === 'menus') {
      if (window.app) window.app.navigateTo('menus', subParam || 'dashboard');
    } else {
      this.showSubprojectInfo(moduleId);
    }
  }

  showSubprojectInfo(id) {
    const p = this.subprojects.find(x => x.id === id);
    if (!p) return;
    const msg = `El subproyecto "${p.name}" está reservado en CRIS. Puedes activarlo cuando lo desees.`;
    if (window.app && window.app.showToast) {
      window.app.showToast(msg, 'info');
    } else {
      alert(msg);
    }
  }

  openAddSubprojectModal() {
    const modal = document.getElementById('modal-add-cris-subproject');
    if (modal) {
      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  closeAddSubprojectModal() {
    const modal = document.getElementById('modal-add-cris-subproject');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  handleAddSubprojectSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('new-subproject-name');
    const catInput = document.getElementById('new-subproject-category');
    const descInput = document.getElementById('new-subproject-desc');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      alert('Por favor, escribe un nombre para el subproyecto.');
      return;
    }

    const id = 'sub_' + Date.now();
    const newSub = {
      id: id,
      name: name,
      category: catInput ? catInput.value.trim() || 'General' : 'General',
      subtitle: 'Subproyecto configurado en CRIS',
      description: descInput ? descInput.value.trim() : 'Espacio modular listo para conectar funcionalidades.',
      icon: 'folder-plus',
      color: 'indigo',
      badge: 'Definido',
      status: 'upcoming',
      route: null
    };

    this.saveCustomSubproject(newSub);
    this.closeAddSubprojectModal();

    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
  }

  // =========================================================================
  // RENDERIZADO PRINCIPAL DEL DASHBOARD CRIS (REDiseño Integral)
  // =========================================================================
  renderDashboard() {
    const container = document.getElementById('cris-hub-container');
    if (!container) return;

    const metrics = this.getEstudiosMetrics();
    const habits = this.getHabitTrackerData();
    const economia = this.getEconomiaMetrics();
    const menus = this.getMenusMetrics();
    const greeting = this.getGreeting();
    const dateStr = this.getFormattedDate();
    const quickNotes = this.getQuickNotes();

    container.innerHTML = `
      <!-- HERO MAESTRO CRIS: CENTRO DE MANDO INTEGRAL -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950 text-white p-7 md:p-10 shadow-2xl border border-slate-800/80">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-slate-200">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>PLATAFORMA CRIS • CENTRO DE MANDO</span>
            </div>
            
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white flex items-center gap-3">
              ${greeting}, Cris <span class="inline-block animate-wave">👋</span>
            </h1>
            
            <p class="text-slate-300 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
              Panel central unificado. Tus 4 subproyectos activos (<span class="text-purple-300 font-bold">Estudios</span>, <span class="text-cyan-300 font-bold">Habit Tracker</span>, <span class="text-emerald-300 font-bold">Gestión Económica</span> y <span class="text-amber-300 font-bold">Menús Semanales</span>) están listos para hoy <span class="font-extrabold text-white">${dateStr}</span>.
            </p>
          </div>

          <!-- Acceso Rápido a los 4 Subproyectos -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 flex-shrink-0">
            <button onclick="window.crisHub.navigateToModule('estudios')" class="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="graduation-cap" class="w-4 h-4"></i>
              <span>Estudios</span>
            </button>
            <button onclick="window.crisHub.navigateToModule('checklist')" class="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              <span>Habit Tracker</span>
            </button>
            <button onclick="window.crisHub.navigateToModule('economia')" class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="wallet" class="w-4 h-4"></i>
              <span>Economía</span>
            </button>
            <button onclick="window.crisHub.navigateToModule('menus')" class="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="utensils" class="w-4 h-4"></i>
              <span>Menús</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4 KPIS MAESTROS DE LOS 4 SUBPROYECTOS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- KPI 1: ESTUDIOS (Púrpura) -->
        <div onclick="window.crisHub.navigateToModule('estudios')" class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-purple-200/80 dark:border-purple-800/40 shadow-xs hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Subproyecto 1 • Académico</span>
            <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <i data-lucide="graduation-cap" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="text-2xl font-black text-slate-900 dark:text-white">${metrics.activeSubjects} Asignaturas</h3>
            <p class="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">Marketing FP + ADE UNED</p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span>Temas 1-9 Calificados</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">${metrics.marketingGradedTopics} notas</span>
            </div>
          </div>
        </div>

        <!-- KPI 2: HABIT TRACKER (Cian Glaciar) -->
        <div onclick="window.crisHub.navigateToModule('checklist')" class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-cyan-200/80 dark:border-cyan-800/40 shadow-xs hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Subproyecto 2 • Bienestar</span>
            <div class="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <div class="flex items-baseline justify-between">
              <h3 class="text-2xl font-black text-slate-900 dark:text-white">${habits.percent}%</h3>
              <span class="text-xs font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                🔥 ${habits.streak}d racha
              </span>
            </div>
            <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500" style="width: ${habits.percent}%"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span>Completados hoy</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">${habits.completedCount}/${habits.totalCount} hábitos</span>
            </div>
          </div>
        </div>

        <!-- KPI 3: GESTIÓN ECONÓMICA (Esmeralda) -->
        <div onclick="window.crisHub.navigateToModule('economia')" class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Subproyecto 3 • Finanzas</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <i data-lucide="wallet" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="text-2xl font-black ${economia.totalNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
              ${economia.totalNeto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Balance Neto Personal</p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span>1.1 Personal y 1.2 De Casa</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">${economia.tasaAhorro}% ahorro</span>
            </div>
          </div>
        </div>

        <!-- KPI 4: MENÚS SEMANALES (Ámbar) -->
        <div onclick="window.crisHub.navigateToModule('menus')" class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-amber-200/80 dark:border-amber-800/40 shadow-xs hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Subproyecto 4 • Hogar</span>
            <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <i data-lucide="utensils" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <h3 class="text-lg font-black text-slate-900 dark:text-white truncate">
              ${menus.lunch || 'Menú sin definir'}
            </h3>
            <p class="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5 truncate">Hoy (${menus.todayName}): ${menus.dinner ? 'Cena: ' + menus.dinner : 'Plan semanal listo'}</p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span>Recetario & Súper</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">${menus.recetasCount} recetas</span>
            </div>
          </div>
        </div>

      </div>

      <!-- SECCIÓN PRINCIPAL: HABIT TRACKER INTERACTIVO + GESTIÓN RESUMEN -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- COLUMNA IZQUIERDA: HABIT TRACKER HOY + BLOC DE NOTAS (7 de 12) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Widget Interactivo de Habit Tracker (Cian Glaciar) (Colapsable) -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-cyan-200/80 dark:border-cyan-800/40 shadow-sm space-y-4 transition-all">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                  <i data-lucide="check-circle-2" class="w-5 h-5 pointer-events-none"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Habit Tracker • Progreso de Hoy</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                      ${habits.completedCount}/${habits.totalCount}
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Marca tus hábitos directamente desde el Dashboard central</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="window.crisHub.navigateToModule('checklist', 'cuadro')" class="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1 cursor-pointer">
                  <span>Cuadro Semanal</span>
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5 pointer-events-none"></i>
                </button>
                <button type="button" onclick="window.toggleSection('cris-hub-habits-content', 'chevron-cris-hub-habits', 'hub_habits'); return false;" class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer" title="Comprimir / Desplegar Hábitos">
                  <i data-lucide="chevron-down" id="chevron-cris-hub-habits" class="w-4 h-4 transition-transform duration-200 pointer-events-none"></i>
                </button>
              </div>
            </div>

            <div id="cris-hub-habits-content" class="space-y-4 transition-all">
              <!-- Barra de Progreso Viva -->
              <div>
                <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  <span>Cumplimiento diario</span>
                  <span class="text-cyan-600 dark:text-cyan-400 font-extrabold">${habits.percent}%</span>
                </div>
                <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500" style="width: ${habits.percent}%"></div>
                </div>
              </div>

              <!-- Lista Interactiva de Hábitos con Checkbox -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                ${habits.habits.length === 0 ? `
                  <p class="text-xs text-slate-400 italic py-3 text-center col-span-2">No hay hábitos configurados aún.</p>
                ` : habits.habits.map(h => `
                  <div onclick="window.crisHub.toggleHabitFromDashboard('${h.id}')" class="group flex items-center gap-2.5 p-2.5 rounded-2xl transition cursor-pointer border ${h.completed ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200/70 dark:border-cyan-800/40' : 'bg-slate-50/70 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-700/60 hover:border-cyan-300 dark:hover:border-cyan-700'}">
                    <div class="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition flex-shrink-0 ${h.completed ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-slate-300 dark:border-slate-500 group-hover:border-cyan-500'}">
                      ${h.completed ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3] pointer-events-none"></i>' : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                      <span class="text-xs font-bold block truncate ${h.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}">
                        ${h.name}
                      </span>
                      ${h.goal ? `<span class="text-[10px] text-slate-400 block truncate">${h.goal}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Bloc de Notas Rápidas de Cris (Scratchpad con Autoguardado) (Colapsable) -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3 transition-all">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <i data-lucide="edit-3" class="w-4 h-4 pointer-events-none"></i>
                </div>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Bloc de Notas Rápidas de Cris</h3>
              </div>

              <div class="flex items-center gap-2">
                <span id="scratchpad-status" class="text-xs text-slate-400 dark:text-slate-500">Autoguardado</span>
                <button onclick="window.crisHub.clearQuickNotes()" title="Limpiar notas" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer text-xs">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                </button>
                <button type="button" onclick="window.toggleSection('cris-hub-scratchpad-content', 'chevron-cris-hub-scratchpad', 'hub_scratchpad'); return false;" class="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer" title="Comprimir / Desplegar Bloc de Notas">
                  <i data-lucide="chevron-down" id="chevron-cris-hub-scratchpad" class="w-4 h-4 transition-transform duration-200 pointer-events-none"></i>
                </button>
              </div>
            </div>

            <div id="cris-hub-scratchpad-content" class="transition-all">
              <textarea id="cris-scratchpad-input" oninput="window.crisHub.saveQuickNotes(this.value)" placeholder="Escribe aquí cualquier pensamiento, apunte urgente o idea del día... Se guarda automáticamente en tu navegador." rows="3" class="w-full bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-2xl p-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition leading-relaxed">${quickNotes}</textarea>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: RESUMEN EJECUTIVO DE SUBPROYECTOS (5 de 12) -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- Tarjeta Ejecutiva Estudios (Colapsable) -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-purple-200/80 dark:border-purple-800/40 shadow-sm space-y-4 transition-all">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <i data-lucide="graduation-cap" class="w-5 h-5 pointer-events-none"></i>
                </div>
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Subproyecto 1</span>
                  <h3 class="text-base font-black text-slate-900 dark:text-white leading-tight">Estudios</h3>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="window.crisHub.navigateToModule('estudios')" class="text-xs font-bold text-purple-600 hover:underline cursor-pointer">Abrir</button>
                <button type="button" onclick="window.toggleSection('cris-hub-estudios-exec-content', 'chevron-cris-hub-estudios-exec', 'hub_estudios_exec'); return false;" class="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer" title="Comprimir / Desplegar Resumen Estudios">
                  <i data-lucide="chevron-down" id="chevron-cris-hub-estudios-exec" class="w-4 h-4 transition-transform duration-200 pointer-events-none"></i>
                </button>
              </div>
            </div>

            <div id="cris-hub-estudios-exec-content" class="space-y-4 transition-all">
              <div class="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs space-y-2">
                <div class="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                  <span>Módulos Marketing FP</span>
                  <span class="text-purple-600 dark:text-purple-400 text-[11px]">Temas 1 al 9</span>
                </div>
                <div class="grid grid-cols-4 gap-1 text-[11px] font-bold text-center">
                  <span class="p-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40">DEMC</span>
                  <span class="p-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40">MSC</span>
                  <span class="p-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40">TCIC</span>
                  <span class="p-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40">SOST</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs font-bold">
                <a href="#mkt-grades" data-nav-target="mkt-grades" class="sidebar-nav-item py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 transition">
                  <i data-lucide="award" class="w-3.5 h-3.5"></i>
                  <span>Notas (1-9)</span>
                </a>
                <a href="#calendar" data-nav-target="calendar" class="sidebar-nav-item py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition">
                  <i data-lucide="calendar" class="w-3.5 h-3.5 text-purple-600"></i>
                  <span>Calendario</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Tarjeta Ejecutiva Gestión de Casa (Economía + Menús) (Colapsable) -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm space-y-4 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <i data-lucide="home" class="w-4 h-4 pointer-events-none"></i>
                </div>
                <div>
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Gestión de Casa</h3>
                  <p class="text-[11px] text-slate-400">Economía (1.1 y 1.2) & Menús Semanales</p>
                </div>
              </div>
              <button type="button" onclick="window.toggleSection('cris-hub-casa-exec-content', 'chevron-cris-hub-casa-exec', 'hub_casa_exec'); return false;" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer" title="Comprimir / Desplegar Gestión de Casa">
                <i data-lucide="chevron-down" id="chevron-cris-hub-casa-exec" class="w-4 h-4 transition-transform duration-200 pointer-events-none"></i>
              </button>
            </div>

            <div id="cris-hub-casa-exec-content" class="transition-all">
              <div class="grid grid-cols-2 gap-2 text-xs font-bold">
                <button onclick="window.crisHub.navigateToModule('economia')" class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300 flex flex-col items-start gap-1 hover:bg-emerald-100/50 transition cursor-pointer">
                  <div class="flex items-center gap-1.5">
                    <i data-lucide="wallet" class="w-4 h-4 pointer-events-none"></i>
                    <span>Economía</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-normal">Personal y Hogar</span>
                </button>

                <button onclick="window.crisHub.navigateToModule('menus')" class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 flex flex-col items-start gap-1 hover:bg-amber-100/50 transition cursor-pointer">
                  <div class="flex items-center gap-1.5">
                    <i data-lucide="utensils" class="w-4 h-4 pointer-events-none"></i>
                    <span>Menús</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-normal">Plan y Compras</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Sincronización Local v30 -->
          <div class="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
            <div class="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
              <span class="flex items-center gap-1.5">
                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-500"></i>
                <span>Sincronización Local Activa</span>
              </span>
              <span class="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">v30</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Tus hábitos, economía, menús y notas se guardan de forma privada en tu navegador.</p>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: ECOSISTEMA DE SUBPROYECTOS CRIS (CARDS LIMPIAS) -->
      <div class="space-y-4 pt-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">Ecosistema de Subproyectos CRIS</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Acceso rápido a cada área de la plataforma</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.crisHub.toggleDashboardSubprojectsView()" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer">
              <i data-lucide="${this.dashboardShowAllOptions ? 'minimize-2' : 'maximize-2'}" class="w-3.5 h-3.5 pointer-events-none"></i>
              <span>${this.dashboardShowAllOptions ? 'Comprimir opciones' : 'Mostrar opciones'}</span>
            </button>
            <button onclick="window.crisHub.openAddSubprojectModal()" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5 pointer-events-none"></i>
              <span>Nuevo</span>
            </button>
            <button type="button" onclick="window.toggleSection('cris-hub-ecosystem-grid', 'chevron-cris-hub-ecosystem', 'hub_ecosystem'); return false;" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-purple-600 transition cursor-pointer border border-slate-200 dark:border-slate-700" title="Comprimir / Desplegar Ecosistema">
              <i data-lucide="chevron-down" id="chevron-cris-hub-ecosystem" class="w-4 h-4 transition-transform duration-200 pointer-events-none"></i>
            </button>
          </div>
        </div>

        <div id="cris-hub-ecosystem-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all">
          ${this.renderSubprojectCards()}
        </div>
      </div>
    `;

    if (typeof window.initCollapsibleSection === 'function') {
      window.initCollapsibleSection('cris-hub-habits-content', 'chevron-cris-hub-habits', 'hub_habits');
      window.initCollapsibleSection('cris-hub-scratchpad-content', 'chevron-cris-hub-scratchpad', 'hub_scratchpad');
      window.initCollapsibleSection('cris-hub-estudios-exec-content', 'chevron-cris-hub-estudios-exec', 'hub_estudios_exec');
      window.initCollapsibleSection('cris-hub-casa-exec-content', 'chevron-cris-hub-casa-exec', 'hub_casa_exec');
      window.initCollapsibleSection('cris-hub-ecosystem-grid', 'chevron-cris-hub-ecosystem', 'hub_ecosystem');
    }

    if (window.app && window.app.setupNavigation) {
      window.app.setupNavigation();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Alias para retrocompatibilidad
  renderHub() {
    this.renderDashboard();
  }

  renderSubprojectCards() {
    return this.subprojects.map(p => {
      const isSubActive = p.status === 'active';
      const colorMap = {
        purple: {
          badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          btn: 'bg-purple-600 hover:bg-purple-700 text-white',
          border: 'border-purple-300 dark:border-purple-800/60'
        },
        cyan: {
          badge: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
          btn: 'bg-cyan-600 hover:bg-cyan-700 text-white',
          border: 'border-cyan-300 dark:border-cyan-800/60'
        },
        emerald: {
          badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          border: 'border-emerald-300 dark:border-emerald-800/60'
        },
        amber: {
          badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white',
          border: 'border-amber-300 dark:border-amber-800/60'
        },
        blue: {
          badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
          btn: 'bg-blue-600 text-white',
          border: 'border-slate-200 dark:border-slate-700'
        },
        indigo: {
          badge: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
          btn: 'bg-indigo-600 text-white',
          border: 'border-slate-200 dark:border-slate-700'
        }
      };

      const cTheme = colorMap[p.color] || colorMap.purple;

      return `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border ${isSubActive ? cTheme.border : 'border-slate-200 dark:border-slate-700'} shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl ${cTheme.btn} flex items-center justify-center shadow-sm">
                <i data-lucide="${p.icon || 'folder'}" class="w-5 h-5"></i>
              </div>
              <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cTheme.badge}">
                ${p.badge}
              </span>
            </div>

            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">${p.category}</span>
              <h4 class="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">${p.name}</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${p.description}</p>
            </div>

            ${isSubActive ? `
              <div class="pt-1">
                <button type="button" onclick="window.crisHub && window.crisHub.toggleCardOptions('${p.id}'); return false;" class="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer">
                  <span>${this.isCardOptionsOpen(p.id) ? 'Ocultar opciones' : 'Ver opciones'}</span>
                  <i data-lucide="${this.isCardOptionsOpen(p.id) ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            ` : ''}

            ${this.isCardOptionsOpen(p.id) && p.id === 'estudios' ? `
              <div class="pt-2 space-y-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold">
                <div class="grid grid-cols-2 gap-1">
                  <a href="#mkt-grades" data-nav-target="mkt-grades" class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-center">Notas (1-9)</a>
                  <a href="#calendar" data-nav-target="calendar" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-center">Calendario</a>
                  <a href="#schedule" data-nav-target="schedule" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-center">Horario</a>
                  <a href="#tfg" data-nav-target="tfg" class="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-center">TFG</a>
                </div>
              </div>
            ` : ''}

            ${this.isCardOptionsOpen(p.id) && p.id === 'checklist' ? `
              <div class="pt-2 space-y-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold">
                <a href="#checklist" data-nav-target="checklist" class="block p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-center">Cuadro Semanal</a>
              </div>
            ` : ''}

            ${this.isCardOptionsOpen(p.id) && p.id === 'economia' ? `
              <div class="pt-2 space-y-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold">
                <div class="grid grid-cols-2 gap-1">
                  <a href="#economia" onclick="if(window.economiaModule) window.economiaModule.setTab('personal');" class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-center">1.1 Personal</a>
                  <a href="#economia" onclick="if(window.economiaModule) window.economiaModule.setTab('casa');" class="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-center">1.2 De Casa</a>
                </div>
              </div>
            ` : ''}

            ${this.isCardOptionsOpen(p.id) && p.id === 'menus' ? `
              <div class="pt-2 space-y-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold">
                <div class="grid grid-cols-3 gap-1">
                  <a href="#menus" onclick="if(window.menusModule) window.menusModule.setTab('semanal');" class="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-center">Semanal</a>
                  <a href="#menus" onclick="if(window.menusModule) window.menusModule.setTab('recetas');" class="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-center">Recetas</a>
                  <a href="#menus" onclick="if(window.menusModule) window.menusModule.setTab('compra');" class="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-center">Compra</a>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="pt-4 mt-3 border-t border-slate-100 dark:border-slate-700/60">
            ${isSubActive ? `
              <button onclick="window.crisHub.navigateToModule('${p.id}')" class="w-full py-2 rounded-xl ${cTheme.btn} font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer">
                <span>Abrir ${p.name}</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            ` : `
              <button onclick="window.crisHub.showSubprojectInfo('${p.id}')" class="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>En Preparación</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Instanciar globalmente
window.crisHub = new CrisHubModule();
