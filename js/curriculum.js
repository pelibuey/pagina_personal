/**
 * StudyFlow - Curriculum & Academic Progress Module
 * Control de asignaturas cursadas, convalidadas, en curso y pendientes para ADE y Marketing.
 */

class CurriculumModule {
  constructor() {
    const active = window.studyStore ? window.studyStore.getActiveStudyFilter() : 'marketing';
    this.currentStudy = (active === 'ade') ? 'ade' : 'marketing';
    this.currentFilter = 'all'; // 'all' | 'cursando' | 'cursada' | 'convalidada' | 'pendiente'

    this.container = document.getElementById('curriculum-container');
    this.adeTabBtn = document.getElementById('tab-cur-ade');
    this.mktTabBtn = document.getElementById('tab-cur-mkt');
    this.progressBar = document.getElementById('curriculum-progress-bar');
    this.progressPercentEl = document.getElementById('curriculum-progress-percent');
    this.progressStatsEl = document.getElementById('curriculum-progress-stats');

    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      const active = window.studyStore.getActiveStudyFilter();
      if (active === 'ade') {
        this.currentStudy = 'ade';
      } else if (active === 'marketing') {
        this.currentStudy = 'marketing';
      }
      this.updateTabs();
      this.render();
    });
    this.bindEvents();
    const active = window.studyStore.getActiveStudyFilter();
    if (active === 'ade') {
      this.currentStudy = 'ade';
    } else {
      this.currentStudy = 'marketing';
    }
    this.updateTabs();
    this.render();
  }

  bindEvents() {
    if (this.adeTabBtn) {
      this.adeTabBtn.addEventListener('click', () => {
        this.currentStudy = 'ade';
        this.updateTabs();
        this.render();
      });
    }

    if (this.mktTabBtn) {
      this.mktTabBtn.addEventListener('click', () => {
        this.currentStudy = 'marketing';
        this.updateTabs();
        this.render();
      });
    }

    const filterBtns = document.querySelectorAll('[data-cur-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.currentTarget.getAttribute('data-cur-filter');
        filterBtns.forEach(b => {
          b.classList.remove('bg-purple-600', 'text-white');
          b.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
        });
        e.currentTarget.classList.add('bg-purple-600', 'text-white');
        e.currentTarget.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
        this.render();
      });
    });

    const addCurBtn = document.getElementById('btn-add-curriculum-item');
    if (addCurBtn) {
      addCurBtn.addEventListener('click', () => this.openCurriculumModal());
    }

    const formCur = document.getElementById('form-curriculum-item');
    if (formCur) {
      formCur.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveCurriculumItem();
      });
    }
  }

  updateTabs() {
    // Ambos botones siempre visibles y accesibles para alternar en cualquier momento
    if (this.adeTabBtn) this.adeTabBtn.classList.remove('hidden');
    if (this.mktTabBtn) this.mktTabBtn.classList.remove('hidden');

    if (this.currentStudy === 'marketing') {
      if (this.mktTabBtn) {
        this.mktTabBtn.className = 'px-5 py-2 rounded-xl text-xs font-bold transition bg-purple-600 text-white shadow-sm flex items-center gap-2';
      }
      if (this.adeTabBtn) {
        this.adeTabBtn.className = 'px-5 py-2 rounded-xl text-xs font-bold transition text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-600 flex items-center gap-2';
      }
    } else {
      if (this.adeTabBtn) {
        this.adeTabBtn.className = 'px-5 py-2 rounded-xl text-xs font-bold transition bg-purple-600 text-white shadow-sm flex items-center gap-2';
      }
      if (this.mktTabBtn) {
        this.mktTabBtn.className = 'px-5 py-2 rounded-xl text-xs font-bold transition text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-600 flex items-center gap-2';
      }
    }
  }

  render() {
    const list = window.studyStore.getCurriculum(this.currentStudy);
    const isMarketing = this.currentStudy === 'marketing';

    let percent = 0;

    const progressTitleEl = document.getElementById('curriculum-progress-title');
    if (progressTitleEl) {
      progressTitleEl.textContent = isMarketing
        ? 'Cálculo por Asignaturas (17 en total • Marketing FP)'
        : 'Cálculo Inverso: 336 Créditos Totales a Cursar (ADE)';
    }

    if (isMarketing) {
      // En FP de Marketing son exactamente 17 asignaturas oficiales (Cálculo solo en asignaturas, sin créditos ni FCT)
      const totalModules = 17;
      const countSuperadas = list.filter(item => item.status === 'cursada').length;
      const countConvalidadas = list.filter(item => item.status === 'convalidada').length;
      const countCursando = list.filter(item => item.status === 'cursando').length;
      const completedModules = countSuperadas + countConvalidadas;

      percent = Math.min(100, Math.round((completedModules / totalModules) * 100));

      const superadasConNota = list.filter(i => i.status === 'cursada' && i.grade !== null && i.grade !== undefined);
      let gpaNotice = '';
      if (superadasConNota.length > 0) {
        const sum = superadasConNota.reduce((acc, i) => acc + Number(i.grade), 0);
        const avg = (sum / superadasConNota.length).toFixed(2);
        gpaNotice = ` • Nota media superadas: ${avg}`;
      }

      if (this.progressBar) this.progressBar.style.width = `${percent}%`;
      if (this.progressPercentEl) this.progressPercentEl.textContent = `${percent}%`;
      if (this.progressStatsEl) {
        this.progressStatsEl.textContent = `${completedModules} de ${totalModules} asignaturas del ciclo (${countSuperadas} superadas con nota, ${countConvalidadas} a convalidar • ${countCursando} en curso este año${gpaNotice})`;
      }
    } else {
      // ADE (Cálculo inverso: 336 créditos totales a cursar)
      const totalCredits = 336;
      const completedCredits = list
        .filter(item => item.status === 'cursada' || item.status === 'convalidada')
        .reduce((sum, item) => sum + (Number(item.credits) || 0), 0);
      const remainingCredits = Math.max(0, totalCredits - completedCredits);

      percent = Math.min(100, Math.round((completedCredits / totalCredits) * 100));

      if (this.progressBar) this.progressBar.style.width = `${percent}%`;
      if (this.progressPercentEl) {
        this.progressPercentEl.innerHTML = `<span class="tabular-nums">${remainingCredits}</span><span class="text-xs font-semibold text-slate-400 block -mt-1">ECTS restantes</span>`;
      }
      if (this.progressStatsEl) {
        if (list.length === 0) {
          this.progressStatsEl.textContent = `336 créditos totales a cursar • 0 créditos completados (Pendiente de recibir asignaturas)`;
        } else {
          this.progressStatsEl.textContent = `${completedCredits} de ${totalCredits} créditos superados • Faltan ${remainingCredits} créditos por cursar (${list.length} asignaturas registradas)`;
        }
      }
    }

    // Contadores de métricas por estado
    const countCursadas = list.filter(i => i.status === 'cursada').length;
    const countConvalidadas = list.filter(i => i.status === 'convalidada').length;
    const countCursando = list.filter(i => i.status === 'cursando').length;
    const countPendientes = list.filter(i => i.status === 'pendiente').length;

    const elCursadas = document.getElementById('stat-cur-cursadas');
    const elConvalidadas = document.getElementById('stat-cur-convalidadas');
    const elCursando = document.getElementById('stat-cur-cursando');
    const elPendientes = document.getElementById('stat-cur-pendientes');

    const elSub1 = document.getElementById('stat-cur-cursadas-sub');
    const elSub2 = document.getElementById('stat-cur-convalidadas-sub');
    const elSub3 = document.getElementById('stat-cur-cursando-sub');
    const elSub4 = document.getElementById('stat-cur-pendientes-sub');

    if (isMarketing) {
      if (elCursadas) elCursadas.textContent = countCursadas;
      if (elConvalidadas) elConvalidadas.textContent = countConvalidadas;
      if (elCursando) elCursando.textContent = countCursando;
      if (elPendientes) elPendientes.textContent = countPendientes;

      if (elSub1) elSub1.textContent = 'asignaturas';
      if (elSub2) elSub2.textContent = 'asignaturas';
      if (elSub3) elSub3.textContent = 'asignaturas';
      if (elSub4) elSub4.textContent = 'asignaturas';
    } else {
      const totalCredits = 336;
      const completedCredits = list
        .filter(item => item.status === 'cursada' || item.status === 'convalidada')
        .reduce((sum, item) => sum + (Number(item.credits) || 0), 0);
      const remainingCredits = Math.max(0, totalCredits - completedCredits);

      if (elCursadas) elCursadas.textContent = countCursadas;
      if (elConvalidadas) elConvalidadas.textContent = countConvalidadas;
      if (elCursando) elCursando.textContent = countCursando;
      if (elPendientes) elPendientes.textContent = remainingCredits;

      if (elSub1) elSub1.textContent = 'superadas';
      if (elSub2) elSub2.textContent = 'convalidadas';
      if (elSub3) elSub3.textContent = 'en curso';
      if (elSub4) elSub4.textContent = 'créditos restantes';
    }

    // Filtrar lista
    let filtered = [...list];
    if (this.currentFilter === 'cursando') {
      filtered = filtered.filter(item => item.status === 'cursando');
    } else if (this.currentFilter === 'cursada') {
      filtered = filtered.filter(item => item.status === 'cursada');
    } else if (this.currentFilter === 'convalidada') {
      filtered = filtered.filter(item => item.status === 'convalidada');
    } else if (this.currentFilter === 'pendiente') {
      filtered = filtered.filter(item => item.status === 'pendiente');
    }

    if (!this.container) return;

    if (filtered.length === 0) {
      const emptyMsg = (!isMarketing && list.length === 0)
        ? `
          <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-purple-300 dark:border-purple-800/50 p-8 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto text-xl">
              <i data-lucide="book-open" class="w-6 h-6"></i>
            </div>
            <h4 class="text-base font-bold text-slate-800 dark:text-slate-100">Expediente de ADE preparado (336 Créditos Totales)</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Se han borrado las asignaturas de ejemplo según lo solicitado. En cuanto me indiques cuáles son tus asignaturas oficiales de ADE, las cargaremos aquí con sus créditos y estado.
            </p>
            <button onclick="window.curriculumModule.openCurriculumModal()" class="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-xs">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Añadir Primera Asignatura
            </button>
          </div>
        `
        : `
          <div class="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
            <p class="text-slate-400 text-xs">No hay asignaturas registradas en este estado.</p>
          </div>
        `;
      this.container.innerHTML = emptyMsg;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    this.container.innerHTML = filtered.map(item => {
      let badge = '';
      let borderLeft = 'border-l-4 ';

      if (item.substatus === 'A convalidar' || item.status === 'convalidada') {
        borderLeft += 'border-cyan-500';
        badge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">A convalidar</span>`;
      } else if (item.substatus === 'Cursar 2027') {
        borderLeft += 'border-pink-500';
        badge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800">Cursar 2027</span>`;
      } else if (item.status === 'cursada') {
        borderLeft += 'border-emerald-500';
        const gradeStr = item.grade !== null && item.grade !== undefined ? `Nota: ${Number(item.grade).toFixed(0)}` : 'Aprobada';
        badge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">${gradeStr}</span>`;
      } else if (item.status === 'cursando') {
        borderLeft += 'border-purple-600';
        badge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 animate-pulse">En Curso</span>`;
      } else {
        borderLeft += 'border-slate-300 dark:border-slate-600';
        badge = `<span class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">${this.escapeHtml(item.substatus || 'Pendiente')}</span>`;
      }

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition flex items-center justify-between gap-3 ${borderLeft}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              ${item.num ? `<span class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">${item.num}</span>` : ''}
              ${item.code ? `<span class="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">${this.escapeHtml(item.code)}</span>` : ''}
              <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">${this.escapeHtml(item.name)}</h4>
              ${(!isMarketing && item.credits) ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium">${item.credits} ECTS</span>` : ''}
            </div>
            <p class="text-xs text-slate-400 mt-1 pl-7">${item.term ? this.escapeHtml(item.term) : 'Sin período'}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            ${badge}
            <div class="flex items-center">
              <button onclick="window.curriculumModule.openCurriculumModal('${item.id}')" title="Editar estado o nota" class="p-1.5 text-slate-400 hover:text-purple-600 transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="window.curriculumModule.deleteItem('${item.id}')" title="Eliminar" class="p-1.5 text-slate-400 hover:text-rose-500 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openCurriculumModal(itemId = null) {
    const modal = document.getElementById('modal-curriculum-item');
    const form = document.getElementById('form-curriculum-item');
    const title = document.getElementById('modal-curriculum-title');
    const creditsGroup = document.getElementById('cur-item-credits')?.parentElement;
    if (!modal || !form) return;

    form.reset();
    document.getElementById('cur-item-id').value = itemId || '';
    document.getElementById('cur-study-id').value = this.currentStudy;

    // En Marketing FP no hay créditos ECTS
    if (creditsGroup) {
      if (this.currentStudy === 'marketing') {
        creditsGroup.classList.add('hidden');
      } else {
        creditsGroup.classList.remove('hidden');
      }
    }

    if (itemId) {
      title.textContent = 'Editar Asignatura del Expediente';
      const item = window.studyStore.getCurriculum(this.currentStudy).find(c => c.id === itemId);
      if (item) {
        document.getElementById('cur-item-name').value = item.name || '';
        document.getElementById('cur-item-credits').value = item.credits || (this.currentStudy === 'marketing' ? '' : 6);
        document.getElementById('cur-item-status').value = item.status || 'pendiente';
        document.getElementById('cur-item-grade').value = item.grade || '';
        document.getElementById('cur-item-term').value = item.term || '';
      }
    } else {
      title.textContent = `Añadir Asignatura a ${this.currentStudy.toUpperCase()}`;
      document.getElementById('cur-item-credits').value = this.currentStudy === 'marketing' ? '' : 6;
      document.getElementById('cur-item-status').value = 'cursando';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('cur-item-name').focus();
  }

  closeCurriculumModal() {
    const modal = document.getElementById('modal-curriculum-item');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveCurriculumItem() {
    const id = document.getElementById('cur-item-id').value;
    const name = document.getElementById('cur-item-name').value.trim();
    const credits = document.getElementById('cur-item-credits').value;
    const status = document.getElementById('cur-item-status').value;
    const grade = document.getElementById('cur-item-grade').value;
    const term = document.getElementById('cur-item-term').value.trim();

    if (!name) return;

    window.studyStore.saveCurriculumSubject(this.currentStudy, {
      id: id || undefined,
      name,
      credits: this.currentStudy === 'marketing' ? null : (Number(credits) || 6),
      status,
      grade: grade !== '' ? Number(grade) : null,
      term: term || 'General'
    });

    this.closeCurriculumModal();
  }

  deleteItem(id) {
    if (confirm('¿Eliminar esta asignatura del expediente curricular?')) {
      window.studyStore.deleteCurriculumSubject(this.currentStudy, id);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.curriculumModule = new CurriculumModule();
