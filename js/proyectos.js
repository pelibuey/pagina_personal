/**
 * CRIS Platform - Subproyecto: Proyectos Cris (Hoja de Cálculo / Tipo Excel)
 * Archivo: js/proyectos.js
 * 
 * Funcionalidades completas:
 * - Vista Hoja de Cálculo interactiva (Excel / Google Sheets / Airtable style).
 * - Vista Tarjetas / Kanban alternativa.
 * - Columnas: #, Nombre, Categoría, Estado, Prioridad, Web/Enlace, Usuario/Email,
 *   Contraseña (con máscara, visualización individual/global, generador seguro y copiado rápido),
 *   Notas / Apuntes / Resumen, Fecha y Acciones.
 * - Fila rápida inferior para añadir filas como en Excel real.
 * - Exportación e importación en formato CSV (Excel con UTF-8 BOM) y Backup JSON.
 * - Búsqueda en tiempo real y filtros avanzados por Estado, Categoría y Prioridad.
 * - Persistencia permanente en localStorage sincronizada con el Dashboard CRIS.
 */

class ProyectosCrisModule {
  constructor() {
    this.storageKey = 'cris_proyectos_data';
    this.currentViewMode = 'excel'; // 'excel' | 'cards'
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.filterCategory = 'all';
    this.filterPriority = 'all';
    this.visiblePasswords = new Set();
    this.showAllPasswords = false;
    this.editingId = null;
    this.deleteTargetId = null;

    // Cargar datos
    this.projects = this.loadData();

    this.init();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Si contenía los proyectos de prueba iniciales, limpiarlo a lista vacía
          const isInitialDemo = parsed.length === 4 && parsed.some(p => p.id === 'proj-1' && p.name === 'Plataforma Central CRIS');
          if (isInitialDemo) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
            return [];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error al cargar datos de Proyectos Cris:', e);
    }
    const defaultData = this.getDefaultProjects();
    this.saveData(defaultData);
    return defaultData;
  }

  saveData(dataToSave) {
    try {
      const data = dataToSave || this.projects;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      // Notificar a la plataforma para actualizar KPIs del Hub central
      window.dispatchEvent(new CustomEvent('studyflow:change', { detail: { proyectos: data } }));
    } catch (e) {
      console.error('Error al guardar datos de Proyectos Cris:', e);
    }
  }

  getDefaultProjects() {
    return [];
  }

  init() {
    // Escuchar eventos globales si es necesario
    window.addEventListener('resize', () => {
      // Reajuste responsivo si se precisa
    });
  }

  // --- MÉTODOS DE DATOS ---

  getProjects() {
    return this.projects;
  }

  getMetrics() {
    const total = this.projects.length;
    const active = this.projects.filter(p => p.status === 'Activo').length;
    const inDev = this.projects.filter(p => p.status === 'En Desarrollo').length;
    const ideas = this.projects.filter(p => p.status === 'Idea').length;
    const completed = this.projects.filter(p => p.status === 'Finalizado').length;
    const paused = this.projects.filter(p => p.status === 'Pausado').length;
    const withCredentials = this.projects.filter(p => p.user || p.password).length;

    return { total, active, inDev, ideas, completed, paused, withCredentials };
  }

  getCategories() {
    const defaultCats = ['Personal', 'Negocio', 'Trabajo', 'Estudios', 'Web / App', 'Finanzas', 'Idea', 'Otros'];
    const usedCats = this.projects.map(p => p.category).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...usedCats]));
  }

  getFilteredProjects() {
    return this.projects.filter(p => {
      // Filtro de búsqueda
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchWeb = (p.web || '').toLowerCase().includes(q);
        const matchUser = (p.user || '').toLowerCase().includes(q);
        const matchSummary = (p.summary || '').toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchWeb && !matchUser && !matchSummary) {
          return false;
        }
      }

      // Filtro de Estado
      if (this.filterStatus !== 'all' && p.status !== this.filterStatus) {
        return false;
      }

      // Filtro de Categoría
      if (this.filterCategory !== 'all' && p.category !== this.filterCategory) {
        return false;
      }

      // Filtro de Prioridad
      if (this.filterPriority !== 'all' && p.priority !== this.filterPriority) {
        return false;
      }

      return true;
    });
  }

  addProject(projectData) {
    const newProject = {
      id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: projectData.name || 'Nuevo Proyecto / Tarea',
      category: projectData.category || 'Personal',
      status: projectData.status || 'Idea',
      priority: projectData.priority || 'Media',
      web: projectData.web || '',
      user: projectData.user || '',
      password: projectData.password || '',
      summary: projectData.summary || '',
      deadline: projectData.deadline || '',
      createdAt: new Date().toISOString()
    };

    this.projects.unshift(newProject);
    this.saveData();
    this.render();
    this.showToast('✅ Fila añadida correctamente');
    return newProject;
  }

  updateProject(id, updatedData) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.projects[index] = {
      ...this.projects[index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    this.saveData();
    this.render();
    this.showToast('💾 Cambios guardados correctamente');
    return true;
  }

  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveData();
    this.render();
    this.showToast('🗑️ Proyecto eliminado');
  }

  duplicateProject(id) {
    const original = this.projects.find(p => p.id === id);
    if (!original) return;

    const copy = {
      ...original,
      id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: `${original.name} (Copia)`,
      createdAt: new Date().toISOString()
    };

    this.projects.unshift(copy);
    this.saveData();
    this.render();
    this.showToast('📋 Proyecto duplicado');
  }

  updateQuickCell(id, field, value) {
    const proj = this.projects.find(p => p.id === id);
    if (proj) {
      proj[field] = value;
      proj.updatedAt = new Date().toISOString();
      this.saveData();
      this.showToast('Fila actualizada', 'info');
    }
  }

  // --- MÉTODOS DE CONTRASEÑAS ---

  togglePasswordVisibility(id) {
    if (this.visiblePasswords.has(id)) {
      this.visiblePasswords.delete(id);
    } else {
      this.visiblePasswords.add(id);
    }
    this.render();
  }

  toggleAllPasswords() {
    this.showAllPasswords = !this.showAllPasswords;
    if (this.showAllPasswords) {
      this.projects.forEach(p => this.visiblePasswords.add(p.id));
    } else {
      this.visiblePasswords.clear();
    }
    this.render();
  }

  generateRandomPassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  copyToClipboard(text, label = 'Dato') {
    if (!text) {
      this.showToast('No hay nada que copiar', 'info');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`📋 ${label} copiado al portapapeles`);
    }).catch(err => {
      console.error('Error al copiar:', err);
      // Fallback
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.showToast(`📋 ${label} copiado`);
    });
  }

  // --- EXPORTACIÓN E IMPORTACIÓN ---

  exportToCSV() {
    if (this.projects.length === 0) {
      this.showToast('No hay datos para exportar', 'info');
      return;
    }

    const headers = [
      '#',
      'Nombre del Proyecto / Asunto',
      'Categoría',
      'Estado',
      'Prioridad',
      'Sitio Web / URL',
      'Usuario / Email',
      'Contraseña / Clave',
      'Notas / Resumen / Mis Cosas',
      'Fecha / Plazo',
      'Fecha Creación'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = this.projects.map((p, idx) => [
      idx + 1,
      escapeCSV(p.name),
      escapeCSV(p.category),
      escapeCSV(p.status),
      escapeCSV(p.priority),
      escapeCSV(p.web),
      escapeCSV(p.user),
      escapeCSV(p.password),
      escapeCSV(p.summary),
      escapeCSV(p.deadline),
      escapeCSV(p.createdAt ? p.createdAt.split('T')[0] : '')
    ]);

    // Usar punto y coma para máxima compatibilidad con Microsoft Excel en español
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Proyectos_Cris_Excel_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('📊 Archivo Excel (CSV) descargado con éxito');
  }

  exportToJSON() {
    const dataStr = JSON.stringify(this.projects, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Proyectos_Cris_Backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('💾 Backup JSON descargado correctamente');
  }

  importFromJSONFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.projects = parsed;
          this.saveData();
          this.render();
          this.showToast(`✅ ${parsed.length} proyectos importados con éxito`);
        } else {
          this.showToast('El archivo JSON no tiene un formato válido', 'error');
        }
      } catch (err) {
        console.error('Error importando JSON:', err);
        this.showToast('Error al leer el archivo JSON', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // --- TOAST NOTIFICATION ---

  showToast(message, type = 'success') {
    if (window.app && window.app.showToast) {
      window.app.showToast(message, type);
      return;
    }

    let toast = document.getElementById('proyectos-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'proyectos-toast';
      toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none flex items-center gap-2 border border-slate-700';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.remove('translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2600);
  }

  // --- RENDERIZADO PRINCIPAL ---

  render() {
    const container = document.getElementById('proyectos-view-container');
    if (!container) return;

    const filtered = this.getFilteredProjects();
    const metrics = this.getMetrics();
    const categories = this.getCategories();

    container.innerHTML = `
      <!-- CABECERA EXCEL / PLATAFORMA PROYECTOS CRIS -->
      <div class="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -top-10 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
              <span>CRIS • Subproyecto: Proyectos Cris (Hoja de Cálculo)</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Proyectos Cris</span>
              <span class="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-400/40 text-emerald-200">
                Vista Excel
              </span>
            </h1>
            <p class="text-emerald-100 text-xs md:text-sm max-w-2xl font-medium">
              Tu hoja de cálculo interactiva para apuntar todos tus proyectos, ideas, credenciales seguras, tareas y notas en un solo lugar.
            </p>
          </div>

          <!-- Botones de Acción del Banner -->
          <div class="flex items-center flex-wrap gap-2">
            <button onclick="window.proyectosModule.openModal()" class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs shadow-lg transition active:scale-95 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4 text-emerald-700 stroke-[2.5]"></i>
              <span>+ Añadir Proyecto / Fila</span>
            </button>
            <button onclick="window.proyectosModule.exportToCSV()" class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-500/40 transition cursor-pointer" title="Descargar como archivo CSV compatible con Excel">
              <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-300"></i>
              <span>Descargar Excel</span>
            </button>
            <button onclick="window.proyectosModule.exportToJSON()" class="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-500/40 transition cursor-pointer" title="Guardar copia JSON">
              <i data-lucide="download" class="w-4 h-4"></i>
              <span>Backup</span>
            </button>
            <label class="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-500/40 transition cursor-pointer" title="Importar copia JSON">
              <i data-lucide="upload" class="w-4 h-4"></i>
              <span>Importar</span>
              <input type="file" accept=".json" onchange="window.proyectosModule.importFromJSONFile(event)" class="hidden">
            </label>
          </div>
        </div>
      </div>

      <!-- KPIS ESTADÍSTICAS RÁPIDAS (EXCEL FORMULAS / RESUMEN) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- Total -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Filas</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-slate-900 dark:text-white">${metrics.total}</span>
            <i data-lucide="layers" class="w-4 h-4 text-slate-400"></i>
          </div>
        </div>

        <!-- Activos -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <span class="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">🚀 Activos</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">${metrics.active}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">En uso</span>
          </div>
        </div>

        <!-- En Desarrollo -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
          <span class="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">🛠️ En Curso</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-blue-600 dark:text-blue-400">${metrics.inDev}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">Trabajando</span>
          </div>
        </div>

        <!-- Ideas -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
          <span class="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">💡 Ideas</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-amber-600 dark:text-amber-400">${metrics.ideas}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">Futuras</span>
          </div>
        </div>

        <!-- Finalizados -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-purple-200/80 dark:border-purple-900/50 shadow-xs">
          <span class="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">✅ Finalizados</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-purple-600 dark:text-purple-400">${metrics.completed}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">Listos</span>
          </div>
        </div>

        <!-- Credenciales -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">🔒 Accesos / Claves</span>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xl font-black text-slate-900 dark:text-white">${metrics.withCredentials}</span>
            <i data-lucide="key" class="w-4 h-4 text-emerald-500"></i>
          </div>
        </div>
      </div>

      <!-- BARRA DE HERRAMIENTAS, BÚSQUEDA Y FILTROS (EXCEL RIBBON STYLE) -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <!-- Búsqueda en vivo -->
          <div class="relative flex-1 min-w-[240px]">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              id="proyectos-search-input"
              value="${this.searchQuery}"
              oninput="window.proyectosModule.handleSearch(this.value)"
              placeholder="Buscar en toda la hoja (nombre, categoría, web, usuario, notas)..."
              class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
          </div>

          <!-- Filtros desplegables -->
          <div class="flex items-center flex-wrap gap-2">
            <!-- Estado -->
            <select 
              onchange="window.proyectosModule.handleFilterStatus(this.value)" 
              class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos los Estados</option>
              <option value="Activo" ${this.filterStatus === 'Activo' ? 'selected' : ''}>🚀 Activo</option>
              <option value="En Desarrollo" ${this.filterStatus === 'En Desarrollo' ? 'selected' : ''}>🛠️ En Desarrollo</option>
              <option value="Idea" ${this.filterStatus === 'Idea' ? 'selected' : ''}>💡 Idea</option>
              <option value="Pausado" ${this.filterStatus === 'Pausado' ? 'selected' : ''}>⏸️ Pausado</option>
              <option value="Finalizado" ${this.filterStatus === 'Finalizado' ? 'selected' : ''}>✅ Finalizado</option>
            </select>

            <!-- Categoría -->
            <select 
              onchange="window.proyectosModule.handleFilterCategory(this.value)" 
              class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>Todas las Categorías</option>
              ${categories.map(cat => `
                <option value="${cat}" ${this.filterCategory === cat ? 'selected' : ''}>📁 ${cat}</option>
              `).join('')}
            </select>

            <!-- Prioridad -->
            <select 
              onchange="window.proyectosModule.handleFilterPriority(this.value)" 
              class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all" ${this.filterPriority === 'all' ? 'selected' : ''}>Todas las Prioridades</option>
              <option value="Alta" ${this.filterPriority === 'Alta' ? 'selected' : ''}>🔴 Alta</option>
              <option value="Media" ${this.filterPriority === 'Media' ? 'selected' : ''}>🟡 Media</option>
              <option value="Baja" ${this.filterPriority === 'Baja' ? 'selected' : ''}>🟢 Baja</option>
            </select>

            <!-- Toggle Visibilidad de Todas las Contraseñas -->
            <button 
              onclick="window.proyectosModule.toggleAllPasswords()" 
              class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Mostrar u ocultar todas las contraseñas al mismo tiempo"
            >
              <i data-lucide="${this.showAllPasswords ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
              <span>${this.showAllPasswords ? 'Ocultar Claves' : 'Ver Claves'}</span>
            </button>

            <!-- Selector de Vista (Excel / Tarjetas) -->
            <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <button 
                onclick="window.proyectosModule.setViewMode('excel')" 
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentViewMode === 'excel' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                title="Vista Hoja de Cálculo tipo Excel"
              >
                <i data-lucide="table" class="w-3.5 h-3.5"></i>
              </button>
              <button 
                onclick="window.proyectosModule.setViewMode('cards')" 
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition ${this.currentViewMode === 'cards' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                title="Vista Tarjetas / Kanban"
              >
                <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Indicador de Resultados Filtrados -->
        <div class="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <span>Mostrando ${filtered.length} de ${this.projects.length} registros</span>
          ${(this.searchQuery || this.filterStatus !== 'all' || this.filterCategory !== 'all' || this.filterPriority !== 'all') ? `
            <button onclick="window.proyectosModule.resetFilters()" class="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
              Limpiar filtros
            </button>
          ` : ''}
        </div>
      </div>

      <!-- VISTA PRINCIPAL SEGÚN MODO SELECCIONADO -->
      ${this.currentViewMode === 'excel' ? this.renderExcelTable(filtered) : this.renderCardsView(filtered)}

      <!-- MODAL DE CREACIÓN / EDICIÓN -->
      <div id="modal-proyecto-form" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div class="p-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 id="modal-proyecto-title" class="text-base font-black text-slate-900 dark:text-white">Añadir Proyecto / Fila</h3>
                <p class="text-xs text-slate-400">Completa los campos para registrar en tu hoja</p>
              </div>
            </div>
            <button type="button" onclick="window.proyectosModule.closeModal()" class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="form-proyecto" onsubmit="window.proyectosModule.handleFormSubmit(event)" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <input type="hidden" id="form-proj-id" value="">

            <!-- Nombre -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Proyecto / Asunto *</label>
              <input type="text" id="form-proj-name" required placeholder="Ej: Tienda Online, Dashboard Facturación, TFG..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <!-- Categoría, Estado y Prioridad -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <input type="text" id="form-proj-category" list="categories-list" placeholder="Personal, Negocio..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <datalist id="categories-list">
                  ${categories.map(c => `<option value="${c}"></option>`).join('')}
                </datalist>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                <select id="form-proj-status" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="Idea">💡 Idea</option>
                  <option value="En Desarrollo">🛠️ En Desarrollo</option>
                  <option value="Activo" selected>🚀 Activo</option>
                  <option value="Pausado">⏸️ Pausado</option>
                  <option value="Finalizado">✅ Finalizado</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prioridad</label>
                <select id="form-proj-priority" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="Alta">🔴 Alta</option>
                  <option value="Media" selected>🟡 Media</option>
                  <option value="Baja">🟢 Baja</option>
                </select>
              </div>
            </div>

            <!-- Web / URL -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sitio Web / URL / Enlace</label>
              <input type="text" id="form-proj-web" placeholder="https://ejemplo.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <!-- Usuario y Contraseña con Generador -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Usuario / Email</label>
                <input type="text" id="form-proj-user" placeholder="admin@ejemplo.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">Contraseña / Clave</label>
                  <button type="button" onclick="window.proyectosModule.fillGeneratedPassword()" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
                    <i data-lucide="key" class="w-3 h-3"></i>
                    <span>Generar Segura</span>
                  </button>
                </div>
                <div class="relative">
                  <input type="text" id="form-proj-password" placeholder="Clave o contraseña" class="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <button type="button" onclick="window.proyectosModule.toggleFormPasswordVisibility()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <i data-lucide="eye" id="form-pass-eye-icon" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Fecha / Plazo -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha / Plazo de Entrega</label>
              <input type="date" id="form-proj-deadline" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            </div>

            <!-- Notas / Resumen / Mis Cosas -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notas / Resumen / Mis Cosas</label>
              <textarea id="form-proj-summary" rows="3" placeholder="Apuntes, detalles, cosas pendientes, ideas, credenciales adicionales o recordatorios..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
            </div>

            <!-- Botones de Acción -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
              <button type="button" onclick="window.proyectosModule.closeModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                Cancelar
              </button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5">
                <i data-lucide="check" class="w-4 h-4"></i>
                <span id="form-btn-submit-text">Guardar en la Hoja</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL DE CONFIRMACIÓN DE BORRADO -->
      <div id="modal-delete-proyecto" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
            <i data-lucide="trash-2" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-base font-black text-slate-900 dark:text-white">¿Eliminar este registro?</h4>
            <p id="delete-proj-name-label" class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Esta acción quitará la fila permanentemente.</p>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onclick="window.proyectosModule.closeDeleteModal()" class="py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
              Cancelar
            </button>
            <button type="button" onclick="window.proyectosModule.confirmDelete()" class="py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;

    // Re-renderizar iconos de Lucide
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- RENDERIZADO TABLA HOJA DE CÁLCULO EXCEL ---

  renderExcelTable(projects) {
    return `
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        
        <!-- Contenedor con scroll horizontal para emular hoja de cálculo grande -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <!-- Encabezados de Columna con estética Excel -->
            <thead>
              <tr class="bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider select-none">
                <th class="py-3 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-700">#</th>
                <th class="py-3 px-4 min-w-[200px] border-r border-slate-200 dark:border-slate-700">Proyecto / Asunto</th>
                <th class="py-3 px-3 min-w-[120px] border-r border-slate-200 dark:border-slate-700">Categoría</th>
                <th class="py-3 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-700">Estado</th>
                <th class="py-3 px-3 min-w-[100px] border-r border-slate-200 dark:border-slate-700">Prioridad</th>
                <th class="py-3 px-3 min-w-[160px] border-r border-slate-200 dark:border-slate-700">Web / Enlace</th>
                <th class="py-3 px-3 min-w-[170px] border-r border-slate-200 dark:border-slate-700">Usuario / Email</th>
                <th class="py-3 px-3 min-w-[180px] border-r border-slate-200 dark:border-slate-700">Contraseña / Clave</th>
                <th class="py-3 px-4 min-w-[240px] border-r border-slate-200 dark:border-slate-700">Notas / Resumen / Mis Cosas</th>
                <th class="py-3 px-3 min-w-[110px] border-r border-slate-200 dark:border-slate-700">Plazo / Fecha</th>
                <th class="py-3 px-3 text-center min-w-[90px]">Acciones</th>
              </tr>
            </thead>

            <!-- Filas de la Hoja de Cálculo -->
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              ${projects.length === 0 ? `
                <tr>
                  <td colspan="11" class="py-12 px-4 text-center">
                    <div class="max-w-md mx-auto space-y-3">
                      <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                        <i data-lucide="file-spreadsheet" class="w-6 h-6"></i>
                      </div>
                      <div>
                        <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Hoja de Proyectos Vacía</h4>
                        <p class="text-xs text-slate-400 mt-0.5">Añade tus propios proyectos, ideas, contraseñas y notas.</p>
                      </div>
                      <button onclick="window.proyectosModule.openModal()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>+ Añadir Primera Fila</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ` : projects.map((p, idx) => this.renderTableRow(p, idx + 1)).join('')}

              <!-- Fila rápida inferior para añadir directamente estilo Excel -->
              <tr class="bg-slate-50/60 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition group">
                <td class="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700">
                  +
                </td>
                <td colspan="9" class="py-2.5 px-4 border-r border-slate-200 dark:border-slate-700">
                  <button onclick="window.proyectosModule.openModal()" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    <span>Hacer clic para añadir una nueva fila a la hoja de proyectos...</span>
                  </button>
                </td>
                <td class="py-2.5 px-3 text-center">
                  <button onclick="window.proyectosModule.openModal()" class="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition" title="Añadir">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pie de Tabla con Estadísticas de Fórmulas -->
        <div class="bg-slate-50 dark:bg-slate-900/90 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <div class="flex items-center gap-4">
            <span><strong class="text-slate-800 dark:text-white">${projects.length}</strong> filas registradas</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.proyectosModule.exportToCSV()" class="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Exportar tabla (.csv)</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  renderTableRow(p, rowNum) {
    const isPassVisible = this.visiblePasswords.has(p.id);

    // Badges de Estado
    const statusBadges = {
      'Activo': 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'En Desarrollo': 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'Idea': 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Pausado': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
      'Finalizado': 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };

    // Badges de Prioridad
    const priorityBadges = {
      'Alta': 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      'Media': 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Baja': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
    };

    const statusClass = statusBadges[p.status] || statusBadges['Idea'];
    const priorityClass = priorityBadges[p.priority] || priorityBadges['Media'];

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition group">
        <!-- # Número de fila -->
        <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 font-bold">
          ${rowNum}
        </td>

        <!-- Nombre del Proyecto -->
        <td class="py-3 px-4 border-r border-slate-200 dark:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer" onclick="window.proyectosModule.openModal('${p.id}')">
              ${this.escapeHtml(p.name)}
            </span>
          </div>
        </td>

        <!-- Categoría -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
            ${this.escapeHtml(p.category || 'General')}
          </span>
        </td>

        <!-- Estado interactivo -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          <select 
            onchange="window.proyectosModule.updateQuickCell('${p.id}', 'status', this.value)"
            class="text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${statusClass} bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Idea" ${p.status === 'Idea' ? 'selected' : ''}>💡 Idea</option>
            <option value="En Desarrollo" ${p.status === 'En Desarrollo' ? 'selected' : ''}>🛠️ En Desarrollo</option>
            <option value="Activo" ${p.status === 'Activo' ? 'selected' : ''}>🚀 Activo</option>
            <option value="Pausado" ${p.status === 'Pausado' ? 'selected' : ''}>⏸️ Pausado</option>
            <option value="Finalizado" ${p.status === 'Finalizado' ? 'selected' : ''}>✅ Finalizado</option>
          </select>
        </td>

        <!-- Prioridad -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityClass}">
            ${p.priority || 'Media'}
          </span>
        </td>

        <!-- Web / URL con apertura directa -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          ${p.web ? `
            <div class="flex items-center gap-1.5 max-w-[150px]">
              <a href="${p.web.startsWith('http') ? p.web : 'https://' + p.web}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:underline truncate flex items-center gap-1 font-semibold" title="${p.web}">
                <i data-lucide="external-link" class="w-3 h-3 flex-shrink-0"></i>
                <span class="truncate">${this.escapeHtml(p.web.replace(/^https?:\/\//, ''))}</span>
              </a>
              <button onclick="window.proyectosModule.copyToClipboard('${this.escapeHtml(p.web)}', 'Enlace')" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Copiar enlace">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            </div>
          ` : `
            <span class="text-slate-400 dark:text-slate-600 italic text-[11px]">—</span>
          `}
        </td>

        <!-- Usuario / Email con botón copiar -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          ${p.user ? `
            <div class="flex items-center justify-between gap-1 max-w-[160px]">
              <span class="truncate font-mono text-[11px] text-slate-800 dark:text-slate-200" title="${p.user}">
                ${this.escapeHtml(p.user)}
              </span>
              <button onclick="window.proyectosModule.copyToClipboard('${this.escapeHtml(p.user)}', 'Usuario')" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition flex-shrink-0" title="Copiar usuario">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            </div>
          ` : `
            <span class="text-slate-400 dark:text-slate-600 italic text-[11px]">—</span>
          `}
        </td>

        <!-- Contraseña con máscara y copiado -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          ${p.password ? `
            <div class="flex items-center justify-between gap-1 max-w-[170px]">
              <span class="font-mono text-[11px] truncate ${isPassVisible ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-400 tracking-wider'}">
                ${isPassVisible ? this.escapeHtml(p.password) : '••••••••••••'}
              </span>
              <div class="flex items-center gap-0.5 flex-shrink-0">
                <button onclick="window.proyectosModule.togglePasswordVisibility('${p.id}')" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition" title="${isPassVisible ? 'Ocultar' : 'Ver'} clave">
                  <i data-lucide="${isPassVisible ? 'eye-off' : 'eye'}" class="w-3 h-3"></i>
                </button>
                <button onclick="window.proyectosModule.copyToClipboard('${this.escapeHtml(p.password)}', 'Contraseña')" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Copiar contraseña">
                  <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          ` : `
            <span class="text-slate-400 dark:text-slate-600 italic text-[11px]">—</span>
          `}
        </td>

        <!-- Notas / Resumen / Mis Cosas -->
        <td class="py-3 px-4 border-r border-slate-200 dark:border-slate-700">
          <p class="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 max-w-sm" title="${this.escapeHtml(p.summary || '')}">
            ${this.escapeHtml(p.summary || 'Sin notas registradas.')}
          </p>
        </td>

        <!-- Fecha / Plazo -->
        <td class="py-3 px-3 border-r border-slate-200 dark:border-slate-700">
          <span class="text-[11px] text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
            ${p.deadline ? p.deadline : (p.createdAt ? p.createdAt.split('T')[0] : '—')}
          </span>
        </td>

        <!-- Acciones -->
        <td class="py-3 px-3 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="window.proyectosModule.openModal('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition" title="Editar fila">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.proyectosModule.duplicateProject('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition" title="Duplicar fila">
              <i data-lucide="copy-plus" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.proyectosModule.openDeleteModal('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Eliminar fila">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // --- RENDERIZADO VISTA TARJETAS / KANBAN ---

  renderCardsView(projects) {
    if (projects.length === 0) {
      return this.renderExcelTable(projects);
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${projects.map(p => {
          const isPassVisible = this.visiblePasswords.has(p.id);
          return `
            <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    📁 ${this.escapeHtml(p.category || 'General')}
                  </span>
                  <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${p.status === 'Activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}">
                    ${p.status}
                  </span>
                </div>

                <div>
                  <h4 class="text-base font-black text-slate-900 dark:text-white">${this.escapeHtml(p.name)}</h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">${this.escapeHtml(p.summary || 'Sin descripción.')}</p>
                </div>

                <!-- Credenciales Rápidas -->
                ${(p.user || p.password || p.web) ? `
                  <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs font-mono">
                    ${p.web ? `
                      <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span class="text-[10px] text-slate-400 uppercase font-sans font-bold">Web:</span>
                        <a href="${p.web.startsWith('http') ? p.web : 'https://' + p.web}" target="_blank" class="text-emerald-600 hover:underline truncate max-w-[160px]">${p.web}</a>
                      </div>
                    ` : ''}
                    ${p.user ? `
                      <div class="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span class="text-[10px] text-slate-400 uppercase font-sans font-bold">Usuario:</span>
                        <div class="flex items-center gap-1">
                          <span class="truncate max-w-[140px]">${p.user}</span>
                          <button onclick="window.proyectosModule.copyToClipboard('${this.escapeHtml(p.user)}', 'Usuario')" class="text-slate-400 hover:text-slate-600"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                      </div>
                    ` : ''}
                    ${p.password ? `
                      <div class="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span class="text-[10px] text-slate-400 uppercase font-sans font-bold">Clave:</span>
                        <div class="flex items-center gap-1">
                          <span>${isPassVisible ? p.password : '••••••••'}</span>
                          <button onclick="window.proyectosModule.togglePasswordVisibility('${p.id}')" class="text-slate-400 hover:text-emerald-600"><i data-lucide="${isPassVisible ? 'eye-off' : 'eye'}" class="w-3 h-3"></i></button>
                          <button onclick="window.proyectosModule.copyToClipboard('${this.escapeHtml(p.password)}', 'Clave')" class="text-slate-400 hover:text-slate-600"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Footer de la tarjeta -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400">${p.deadline ? 'Plazo: ' + p.deadline : 'Prioridad: ' + p.priority}</span>
                <div class="flex items-center gap-1">
                  <button onclick="window.proyectosModule.openModal('${p.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                  <button onclick="window.proyectosModule.openDeleteModal('${p.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- GESTIÓN DE EVENTOS DE FILTROS & VISTAS ---

  handleSearch(query) {
    this.searchQuery = query;
    this.render();
    const input = document.getElementById('proyectos-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  handleFilterStatus(status) {
    this.filterStatus = status;
    this.render();
  }

  handleFilterCategory(cat) {
    this.filterCategory = cat;
    this.render();
  }

  handleFilterPriority(prio) {
    this.filterPriority = prio;
    this.render();
  }

  resetFilters() {
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.filterCategory = 'all';
    this.filterPriority = 'all';
    this.render();
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    this.render();
  }

  // --- MODAL DE FORMULARIO ---

  openModal(id = null) {
    this.editingId = id;
    const modal = document.getElementById('modal-proyecto-form');
    const titleEl = document.getElementById('modal-proyecto-title');
    const btnTextEl = document.getElementById('form-btn-submit-text');

    if (!modal) return;

    if (id) {
      const p = this.projects.find(proj => proj.id === id);
      if (p) {
        if (titleEl) titleEl.textContent = 'Editar Proyecto / Fila';
        if (btnTextEl) btnTextEl.textContent = 'Guardar Cambios';
        document.getElementById('form-proj-id').value = p.id;
        document.getElementById('form-proj-name').value = p.name || '';
        document.getElementById('form-proj-category').value = p.category || 'Personal';
        document.getElementById('form-proj-status').value = p.status || 'Activo';
        document.getElementById('form-proj-priority').value = p.priority || 'Media';
        document.getElementById('form-proj-web').value = p.web || '';
        document.getElementById('form-proj-user').value = p.user || '';
        document.getElementById('form-proj-password').value = p.password || '';
        document.getElementById('form-proj-deadline').value = p.deadline || '';
        document.getElementById('form-proj-summary').value = p.summary || '';
      }
    } else {
      if (titleEl) titleEl.textContent = 'Añadir Proyecto / Fila';
      if (btnTextEl) btnTextEl.textContent = 'Guardar en la Hoja';
      document.getElementById('form-proj-id').value = '';
      document.getElementById('form-proj-name').value = '';
      document.getElementById('form-proj-category').value = 'Personal';
      document.getElementById('form-proj-status').value = 'Activo';
      document.getElementById('form-proj-priority').value = 'Media';
      document.getElementById('form-proj-web').value = '';
      document.getElementById('form-proj-user').value = '';
      document.getElementById('form-proj-password').value = '';
      document.getElementById('form-proj-deadline').value = '';
      document.getElementById('form-proj-summary').value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
      document.getElementById('form-proj-name')?.focus();
    }, 50);
  }

  closeModal() {
    const modal = document.getElementById('modal-proyecto-form');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.editingId = null;
  }

  handleFormSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const id = document.getElementById('form-proj-id').value;
    const projectData = {
      name: document.getElementById('form-proj-name').value.trim(),
      category: document.getElementById('form-proj-category').value.trim() || 'Personal',
      status: document.getElementById('form-proj-status').value,
      priority: document.getElementById('form-proj-priority').value,
      web: document.getElementById('form-proj-web').value.trim(),
      user: document.getElementById('form-proj-user').value.trim(),
      password: document.getElementById('form-proj-password').value.trim(),
      deadline: document.getElementById('form-proj-deadline').value,
      summary: document.getElementById('form-proj-summary').value.trim()
    };

    if (!projectData.name) {
      this.showToast('El nombre del proyecto es obligatorio', 'error');
      return;
    }

    if (id) {
      this.updateProject(id, projectData);
    } else {
      this.addProject(projectData);
    }

    this.closeModal();
  }

  fillGeneratedPassword() {
    const generated = this.generateRandomPassword(16);
    const passInput = document.getElementById('form-proj-password');
    if (passInput) {
      passInput.value = generated;
      passInput.type = 'text';
      this.showToast('🔑 Contraseña segura generada');
    }
  }

  toggleFormPasswordVisibility() {
    const passInput = document.getElementById('form-proj-password');
    if (!passInput) return;
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  }

  // --- BORRADO ---

  openDeleteModal(id) {
    this.deleteTargetId = id;
    const proj = this.projects.find(p => p.id === id);
    const modal = document.getElementById('modal-delete-proyecto');
    const label = document.getElementById('delete-proj-name-label');

    if (modal && proj) {
      if (label) label.textContent = `¿Seguro que deseas eliminar "${proj.name}"?`;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeDeleteModal() {
    const modal = document.getElementById('modal-delete-proyecto');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.deleteTargetId = null;
  }

  confirmDelete() {
    if (this.deleteTargetId) {
      this.deleteProject(this.deleteTargetId);
      this.closeDeleteModal();
    }
  }

  loadSampleData() {
    this.projects = this.getDefaultProjects();
    this.saveData();
    this.render();
    this.showToast('📋 Proyectos de ejemplo cargados');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instanciar globalmente
window.proyectosModule = new ProyectosCrisModule();
