/**
 * CRIS Platform - Subproyecto Gestión Económica (js/economia.js)
 * Módulo independiente de Gestión Económica que comprende:
 * 1.1 Personal: Ingresos, gastos por categoría, métodos de pago, presupuesto y ahorro.
 * 1.2 De Casa: Gastos comunes del hogar (alquiler, suministros, supermercado), estado de pago y aportaciones.
 * 
 * Inicia 100% limpio sin datos inventados.
 */

class EconomiaModule {
  constructor() {
    this.storageKey = 'cris_economia_data_v1';
    this.currentTab = 'dashboard'; // 'dashboard' | 'personal' | 'casa'
    this.chartCategory = null;
    this.chartEvolution = null;

    this.data = this.loadData();
    this.init();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          personal: {
            ingresos: Array.isArray(parsed?.personal?.ingresos) ? parsed.personal.ingresos : [],
            gastos: Array.isArray(parsed?.personal?.gastos) ? parsed.personal.gastos : [],
            presupuestoMensual: Number(parsed?.personal?.presupuestoMensual) || 0
          },
          casa: {
            gastos: Array.isArray(parsed?.casa?.gastos) ? parsed.casa.gastos : [],
            aportaciones: Array.isArray(parsed?.casa?.aportaciones) ? parsed.casa.aportaciones : []
          }
        };
      }
    } catch (e) {
      console.error('Error cargando datos de economía:', e);
    }

    return {
      personal: {
        ingresos: [],
        gastos: [],
        presupuestoMensual: 0
      },
      casa: {
        gastos: [],
        aportaciones: []
      }
    };
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      window.dispatchEvent(new CustomEvent('studyflow:change'));
    } catch (e) {
      console.error('Error guardando datos de economía:', e);
    }
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      if (window.app && window.app.currentView === 'economia') {
        this.render();
      }
    });
  }

  setTab(tab) {
    if (tab !== 'dashboard' && tab !== 'personal' && tab !== 'casa') return;
    this.currentTab = tab;
    this.render();
  }

  formatMoney(amount) {
    return (Number(amount) || 0).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ==========================================
  // MÉTODOS: 1.1 PERSONAL
  // ==========================================
  addIngresoPersonal(descripcion, importe, fecha = new Date().toISOString().split('T')[0], categoria = 'Nómina') {
    const num = parseFloat(importe);
    if (isNaN(num) || num <= 0) return false;

    this.data.personal.ingresos.unshift({
      id: 'ing_' + Date.now(),
      descripcion: descripcion || 'Ingreso sin concepto',
      importe: num,
      fecha: fecha,
      categoria: categoria
    });
    this.saveData();
    this.render();
    return true;
  }

  addGastoPersonal(descripcion, importe, categoria = 'Varios', metodo = 'Tarjeta', fecha = new Date().toISOString().split('T')[0]) {
    const num = parseFloat(importe);
    if (isNaN(num) || num <= 0) return false;

    this.data.personal.gastos.unshift({
      id: 'gst_p_' + Date.now(),
      descripcion: descripcion || 'Gasto sin concepto',
      importe: num,
      categoria: categoria,
      metodo: metodo,
      fecha: fecha
    });
    this.saveData();
    this.render();
    return true;
  }

  deleteGastoPersonal(id) {
    this.data.personal.gastos = this.data.personal.gastos.filter(g => g.id !== id);
    this.saveData();
    this.render();
  }

  deleteIngresoPersonal(id) {
    this.data.personal.ingresos = this.data.personal.ingresos.filter(i => i.id !== id);
    this.saveData();
    this.render();
  }

  setPresupuestoPersonal(presupuesto) {
    const num = parseFloat(presupuesto);
    this.data.personal.presupuestoMensual = isNaN(num) || num < 0 ? 0 : num;
    this.saveData();
    this.render();
  }

  getPersonalMetrics() {
    const totalIngresos = this.data.personal.ingresos.reduce((acc, i) => acc + (Number(i.importe) || 0), 0);
    const totalGastos = this.data.personal.gastos.reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
    const balanceNeto = totalIngresos - totalGastos;
    const tasaAhorro = totalIngresos > 0 ? Math.max(0, Math.round((balanceNeto / totalIngresos) * 100)) : 0;
    const presupuesto = this.data.personal.presupuestoMensual;
    const presupuestoUsadoPct = presupuesto > 0 ? Math.min(100, Math.round((totalGastos / presupuesto) * 100)) : 0;
    const presupuestoRestante = Math.max(0, presupuesto - totalGastos);

    return {
      totalIngresos,
      totalGastos,
      balanceNeto,
      tasaAhorro,
      presupuesto,
      presupuestoUsadoPct,
      presupuestoRestante
    };
  }

  // ==========================================
  // MÉTODOS: 1.2 DE CASA
  // ==========================================
  addGastoCasa(concepto, importe, categoria = 'Suministros', pagado = false, fecha = new Date().toISOString().split('T')[0]) {
    const num = parseFloat(importe);
    if (isNaN(num) || num <= 0) return false;

    this.data.casa.gastos.unshift({
      id: 'gst_c_' + Date.now(),
      concepto: concepto || 'Gasto de casa',
      importe: num,
      categoria: categoria,
      pagado: !!pagado,
      fecha: fecha
    });
    this.saveData();
    this.render();
    return true;
  }

  toggleGastoCasaEstado(id) {
    const item = this.data.casa.gastos.find(g => g.id === id);
    if (item) {
      item.pagado = !item.pagado;
      this.saveData();
      this.render();
    }
  }

  deleteGastoCasa(id) {
    this.data.casa.gastos = this.data.casa.gastos.filter(g => g.id !== id);
    this.saveData();
    this.render();
  }

  addAportacionCasa(persona, importe, fecha = new Date().toISOString().split('T')[0]) {
    const num = parseFloat(importe);
    if (isNaN(num) || num <= 0) return false;

    this.data.casa.aportaciones.unshift({
      id: 'apt_' + Date.now(),
      persona: persona || 'Cris',
      importe: num,
      fecha: fecha
    });
    this.saveData();
    this.render();
    return true;
  }

  deleteAportacionCasa(id) {
    this.data.casa.aportaciones = this.data.casa.aportaciones.filter(a => a.id !== id);
    this.saveData();
    this.render();
  }

  getCasaMetrics() {
    const totalGastos = this.data.casa.gastos.reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
    const pagados = this.data.casa.gastos.filter(g => g.pagado).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
    const pendientes = this.data.casa.gastos.filter(g => !g.pagado).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
    const totalAportaciones = this.data.casa.aportaciones.reduce((acc, a) => acc + (Number(a.importe) || 0), 0);

    return {
      totalGastos,
      pagados,
      pendientes,
      totalAportaciones
    };
  }

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================
  render() {
    const container = document.getElementById('view-economia');
    if (!container) return;

    const isDashboard = this.currentTab === 'dashboard';
    const isPersonal = this.currentTab === 'personal';
    const isCasa = this.currentTab === 'casa';

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto pb-12">
        <!-- HEADER DEL SUBPROYECTO -->
        <div class="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 md:p-8 text-white border border-emerald-800/40 shadow-xl relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold backdrop-blur-sm border border-white/10">
                <i data-lucide="wallet" class="w-3.5 h-3.5"></i>
                <span>SUBPROYECTO DE CRIS • GESTIÓN ECONÓMICA</span>
              </div>
              <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Gestión Económica 💶
              </h1>
              <p class="text-slate-300 text-sm max-w-2xl font-medium">
                Control financiero estructurado: tu dashboard resumen, economía personal y gastos comunes del hogar.
              </p>
            </div>

            <!-- Botonera de cambio de vertiente / dashboard -->
            <div class="inline-flex p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 self-start md:self-auto flex-wrap">
              <button onclick="window.economiaModule.setTab('dashboard')" class="px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isDashboard ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                <span>Dashboard</span>
              </button>
              <button onclick="window.economiaModule.setTab('personal')" class="px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isPersonal ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="user" class="w-4 h-4"></i>
                <span>1.1 Personal</span>
              </button>
              <button onclick="window.economiaModule.setTab('casa')" class="px-5 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${isCasa ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'text-slate-300 hover:text-white'}">
                <i data-lucide="home" class="w-4 h-4"></i>
                <span>1.2 De Casa</span>
              </button>
            </div>
          </div>
        </div>

        <!-- CONTENIDO DE LA PESTAÑA ACTIVA -->
        ${isDashboard ? this.renderTabDashboard() : (isPersonal ? this.renderTabPersonal() : this.renderTabCasa())}
      </div>

      <!-- MODALES DE GESTIÓN ECONÓMICA -->
      ${this.renderModals()}
    `;

    if (window.lucide) window.lucide.createIcons();

    if (isPersonal) {
      this.initPersonalCharts();
    }
  }

  // ==========================================
  // RENDER PESTAÑA: DASHBOARD (LIMPIO Y PREPARADO)
  // ==========================================
  renderTabDashboard() {
    return `
      <div class="space-y-6">
        <div class="rounded-3xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/60 bg-white/50 dark:bg-slate-900/50 p-12 text-center shadow-xs">
          <div class="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">
            📊
          </div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Dashboard de Gestión Económica</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Lienzo preparado y listo. Indícame qué métricas, balances consolidados, gráficas de evolución o resúmenes de ahorro deseas colocar en este panel.
          </p>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <i data-lucide="sparkles" class="w-4 h-4 text-emerald-500"></i>
            <span>Espacio reservado para personalizar tu Dashboard Económico</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // RENDER PESTAÑA: 1.1 PERSONAL
  // ==========================================
  renderTabPersonal() {
    const kpis = this.getPersonalMetrics();
    const gastos = this.data.personal.gastos;
    const ingresos = this.data.personal.ingresos;

    return `
      <div class="space-y-6">
        <!-- 4 KPIS PERSONALES -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- KPI 1: Ingresos -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</span>
              <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <i data-lucide="trending-up" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">${this.formatMoney(kpis.totalIngresos)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">${ingresos.length} ingresos registrados</p>
          </div>

          <!-- KPI 2: Gastos -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gastos Personales</span>
              <div class="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <i data-lucide="trending-down" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">${this.formatMoney(kpis.totalGastos)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">${gastos.length} gastos registrados</p>
          </div>

          <!-- KPI 3: Balance Neto -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Balance Neto</span>
              <div class="w-8 h-8 rounded-xl ${kpis.balanceNeto >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center">
                <i data-lucide="${kpis.balanceNeto >= 0 ? 'plus' : 'minus'}" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black ${kpis.balanceNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} mt-2">
              ${this.formatMoney(kpis.balanceNeto)}
            </h3>
            <p class="text-[11px] text-slate-400 mt-1">Diferencial neto del periodo</p>
          </div>

          <!-- KPI 4: Tasa de Ahorro y Presupuesto -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ahorro & Presupuesto</span>
              <div class="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <i data-lucide="piggy-bank" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">${kpis.tasaAhorro}%</h3>
            <p class="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-1">
              ${kpis.presupuesto > 0 ? `Límite: ${this.formatMoney(kpis.presupuesto)}` : 'Sin presupuesto fijado'}
            </p>
          </div>
        </div>

        <!-- BARRA DE SEGUIMIENTO DEL PRESUPUESTO PERSONAL -->
        ${kpis.presupuesto > 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="gauge" class="w-4 h-4 text-emerald-500"></i>
                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Presupuesto Mensual Activo</span>
              </div>
              <span class="text-xs font-black text-slate-900 dark:text-white">${this.formatMoney(kpis.totalGastos)} de ${this.formatMoney(kpis.presupuesto)} (${kpis.presupuestoUsadoPct}%)</span>
            </div>
            <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 ${kpis.presupuestoUsadoPct > 90 ? 'bg-rose-500' : (kpis.presupuestoUsadoPct > 70 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${kpis.presupuestoUsadoPct}%"></div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Restante disponible: <strong class="${kpis.presupuestoRestante > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 font-bold'}">${this.formatMoney(kpis.presupuestoRestante)}</strong></span>
              <button onclick="window.economiaModule.openPresupuestoModal()" class="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">Editar Presupuesto</button>
            </div>
          </div>
        ` : ''}

        <!-- ACCIONES RÁPIDAS -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80">
          <div class="flex items-center gap-2">
            <button onclick="window.economiaModule.openGastoPersonalModal()" class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Añadir Gasto Personal</span>
            </button>
            <button onclick="window.economiaModule.openIngresoPersonalModal()" class="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="arrow-down-left" class="w-4 h-4 text-emerald-500"></i>
              <span>+ Añadir Ingreso</span>
            </button>
          </div>
          <button onclick="window.economiaModule.openPresupuestoModal()" class="px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 flex items-center gap-2 transition cursor-pointer">
            <i data-lucide="sliders" class="w-4 h-4"></i>
            <span>${kpis.presupuesto > 0 ? 'Ajustar Presupuesto' : 'Fijar Presupuesto Mensual'}</span>
          </button>
        </div>

        <!-- GRÁFICAS Y ANÁLISIS (SI HAY GASTOS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Gráfica de categorías (5 de 12) -->
          <div class="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-2">
                <i data-lucide="pie-chart" class="w-4 h-4 text-emerald-600"></i>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Distribución por Categoría</h3>
              </div>
            </div>
            ${gastos.length === 0 ? `
              <div class="py-12 text-center text-slate-400 space-y-2">
                <i data-lucide="circle-dashed" class="w-10 h-10 mx-auto stroke-1 text-slate-300"></i>
                <p class="text-xs font-semibold">Registra gastos para generar el desglose gráfico.</p>
              </div>
            ` : `
              <div class="relative h-64 flex items-center justify-center">
                <canvas id="chart-personal-categorias"></canvas>
              </div>
            `}
          </div>

          <!-- LISTA DE GASTOS PERSONALES (7 de 12) -->
          <div class="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-2">
                <i data-lucide="list" class="w-4 h-4 text-emerald-600"></i>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Movimientos Personales Recientes</h3>
              </div>
              <span class="text-[11px] font-bold text-slate-400">${gastos.length} gastos</span>
            </div>

            ${gastos.length === 0 ? `
              <div class="py-12 text-center space-y-3">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <i data-lucide="receipt" class="w-6 h-6"></i>
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No hay gastos personales registrados</p>
                  <p class="text-xs text-slate-400">Pulsa "+ Añadir Gasto Personal" para registrar tus compras, suscripciones u ocio.</p>
                </div>
                <button onclick="window.economiaModule.openGastoPersonalModal()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer">
                  Añadir Primer Gasto
                </button>
              </div>
            ` : `
              <div class="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-96 overflow-y-auto pr-1">
                ${gastos.map(g => `
                  <div class="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-2 rounded-2xl transition">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${this.getCategoryIcon(g.categoria)}" class="w-4 h-4"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">${g.descripcion}</p>
                        <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                          <span class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">${g.categoria}</span>
                          <span>•</span>
                          <span>${g.metodo || 'Tarjeta'}</span>
                          <span>•</span>
                          <span>${g.fecha}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                      <span class="text-sm font-black text-rose-600 dark:text-rose-400">-${this.formatMoney(g.importe)}</span>
                      <button onclick="window.economiaModule.deleteGastoPersonal('${g.id}')" title="Eliminar" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- LISTA DE INGRESOS REGISTRADOS -->
        ${ingresos.length > 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-2">
                <i data-lucide="arrow-down-left" class="w-4 h-4 text-emerald-600"></i>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Ingresos Registrados</h3>
              </div>
              <span class="text-[11px] font-bold text-emerald-600">${this.formatMoney(kpis.totalIngresos)}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${ingresos.map(i => `
                <div class="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                  <div>
                    <h5 class="text-xs font-bold text-slate-900 dark:text-white">${i.descripcion}</h5>
                    <p class="text-[10px] text-slate-400 mt-0.5">${i.categoria || 'Nómina'} • ${i.fecha}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">+${this.formatMoney(i.importe)}</span>
                    <button onclick="window.economiaModule.deleteIngresoPersonal('${i.id}')" title="Eliminar" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer">
                      <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // RENDER PESTAÑA: 1.2 DE CASA
  // ==========================================
  renderTabCasa() {
    const kpis = this.getCasaMetrics();
    const gastos = this.data.casa.gastos;
    const aportaciones = this.data.casa.aportaciones;

    return `
      <div class="space-y-6">
        <!-- 4 KPIS DE CASA -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Gastos Hogar -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Gastos Hogar</span>
              <div class="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <i data-lucide="home" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">${this.formatMoney(kpis.totalGastos)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">${gastos.length} conceptos comunes</p>
          </div>

          <!-- Pagados -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ya Pagados</span>
              <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">${this.formatMoney(kpis.pagados)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">Liquidado este periodo</p>
          </div>

          <!-- Pendientes -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendientes de Pago</span>
              <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <i data-lucide="clock" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">${this.formatMoney(kpis.pendientes)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">Por pagar o abonar</p>
          </div>

          <!-- Total Aportaciones -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fondo / Aportaciones</span>
              <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <i data-lucide="users" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">${this.formatMoney(kpis.totalAportaciones)}</h3>
            <p class="text-[11px] text-slate-400 mt-1">${aportaciones.length} aportaciones</p>
          </div>
        </div>

        <!-- ACCIONES RÁPIDAS CASA -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80">
          <div class="flex items-center gap-2">
            <button onclick="window.economiaModule.openGastoCasaModal()" class="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Añadir Gasto de Casa</span>
            </button>
            <button onclick="window.economiaModule.openAportacionCasaModal()" class="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer">
              <i data-lucide="user-plus" class="w-4 h-4 text-teal-500"></i>
              <span>+ Registrar Aportación</span>
            </button>
          </div>
          <div class="text-xs text-slate-500 font-medium">
            <span>Haz clic sobre el estado para alternar entre <span class="text-emerald-600 font-bold">Pagado</span> y <span class="text-amber-600 font-bold">Pendiente</span>.</span>
          </div>
        </div>

        <!-- TABLA PRINCIPAL DE GASTOS DE CASA -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Gastos Comunes del Hogar</h3>
            </div>
            <span class="text-[11px] font-bold text-slate-400">${gastos.length} registrados</span>
          </div>

          ${gastos.length === 0 ? `
            <div class="py-12 text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
                <i data-lucide="home" class="w-6 h-6"></i>
              </div>
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No hay gastos comunes registrados en el hogar</p>
                <p class="text-xs text-slate-400">Añade aquí conceptos como alquiler/hipoteca, electricidad, internet, agua o comunidad.</p>
              </div>
              <button onclick="window.economiaModule.openGastoCasaModal()" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer">
                Añadir Gasto de Casa
              </button>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 dark:border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th class="py-3 px-2">Concepto</th>
                    <th class="py-3 px-2">Categoría</th>
                    <th class="py-3 px-2">Fecha</th>
                    <th class="py-3 px-2">Importe</th>
                    <th class="py-3 px-2">Estado</th>
                    <th class="py-3 px-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
                  ${gastos.map(g => `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td class="py-3 px-2 font-bold text-slate-900 dark:text-white">${g.concepto}</td>
                      <td class="py-3 px-2">
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          ${g.categoria}
                        </span>
                      </td>
                      <td class="py-3 px-2 text-slate-400">${g.fecha}</td>
                      <td class="py-3 px-2 font-black text-slate-900 dark:text-white">${this.formatMoney(g.importe)}</td>
                      <td class="py-3 px-2">
                        <button onclick="window.economiaModule.toggleGastoCasaEstado('${g.id}')" class="px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition ${g.pagado ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}">
                          <i data-lucide="${g.pagado ? 'check' : 'clock'}" class="w-3 h-3"></i>
                          <span>${g.pagado ? 'Pagado' : 'Pendiente'}</span>
                        </button>
                      </td>
                      <td class="py-3 px-2 text-right">
                        <button onclick="window.economiaModule.deleteGastoCasa('${g.id}')" title="Eliminar" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- SECCIÓN DE APORTACIONES / FONDO COMÚN -->
        ${aportaciones.length > 0 ? `
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div class="flex items-center gap-2">
                <i data-lucide="users" class="w-4 h-4 text-indigo-600"></i>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Aportaciones al Fondo Común</h3>
              </div>
              <span class="text-[11px] font-bold text-indigo-600">${this.formatMoney(kpis.totalAportaciones)}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${aportaciones.map(a => `
                <div class="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <h5 class="text-xs font-bold text-slate-900 dark:text-white">${a.persona}</h5>
                    <p class="text-[10px] text-slate-400 mt-0.5">Fecha: ${a.fecha}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-black text-indigo-600 dark:text-indigo-400">${this.formatMoney(a.importe)}</span>
                    <button onclick="window.economiaModule.deleteAportacionCasa('${a.id}')" title="Eliminar" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer">
                      <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // GRÁFICAS CHART.JS
  // ==========================================
  initPersonalCharts() {
    const canvas = document.getElementById('chart-personal-categorias');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.chartCategory) {
      this.chartCategory.destroy();
      this.chartCategory = null;
    }

    const gastos = this.data.personal.gastos;
    if (gastos.length === 0) return;

    const catTotals = {};
    gastos.forEach(g => {
      const cat = g.categoria || 'Varios';
      catTotals[cat] = (catTotals[cat] || 0) + (Number(g.importe) || 0);
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);

    const colors = [
      '#10b981', '#06b6d4', '#6366f1', '#a855f7',
      '#ec4899', '#f59e0b', '#3b82f6', '#f43f5e'
    ];

    try {
      this.chartCategory = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 10, weight: 'bold' }
              }
            }
          },
          cutout: '70%'
        }
      });
    } catch (e) {
      console.warn('Error iniciando gráfica:', e);
    }
  }

  getCategoryIcon(cat) {
    const map = {
      'Ocio': 'film',
      'Compras': 'shopping-bag',
      'Transporte': 'bus',
      'Salud': 'heart-pulse',
      'Suscripciones': 'tv',
      'Formación': 'book-open',
      'Restauración': 'coffee',
      'Nómina': 'briefcase',
      'Alquiler': 'key',
      'Suministros': 'zap',
      'Supermercado': 'shopping-cart'
    };
    return map[cat] || 'tag';
  }

  // ==========================================
  // MODALES
  // ==========================================
  renderModals() {
    return `
      <!-- MODAL: GASTO PERSONAL -->
      <div id="modal-gasto-personal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-600"></i>
              <span>Nuevo Gasto Personal (1.1)</span>
            </h3>
            <button onclick="window.economiaModule.closeModal('modal-gasto-personal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.economiaModule.handleGastoPersonalSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Concepto o Descripción</label>
              <input type="text" id="gasto-p-desc" required placeholder="Ej. Café con amigos, Ropa, Libro..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Importe (€)</label>
                <input type="number" step="0.01" min="0.01" id="gasto-p-importe" required placeholder="0.00" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                <input type="date" id="gasto-p-fecha" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select id="gasto-p-cat" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="Ocio">Ocio</option>
                  <option value="Compras">Compras</option>
                  <option value="Restauración">Restauración</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Suscripciones">Suscripciones</option>
                  <option value="Salud">Salud</option>
                  <option value="Formación">Formación</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Método de Pago</label>
                <select id="gasto-p-metodo" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Bizum">Bizum</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.economiaModule.closeModal('modal-gasto-personal')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Gasto</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: INGRESO PERSONAL -->
      <div id="modal-ingreso-personal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="arrow-down-left" class="w-4 h-4 text-emerald-600"></i>
              <span>Registrar Ingreso Personal</span>
            </h3>
            <button onclick="window.economiaModule.closeModal('modal-ingreso-personal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.economiaModule.handleIngresoPersonalSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Concepto</label>
              <input type="text" id="ingreso-p-desc" required placeholder="Ej. Nómina, Transferencia, Venta Wallapop..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Importe (€)</label>
                <input type="number" step="0.01" min="0.01" id="ingreso-p-importe" required placeholder="0.00" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                <input type="date" id="ingreso-p-fecha" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.economiaModule.closeModal('modal-ingreso-personal')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Ingreso</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: GASTO DE CASA -->
      <div id="modal-gasto-casa" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="home" class="w-4 h-4 text-teal-600"></i>
              <span>Nuevo Gasto de Casa (1.2)</span>
            </h3>
            <button onclick="window.economiaModule.closeModal('modal-gasto-casa')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.economiaModule.handleGastoCasaSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Concepto del Gasto Común</label>
              <input type="text" id="gasto-c-desc" required placeholder="Ej. Alquiler, Luz Endesa, Fibra Digi, Agua..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Importe (€)</label>
                <input type="number" step="0.01" min="0.01" id="gasto-c-importe" required placeholder="0.00" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select id="gasto-c-cat" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none">
                  <option value="Alquiler/Hipoteca">Alquiler/Hipoteca</option>
                  <option value="Suministros (Luz/Gas)">Suministros (Luz/Gas)</option>
                  <option value="Internet/Telefonía">Internet/Telefonía</option>
                  <option value="Agua/Comunidad">Agua/Comunidad</option>
                  <option value="Supermercado Hogar">Supermercado Hogar</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-2">
              <input type="checkbox" id="gasto-c-pagado" class="rounded text-teal-600 focus:ring-teal-500">
              <label for="gasto-c-pagado" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Marcar como pagado inmediatamente</label>
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.economiaModule.closeModal('modal-gasto-casa')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Gasto Común</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: APORTACIÓN CASA -->
      <div id="modal-aportacion-casa" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="users" class="w-4 h-4 text-indigo-600"></i>
              <span>Registrar Aportación al Hogar</span>
            </h3>
            <button onclick="window.economiaModule.closeModal('modal-aportacion-casa')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.economiaModule.handleAportacionCasaSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre / Persona</label>
              <input type="text" id="aportacion-c-persona" required value="Cris" placeholder="Nombre" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Importe aportado (€)</label>
              <input type="number" step="0.01" min="0.01" id="aportacion-c-importe" required placeholder="0.00" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.economiaModule.closeModal('modal-aportacion-casa')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer">Guardar Aportación</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: AJUSTAR PRESUPUESTO PERSONAL -->
      <div id="modal-presupuesto-personal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="sliders" class="w-4 h-4 text-emerald-600"></i>
              <span>Presupuesto Mensual</span>
            </h3>
            <button onclick="window.economiaModule.closeModal('modal-presupuesto-personal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="window.economiaModule.handlePresupuestoSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Límite mensual deseado (€)</label>
              <input type="number" step="0.01" min="0" id="presupuesto-p-valor" value="${this.data.personal.presupuestoMensual || ''}" placeholder="Ej. 600" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <p class="text-[10px] text-slate-400 mt-1">Introduce 0 para desactivar el límite.</p>
            </div>
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onclick="window.economiaModule.closeModal('modal-presupuesto-personal')" class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer">Fijar Presupuesto</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Modales helpers
  openGastoPersonalModal() {
    this.openModal('modal-gasto-personal');
  }

  openIngresoPersonalModal() {
    this.openModal('modal-ingreso-personal');
  }

  openGastoCasaModal() {
    this.openModal('modal-gasto-casa');
  }

  openAportacionCasaModal() {
    this.openModal('modal-aportacion-casa');
  }

  openPresupuestoModal() {
    this.openModal('modal-presupuesto-personal');
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

  handleGastoPersonalSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const desc = document.getElementById('gasto-p-desc')?.value.trim();
    const imp = document.getElementById('gasto-p-importe')?.value;
    const cat = document.getElementById('gasto-p-cat')?.value;
    const metodo = document.getElementById('gasto-p-metodo')?.value;
    const fecha = document.getElementById('gasto-p-fecha')?.value;

    if (this.addGastoPersonal(desc, imp, cat, metodo, fecha)) {
      this.closeModal('modal-gasto-personal');
      if (window.app && window.app.showToast) {
        window.app.showToast('Gasto personal añadido', 'success');
      }
    }
  }

  handleIngresoPersonalSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const desc = document.getElementById('ingreso-p-desc')?.value.trim();
    const imp = document.getElementById('ingreso-p-importe')?.value;
    const fecha = document.getElementById('ingreso-p-fecha')?.value;

    if (this.addIngresoPersonal(desc, imp, fecha)) {
      this.closeModal('modal-ingreso-personal');
      if (window.app && window.app.showToast) {
        window.app.showToast('Ingreso registrado', 'success');
      }
    }
  }

  handleGastoCasaSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const desc = document.getElementById('gasto-c-desc')?.value.trim();
    const imp = document.getElementById('gasto-c-importe')?.value;
    const cat = document.getElementById('gasto-c-cat')?.value;
    const pagado = document.getElementById('gasto-c-pagado')?.checked;

    if (this.addGastoCasa(desc, imp, cat, pagado)) {
      this.closeModal('modal-gasto-casa');
      if (window.app && window.app.showToast) {
        window.app.showToast('Gasto de casa añadido', 'success');
      }
    }
  }

  handleAportacionCasaSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const persona = document.getElementById('aportacion-c-persona')?.value.trim();
    const imp = document.getElementById('aportacion-c-importe')?.value;

    if (this.addAportacionCasa(persona, imp)) {
      this.closeModal('modal-aportacion-casa');
      if (window.app && window.app.showToast) {
        window.app.showToast('Aportación registrada', 'success');
      }
    }
  }

  handlePresupuestoSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const val = document.getElementById('presupuesto-p-valor')?.value;
    this.setPresupuestoPersonal(val);
    this.closeModal('modal-presupuesto-personal');
    if (window.app && window.app.showToast) {
      window.app.showToast('Presupuesto actualizado', 'success');
    }
  }
}

// Instanciar globalmente
window.economiaModule = new EconomiaModule();
