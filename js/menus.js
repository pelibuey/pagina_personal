/**
 * CRIS Platform - Subproyecto Menús Semanales (js/menus.js)
 * Módulo independiente de Planificación de Comidas, Recetario y Lista de la Compra.
 * 
 * Inicia 100% limpio sin datos inventados.
 */

class MenusModule {
  constructor() {
    this.storageKey = 'cris_menus_data_v1';
    this.currentTab = 'dashboard'; // 'dashboard' | 'semanal' | 'recetas' | 'compra'
    this.daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    this.data = this.loadData();
    this.init();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const menu = parsed.menuSemanal || {};
        const safeMenu = {};
        this.daysOfWeek.forEach(day => {
          safeMenu[day] = {
            almuerzo: menu[day]?.almuerzo || '',
            cena: menu[day]?.cena || ''
          };
        });

        return {
          menuSemanal: safeMenu,
          recetas: Array.isArray(parsed.recetas) ? parsed.recetas : [],
          listaCompra: Array.isArray(parsed.listaCompra) ? parsed.listaCompra : []
        };
      }
    } catch (e) {
      console.error('Error cargando datos de menús:', e);
    }

    const defaultMenu = {};
    this.daysOfWeek.forEach(day => {
      defaultMenu[day] = { almuerzo: '', cena: '' };
    });

    return {
      menuSemanal: defaultMenu,
      recetas: [],
      listaCompra: []
    };
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      window.dispatchEvent(new CustomEvent('studyflow:change'));
    } catch (e) {
      console.error('Error guardando datos de menús:', e);
    }
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      if (window.app && window.app.currentView === 'menus') {
        this.render();
      }
    });
  }

  setTab(tab) {
    if (!['dashboard', 'semanal', 'recetas', 'compra'].includes(tab)) return;
    this.currentTab = tab;
    this.render();
  }

  // ==========================================
  // MÉTODOS: PLAN SEMANAL
  // ==========================================
  updateDayMenu(day, almuerzo, cena) {
    if (!this.data.menuSemanal[day]) {
      this.data.menuSemanal[day] = {};
    }
    this.data.menuSemanal[day].almuerzo = (almuerzo || '').trim();
    this.data.menuSemanal[day].cena = (cena || '').trim();
    this.saveData();
    this.render();
  }

  clearDayMenu(day) {
    if (this.data.menuSemanal[day]) {
      this.data.menuSemanal[day] = { almuerzo: '', cena: '' };
      this.saveData();
      this.render();
    }
  }

  clearWeeklyMenu() {
    if (confirm('¿Deseas vaciar toda la planificación de menús de la semana?')) {
      this.daysOfWeek.forEach(day => {
        this.data.menuSemanal[day] = { almuerzo: '', cena: '' };
      });
      this.saveData();
      this.render();
    }
  }

  // ==========================================
  // MÉTODOS: RECETARIO
  // ==========================================
  addReceta(nombre, tiempo, ingredientes, pasos, categoria = 'Principal') {
    if (!nombre || !nombre.trim()) return false;

    // Ingredientes puede ser un string separado por comas o saltos de línea, o un array
    let ingArray = [];
    if (Array.isArray(ingredientes)) {
      ingArray = ingredientes;
    } else if (typeof ingredientes === 'string') {
      ingArray = ingredientes
        .split('\n')
        .map(i => i.trim())
        .filter(i => i.length > 0);
    }

    this.data.recetas.unshift({
      id: 'rec_' + Date.now(),
      nombre: nombre.trim(),
      tiempo: tiempo ? tiempo.trim() : '20 min',
      categoria: categoria || 'Principal',
      ingredientes: ingArray,
      pasos: pasos ? pasos.trim() : ''
    });

    this.saveData();
    this.render();
    return true;
  }

  deleteReceta(id) {
    this.data.recetas = this.data.recetas.filter(r => r.id !== id);
    this.saveData();
    this.render();
  }

  addRecetaToShoppingList(recetaId) {
    const receta = this.data.recetas.find(r => r.id === recetaId);
    if (!receta || !receta.ingredientes || receta.ingredientes.length === 0) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Esta receta no tiene ingredientes definidos.', 'info');
      }
      return;
    }

    let addedCount = 0;
    receta.ingredientes.forEach(ing => {
      // Si no existe ya en la lista de la compra, añadirlo
      const exists = this.data.listaCompra.some(item => item.texto.toLowerCase() === ing.toLowerCase());
      if (!exists) {
        this.data.listaCompra.push({
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          texto: ing,
          categoria: 'Recetas',
          comprado: false
        });
        addedCount++;
      }
    });

    this.saveData();
    this.render();

    if (window.app && window.app.showToast) {
      window.app.showToast(`Se han añadido ${addedCount} ingredientes a la Lista de la Compra`, 'success');
    }
  }

  // ==========================================
  // MÉTODOS: LISTA DE LA COMPRA
  // ==========================================
  addShoppingItem(texto, categoria = 'General') {
    if (!texto || !texto.trim()) return false;

    this.data.listaCompra.push({
      id: 'item_' + Date.now(),
      texto: texto.trim(),
      categoria: categoria || 'General',
      comprado: false
    });

    this.saveData();
    this.render();
    return true;
  }

  toggleShoppingItem(id) {
    const item = this.data.listaCompra.find(i => i.id === id);
    if (item) {
      item.comprado = !item.comprado;
      this.saveData();
      this.render();
    }
  }

  deleteShoppingItem(id) {
    this.data.listaCompra = this.data.listaCompra.filter(i => i.id !== id);
    this.saveData();
    this.render();
  }

  clearBoughtItems() {
    const prevLen = this.data.listaCompra.length;
    this.data.listaCompra = this.data.listaCompra.filter(i => !i.comprado);
    const removed = prevLen - this.data.listaCompra.length;
    this.saveData();
    this.render();
    if (window.app && window.app.showToast && removed > 0) {
      window.app.showToast(`${removed} artículos comprados eliminados`, 'info');
    }
  }

  clearEntireShoppingList() {
    if (confirm('¿Vaciar toda la lista de la compra?')) {
      this.data.listaCompra = [];
      this.saveData();
      this.render();
    }
  }

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================
  render() {
    const container = document.getElementById('view-menus');
    if (!container) return;

    const isDashboard = this.currentTab === 'dashboard';
    const isSemanal = this.currentTab === 'semanal';
    const isRecetas = this.currentTab === 'recetas';
    const isCompra = this.currentTab === 'compra';

    const countCompra = this.data.listaCompra.filter(i => !i.comprado).length;

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto pb-12">
        <!-- HEADER DEL SUBPROYECTO -->
        <div class="rounded-3xl bg-gradient-to-r from-slate-900 via-orange-950 to-amber-950 p-6 md:p-8 text-white border border-amber-800/40 shadow-xl relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm border border-white/10">
                <i data-lucide="utensils" class="w-3.5 h-3.5"></i>
                <span>SUBPROYECTO DE CRIS • MENÚS SEMANALES</span>
              </div>
              <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Menús Semanales 🥗
              </h1>
              <p class="text-slate-300 text-sm max-w-2xl font-medium">
                Organización de comidas y cenas de lunes a domingo, recetario casero y lista de la compra sincronizada.
              </p>
            </div>

            <!-- Botonera de cambio de pestaña -->
            <div class="inline-flex p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 self-start md:self-auto flex-wrap">
              <button onclick="window.menusModule.setTab('dashboard')" class="px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isDashboard ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                <span>Dashboard</span>
              </button>
              <button onclick="window.menusModule.setTab('semanal')" class="px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isSemanal ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>Plan Semanal</span>
              </button>
              <button onclick="window.menusModule.setTab('recetas')" class="px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isRecetas ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>Recetario (${this.data.recetas.length})</span>
              </button>
              <button onclick="window.menusModule.setTab('compra')" class="px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isCompra ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                <span>Lista Compra ${countCompra > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-white text-amber-900 text-[10px] font-black">${countCompra}</span>` : ''}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- VISTA DE LA PESTAÑA SELECCIONADA -->
        ${isDashboard ? this.renderTabDashboard() : (isSemanal ? this.renderTabSemanal() : (isRecetas ? this.renderTabRecetas() : this.renderTabCompra()))}
      </div>

      <!-- MODALES DE MENÚS -->
      ${this.renderModals()}
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  // ==========================================
  // RENDER PESTAÑA: DASHBOARD (LIMPIO Y PREPARADO)
  // ==========================================
  renderTabDashboard() {
    return `
      <div class="space-y-6">
        <div class="rounded-3xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 bg-white/50 dark:bg-slate-900/50 p-12 text-center shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
            📊
          </div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Dashboard de Menús Semanales</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Lienzo preparado y listo. Indícame qué métricas, menú del día, ingredientes pendientes, plan nutricional o widgets de cocina deseas colocar en este panel.
          </p>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-500"></i>
            <span>Espacio reservado para personalizar tu Dashboard de Cocina</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // RENDER PESTAÑA: PLAN SEMANAL
  // ==========================================
  renderTabSemanal() {
    const plannedDays = this.daysOfWeek.filter(d => this.data.menuSemanal[d]?.almuerzo || this.data.menuSemanal[d]?.cena).length;

    return `
      <div class="space-y-6">
        <!-- BARRA SUPERIOR DE ACCIONES -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div class="space-y-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Planificación Semanal de Comidas</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                ${plannedDays} de 7 días planificados
              </span>
            </h3>
            <p class="text-xs text-slate-400">Define tus almuerzos y cenas para comer sano, ahorrar y optimizar las compras.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.menusModule.clearWeeklyMenu()" class="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Limpiar Semana</span>
            </button>
          </div>
        </div>

        <!-- GRID DE DÍAS LUNES A DOMINGO -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          ${this.daysOfWeek.map((day, idx) => {
            const menu = this.data.menuSemanal[day] || { almuerzo: '', cena: '' };
            const hasAlmuerzo = !!menu.almuerzo;
            const hasCena = !!menu.cena;
            const isWeekend = idx >= 5;

            return `
              <div class="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-600 transition group">
                <div class="space-y-3">
                  <!-- Header del Día -->
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span class="text-xs font-black uppercase tracking-wider ${isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}">
                      ${day}
                    </span>
                    <button onclick="window.menusModule.openEditDayModal('${day}')" class="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer" title="Editar ${day}">
                      <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>

                  <!-- Almuerzo -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <i data-lucide="sun" class="w-3 h-3 text-amber-500"></i>
                      <span>Almuerzo</span>
                    </span>
                    <div class="p-2.5 rounded-2xl ${hasAlmuerzo ? 'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-slate-900 dark:text-white font-bold' : 'bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700/80 text-slate-400 font-medium'} text-xs min-h-[46px] flex items-center">
                      ${hasAlmuerzo ? menu.almuerzo : '<span class="italic text-[11px]">Sin definir</span>'}
                    </div>
                  </div>

                  <!-- Cena -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <i data-lucide="moon" class="w-3 h-3 text-indigo-400"></i>
                      <span>Cena</span>
                    </span>
                    <div class="p-2.5 rounded-2xl ${hasCena ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-slate-900 dark:text-white font-bold' : 'bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700/80 text-slate-400 font-medium'} text-xs min-h-[46px] flex items-center">
                      ${hasCena ? menu.cena : '<span class="italic text-[11px]">Sin definir</span>'}
                    </div>
                  </div>
                </div>

                <!-- Botón rápido editar -->
                <div class="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <button onclick="window.menusModule.openEditDayModal('${day}')" class="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1">
                    <span>Planificar</span>
                    <i data-lucide="chevron-right" class="w-3 h-3"></i>
                  </button>
                  ${(hasAlmuerzo || hasCena) ? `
                    <button onclick="window.menusModule.clearDayMenu('${day}')" title="Limpiar día" class="p-1 rounded text-slate-300 hover:text-rose-500 transition cursor-pointer">
                      <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================
  // RENDER PESTAÑA: RECETARIO
  // ==========================================
  renderTabRecetas() {
    const recetas = this.data.recetas;

    return `
      <div class="space-y-6">
        <!-- HEADER ACCIONES RECETARIO -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div class="space-y-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Recetario Personal y del Hogar</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                ${recetas.length} recetas
              </span>
            </h3>
            <p class="text-xs text-slate-400">Guarda tus platos favoritos y envía sus ingredientes a la lista de la compra con 1 clic.</p>
          </div>
          <button onclick="window.menusModule.openAddRecetaModal()" class="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Nueva Receta</span>
          </button>
        </div>

        <!-- GRID DE RECETAS -->
        ${recetas.length === 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <div class="w-14 h-14 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <i data-lucide="chef-hat" class="w-7 h-7"></i>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-bold text-slate-800 dark:text-slate-200">Tu recetario está vacío</h4>
              <p class="text-xs text-slate-400 max-w-md mx-auto">Añade tus platos caseros, ensaladas o recetas de meal prep para tenerlas a mano e integrarlas en tu lista de la compra.</p>
            </div>
            <button onclick="window.menusModule.openAddRecetaModal()" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer">
              Crear Primera Receta
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${recetas.map(r => `
              <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase">
                        ${r.categoria || 'Receta'}
                      </span>
                      <h4 class="text-base font-black text-slate-900 dark:text-white mt-1">${r.nombre}</h4>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-400 font-bold flex-shrink-0">
                      <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-500"></i>
                      <span>${r.tiempo}</span>
                    </div>
                  </div>

                  <!-- Ingredientes -->
                  <div>
                    <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Ingredientes:</span>
                    <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl">
                      ${(r.ingredientes && r.ingredientes.length > 0) ? r.ingredientes.map(ing => `<li>${ing}</li>`).join('') : '<li class="italic text-slate-400">Sin ingredientes especificados</li>'}
                    </ul>
                  </div>

                  <!-- Pasos o Preparación -->
                  ${r.pasos ? `
                    <div>
                      <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Preparación:</span>
                      <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">${r.pasos}</p>
                    </div>
                  ` : ''}
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <button onclick="window.menusModule.addRecetaToShoppingList('${r.id}')" class="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                    <span>Añadir a la Compra</span>
                  </button>
                  <button onclick="window.menusModule.deleteReceta('${r.id}')" title="Eliminar receta" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ==========================================
  // RENDER PESTAÑA: LISTA DE LA COMPRA
  // ==========================================
  renderTabCompra() {
    const items = this.data.listaCompra;
    const pendingItems = items.filter(i => !i.comprado);
    const completedItems = items.filter(i => i.comprado);

    return `
      <div class="space-y-6">
        <!-- BARRA RÁPIDA DE AÑADIR PRODUCTO -->
        <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="shopping-cart" class="w-5 h-5 text-amber-600"></i>
              <span>Lista de la Compra Interactiva</span>
            </h3>
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">
              ${completedItems.length} de ${items.length} productos comprados
            </span>
          </div>

          <form onsubmit="window.menusModule.handleQuickAddShopping(event)" class="flex flex-col sm:flex-row gap-2">
            <input type="text" id="quick-shopping-text" required placeholder="Añadir producto (ej. Tomates, Leche de avena, Detergente...)" class="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
            <select id="quick-shopping-cat" class="px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none sm:w-48">
              <option value="General">General</option>
              <option value="Frutería">Frutas & Verduras</option>
              <option value="Carnicería">Carnes & Pescados</option>
              <option value="Lácteos">Lácteos & Huevos</option>
              <option value="Despensa">Despensa & Pastas</option>
              <option value="Hogar">Limpieza & Hogar</option>
            </select>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Añadir</span>
            </button>
          </form>
        </div>

        <!-- LISTA INTERACTIVA -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center gap-2">
              <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Artículos en la Cesta</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black">${pendingItems.length} pendientes</span>
            </div>
            <div class="flex items-center gap-2">
              ${completedItems.length > 0 ? `
                <button onclick="window.menusModule.clearBoughtItems()" class="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
                  <i data-lucide="check-check" class="w-3.5 h-3.5"></i>
                  <span>Borrar comprados (${completedItems.length})</span>
                </button>
              ` : ''}
              ${items.length > 0 ? `
                <button onclick="window.menusModule.clearEntireShoppingList()" class="text-xs font-bold text-slate-400 hover:text-rose-600 cursor-pointer">
                  Vaciar Todo
                </button>
              ` : ''}
            </div>
          </div>

          ${items.length === 0 ? `
            <div class="py-12 text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <i data-lucide="check-circle" class="w-6 h-6"></i>
              </div>
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300">¡Tu lista de la compra está al día!</p>
                <p class="text-xs text-slate-400">Escribe un producto arriba o importa ingredientes desde el Recetario.</p>
              </div>
            </div>
          ` : `
            <div class="divide-y divide-slate-100 dark:divide-slate-700/60">
              <!-- Pendientes -->
              ${pendingItems.map(item => `
                <div class="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 px-2 rounded-2xl transition group">
                  <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" onchange="window.menusModule.toggleShoppingItem('${item.id}')" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer">
                    <div class="min-w-0">
                      <span class="text-xs font-bold text-slate-900 dark:text-white block truncate">${item.texto}</span>
                      <span class="text-[10px] text-slate-400 font-semibold">${item.categoria || 'General'}</span>
                    </div>
                  </label>
                  <button onclick="window.menusModule.deleteShoppingItem('${item.id}')" title="Eliminar producto" class="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `).join('')}

              <!-- Comprados -->
              ${completedItems.map(item => `
                <div class="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 px-2 rounded-2xl transition opacity-60">
                  <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" checked onchange="window.menusModule.toggleShoppingItem('${item.id}')" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer">
                    <div class="min-w-0">
                      <span class="text-xs font-bold line-through text-slate-400 block truncate">${item.texto}</span>
                      <span class="text-[10px] text-slate-400 font-medium">${item.categoria || 'General'} • Comprado</span>
                    </div>
                  </label>
                  <button onclick="window.menusModule.deleteShoppingItem('${item.id}')" title="Eliminar producto" class="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==========================================
  // MODALES
  // ==========================================
  renderModals() {
    return `
      <!-- MODAL: EDITAR MENÚ DEL DÍA -->
      <div id="modal-edit-day-menu" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="calendar" class="w-4 h-4 text-amber-600"></i>
              <span id="modal-day-title">Planificar Menú</span>
            </h3>
            <button onclick="window.menusModule.closeModal('modal-edit-day-menu')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.menusModule.handleEditDaySubmit(event)" class="space-y-4">
            <input type="hidden" id="edit-day-name">

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-500"></i>
                <span>Almuerzo (Comida)</span>
              </label>
              <input type="text" id="edit-day-almuerzo" placeholder="Ej. Lentejas caseras con verduras..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <i data-lucide="moon" class="w-3.5 h-3.5 text-indigo-400"></i>
                <span>Cena</span>
              </label>
              <input type="text" id="edit-day-cena" placeholder="Ej. Tortilla francesa y ensalada mixta..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
            </div>

            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.menusModule.closeModal('modal-edit-day-menu')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Día</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: NUEVA RECETA -->
      <div id="modal-add-receta" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="chef-hat" class="w-4 h-4 text-amber-600"></i>
              <span>Añadir Nueva Receta</span>
            </h3>
            <button onclick="window.menusModule.closeModal('modal-add-receta')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.menusModule.handleAddRecetaSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de la Receta</label>
              <input type="text" id="receta-nombre" required placeholder="Ej. Salmón al horno con verduras" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tiempo Estimado</label>
                <input type="text" id="receta-tiempo" placeholder="Ej. 25 min" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select id="receta-cat" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  <option value="Plato Principal">Plato Principal</option>
                  <option value="Ensalada / Ligero">Ensalada / Ligero</option>
                  <option value="Desayuno / Merienda">Desayuno / Merienda</option>
                  <option value="Postre / Snack">Postre / Snack</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ingredientes (un ingrediente por línea)</label>
              <textarea id="receta-ingredientes" rows="4" placeholder="2 lomos de salmón&#10;1 calabacín&#10;Aceite de oliva y sal" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pasos o Preparación (opcional)</label>
              <textarea id="receta-pasos" rows="3" placeholder="Hornear a 180°C durante 18 minutos..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
            </div>

            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.menusModule.closeModal('modal-add-receta')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Receta</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Modales helpers
  openEditDayModal(day) {
    const dayData = this.data.menuSemanal[day] || { almuerzo: '', cena: '' };
    const titleEl = document.getElementById('modal-day-title');
    const dayInput = document.getElementById('edit-day-name');
    const almuerzoInput = document.getElementById('edit-day-almuerzo');
    const cenaInput = document.getElementById('edit-day-cena');

    if (titleEl) titleEl.textContent = `Planificar ${day}`;
    if (dayInput) dayInput.value = day;
    if (almuerzoInput) almuerzoInput.value = dayData.almuerzo || '';
    if (cenaInput) cenaInput.value = dayData.cena || '';

    this.openModal('modal-edit-day-menu');
  }

  openAddRecetaModal() {
    this.openModal('modal-add-receta');
  }

  openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  handleEditDaySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const day = document.getElementById('edit-day-name')?.value;
    const almuerzo = document.getElementById('edit-day-almuerzo')?.value;
    const cena = document.getElementById('edit-day-cena')?.value;

    if (day) {
      this.updateDayMenu(day, almuerzo, cena);
      this.closeModal('modal-edit-day-menu');
      if (window.app && window.app.showToast) {
        window.app.showToast(`Menú del ${day} actualizado`, 'success');
      }
    }
  }

  handleAddRecetaSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nombre = document.getElementById('receta-nombre')?.value;
    const tiempo = document.getElementById('receta-tiempo')?.value;
    const cat = document.getElementById('receta-cat')?.value;
    const ing = document.getElementById('receta-ingredientes')?.value;
    const pasos = document.getElementById('receta-pasos')?.value;

    if (this.addReceta(nombre, tiempo, ing, pasos, cat)) {
      this.closeModal('modal-add-receta');
      if (window.app && window.app.showToast) {
        window.app.showToast('Receta guardada con éxito', 'success');
      }
    }
  }

  handleQuickAddShopping(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('quick-shopping-text');
    const catSelect = document.getElementById('quick-shopping-cat');

    const text = input ? input.value.trim() : '';
    const cat = catSelect ? catSelect.value : 'General';

    if (this.addShoppingItem(text, cat)) {
      if (input) input.value = '';
      if (window.app && window.app.showToast) {
        window.app.showToast('Producto añadido a la compra', 'success');
      }
    }
  }
}

// Instanciar globalmente
window.menusModule = new MenusModule();
