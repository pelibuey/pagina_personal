/**
 * StudyFlow - Schedule & Study Routine Module
 * Plan semanal de estudio (Lunes-Jueves con horarios fijos hasta 21:00) y Horario de Clases.
 */

class ScheduleModule {
  constructor() {
    this.planContainer = document.getElementById('study-plan-days-container');
    this.classGridContainer = document.getElementById('class-schedule-grid');
    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      this.render();
    });
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const btnAddClass = document.getElementById('btn-add-class-slot');
    if (btnAddClass) {
      btnAddClass.addEventListener('click', () => this.openClassModal());
    }

    const formClass = document.getElementById('form-class-slot');
    if (formClass) {
      formClass.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveClassSlot();
      });
    }
  }

  render() {
    this.renderStudyPlan();
    this.renderClassSchedule();
    if (window.lucide) window.lucide.createIcons();
  }

  renderStudyPlan() {
    if (!this.planContainer) return;
    const plan = window.studyStore.getWeeklyStudyPlan();
    const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oct1 = new Date(today.getFullYear(), 9, 1); // 1 de octubre
    const isBeforeOct1 = today < oct1;
    const diffDays = Math.ceil((oct1 - today) / (1000 * 60 * 60 * 24));

    // Banner de estado del plan de estudio
    const bannerEl = document.getElementById('study-plan-status-banner');
    if (bannerEl) {
      if (isBeforeOct1) {
        bannerEl.innerHTML = `
          <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                <i data-lucide="clock" class="w-5 h-5"></i>
              </div>
              <div>
                <span class="font-bold text-amber-900 dark:text-amber-200 block text-sm">Plan diario de estudio: activo a partir del 1 de octubre de 2026</span>
                <p class="text-amber-700/80 dark:text-amber-300/80 mt-0.5">El horario de estudio estructurado de lunes a jueves entrará en vigor el 1 de octubre. Actualmente puedes consultar la distribución de bloques para preparar tus sesiones.</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="px-3 py-1.5 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Faltan ${diffDays} días (1 Oct)
              </span>
            </div>
          </div>
        `;
      } else {
        bannerEl.innerHTML = `
          <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
              </div>
              <div>
                <span class="font-bold text-emerald-900 dark:text-emerald-200 block text-sm">Plan diario de estudio activo</span>
                <p class="text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">Jornadas estructuradas en vigor (Lunes a Jueves con fin estricto a las 21:00).</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="px-3 py-1.5 rounded-xl bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                En vigor
              </span>
            </div>
          </div>
        `;
      }
    }

    // Determinar día actual solo si el plan ya está en vigor
    const todayIndex = new Date().getDay(); // 0 Dom, 1 Lun, 2 Mar, 3 Mie, 4 Jue, 5 Vie, 6 Sab
    const dayMap = { 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves' };
    const todayKey = !isBeforeOct1 ? (dayMap[todayIndex] || '') : '';

    this.planContainer.innerHTML = daysOrder.map(dayKey => {
      const dayData = plan[dayKey];
      if (!dayData) return '';

      const isToday = dayKey === todayKey;
      const filter = window.studyStore.getActiveStudyFilter();

      const filteredSlots = dayData.slots.filter(slot => {
        if (filter === 'all') return true;
        if (slot.isBreak) return true;
        return slot.studyId === filter;
      });

      const slotsHtml = filteredSlots.map(slot => {
        if (slot.isBreak) {
          return `
            <div class="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200/60 dark:border-amber-800/40 my-1">
              <i data-lucide="coffee" class="w-3.5 h-3.5"></i>
              <span>${slot.time} • ${this.escapeHtml(slot.title)}</span>
            </div>
          `;
        }

        const isAde = slot.studyId === 'ade';
        const badgeColor = isAde ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300';
        const tagText = isAde ? 'ADE' : 'MARKETING';

        return `
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3 h-3 text-purple-600"></i> ${slot.time}
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">${tagText}</span>
            </div>
            <h5 class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(slot.title)}</h5>
            <p class="text-[11px] text-slate-400">${this.escapeHtml(slot.activity)}</p>
            <button onclick="window.scheduleModule.launchInPomodoro('${this.escapeHtml(slot.title)}', '${slot.studyId}')" class="mt-2 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              <i data-lucide="play" class="w-3 h-3"></i> Estudiar este bloque ahora →
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border ${isToday ? 'border-purple-600 shadow-md ring-2 ring-purple-500/20' : 'border-slate-200/80 dark:border-slate-700/80'} shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-3">
              <div>
                <span class="text-[11px] uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 block">${dayData.dayName}</span>
                <h4 class="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  ${dayData.startTime} — 21:00
                </h4>
              </div>
              <div class="text-right">
                ${isToday ? `<span class="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold animate-pulse">¡HOY!</span>` : ''}
                <span class="block text-[11px] text-slate-400 mt-0.5">${dayData.totalMinutes} min</span>
              </div>
            </div>

            <div class="space-y-2">
              ${slotsHtml}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>${isBeforeOct1 ? 'Activo: 1 de octubre' : 'Fin estricto: 21:00'}</span>
            <span class="text-purple-600 dark:text-purple-400 font-semibold">Reparto equilibrado</span>
          </div>
        </div>
      `;
    }).join('');
  }

  launchInPomodoro(taskTitle, studyId) {
    window.app.navigateTo('pomodoro');
    const noteInput = document.getElementById('pomodoro-task-note');
    const subjectSelect = document.getElementById('pomodoro-subject-select');

    if (noteInput) noteInput.value = taskTitle;
    
    // Buscar si coincide con alguna materia activa
    if (subjectSelect) {
      const subjects = window.studyStore.getSubjects(studyId);
      if (subjects.length > 0) {
        subjectSelect.value = subjects[0].id;
      }
    }
  }

  renderClassSchedule() {
    const section = document.getElementById('section-class-schedule');
    const filter = window.studyStore.getActiveStudyFilter();

    // El Horario de Clases Semanales SOLO tiene que salir en la vista de ADE
    if (filter !== 'ade') {
      if (section) section.classList.add('hidden');
      return;
    }

    if (section) section.classList.remove('hidden');
    if (!this.classGridContainer) return;

    const classes = window.studyStore.getClassSchedule();
    const days = [
      { key: 'lunes', label: 'Lunes' },
      { key: 'martes', label: 'Martes' },
      { key: 'miercoles', label: 'Miércoles' },
      { key: 'jueves', label: 'Jueves' },
      { key: 'viernes', label: 'Viernes' }
    ];

    this.classGridContainer.innerHTML = days.map(d => {
      const dayClasses = classes.filter(c => c.day === d.key && (c.studyId === 'ade' || !c.studyId));

      const itemsHtml = dayClasses.length > 0
        ? dayClasses.map(c => {
          return `
            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs flex justify-between items-start gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                  <span>${this.escapeHtml(c.title)}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1 space-y-0.5">
                  <div class="flex items-center gap-1.5">
                    <span>🕒 ${c.time}</span>
                  </div>
                  ${c.classroom ? `<div class="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium"><i data-lucide="video" class="w-3 h-3 text-purple-600 flex-shrink-0"></i> <span class="truncate">${this.escapeHtml(c.classroom)}</span></div>` : ''}
                </div>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                    ADE (UNED)
                  </span>
                  ${c.url ? `
                    <a href="${this.escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline">
                      <i data-lucide="external-link" class="w-2.5 h-2.5"></i> Ver / Conectar
                    </a>
                  ` : ''}
                </div>
              </div>
              <button onclick="window.scheduleModule.deleteClassSlot('${c.id}')" title="Eliminar clase" class="text-slate-400 hover:text-rose-500 transition p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          `;
        }).join('')
        : `<p class="text-xs text-slate-400 italic py-4 text-center">Sin clases registradas</p>`;

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div>
            <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-3 flex items-center justify-between">
              <span>${d.label}</span>
              <span class="text-[10px] font-semibold text-purple-600 dark:text-purple-400">ADE</span>
            </h4>
            <div class="space-y-2">
              ${itemsHtml}
            </div>
          </div>
          <button onclick="window.scheduleModule.openClassModal('${d.key}')" class="mt-3 w-full py-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition flex items-center justify-center gap-1">
            <i data-lucide="plus" class="w-3 h-3"></i> Añadir clase ADE
          </button>
        </div>
      `;
    }).join('');
  }

  openClassModal(day = 'lunes') {
    const modal = document.getElementById('modal-class-slot');
    const form = document.getElementById('form-class-slot');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('class-slot-day').value = day;
    document.getElementById('class-slot-time').value = '17:00 - 18:30';
    const studyInput = document.getElementById('class-slot-study');
    if (studyInput) studyInput.value = 'ade';
    const urlInput = document.getElementById('class-slot-url');
    if (urlInput) urlInput.value = 'https://www.intecca.uned.es/portal/inicio';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('class-slot-title').focus();
  }

  closeClassModal() {
    const modal = document.getElementById('modal-class-slot');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveClassSlot() {
    const day = document.getElementById('class-slot-day').value;
    const title = document.getElementById('class-slot-title').value.trim();
    const time = document.getElementById('class-slot-time').value.trim();
    const classroom = document.getElementById('class-slot-classroom').value.trim();
    const urlInput = document.getElementById('class-slot-url');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!title || !time) return;

    window.studyStore.saveClassSlot({
      day,
      studyId: 'ade', // Exclusivo para ADE
      title,
      time,
      classroom: classroom || 'INTECCA • Aula Virtual UNED',
      url
    });

    this.closeClassModal();
  }

  deleteClassSlot(id) {
    if (confirm('¿Eliminar esta clase del horario lectivo?')) {
      window.studyStore.deleteClassSlot(id);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.scheduleModule = new ScheduleModule();
