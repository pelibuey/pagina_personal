/**
 * StudyFlow - Tasks & To-Do Module
 * Gestión de tareas pendientes, prioridades, fechas de entrega y filtros.
 */

class TasksModule {
  constructor() {
    this.container = document.getElementById('tasks-container');
    this.filterSubject = 'all';
    this.filterStatus = 'all';
    this.filterPriority = 'all';
    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      this.populateSubjectSelects();
      this.render();
    });
    this.bindEvents();
    this.populateSubjectSelects();
    this.render();
  }

  bindEvents() {
    const addTaskBtn = document.getElementById('btn-add-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => this.openTaskModal());
    }

    const formTask = document.getElementById('form-task');
    if (formTask) {
      formTask.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTask();
      });
    }

    const filterSub = document.getElementById('filter-task-subject');
    if (filterSub) {
      filterSub.addEventListener('change', (e) => {
        this.filterSubject = e.target.value;
        this.render();
      });
    }

    const filterStat = document.getElementById('filter-task-status');
    if (filterStat) {
      filterStat.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.render();
      });
    }

    const filterPri = document.getElementById('filter-task-priority');
    if (filterPri) {
      filterPri.addEventListener('change', (e) => {
        this.filterPriority = e.target.value;
        this.render();
      });
    }
  }

  populateSubjectSelects() {
    const subjects = window.studyStore.getSubjects();
    const filterSelect = document.getElementById('filter-task-subject');
    const formSelect = document.getElementById('task-subject');

    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = `<option value="all">Todas las materias</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
      filterSelect.value = currentVal || 'all';
    }

    if (formSelect) {
      formSelect.innerHTML = `<option value="">Sin materia específica</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
    }
  }

  render() {
    if (!this.container) return;

    let tasks = window.studyStore.getTasks();
    const subjects = window.studyStore.getSubjects();

    // Stats
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = totalCount - completedCount;

    const countPendingEl = document.getElementById('task-pending-count');
    const countCompletedEl = document.getElementById('task-completed-count');
    if (countPendingEl) countPendingEl.textContent = pendingCount;
    if (countCompletedEl) countCompletedEl.textContent = completedCount;

    // Filters
    if (this.filterSubject !== 'all') {
      tasks = tasks.filter(t => t.subjectId === this.filterSubject);
    }
    if (this.filterStatus === 'pending') {
      tasks = tasks.filter(t => t.status !== 'completed');
    } else if (this.filterStatus === 'completed') {
      tasks = tasks.filter(t => t.status === 'completed');
    }
    if (this.filterPriority !== 'all') {
      tasks = tasks.filter(t => t.priority === this.filterPriority);
    }

    if (tasks.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
          </div>
          <p class="text-slate-600 dark:text-slate-300 font-medium">No hay tareas que coincidan con los filtros</p>
          <p class="text-slate-400 text-xs mt-1">¡Buen trabajo! O crea una nueva tarea para mantenerte organizado.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const todayStr = window.getLocalDateString(new Date());

    this.container.innerHTML = tasks.map(t => {
      const subject = subjects.find(s => s.id === t.subjectId);
      const isDone = t.status === 'completed';

      // Due date formatting & badge
      let dateBadge = '';
      if (t.dueDate) {
        const diffDays = Math.ceil((new Date(t.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        if (isDone) {
          dateBadge = `<span class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${t.dueDate}</span>`;
        } else if (diffDays < 0) {
          dateBadge = `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Vencida (${Math.abs(diffDays)}d)</span>`;
        } else if (diffDays === 0) {
          dateBadge = `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ¡Para hoy!</span>`;
        } else if (diffDays === 1) {
          dateBadge = `<span class="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Mañana</span>`;
        } else {
          dateBadge = `<span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> En ${diffDays} días</span>`;
        }
      }

      // Priority badge
      let prioBadge = '';
      if (t.priority === 'high') {
        prioBadge = `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">Alta</span>`;
      } else if (t.priority === 'medium') {
        prioBadge = `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">Media</span>`;
      } else {
        prioBadge = `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Baja</span>`;
      }

      return `
        <div class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition flex items-start justify-between gap-3 ${isDone ? 'opacity-60 bg-slate-50 dark:bg-slate-800/40' : ''}">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <button onclick="window.tasksModule.toggleDone('${t.id}')" class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'} flex items-center justify-center transition">
              ${isDone ? `<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>` : ''}
            </button>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}">${this.escapeHtml(t.title)}</span>
                ${prioBadge}
              </div>
              
              ${t.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${this.escapeHtml(t.notes)}</p>` : ''}

              <div class="flex items-center gap-3 mt-2.5 flex-wrap">
                ${subject ? `
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md" style="background-color: ${subject.color}15; color: ${subject.color};">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${subject.color}"></span>
                    ${this.escapeHtml(subject.name)}
                  </span>
                ` : ''}
                ${dateBadge}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onclick="window.tasksModule.openTaskModal('${t.id}')" title="Editar tarea" class="p-1 text-slate-400 hover:text-blue-500 rounded transition">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.tasksModule.deleteTask('${t.id}')" title="Eliminar tarea" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  toggleDone(id) {
    const task = window.studyStore.getTasks().find(t => t.id === id);
    const wasPending = task && task.status !== 'completed';
    window.studyStore.toggleTaskStatus(id);

    if (wasPending && window.confetti) {
      window.confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }

  openTaskModal(taskId = null) {
    const modal = document.getElementById('modal-task');
    const form = document.getElementById('form-task');
    const title = document.getElementById('modal-task-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('task-id').value = taskId || '';
    this.populateSubjectSelects();

    if (taskId) {
      title.textContent = 'Editar Tarea';
      const task = window.studyStore.getTasks().find(t => t.id === taskId);
      if (task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-subject').value = task.subjectId || '';
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-notes').value = task.notes || '';
      }
    } else {
      title.textContent = 'Nueva Tarea';
      document.getElementById('task-priority').value = 'medium';
      document.getElementById('task-due-date').value = window.getLocalDateString(new Date());
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('task-title').focus();
  }

  closeTaskModal() {
    const modal = document.getElementById('modal-task');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveTask() {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    if (!title) return;

    const subjectId = document.getElementById('task-subject').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const notes = document.getElementById('task-notes').value.trim();

    window.studyStore.saveTask({
      id: id || undefined,
      title,
      subjectId,
      dueDate,
      priority,
      notes
    });

    this.closeTaskModal();
  }

  deleteTask(id) {
    if (confirm('¿Eliminar esta tarea?')) {
      window.studyStore.deleteTask(id);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.tasksModule = new TasksModule();
