/**
 * StudyFlow - Notes & Resources Module
 * Cuaderno de apuntes rápidos y repositorio de enlaces/recursos organizados por materia.
 */

class NotesModule {
  constructor() {
    this.currentTab = 'notes'; // 'notes' | 'resources'
    this.filterSubject = 'all';
    this.searchQuery = '';

    this.notesContainer = document.getElementById('notes-grid');
    this.resourcesContainer = document.getElementById('resources-grid');
    this.searchInput = document.getElementById('notes-search-input');
    this.filterSubjectSelect = document.getElementById('filter-notes-subject');

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
    // Pestañas
    const tabNotesBtn = document.getElementById('tab-btn-notes');
    const tabResourcesBtn = document.getElementById('tab-btn-resources');

    if (tabNotesBtn) {
      tabNotesBtn.addEventListener('click', () => this.switchTab('notes'));
    }
    if (tabResourcesBtn) {
      tabResourcesBtn.addEventListener('click', () => this.switchTab('resources'));
    }

    // Buscador
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });
    }

    // Filtro de materia
    if (this.filterSubjectSelect) {
      this.filterSubjectSelect.addEventListener('change', (e) => {
        this.filterSubject = e.target.value;
        this.render();
      });
    }

    // Botones de añadir
    const addNoteBtn = document.getElementById('btn-add-note');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => this.openNoteModal());
    }

    const addResBtn = document.getElementById('btn-add-resource');
    if (addResBtn) {
      addResBtn.addEventListener('click', () => this.openResourceModal());
    }

    // Formularios
    const formNote = document.getElementById('form-note');
    if (formNote) {
      formNote.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveNote();
      });
    }

    const formRes = document.getElementById('form-resource');
    if (formRes) {
      formRes.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveResource();
      });
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    const tabNotesBtn = document.getElementById('tab-btn-notes');
    const tabResourcesBtn = document.getElementById('tab-btn-resources');
    const notesView = document.getElementById('view-notes-content');
    const resourcesView = document.getElementById('view-resources-content');

    if (tab === 'notes') {
      tabNotesBtn.classList.add('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
      tabNotesBtn.classList.remove('border-transparent', 'text-slate-500');
      tabResourcesBtn.classList.remove('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
      tabResourcesBtn.classList.add('border-transparent', 'text-slate-500');

      if (notesView) notesView.classList.remove('hidden');
      if (resourcesView) resourcesView.classList.add('hidden');
    } else {
      tabResourcesBtn.classList.add('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
      tabResourcesBtn.classList.remove('border-transparent', 'text-slate-500');
      tabNotesBtn.classList.remove('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
      tabNotesBtn.classList.add('border-transparent', 'text-slate-500');

      if (resourcesView) resourcesView.classList.remove('hidden');
      if (notesView) notesView.classList.add('hidden');
    }

    this.render();
  }

  populateSubjectSelects() {
    const subjects = window.studyStore.getSubjects();

    if (this.filterSubjectSelect) {
      const currentVal = this.filterSubjectSelect.value;
      this.filterSubjectSelect.innerHTML = `<option value="all">Todas las materias</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
      this.filterSubjectSelect.value = currentVal || 'all';
    }

    const noteSubSelect = document.getElementById('note-subject');
    if (noteSubSelect) {
      noteSubSelect.innerHTML = `<option value="">General / Sin materia</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
    }

    const resSubSelect = document.getElementById('resource-subject');
    if (resSubSelect) {
      resSubSelect.innerHTML = `<option value="">General / Sin materia</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
    }
  }

  render() {
    if (this.currentTab === 'notes') {
      this.renderNotes();
    } else {
      this.renderResources();
    }
    if (window.lucide) window.lucide.createIcons();
  }

  renderNotes() {
    if (!this.notesContainer) return;
    let notes = window.studyStore.getNotes();
    const subjects = window.studyStore.getSubjects();

    if (this.filterSubject !== 'all') {
      notes = notes.filter(n => n.subjectId === this.filterSubject);
    }
    if (this.searchQuery) {
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(this.searchQuery) ||
        n.content.toLowerCase().includes(this.searchQuery)
      );
    }

    if (notes.length === 0) {
      this.notesContainer.innerHTML = `
        <div class="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
          <p class="text-slate-500 dark:text-slate-400 text-sm">No hay notas guardadas que coincidan con la búsqueda.</p>
          <button onclick="window.notesModule.openNoteModal()" class="mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
            + Crear nuevo apunte rápido
          </button>
        </div>
      `;
      return;
    }

    this.notesContainer.innerHTML = notes.map(n => {
      const sub = subjects.find(s => s.id === n.subjectId);
      const dateFormatted = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <h4 class="font-bold text-slate-800 dark:text-slate-100 text-base">${this.escapeHtml(n.title)}</h4>
              <div class="flex items-center gap-1">
                <button onclick="window.notesModule.copyNote('${n.id}')" title="Copiar texto" class="p-1 text-slate-400 hover:text-blue-500 rounded transition">
                  <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button onclick="window.notesModule.openNoteModal('${n.id}')" title="Editar apunte" class="p-1 text-slate-400 hover:text-blue-500 rounded transition">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="window.notesModule.deleteNote('${n.id}')" title="Eliminar apunte" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <div class="text-slate-600 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-700/50">
              ${this.escapeHtml(n.content)}
            </div>
          </div>

          <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            ${sub ? `
              <span class="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md" style="background-color: ${sub.color}15; color: ${sub.color};">
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${sub.color}"></span>
                ${this.escapeHtml(sub.name)}
              </span>
            ` : '<span class="text-slate-400">General</span>'}
            <span class="text-slate-400 text-[11px]">${dateFormatted}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderResources() {
    if (!this.resourcesContainer) return;
    let resources = window.studyStore.getResources();
    const subjects = window.studyStore.getSubjects();

    if (this.filterSubject !== 'all') {
      resources = resources.filter(r => r.subjectId === this.filterSubject);
    }
    if (this.searchQuery) {
      resources = resources.filter(r =>
        r.title.toLowerCase().includes(this.searchQuery) ||
        (r.category && r.category.toLowerCase().includes(this.searchQuery)) ||
        (r.notes && r.notes.toLowerCase().includes(this.searchQuery))
      );
    }

    if (resources.length === 0) {
      this.resourcesContainer.innerHTML = `
        <div class="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
          <p class="text-slate-500 dark:text-slate-400 text-sm">No hay enlaces o recursos guardados con este criterio.</p>
          <button onclick="window.notesModule.openResourceModal()" class="mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
            + Guardar nuevo enlace
          </button>
        </div>
      `;
      return;
    }

    this.resourcesContainer.innerHTML = resources.map(r => {
      const sub = subjects.find(s => s.id === r.subjectId);
      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <i data-lucide="external-link" class="w-4 h-4"></i>
                </span>
                <div>
                  <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm">${this.escapeHtml(r.title)}</h4>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium">${this.escapeHtml(r.category || 'Enlace')}</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button onclick="window.notesModule.openResourceModal('${r.id}')" class="p-1 text-slate-400 hover:text-blue-500">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="window.notesModule.deleteResource('${r.id}')" class="p-1 text-slate-400 hover:text-rose-500">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            ${r.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">${this.escapeHtml(r.notes)}</p>` : ''}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
            ${sub ? `
              <span class="text-[11px] font-medium truncate" style="color: ${sub.color};">
                ${this.escapeHtml(sub.name)}
              </span>
            ` : '<span class="text-[11px] text-slate-400">General</span>'}

            <a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Abrir enlace <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  copyNote(id) {
    const note = window.studyStore.getNotes().find(n => n.id === id);
    if (note && navigator.clipboard) {
      navigator.clipboard.writeText(note.content);
      alert('¡Apunte copiado al portapapeles!');
    }
  }

  // --- MODAL APUNTE ---
  openNoteModal(noteId = null) {
    const modal = document.getElementById('modal-note');
    const form = document.getElementById('form-note');
    const title = document.getElementById('modal-note-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('note-id').value = noteId || '';
    this.populateSubjectSelects();

    if (noteId) {
      title.textContent = 'Editar Apunte';
      const note = window.studyStore.getNotes().find(n => n.id === noteId);
      if (note) {
        document.getElementById('note-title').value = note.title || '';
        document.getElementById('note-subject').value = note.subjectId || '';
        document.getElementById('note-content').value = note.content || '';
      }
    } else {
      title.textContent = 'Nuevo Apunte Rápido';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('note-title').focus();
  }

  closeNoteModal() {
    const modal = document.getElementById('modal-note');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveNote() {
    const id = document.getElementById('note-id').value;
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const subjectId = document.getElementById('note-subject').value;

    if (!title || !content) return;

    window.studyStore.saveNote({
      id: id || undefined,
      title,
      subjectId,
      content
    });

    this.closeNoteModal();
  }

  deleteNote(id) {
    if (confirm('¿Deseas eliminar este apunte?')) {
      window.studyStore.deleteNote(id);
    }
  }

  // --- MODAL RECURSO ---
  openResourceModal(resId = null) {
    const modal = document.getElementById('modal-resource');
    const form = document.getElementById('form-resource');
    const title = document.getElementById('modal-resource-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('resource-id').value = resId || '';
    this.populateSubjectSelects();

    if (resId) {
      title.textContent = 'Editar Recurso';
      const res = window.studyStore.getResources().find(r => r.id === resId);
      if (res) {
        document.getElementById('resource-title').value = res.title || '';
        document.getElementById('resource-url').value = res.url || '';
        document.getElementById('resource-subject').value = res.subjectId || '';
        document.getElementById('resource-category').value = res.category || 'General';
        document.getElementById('resource-notes').value = res.notes || '';
      }
    } else {
      title.textContent = 'Guardar Enlace / Recurso';
      document.getElementById('resource-category').value = 'Herramienta';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('resource-title').focus();
  }

  closeResourceModal() {
    const modal = document.getElementById('modal-resource');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveResource() {
    const id = document.getElementById('resource-id').value;
    const title = document.getElementById('resource-title').value.trim();
    const url = document.getElementById('resource-url').value.trim();
    const subjectId = document.getElementById('resource-subject').value;
    const category = document.getElementById('resource-category').value.trim();
    const notes = document.getElementById('resource-notes').value.trim();

    if (!title || !url) return;

    window.studyStore.saveResource({
      id: id || undefined,
      title,
      url,
      subjectId,
      category,
      notes
    });

    this.closeResourceModal();
  }

  deleteResource(id) {
    if (confirm('¿Deseas eliminar este recurso?')) {
      window.studyStore.deleteResource(id);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.notesModule = new NotesModule();
