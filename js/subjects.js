/**
 * StudyFlow - Subjects & Grades Module
 * Gestiona asignaturas, cálculo de promedios ponderados y desglose de notas.
 */

class SubjectsModule {
  constructor() {
    this.container = document.getElementById('subjects-container');
    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => this.render());
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const addSubBtn = document.getElementById('btn-add-subject');
    if (addSubBtn) {
      addSubBtn.addEventListener('click', () => this.openSubjectModal());
    }

    // Modal de asignatura
    const subjectForm = document.getElementById('form-subject');
    if (subjectForm) {
      subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveSubject();
      });
    }

    // Modal de calificación
    const gradeForm = document.getElementById('form-grade');
    if (gradeForm) {
      gradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveGrade();
      });
    }
  }

  render() {
    if (!this.container) return;
    const subjects = window.studyStore.getSubjects();

    if (subjects.length === 0) {
      const filter = window.studyStore.getActiveStudyFilter();
      const isAde = filter === 'ade';
      const emptyTitle = isAde ? 'No hay asignaturas activas en ADE' : 'No tienes asignaturas registradas';
      const emptyDesc = isAde
        ? 'Se han eliminado las asignaturas de ejemplo. En cuanto me indiques las asignaturas oficiales de ADE, las daremos de alta para este curso.'
        : 'Añade tus materias del curso para gestionar notas, exámenes y tareas organizadas por color.';

      this.container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
            <i data-lucide="book-open" class="w-8 h-8"></i>
          </div>
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">${emptyTitle}</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
            ${emptyDesc}
          </p>
          <button onclick="window.subjectsModule.openSubjectModal()" class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-sm">
            <i data-lucide="plus" class="w-4 h-4"></i> Añadir primera asignatura
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    this.container.innerHTML = subjects.map(sub => {
      const avg = window.studyStore.calculateSubjectAverage(sub);
      let avgBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Sin notas</span>`;
      if (avg !== null) {
        if (avg >= 9) {
          avgBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Sobresaliente (${avg})</span>`;
        } else if (avg >= 7) {
          avgBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Notable (${avg})</span>`;
        } else if (avg >= 5) {
          avgBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Aprobado (${avg})</span>`;
        } else {
          avgBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Suspenso (${avg})</span>`;
        }
      }

      const gradesHtml = (sub.grades && sub.grades.length > 0)
        ? sub.grades.map(g => `
          <div class="flex items-center justify-between text-sm py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <div class="flex-1 pr-2">
              <span class="font-medium text-slate-800 dark:text-slate-200">${this.escapeHtml(g.name)}</span>
              <span class="text-xs text-slate-400 block">${g.weight > 0 ? `Peso: ${g.weight}%` : 'Sin peso'} • ${g.date}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold ${g.score >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${Number(g.score).toFixed(1)}</span>
              <button onclick="window.subjectsModule.deleteGrade('${sub.id}', '${g.id}')" title="Eliminar nota" class="text-slate-400 hover:text-rose-500 transition p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `).join('')
        : `<p class="text-xs text-slate-400 italic py-2">No hay notas registradas para esta materia.</p>`;

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition flex flex-col justify-between" style="border-top: 4px solid ${sub.color || '#3B82F6'};">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">${this.escapeHtml(sub.code || 'ASIG')}</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${sub.studyId === 'ade' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300'}">
                    ${sub.studyId === 'ade' ? 'ADE' : 'MARKETING FP'}
                  </span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1">
                    <i data-lucide="wifi" class="w-2.5 h-2.5"></i> Online
                  </span>
                  ${(sub.studyId === 'ade' && sub.credits) ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${sub.credits} ECTS</span>` : ''}
                </div>
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1.5">${this.escapeHtml(sub.name)}</h3>
              </div>
              <div class="flex items-center gap-1">
                <button onclick="window.subjectsModule.openSubjectModal('${sub.id}')" title="Editar materia" class="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-700">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="window.subjectsModule.confirmDeleteSubject('${sub.id}')" title="Eliminar materia" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-700">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <!-- Datos secundarios (Profesor y Plataforma Online) -->
            <div class="space-y-1.5 my-3 text-xs text-slate-500 dark:text-slate-400">
              ${sub.teacher ? `<div class="flex items-center gap-1.5"><i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i> <span>${this.escapeHtml(sub.teacher)}</span></div>` : ''}
              ${sub.classroom ? `<div class="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200"><i data-lucide="laptop" class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"></i> <span>${this.escapeHtml(sub.classroom)}</span></div>` : ''}
              ${sub.onlineUrl ? `
                <div class="pt-1">
                  <a href="${this.escapeHtml(sub.onlineUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition border border-purple-200 dark:border-purple-800/60 shadow-xs">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    <span>Abrir Campus Virtual</span>
                  </a>
                </div>
              ` : ''}
            </div>

            <!-- Calificación Promedio -->
            <div class="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-700/60 my-3">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Nota Media:</span>
              ${avgBadge}
            </div>

            <!-- Lista de Calificaciones -->
            <div class="mt-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Notas Parciales</span>
                <button onclick="window.subjectsModule.openGradeModal('${sub.id}')" class="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1">
                  <i data-lucide="plus" class="w-3 h-3"></i> Añadir nota
                </button>
              </div>
              <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                ${gradesHtml}
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-between items-center text-xs text-slate-400">
            <span>Total evaluaciones: ${sub.grades ? sub.grades.length : 0}</span>
            <div class="flex items-center gap-3">
              ${(sub.studyId === 'marketing' && sub.id !== 'mkt_sub_tfg') ? `
                <button onclick="window.app.navigateTo('mkt-grades'); window.marketingGradesModule.switchSubject('${sub.id}');" class="text-purple-600 dark:text-purple-400 font-bold hover:underline inline-flex items-center gap-1">
                  <i data-lucide="layers" class="w-3 h-3"></i> Temas 1-9 →
                </button>
              ` : ''}
              <button onclick="window.app.filterBySubject('${sub.id}')" class="text-slate-600 dark:text-slate-300 hover:underline font-medium">Tareas / Exámenes →</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- MODAL ASIGNATURA ---
  openSubjectModal(subjectId = null) {
    const modal = document.getElementById('modal-subject');
    const form = document.getElementById('form-subject');
    const title = document.getElementById('modal-subject-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('subject-id').value = subjectId || '';

    if (subjectId) {
      title.textContent = 'Editar Asignatura';
      const sub = window.studyStore.getSubjectById(subjectId);
      if (sub) {
        document.getElementById('subject-study').value = sub.studyId || 'ade';
        document.getElementById('subject-name').value = sub.name || '';
        document.getElementById('subject-code').value = sub.code || '';
        document.getElementById('subject-color').value = sub.color || '#9333EA';
        document.getElementById('subject-teacher').value = sub.teacher || '';
        document.getElementById('subject-classroom').value = sub.classroom || '';
        const urlInput = document.getElementById('subject-online-url');
        if (urlInput) urlInput.value = sub.onlineUrl || '';
        document.getElementById('subject-credits').value = sub.credits || 6;
      }
    } else {
      title.textContent = 'Nueva Asignatura';
      const activeFilter = window.studyStore.getActiveStudyFilter();
      document.getElementById('subject-study').value = activeFilter !== 'all' ? activeFilter : 'ade';
      document.getElementById('subject-color').value = '#9333EA';
      const urlInput = document.getElementById('subject-online-url');
      if (urlInput) urlInput.value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('subject-name').focus();
  }

  closeSubjectModal() {
    const modal = document.getElementById('modal-subject');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveSubject() {
    const id = document.getElementById('subject-id').value;
    const studyId = document.getElementById('subject-study').value;
    const name = document.getElementById('subject-name').value.trim();
    if (!name) return;

    const code = document.getElementById('subject-code').value.trim();
    const color = document.getElementById('subject-color').value;
    const teacher = document.getElementById('subject-teacher').value.trim();
    const classroom = document.getElementById('subject-classroom').value.trim();
    const urlInput = document.getElementById('subject-online-url');
    const onlineUrl = urlInput ? urlInput.value.trim() : '';
    const credits = document.getElementById('subject-credits').value;

    window.studyStore.saveSubject({
      id: id || undefined,
      studyId,
      name,
      code,
      color,
      teacher,
      classroom,
      onlineUrl,
      credits: studyId === 'marketing' ? null : (Number(credits) || 6)
    });

    this.closeSubjectModal();
  }

  confirmDeleteSubject(id) {
    const sub = window.studyStore.getSubjectById(id);
    if (!sub) return;
    if (confirm(`¿Estás seguro de eliminar "${sub.name}"? Se eliminarán también sus tareas, exámenes y notas asociadas.`)) {
      window.studyStore.deleteSubject(id);
    }
  }

  // --- MODAL NOTA ---
  openGradeModal(subjectId) {
    const modal = document.getElementById('modal-grade');
    const form = document.getElementById('form-grade');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('grade-subject-id').value = subjectId;
    document.getElementById('grade-date').value = window.getLocalDateString(new Date());

    const sub = window.studyStore.getSubjectById(subjectId);
    document.getElementById('modal-grade-title').textContent = sub ? `Añadir Nota a ${sub.name}` : 'Añadir Calificación';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('grade-name').focus();
  }

  closeGradeModal() {
    const modal = document.getElementById('modal-grade');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveGrade() {
    const subjectId = document.getElementById('grade-subject-id').value;
    const name = document.getElementById('grade-name').value.trim();
    const score = document.getElementById('grade-score').value;
    const weight = document.getElementById('grade-weight').value;
    const date = document.getElementById('grade-date').value;

    if (!name || score === '') return;

    window.studyStore.addGrade(subjectId, {
      name,
      score: parseFloat(score),
      weight: parseFloat(weight) || 0,
      date
    });

    this.closeGradeModal();
  }

  deleteGrade(subjectId, gradeId) {
    if (confirm('¿Deseas eliminar esta calificación?')) {
      window.studyStore.deleteGrade(subjectId, gradeId);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.subjectsModule = new SubjectsModule();
