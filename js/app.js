/**
 * StudyFlow - Main Application Controller
 * Manejo de navegación por pestañas, temas claro/oscuro, resumen del Dashboard y configuración.
 */

const MOTIVATIONAL_QUOTES = [
  { text: "La constancia no hace milagros, pero construye genios.", author: "Anónimo" },
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { text: "No tienes que ser grande para empezar, pero tienes que empezar para ser grande.", author: "Zig Ziglar" },
  { text: "La disciplina es el puente indispensable entre tus metas y tus logros.", author: "Jim Rohn" },
  { text: "Estudiar dos titulaciones demuestra ambición y capacidad. Cada hora de enfoque suma para tu futuro.", author: "StudyFlow" },
  { text: "Organizar tu tiempo con método es regalarte tranquilidad y libertad futura.", author: "Anónimo" },
  { text: "No cuentes los días, haz que cada día cuente.", author: "Muhammad Ali" },
  { text: "El secreto de avanzar radica simplemente en comenzar. Divide los retos en pasos diarios.", author: "Mark Twain" },
  { text: "La excelencia no es un acto aislado, sino un hábito que se cultiva día a día.", author: "Aristóteles" },
  { text: "Tu mejor inversión es el conocimiento y la dedicación que aplicas hoy.", author: "Benjamin Franklin" },
  { text: "Confía en el proceso. La perseverancia vence lo que la dicha no alcanza.", author: "Séneca" },
  { text: "El futuro pertenece a quienes creen en sus capacidades y trabajan con foco en ellas.", author: "StudyFlow" }
];

class App {
  constructor() {
    const rawHash = (typeof window !== 'undefined' && window.location && window.location.hash) ? window.location.hash.replace('#', '') : '';
    this.currentView = rawHash || 'cris-hub';
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupStudySwitcher();
    this.setupDashboardSummary();
    this.setupMotivationalQuote();
    this.setupSettingsAndBackup();
    this.setupModalsDismiss();
    this.setupAutoUpdater();

    // Inicializar navegación hacia la vista activa
    this.navigateTo(this.currentView);

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (h && h !== this.currentView) {
          this.navigateTo(h);
        }
      });
    }

    if (window.lucide) window.lucide.createIcons();

    window.addEventListener('studyflow:change', () => {
      this.updateStudySwitcher();
      this.setupDashboardSummary();
      if ((this.currentView === 'cris-hub' || this.currentView === 'cris-dashboard') && window.crisHub) {
        if (window.crisHub.renderDashboard) {
          window.crisHub.renderDashboard();
        } else if (window.crisHub.renderHub) {
          window.crisHub.renderHub();
        }
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  setupStudySwitcher() {
    const switcherBtns = document.querySelectorAll('[data-study-filter]');
    switcherBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-study-filter');
        window.studyStore.setActiveStudyFilter(val);
        this.updateStudySwitcher();
      });
    });

    this.updateStudySwitcher();
  }

  updateStudySwitcher() {
    const current = window.studyStore.getActiveStudyFilter();
    const switcherBtns = document.querySelectorAll('[data-study-filter]');
    switcherBtns.forEach(btn => {
      const val = btn.getAttribute('data-study-filter');
      if (val === current) {
        btn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
      } else {
        btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
      }
    });

    // Proyecto TFG: Exclusivo de Marketing FP (oculto en "Todos" y en "ADE")
    const tfgLinks = document.querySelectorAll('[data-nav-target="tfg"]');
    tfgLinks.forEach(tfgLink => {
      if (current === 'marketing') {
        tfgLink.classList.remove('hidden');
      } else {
        tfgLink.classList.add('hidden');
        if (this.currentView === 'tfg') {
          this.navigateTo('dashboard');
        }
      }
    });

    // Notas Marketing (Temas 1-9): Exclusivo de Marketing FP
    const mktGradesLinks = document.querySelectorAll('[data-nav-target="mkt-grades"]');
    mktGradesLinks.forEach(mktGradesLink => {
      if (current === 'marketing') {
        mktGradesLink.classList.remove('hidden');
      } else {
        mktGradesLink.classList.add('hidden');
        if (this.currentView === 'mkt-grades') {
          this.navigateTo('dashboard');
        }
      }
    });
  }

  // --- NAVEGACIÓN ---
  setupNavigation() {
    const navLinks = document.querySelectorAll('[data-nav-target]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.tagName === 'BUTTON' && link.id && link.id.includes('toggle')) return;
        e.preventDefault();
        const target = link.getAttribute('data-nav-target');
        const checklistTab = link.getAttribute('data-checklist-tab') || link.getAttribute('data-checklist-mode');
        const economiaTab = link.getAttribute('data-economia-tab');
        const menusTab = link.getAttribute('data-menus-tab');
        this.navigateTo(target, checklistTab || economiaTab || menusTab);
      });
    });

    // Botones de la barra de navegación inferior móvil
    const mobileNavBtns = document.querySelectorAll('[data-mobile-nav]');
    mobileNavBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-mobile-nav');
        this.navigateTo(target);
      });
    });
  }

  navigateTo(viewId, subParam) {
    if (viewId === 'cris-dashboard') {
      viewId = 'cris-hub';
    }

    if (viewId === 'tfg' || viewId === 'mkt-grades') {
      const current = window.studyStore.getActiveStudyFilter();
      if (current !== 'marketing') {
        this.navigateTo('dashboard');
        return;
      }
    }

    this.currentView = viewId;
    try {
      if (typeof window !== 'undefined' && window.location && window.location.hash !== `#${viewId}`) {
        window.location.hash = viewId;
      }
    } catch (e) {}

    // Actualizar botones de la barra superior global CRIS
    const btnCrisHub = document.getElementById('btn-cris-hub');
    const btnCrisEstudios = document.getElementById('btn-cris-estudios');
    const btnCrisEconomia = document.getElementById('btn-cris-economia');
    const btnCrisMenus = document.getElementById('btn-cris-menus');
    const btnCrisChecklist = document.getElementById('btn-cris-checklist');
    const studyFilterBar = document.getElementById('study-filter-bar');

    // Resetear estilos de todos los botones de la barra superior
    [btnCrisHub, btnCrisEstudios, btnCrisEconomia, btnCrisMenus, btnCrisChecklist].forEach(btn => {
      if (btn) {
        btn.classList.remove('bg-purple-600', 'bg-emerald-600', 'bg-amber-600', 'bg-cyan-600', 'text-white', 'shadow-sm', 'font-bold');
        btn.classList.add('text-slate-300', 'hover:bg-slate-700');
      }
    });

    if (viewId === 'cris-hub') {
      if (btnCrisHub) {
        btnCrisHub.classList.add('bg-purple-600', 'text-white', 'shadow-sm', 'font-bold');
        btnCrisHub.classList.remove('text-slate-300', 'hover:bg-slate-700');
      }
      if (studyFilterBar) studyFilterBar.classList.add('hidden');
      if (window.crisHub) {
        if (window.crisHub.renderDashboard) {
          window.crisHub.renderDashboard();
        } else if (window.crisHub.renderHub) {
          window.crisHub.renderHub();
        }
      }
    } else if (viewId === 'economia') {
      if (btnCrisEconomia) {
        btnCrisEconomia.classList.add('bg-emerald-600', 'text-white', 'shadow-sm', 'font-bold');
        btnCrisEconomia.classList.remove('text-slate-300', 'hover:bg-slate-700');
      }
      if (studyFilterBar) studyFilterBar.classList.add('hidden');
      if (window.economiaModule) {
        if (subParam) {
          window.economiaModule.setTab(subParam);
        }
        if (window.economiaModule.render) {
          window.economiaModule.render();
        }
      }
    } else if (viewId === 'menus') {
      if (btnCrisMenus) {
        btnCrisMenus.classList.add('bg-amber-600', 'text-white', 'shadow-sm', 'font-bold');
        btnCrisMenus.classList.remove('text-slate-300', 'hover:bg-slate-700');
      }
      if (studyFilterBar) studyFilterBar.classList.add('hidden');
      if (window.menusModule) {
        if (subParam) {
          window.menusModule.setTab(subParam);
        }
        if (window.menusModule.render) {
          window.menusModule.render();
        }
      }
    } else if (viewId === 'checklist') {
      if (btnCrisChecklist) {
        btnCrisChecklist.classList.add('bg-cyan-600', 'text-white', 'shadow-sm', 'font-bold');
        btnCrisChecklist.classList.remove('text-slate-300', 'hover:bg-slate-700');
      }
      if (studyFilterBar) studyFilterBar.classList.add('hidden');
      if (window.habitTrackerModule) {
        if (subParam) {
          window.habitTrackerModule.setTab(subParam);
        }
        if (window.habitTrackerModule.render) {
          window.habitTrackerModule.render();
        }
      } else if (window.checklistModule && window.checklistModule.render) {
        window.checklistModule.render();
      }
    } else {
      if (btnCrisEstudios) {
        btnCrisEstudios.classList.add('bg-purple-600', 'text-white', 'shadow-sm', 'font-bold');
        btnCrisEstudios.classList.remove('text-slate-300', 'hover:bg-slate-700');
      }
      if (studyFilterBar) studyFilterBar.classList.remove('hidden');
    }

    // Actualizar texto del selector desplegable de subproyectos (Topbar)
    const activeSubprojectLabel = document.getElementById('dropdown-active-subproject-name');
    if (activeSubprojectLabel) {
      if (viewId === 'cris-hub') {
        activeSubprojectLabel.textContent = 'CRIS: Dashboard';
      } else if (viewId === 'economia') {
        activeSubprojectLabel.textContent = 'CRIS: Gestión Económica';
      } else if (viewId === 'menus') {
        activeSubprojectLabel.textContent = 'CRIS: Menús Semanales';
      } else if (viewId === 'checklist') {
        activeSubprojectLabel.textContent = 'CRIS: Habit Tracker';
      } else {
        activeSubprojectLabel.textContent = 'CRIS: Estudios';
      }
    }

    if (typeof window.closeSubprojectsDropdown === 'function') {
      window.closeSubprojectsDropdown();
    }

    // Expandir automáticamente el subproyecto correspondiente solo si no está colapsado por preferencia del usuario
    if (window.crisHub && window.crisHub.expandSubproject) {
      try {
        if (['dashboard', 'subjects', 'calendar', 'schedule', 'curriculum', 'tfg', 'mkt-grades', 'tasks', 'pomodoro', 'notes'].includes(viewId)) {
          if (localStorage.getItem('cris_sub_estudios_collapsed') !== 'true') {
            window.crisHub.expandSubproject('estudios');
          }
        } else if (viewId === 'economia') {
          if (localStorage.getItem('cris_sub_economia_collapsed') !== 'true') {
            window.crisHub.expandSubproject('economia');
          }
        } else if (viewId === 'menus') {
          if (localStorage.getItem('cris_sub_menus_collapsed') !== 'true') {
            window.crisHub.expandSubproject('menus');
          }
        } else if (viewId === 'checklist') {
          if (localStorage.getItem('cris_sub_checklist_collapsed') !== 'true') {
            window.crisHub.expandSubproject('checklist');
          }
        }
      } catch (e) {}
    }

    // Actualizar resaltado activo en la barra lateral y barras móviles
    this.updateSidebarActiveState();
    this.updateMobileNavActiveState(viewId);
    this.updateMobileSubnavActiveState(viewId);

    // Mostrar sección correspondiente y ocultar las demás
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => {
      if (sec.id === `view-${viewId}`) {
        sec.classList.remove('hidden');
        sec.style.display = 'block';
      } else {
        sec.classList.add('hidden');
        sec.style.display = 'none';
      }
    });

    // Desplazar suavemente arriba
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Actualizar iconos de Lucide si procede
    if (window.lucide) window.lucide.createIcons();
  }

  updateMobileNavActiveState(viewId) {
    const mobileTabs = document.querySelectorAll('.cris-mob-tab[data-mobile-nav]');
    if (!mobileTabs.length) return;

    let targetTab = viewId;
    const isEstudios = ['dashboard', 'subjects', 'calendar', 'schedule', 'curriculum', 'tfg', 'mkt-grades', 'tasks', 'pomodoro', 'notes'].includes(viewId);
    if (isEstudios) {
      targetTab = 'dashboard';
    } else if (viewId === 'cris-dashboard') {
      targetTab = 'cris-hub';
    }

    mobileTabs.forEach(tab => {
      const tabTarget = tab.getAttribute('data-mobile-nav');
      if (tabTarget === targetTab) {
        tab.classList.add('active');
        tab.classList.remove('text-slate-400');
        if (targetTab === 'checklist') {
          tab.classList.add('text-cyan-400');
        } else if (targetTab === 'economia') {
          tab.classList.add('text-emerald-400');
        } else if (targetTab === 'menus') {
          tab.classList.add('text-amber-400');
        } else {
          tab.classList.add('text-purple-400');
        }
      } else {
        tab.classList.remove('active', 'text-purple-400', 'text-cyan-400', 'text-emerald-400', 'text-amber-400');
        tab.classList.add('text-slate-400');
      }
    });
  }

  updateMobileSubnavActiveState(viewId) {
    const subnavBtns = document.querySelectorAll('.study-mobile-subnav[data-nav-target]');
    if (!subnavBtns.length) return;

    subnavBtns.forEach(btn => {
      const target = btn.getAttribute('data-nav-target');
      if (target === viewId) {
        btn.classList.add('bg-purple-600', 'text-white', 'shadow-xs');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
        try {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
      } else {
        btn.classList.remove('bg-purple-600', 'text-white', 'shadow-xs');
        btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
      }
    });
  }

  // --- AUTO-UPDATER & AUTO-RELOAD ENGINE ---
  setupAutoUpdater() {
    this.currentVersionHash = 'cris-v44-2fa-enforce';
    this._isUpdating = false;

    // Obtener versión activa del servidor inmediatamente
    this.fetchCurrentVersion();

    // Verificación periódica cada 25 segundos
    setInterval(() => this.checkServerVersion(), 25000);

    // Verificación inmediata al volver a la pestaña o desbloquear el móvil
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkServerVersion();
        }
      });
    }

    // Verificación en eventos de foco y reconexión a Internet
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.checkServerVersion());
      window.addEventListener('online', () => this.checkServerVersion());
    }
  }

  async fetchCurrentVersion() {
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.hash) {
          this.currentVersionHash = data.hash;
        }
      }
    } catch (e) {}
  }

  async checkServerVersion() {
    if (this._isUpdating) return;
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.hash) return;

      if (this.currentVersionHash && data.hash !== this.currentVersionHash) {
        this.performAutoReload(data);
      } else {
        this.currentVersionHash = data.hash;
      }
    } catch (e) {}
  }

  performAutoReload(newVersionData) {
    if (this._isUpdating) return;
    this._isUpdating = true;

    // Si el usuario está escribiendo en un formulario, esperar un momento
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    const delay = isTyping ? 3000 : 700;

    let toast = document.getElementById('cris-reload-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cris-reload-toast';
      toast.className = 'fixed top-4 left-1/2 z-[10000] bg-slate-900/95 text-white border border-purple-500/70 shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-2.5 backdrop-blur-xl pointer-events-none text-xs font-bold';
      toast.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
        <i data-lucide="refresh-cw" class="w-4 h-4 text-purple-300 animate-spin"></i>
        <span>Nueva versión lista (${newVersionData.version || 'actualizada'}). Actualizando...</span>
      `;
      document.body.appendChild(toast);
      if (window.lucide) window.lucide.createIcons();
    }

    setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now());
        window.location.replace(url.toString());
      } catch (e) {
        window.location.reload(true);
      }
    }, delay);
  }

  updateSidebarActiveState() {
    const viewId = this.currentView;
    const navLinks = document.querySelectorAll('.sidebar-nav-item[data-nav-target]');
    const activeChecklistTab = (window.habitTrackerModule && window.habitTrackerModule.currentTab) || 'dashboard';
    const activeEconomiaTab = (window.economiaModule && window.economiaModule.currentTab) || 'dashboard';
    const activeMenusTab = (window.menusModule && window.menusModule.currentTab) || 'dashboard';

    navLinks.forEach(link => {
      const target = link.getAttribute('data-nav-target');
      const checklistTab = link.getAttribute('data-checklist-tab') || link.getAttribute('data-checklist-mode');
      const economiaTab = link.getAttribute('data-economia-tab');
      const menusTab = link.getAttribute('data-menus-tab');

      // Limpiar clases activas previas
      link.classList.remove(
        'bg-purple-100', 'dark:bg-purple-950/60', 'text-purple-700', 'dark:text-purple-300', 'font-bold',
        'bg-cyan-100', 'dark:bg-cyan-950/60', 'text-cyan-700', 'dark:text-cyan-300',
        'bg-emerald-100', 'dark:bg-emerald-950/60', 'text-emerald-700', 'dark:text-emerald-300',
        'bg-amber-100', 'dark:bg-amber-950/60', 'text-amber-700', 'dark:text-amber-300'
      );
      link.classList.add('text-slate-600', 'dark:text-slate-400');

      if (target === viewId) {
        if (viewId === 'checklist') {
          if (!checklistTab || checklistTab === activeChecklistTab) {
            link.classList.add('bg-cyan-100', 'dark:bg-cyan-950/60', 'text-cyan-700', 'dark:text-cyan-300', 'font-bold');
            link.classList.remove('text-slate-600', 'dark:text-slate-400');
          }
        } else if (viewId === 'economia') {
          if (!economiaTab || economiaTab === activeEconomiaTab) {
            link.classList.add('bg-emerald-100', 'dark:bg-emerald-950/60', 'text-emerald-700', 'dark:text-emerald-300', 'font-bold');
            link.classList.remove('text-slate-600', 'dark:text-slate-400');
          }
        } else if (viewId === 'menus') {
          if (!menusTab || menusTab === activeMenusTab) {
            link.classList.add('bg-amber-100', 'dark:bg-amber-950/60', 'text-amber-700', 'dark:text-amber-300', 'font-bold');
            link.classList.remove('text-slate-600', 'dark:text-slate-400');
          }
        } else {
          link.classList.add('bg-purple-100', 'dark:bg-purple-950/60', 'text-purple-700', 'dark:text-purple-300', 'font-bold');
          link.classList.remove('text-slate-600', 'dark:text-slate-400');
        }
      }
    });

    // Anillo sutil indicador en la tarjeta del subproyecto activo
    const cardEstudios = document.getElementById('card-subproject-estudios');
    const cardChecklist = document.getElementById('card-subproject-checklist');
    const cardEconomia = document.getElementById('card-subproject-economia');
    const cardMenus = document.getElementById('card-subproject-menus');

    const isEstudios = ['dashboard', 'subjects', 'calendar', 'schedule', 'curriculum', 'tfg', 'mkt-grades', 'tasks', 'pomodoro', 'notes'].includes(viewId);
    const isChecklist = viewId === 'checklist';
    const isEconomia = viewId === 'economia';
    const isMenus = viewId === 'menus';

    if (cardEstudios) {
      if (isEstudios) {
        cardEstudios.classList.add('ring-2', 'ring-purple-500/50');
      } else {
        cardEstudios.classList.remove('ring-2', 'ring-purple-500/50');
      }
    }
    if (cardChecklist) {
      if (isChecklist) {
        cardChecklist.classList.add('ring-2', 'ring-cyan-500/50');
      } else {
        cardChecklist.classList.remove('ring-2', 'ring-cyan-500/50');
        cardChecklist.classList.remove('ring-2', 'ring-emerald-500/50');
      }
    }
    if (cardEconomia) {
      if (isEconomia) {
        cardEconomia.classList.add('ring-2', 'ring-emerald-500/50');
      } else {
        cardEconomia.classList.remove('ring-2', 'ring-emerald-500/50');
      }
    }
    if (cardMenus) {
      if (isMenus) {
        cardMenus.classList.add('ring-2', 'ring-amber-500/50');
      } else {
        cardMenus.classList.remove('ring-2', 'ring-amber-500/50');
      }
    }
  }

  filterBySubject(subjectId) {
    this.navigateTo('tasks');
    const filterSub = document.getElementById('filter-task-subject');
    if (filterSub) {
      filterSub.value = subjectId;
      window.tasksModule.filterSubject = subjectId;
      window.tasksModule.render();
    }
  }

  // --- RESUMEN DEL DASHBOARD ---
  setupDashboardSummary() {
    const todayTasksContainer = document.getElementById('dashboard-today-tasks');
    const upcomingExamsContainer = document.getElementById('dashboard-upcoming-exams');
    const todayStr = window.getLocalDateString(new Date());

    const tasks = window.studyStore.getTasks();
    const exams = window.studyStore.getExams();
    const subjects = window.studyStore.getSubjects();
    const activeFilter = window.studyStore.getActiveStudyFilter();

    // Filtrar botones de acceso directo a campus oficiales
    const btnUned = document.querySelector('a[title*="UNED"]');
    const btnEducamos = document.querySelector('a[title*="EducamosCLM"]');
    const btnIntecca = document.querySelector('a[title*="INTECCA"]');

    if (btnUned && btnEducamos && btnIntecca) {
      if (activeFilter === 'ade') {
        btnUned.classList.remove('hidden');
        btnIntecca.classList.remove('hidden');
        btnEducamos.classList.add('hidden');
      } else if (activeFilter === 'marketing') {
        btnUned.classList.add('hidden');
        btnIntecca.classList.add('hidden');
        btnEducamos.classList.remove('hidden');
      } else {
        btnUned.classList.remove('hidden');
        btnIntecca.classList.remove('hidden');
        btnEducamos.classList.remove('hidden');
      }
    }

    // Aviso de rutina diaria de estudio (Plan Diario: A partir del 1 de octubre)
    const scheduleNoticeEl = document.getElementById('dashboard-study-routine-notice');
    const planBadgeCard = document.getElementById('dashboard-plan-badge-card');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oct1 = new Date(today.getFullYear(), 9, 1); // 1 de octubre (mes 9 en JS)
    const diffTime = oct1 - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      // Periodo previo al 1 de octubre
      if (scheduleNoticeEl) {
        scheduleNoticeEl.innerHTML = `
          <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-purple-100">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
            <div>
              <span class="font-bold text-white text-xs">Plan diario de estudio: activo a partir del 1 de octubre</span>
              <p class="text-[11px] text-purple-200 mt-0.5 leading-relaxed">Faltan <strong>${diffDays} días</strong> para activar las jornadas lectivas de estudio (L-J hasta las 21:00). Hasta entonces, periodo preparatorio y de organización.</p>
            </div>
          </div>
        `;
      }
      if (planBadgeCard) {
        planBadgeCard.innerHTML = `
          <span class="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">Inicio Plan</span>
          <span class="text-2xl font-black text-white mt-0.5 block">1 OCT</span>
          <span class="text-[10px] text-purple-200 block">Faltan ${diffDays} días</span>
        `;
      }
    } else {
      // A partir del 1 de octubre: Jornadas en vigor
      const todayIndex = new Date().getDay(); // 1=lun, 2=mar, 3=mie, 4=jue
      if (scheduleNoticeEl) {
        if (todayIndex === 1 || todayIndex === 4) {
          scheduleNoticeEl.innerHTML = `
            <div class="flex items-center gap-2 text-xs font-bold text-purple-200 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Hoy tu sesión de estudio es de <strong>18:15 a 21:00</strong> (2h 45m de enfoque).</span>
            </div>
          `;
        } else if (todayIndex === 2 || todayIndex === 3) {
          scheduleNoticeEl.innerHTML = `
            <div class="flex items-center gap-2 text-xs font-bold text-purple-200 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Hoy tu sesión de estudio es de <strong>18:45 a 21:00</strong> (2h 15m de enfoque).</span>
            </div>
          `;
        } else {
          scheduleNoticeEl.innerHTML = `
            <div class="flex items-center gap-2 text-xs font-medium text-purple-200/90 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-300"></i>
              <span>Sin jornada fija de tarde. ¡Buen momento para descansar o repasar a tu ritmo!</span>
            </div>
          `;
        }
      }
      if (planBadgeCard) {
        planBadgeCard.innerHTML = `
          <span class="text-[11px] font-bold text-emerald-300 block uppercase tracking-wider">Plan Activo</span>
          <span class="text-2xl font-black text-white mt-0.5 block">L - J</span>
          <span class="text-[10px] text-purple-200/80 block">Hasta las 21:00</span>
        `;
      }
    }

    // Tareas pendientes urgentes o para hoy
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const urgentTasks = pendingTasks.slice(0, 4);

    if (todayTasksContainer) {
      if (urgentTasks.length === 0) {
        todayTasksContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs">
            <i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-emerald-500"></i>
            ¡Todo al día! No tienes tareas pendientes.
          </div>
        `;
      } else {
        todayTasksContainer.innerHTML = urgentTasks.map(t => {
          const sub = subjects.find(s => s.id === t.subjectId);
          return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <div class="flex items-center gap-3">
                <button onclick="window.tasksModule.toggleDone('${t.id}')" class="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 hover:border-blue-500 flex items-center justify-center transition">
                </button>
                <div>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-100">${this.escapeHtml(t.title)}</span>
                  <div class="flex items-center gap-2 mt-0.5">
                    ${sub ? `<span class="text-[10px] font-medium" style="color: ${sub.color}">${this.escapeHtml(sub.name)}</span>` : ''}
                    ${t.dueDate ? `<span class="text-[10px] text-slate-400">Entrega: ${t.dueDate}</span>` : ''}
                  </div>
                </div>
              </div>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${t.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}">
                ${t.priority === 'high' ? 'Urgente' : t.priority}
              </span>
            </div>
          `;
        }).join('');
      }
    }

    // Próximos exámenes en dashboard
    if (upcomingExamsContainer) {
      const nextExams = exams.filter(e => e.date >= todayStr).slice(0, 3);
      if (nextExams.length === 0) {
        upcomingExamsContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs">
            <i data-lucide="calendar" class="w-8 h-8 mx-auto mb-2 text-blue-400"></i>
            No hay exámenes próximos a la vista.
          </div>
        `;
      } else {
        upcomingExamsContainer.innerHTML = nextExams.map(e => {
          const sub = subjects.find(s => s.id === e.subjectId);
          const diffDays = Math.ceil((new Date(e.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
          return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-100">${this.escapeHtml(e.title)}</span>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  ${sub ? `<span style="color: ${sub.color}" class="font-medium">${this.escapeHtml(sub.name)}</span> • ` : ''}${e.date}
                </div>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${diffDays <= 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}">
                ${diffDays === 0 ? '¡HOY!' : diffDays === 1 ? 'Mañana' : `En ${diffDays}d`}
              </span>
            </div>
          `;
        }).join('');
      }
    }

    // Re-renderizar mini-calendario si el módulo está disponible
    if (window.calendarModule && typeof window.calendarModule.renderMiniCalendar === 'function') {
      window.calendarModule.renderMiniCalendar();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  setupMotivationalQuote() {
    this.nextMotivationalQuote();
  }

  nextMotivationalQuote() {
    const quoteEl = document.getElementById('motivational-quote');
    const authorEl = document.getElementById('motivational-author');
    if (!quoteEl) return;

    if (this._currentQuoteIndex === undefined) {
      this._currentQuoteIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    } else {
      this._currentQuoteIndex = (this._currentQuoteIndex + 1) % MOTIVATIONAL_QUOTES.length;
    }

    const quote = MOTIVATIONAL_QUOTES[this._currentQuoteIndex];
    quoteEl.textContent = `"${quote.text}"`;
    if (authorEl) authorEl.textContent = `— ${quote.author}`;

    // Animación suave de transición de opacidad
    quoteEl.classList.remove('opacity-100');
    quoteEl.classList.add('opacity-70');
    setTimeout(() => {
      quoteEl.classList.remove('opacity-70');
      quoteEl.classList.add('opacity-100');
    }, 120);

    if (window.lucide) window.lucide.createIcons();
  }

  // --- TEMA CLARO / OSCURO ---
  setupTheme() {
    const themeBtn = document.getElementById('btn-toggle-theme');
    const themeBtnGlobal = document.getElementById('btn-toggle-theme-global');
    const isDark = localStorage.getItem('studyflow_theme') === 'dark' ||
      (!('studyflow_theme' in localStorage) && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const toggleFn = () => {
      const currentlyDark = document.documentElement.classList.contains('dark');
      if (currentlyDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('studyflow_theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('studyflow_theme', 'dark');
      }
      if (window.statsModule) window.statsModule.renderChart();
    };

    if (themeBtn) themeBtn.addEventListener('click', toggleFn);
    if (themeBtnGlobal) themeBtnGlobal.addEventListener('click', toggleFn);
  }

  // --- AJUSTES Y COPIAS DE SEGURIDAD ---
  setupSettingsAndBackup() {
    const btnSettings = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('modal-settings');
    const formSettings = document.getElementById('form-settings');
    const btnExport = document.getElementById('btn-export-data');
    const fileImport = document.getElementById('file-import-data');
    const btnReset = document.getElementById('btn-reset-demo');

    if (btnSettings && modalSettings) {
      btnSettings.addEventListener('click', () => {
        const s = window.studyStore.getSettings();
        document.getElementById('setting-name').value = s.userName || 'Estudiante';
        document.getElementById('setting-work-time').value = s.pomodoroWorkTime || 25;
        document.getElementById('setting-short-break').value = s.pomodoroShortBreak || 5;
        document.getElementById('setting-long-break').value = s.pomodoroLongBreak || 15;
        document.getElementById('setting-sound').checked = s.soundEnabled !== false;

        modalSettings.classList.remove('hidden');
        modalSettings.classList.add('flex');
      });
    }

    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = document.getElementById('setting-name').value.trim();
        const pomodoroWorkTime = parseInt(document.getElementById('setting-work-time').value) || 25;
        const pomodoroShortBreak = parseInt(document.getElementById('setting-short-break').value) || 5;
        const pomodoroLongBreak = parseInt(document.getElementById('setting-long-break').value) || 15;
        const soundEnabled = document.getElementById('setting-sound').checked;

        window.studyStore.saveSettings({
          userName,
          pomodoroWorkTime,
          pomodoroShortBreak,
          pomodoroLongBreak,
          soundEnabled
        });

        // Actualizar saludo
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) greetingEl.textContent = `¡Hola, ${userName}!`;

        modalSettings.classList.add('hidden');
        modalSettings.classList.remove('flex');
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.studyStore.exportBackup();
      });
    }

    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = window.studyStore.importBackup(event.target.result);
          if (res.success) {
            alert('¡Copia de seguridad restaurada correctamente!');
            location.reload();
          } else {
            alert('Error: ' + res.error);
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('¿Restablecer datos a la versión de demostración? Perderás cambios no exportados.')) {
          window.studyStore.resetToDemo();
          location.reload();
        }
      });
    }
  }

  setupModalsDismiss() {
    // Cerrar modales haciendo clic en botones de cancelar o en el fondo oscuro
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        }
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
  });
} else {
  window.app = new App();
}
