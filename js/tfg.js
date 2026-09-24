/**
 * StudyFlow - TFG Module (Marketing FP)
 * Seguimiento de hitos, entregas, tutorías y avance del Trabajo Fin de Ciclo.
 */

class TfgModule {
  constructor() {
    this.container = document.getElementById('tfg-milestones-container');
    this.titleEl = document.getElementById('tfg-project-title');
    this.tutorEl = document.getElementById('tfg-project-tutor');
    this.deadlineEl = document.getElementById('tfg-project-deadline');
    this.defenseEl = document.getElementById('tfg-project-defense');
    this.progressBar = document.getElementById('tfg-progress-bar');
    this.progressText = document.getElementById('tfg-progress-text');
    this.notesEl = document.getElementById('tfg-project-notes');

    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => this.render());
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const editBtn = document.getElementById('btn-edit-tfg');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openTfgModal());
    }

    const formTfg = document.getElementById('form-tfg-edit');
    if (formTfg) {
      formTfg.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTfg();
      });
    }

    const addMilestoneBtn = document.getElementById('btn-add-tfg-milestone');
    if (addMilestoneBtn) {
      addMilestoneBtn.addEventListener('click', () => this.openMilestoneModal());
    }

    const formMilestone = document.getElementById('form-tfg-milestone');
    if (formMilestone) {
      formMilestone.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveMilestone();
      });
    }
  }

  render() {
    const tfg = window.studyStore.getTfgData();
    if (!tfg) return;

    const hasTitle = Boolean(tfg.title && tfg.title.trim());
    if (this.titleEl) {
      this.titleEl.textContent = hasTitle ? tfg.title : 'Proyecto Fin de Ciclo (En blanco / Pendiente de definir)';
      if (!hasTitle) {
        this.titleEl.classList.add('text-slate-400', 'italic');
      } else {
        this.titleEl.classList.remove('text-slate-400', 'italic');
      }
    }
    if (this.tutorEl) this.tutorEl.textContent = tfg.tutor ? `Tutor: ${tfg.tutor}` : 'Tutor: Pendiente de asignar';
    if (this.deadlineEl) this.deadlineEl.textContent = tfg.finalDeadline || 'Por definir';
    if (this.defenseEl) this.defenseEl.textContent = tfg.defenseDate || 'Por definir';
    if (this.notesEl) {
      this.notesEl.textContent = tfg.generalNotes || 'El proyecto de fin de ciclo se encuentra actualmente en blanco. Pulsa en "Editar Datos TFG" para definir el título, tutor, notas y fechas cuando comiences el proyecto.';
    }

    const milestones = tfg.milestones || [];
    const completed = milestones.filter(m => m.completed).length;
    const percent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

    if (this.progressBar) this.progressBar.style.width = `${percent}%`;
    if (this.progressText) {
      this.progressText.textContent = milestones.length > 0
        ? `${percent}% (${completed} de ${milestones.length} hitos completados)`
        : '0% (En blanco / Sin hitos)';
    }

    if (!this.container) return;

    if (milestones.length === 0) {
      this.container.innerHTML = `
        <div class="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <div class="w-12 h-12 mx-auto rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-3">
            <i data-lucide="file-text" class="w-6 h-6"></i>
          </div>
          <h5 class="font-bold text-slate-700 dark:text-slate-200 text-sm">Proyecto Fin de Ciclo en blanco</h5>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">No hay hitos ni tareas registradas por el momento. Pulsa en "Añadir Hito" para incorporar las fases de la memoria cuando las tengas.</p>
          <button onclick="window.tfgModule.openMilestoneModal()" class="mt-4 inline-flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Añadir Primer Hito
          </button>
        </div>
      `;
    } else {
      this.container.innerHTML = milestones.map(m => {
        return `
          <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3 ${m.completed ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50' : ''}">
            <div class="flex items-center gap-3">
              <button onclick="window.tfgModule.toggleMilestone('${m.id}')" class="w-5 h-5 rounded-lg border ${m.completed ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-purple-500'} flex items-center justify-center transition">
                ${m.completed ? `<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>` : ''}
              </button>
              <div>
                <h5 class="text-xs font-bold text-slate-800 dark:text-slate-100 ${m.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                  ${this.escapeHtml(m.name)}
                </h5>
                <span class="text-[11px] text-slate-400">Objetivo: ${m.date || 'Sin fecha'}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${m.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}">
                ${m.completed ? 'Completado' : 'Pendiente'}
              </span>
              <button onclick="window.tfgModule.deleteMilestone('${m.id}')" title="Eliminar hito" class="text-slate-400 hover:text-rose-500 transition p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
  }

  toggleMilestone(id) {
    const tfg = window.studyStore.getTfgData();
    const milestone = (tfg.milestones || []).find(m => m.id === id);
    const wasPending = milestone && !milestone.completed;

    window.studyStore.toggleTfgMilestone(id);

    if (wasPending && window.confetti) {
      window.confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }

  deleteMilestone(id) {
    if (confirm('¿Eliminar este hito del proyecto TFG?')) {
      window.studyStore.deleteTfgMilestone(id);
    }
  }

  openTfgModal() {
    const modal = document.getElementById('modal-tfg-edit');
    const form = document.getElementById('form-tfg-edit');
    if (!modal || !form) return;

    const tfg = window.studyStore.getTfgData();
    document.getElementById('edit-tfg-title').value = tfg.title || '';
    document.getElementById('edit-tfg-tutor').value = tfg.tutor || '';
    document.getElementById('edit-tfg-deadline').value = tfg.finalDeadline || '';
    document.getElementById('edit-tfg-defense').value = tfg.defenseDate || '';
    document.getElementById('edit-tfg-notes').value = tfg.generalNotes || '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('edit-tfg-title').focus();
  }

  closeTfgModal() {
    const modal = document.getElementById('modal-tfg-edit');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveTfg() {
    const title = document.getElementById('edit-tfg-title').value.trim();
    const tutor = document.getElementById('edit-tfg-tutor').value.trim();
    const finalDeadline = document.getElementById('edit-tfg-deadline').value;
    const defenseDate = document.getElementById('edit-tfg-defense').value;
    const generalNotes = document.getElementById('edit-tfg-notes').value.trim();

    window.studyStore.saveTfgData({
      title,
      tutor,
      finalDeadline,
      defenseDate,
      generalNotes
    });

    this.closeTfgModal();
  }

  openMilestoneModal() {
    const modal = document.getElementById('modal-tfg-milestone');
    const form = document.getElementById('form-tfg-milestone');
    if (!modal || !form) return;

    form.reset();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('milestone-name').focus();
  }

  closeMilestoneModal() {
    const modal = document.getElementById('modal-tfg-milestone');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveMilestone() {
    const name = document.getElementById('milestone-name').value.trim();
    const date = document.getElementById('milestone-date').value;

    if (!name) return;

    window.studyStore.addTfgMilestone({
      name,
      date
    });

    this.closeMilestoneModal();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.tfgModule = new TfgModule();
