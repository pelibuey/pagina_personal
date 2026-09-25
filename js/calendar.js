/**
 * StudyFlow - Calendar & Exams Module
 * Calendario interactivo mensual y lista de próximas entregas y exámenes con cuenta regresiva.
 */

class CalendarModule {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.miniDate = new Date();
    this.calendarGrid = document.getElementById('calendar-grid');
    this.currentMonthEl = document.getElementById('calendar-month-year');
    this.upcomingContainer = document.getElementById('upcoming-exams-container');
    this.dayEventsContainer = document.getElementById('day-events-container');
    this.selectedDayTitle = document.getElementById('selected-day-title');
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
    const prevBtn = document.getElementById('btn-prev-month');
    const nextBtn = document.getElementById('btn-next-month');
    const todayBtn = document.getElementById('btn-today-month');
    const addExamBtn = document.getElementById('btn-add-exam');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.render();
      });
    }

    // Mini calendario del Dashboard
    const miniPrevBtn = document.getElementById('btn-mini-prev-month');
    const miniNextBtn = document.getElementById('btn-mini-next-month');
    const miniTodayBtn = document.getElementById('btn-mini-today');

    if (miniPrevBtn) {
      miniPrevBtn.addEventListener('click', () => {
        this.miniDate.setMonth(this.miniDate.getMonth() - 1);
        this.renderMiniCalendar();
      });
    }

    if (miniNextBtn) {
      miniNextBtn.addEventListener('click', () => {
        this.miniDate.setMonth(this.miniDate.getMonth() + 1);
        this.renderMiniCalendar();
      });
    }

    if (miniTodayBtn) {
      miniTodayBtn.addEventListener('click', () => {
        this.miniDate = new Date();
        this.renderMiniCalendar();
      });
    }

    if (addExamBtn) {
      addExamBtn.addEventListener('click', () => this.openExamModal());
    }

    const syncIphoneBtn = document.getElementById('btn-sync-iphone');
    if (syncIphoneBtn) {
      syncIphoneBtn.addEventListener('click', () => this.exportIcs());
    }

    const formExam = document.getElementById('form-exam');
    if (formExam) {
      formExam.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveExam();
      });
    }
  }

  populateSubjectSelects() {
    const subjects = window.studyStore.getSubjects();
    const examSubSelect = document.getElementById('exam-subject');
    if (examSubSelect) {
      examSubSelect.innerHTML = `<option value="">Sin materia asignada</option>` +
        subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
    }
  }

  render() {
    this.renderCalendar();
    this.renderUpcoming();
    this.renderSelectedDayEvents();
    this.renderMiniCalendar();
  }

  renderCalendar() {
    if (!this.calendarGrid || !this.currentMonthEl) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    this.currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Primer día del mes (0=domingo, ajustar a 0=lunes para estándar hispano)
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Lunes = 0, Domingo = 6
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const exams = window.studyStore.getExams();
    const tasks = window.studyStore.getTasks();
    const subjects = window.studyStore.getSubjects();

    let gridHtml = '';

    // Días del mes anterior
    for (let i = startOffset - 1; i >= 0; i--) {
      gridHtml += `
        <div class="h-20 p-1.5 bg-slate-50/50 dark:bg-slate-800/20 text-slate-300 dark:text-slate-600 rounded-lg text-xs select-none">
          <span>${prevMonthDays - i}</span>
        </div>
      `;
    }

    const todayStr = window.getLocalDateString(new Date());
    const selectedStr = window.getLocalDateString(this.selectedDate);

    // Días del mes actual
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, month, day);
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isToday = dayStr === todayStr;
      const isSelected = dayStr === selectedStr;

      // Eventos de este día
      const dayExams = exams.filter(e => e.date === dayStr);
      const dayTasks = tasks.filter(t => t.dueDate === dayStr && t.status !== 'completed');

      let indicators = '';
      if (dayExams.length > 0) {
        indicators += `<span class="w-2 h-2 rounded-full bg-rose-500 inline-block" title="${dayExams.length} examen(es)"></span>`;
      }
      if (dayTasks.length > 0) {
        indicators += `<span class="w-2 h-2 rounded-full bg-blue-500 inline-block" title="${dayTasks.length} tarea(s)"></span>`;
      }

      gridHtml += `
        <div onclick="window.calendarModule.selectDay('${dayStr}')" class="h-20 p-1.5 rounded-lg text-xs cursor-pointer transition flex flex-col justify-between border ${
          isSelected 
            ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 shadow-sm' 
            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
        }">
          <div class="flex items-center justify-between">
            <span class="w-6 h-6 flex items-center justify-center font-medium rounded-full ${
              isToday 
                ? 'bg-blue-600 text-white font-bold' 
                : 'text-slate-700 dark:text-slate-300'
            }">${day}</span>
            <div class="flex items-center gap-1">${indicators}</div>
          </div>

          <div class="space-y-0.5 overflow-hidden">
            ${dayExams.slice(0, 1).map(e => {
              const sub = subjects.find(s => s.id === e.subjectId);
              return `<div class="truncate text-[10px] font-semibold text-rose-700 dark:text-rose-300 px-1 rounded bg-rose-50 dark:bg-rose-900/30">${this.escapeHtml(e.title)}</div>`;
            }).join('')}
            ${dayTasks.slice(0, 1).map(t => {
              return `<div class="truncate text-[10px] text-blue-700 dark:text-blue-300 px-1 rounded bg-blue-50 dark:bg-blue-900/30">${this.escapeHtml(t.title)}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    this.calendarGrid.innerHTML = gridHtml;
  }

  selectDay(dayStr) {
    const parts = dayStr.split('-');
    this.selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    this.renderCalendar();
    this.renderSelectedDayEvents();
  }

  selectDateAndNavigate(dayStr) {
    const parts = dayStr.split('-');
    this.currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    this.selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    window.app.navigateTo('calendar');
    this.render();
  }

  renderMiniCalendar() {
    const miniGrid = document.getElementById('dashboard-mini-calendar-grid');
    const miniTitle = document.getElementById('dashboard-mini-calendar-title');
    if (!miniGrid || !miniTitle) return;

    const year = this.miniDate.getFullYear();
    const month = this.miniDate.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    miniTitle.textContent = `${monthNames[month]} ${year}`;

    // Primer día del mes (ajustado: Lunes = 0, Domingo = 6)
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = (firstDay + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const todayStr = window.getLocalDateString(new Date());
    const exams = window.studyStore.getExams();
    const tasks = window.studyStore.getTasks().filter(t => t.status !== 'completed');

    let html = '';

    // Días del mes anterior (apagados)
    for (let i = 0; i < startOffset; i++) {
      const dayNum = prevMonthDays - startOffset + i + 1;
      html += `<div class="py-1 text-slate-300 dark:text-slate-600 text-xs select-none">${dayNum}</div>`;
    }

    // Días del mes en curso
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = (dateStr === todayStr);
      const dayExams = exams.filter(e => e.date === dateStr);
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);
      const hasExams = dayExams.length > 0;
      const hasTasks = dayTasks.length > 0;

      let tooltip = `${d} de ${monthNames[month]}`;
      if (hasExams) tooltip += ` • ${dayExams.length} examen(es)/entrega(s)`;
      if (hasTasks) tooltip += ` • ${dayTasks.length} tarea(s) pendiente(s)`;

      const badgeClass = isToday
        ? 'bg-indigo-600 text-white font-bold shadow-sm'
        : 'text-slate-700 dark:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-700/60 font-medium';

      html += `
        <div class="py-0.5 flex flex-col items-center justify-center cursor-pointer group" onclick="window.calendarModule.selectDateAndNavigate('${dateStr}')" title="${this.escapeHtml(tooltip)}">
          <span class="w-6 h-6 flex items-center justify-center rounded-full text-xs transition ${badgeClass}">
            ${d}
          </span>
          <div class="flex items-center gap-0.5 h-1.5 mt-0.5">
            ${hasExams ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>' : ''}
            ${hasTasks ? '<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>' : ''}
          </div>
        </div>
      `;
    }

    // Rellenar días del mes siguiente para completar la última fila
    const totalFilled = startOffset + totalDays;
    const remainingCells = (7 - (totalFilled % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      html += `<div class="py-1 text-slate-300 dark:text-slate-600 text-xs select-none">${i}</div>`;
    }

    miniGrid.innerHTML = html;
  }

  renderSelectedDayEvents() {
    if (!this.dayEventsContainer) return;
    const dayStr = window.getLocalDateString(this.selectedDate);
    
    if (this.selectedDayTitle) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      this.selectedDayTitle.textContent = this.selectedDate.toLocaleDateString('es-ES', options);
    }

    const exams = window.studyStore.getExams().filter(e => e.date === dayStr);
    const tasks = window.studyStore.getTasks().filter(t => t.dueDate === dayStr);
    const subjects = window.studyStore.getSubjects();

    if (exams.length === 0 && tasks.length === 0) {
      this.dayEventsContainer.innerHTML = `
        <p class="text-xs text-slate-400 italic py-3 text-center">No hay eventos ni tareas programadas para este día.</p>
      `;
      return;
    }

    let html = '';
    if (exams.length > 0) {
      html += `<div class="space-y-2 mb-3">`;
      html += exams.map(e => {
        const sub = subjects.find(s => s.id === e.subjectId);
        return `
          <div class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 text-xs flex justify-between items-start gap-2">
            <div>
              <div class="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                <i data-lucide="award" class="w-3.5 h-3.5"></i>
                <span>${this.escapeHtml(e.title)}</span>
              </div>
              <div class="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">
                ${e.time ? `🕒 ${e.time}` : ''} ${e.classroom ? `• 💻 ${this.escapeHtml(e.classroom)}` : ''}
              </div>
              ${sub ? `<span class="inline-block mt-1 font-medium text-[10px] px-1.5 py-0.2 rounded" style="background-color: ${sub.color}20; color: ${sub.color};">${this.escapeHtml(sub.name)}</span>` : ''}
            </div>
            <button onclick="window.calendarModule.deleteExam('${e.id}')" title="Eliminar examen" class="text-rose-400 hover:text-rose-600">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      }).join('');
      html += `</div>`;
    }

    if (tasks.length > 0) {
      html += `<div class="space-y-1.5">`;
      html += tasks.map(t => {
        return `
          <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs flex items-center justify-between">
            <span class="text-slate-700 dark:text-slate-200 font-medium ${t.status === 'completed' ? 'line-through opacity-60' : ''}">
              ${this.escapeHtml(t.title)}
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}">
              ${t.status === 'completed' ? 'Hecha' : 'Pendiente'}
            </span>
          </div>
        `;
      }).join('');
      html += `</div>`;
    }

    this.dayEventsContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  renderUpcoming() {
    if (!this.upcomingContainer) return;

    const exams = window.studyStore.getExams();
    const subjects = window.studyStore.getSubjects();
    const todayStr = window.getLocalDateString(new Date());

    // Filtrar desde hoy en adelante y limitar a los 5 próximos
    const upcoming = exams
      .filter(e => e.date >= todayStr)
      .slice(0, 5);

    if (upcoming.length === 0) {
      this.upcomingContainer.innerHTML = `
        <div class="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <p class="text-xs text-slate-400">No tienes exámenes o entregas próximas registradas.</p>
          <button onclick="window.calendarModule.openExamModal()" class="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
            + Añadir fecha importante
          </button>
        </div>
      `;
      return;
    }

    this.upcomingContainer.innerHTML = upcoming.map(e => {
      const sub = subjects.find(s => s.id === e.subjectId);
      const diffDays = Math.ceil((new Date(e.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));

      let countdownBadge = '';
      if (diffDays === 0) {
        countdownBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white animate-pulse">¡HOY!</span>`;
      } else if (diffDays === 1) {
        countdownBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">¡Mañana!</span>`;
      } else if (diffDays <= 7) {
        countdownBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Faltan ${diffDays} días</span>`;
      } else {
        countdownBadge = `<span class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">En ${diffDays} días</span>`;
      }

      return `
        <div class="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow transition flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${this.escapeHtml(e.title)}</h4>
              ${e.weight ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">${e.weight}% nota</span>` : ''}
            </div>
            
            <div class="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span class="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> ${e.date}
              </span>
              ${e.time ? `<span>🕒 ${e.time}</span>` : ''}
              ${sub ? `
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${sub.color}"></span>
                  ${this.escapeHtml(sub.name)}
                </span>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            ${countdownBadge}
            <button onclick="window.calendarModule.addToGoogleCalendar('${e.id}')" title="Añadir a Google Calendar" class="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition cursor-pointer">
              <i data-lucide="calendar-plus" class="w-4 h-4"></i>
            </button>
            <button onclick="window.calendarModule.deleteExam('${e.id}')" title="Eliminar" class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition cursor-pointer">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  openExamModal(examId = null) {
    const modal = document.getElementById('modal-exam');
    const form = document.getElementById('form-exam');
    const title = document.getElementById('modal-exam-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('exam-id').value = examId || '';
    this.populateSubjectSelects();

    if (examId) {
      title.textContent = 'Editar Examen o Entrega';
      const exam = window.studyStore.getExams().find(e => e.id === examId);
      if (exam) {
        document.getElementById('exam-title').value = exam.title || '';
        document.getElementById('exam-subject').value = exam.subjectId || '';
        document.getElementById('exam-date').value = exam.date || '';
        document.getElementById('exam-time').value = exam.time || '09:00';
        document.getElementById('exam-classroom').value = exam.classroom || '';
        document.getElementById('exam-weight').value = exam.weight || '';
        document.getElementById('exam-notes').value = exam.notes || '';
      }
    } else {
      title.textContent = 'Nuevo Examen o Entrega';
      document.getElementById('exam-date').value = window.getLocalDateString(new Date());
      document.getElementById('exam-time').value = '10:00';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('exam-title').focus();
  }

  closeExamModal() {
    const modal = document.getElementById('modal-exam');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveExam() {
    const id = document.getElementById('exam-id').value;
    const title = document.getElementById('exam-title').value.trim();
    const date = document.getElementById('exam-date').value;
    if (!title || !date) return;

    const subjectId = document.getElementById('exam-subject').value;
    const time = document.getElementById('exam-time').value;
    const classroom = document.getElementById('exam-classroom').value.trim();
    const weight = document.getElementById('exam-weight').value;
    const notes = document.getElementById('exam-notes').value.trim();

    window.studyStore.saveExam({
      id: id || undefined,
      title,
      subjectId,
      date,
      time,
      classroom,
      weight: parseFloat(weight) || 0,
      notes
    });

    this.closeExamModal();
  }

  deleteExam(id) {
    if (confirm('¿Eliminar esta fecha importante?')) {
      window.studyStore.deleteExam(id);
    }
  }

  exportIcs() {
    const exams = window.studyStore.getExams();
    const subjects = window.studyStore.getSubjects();
    const filter = window.studyStore.getActiveStudyFilter();
    const classSchedule = window.studyStore.getClassSchedule();
    const tfg = window.studyStore.getTfgData();

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudyFlow//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:StudyFlow - Exámenes y Clases',
      'X-WR-TIMEZONE:Europe/Madrid'
    ];

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    // 1. Exámenes y fechas clave
    exams.forEach(e => {
      const sub = subjects.find(s => s.id === e.subjectId);
      const subName = sub ? sub.name : (e.studyId === 'ade' ? 'ADE UNED' : 'Marketing FP');
      const cleanDate = (e.date || '').replace(/-/g, '');
      if (!cleanDate) return;

      let dtStart, dtEnd;
      if (e.time) {
        const cleanTime = (e.time || '').replace(/:/g, '') + '00';
        dtStart = `${cleanDate}T${cleanTime}`;
        const [h, m] = (e.time || '10:00').split(':').map(Number);
        const endH = Math.min(23, h + 2);
        dtEnd = `${cleanDate}T${pad(endH)}${pad(m)}00`;
      } else {
        dtStart = cleanDate;
        const dObj = new Date(e.date);
        dObj.setDate(dObj.getDate() + 1);
        dtEnd = `${dObj.getFullYear()}${pad(dObj.getMonth() + 1)}${pad(dObj.getDate())}`;
      }

      const uid = `exam_${e.id || Math.random().toString(36).substr(2)}@studyflow`;
      const isAllDay = !e.time;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${dtstamp}`);
      if (isAllDay) {
        icsContent.push(`DTSTART;VALUE=DATE:${dtStart}`);
        icsContent.push(`DTEND;VALUE=DATE:${dtEnd}`);
      } else {
        icsContent.push(`DTSTART:${dtStart}`);
        icsContent.push(`DTEND:${dtEnd}`);
      }
      icsContent.push(`SUMMARY:🎯 [Examen] ${e.title} (${subName})`);
      icsContent.push(`DESCRIPTION:Materia: ${subName}\\nNotas: ${e.notes || 'Sin notas adicionales'}`);
      if (e.classroom) icsContent.push(`LOCATION:${e.classroom}`);

      // Alarma 1 día antes para iPhone
      icsContent.push('BEGIN:VALARM');
      icsContent.push('TRIGGER:-P1D');
      icsContent.push('ACTION:DISPLAY');
      icsContent.push(`DESCRIPTION:Recordatorio Examen Mañana: ${e.title}`);
      icsContent.push('END:VALARM');

      // Alarma 2 horas antes
      icsContent.push('BEGIN:VALARM');
      icsContent.push('TRIGGER:-PT2H');
      icsContent.push('ACTION:DISPLAY');
      icsContent.push(`DESCRIPTION:En 2 horas: ${e.title}`);
      icsContent.push('END:VALARM');

      icsContent.push('END:VEVENT');
    });

    // 2. Horario lectivo de clases ADE (si ADE o Todos)
    if (filter === 'ade' || filter === 'all') {
      const dayMap = { lunes: 'MO', martes: 'TU', miercoles: 'WE', jueves: 'TH', viernes: 'FR' };
      const dayIndexMap = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5 };

      classSchedule.forEach(c => {
        const byDay = dayMap[c.day];
        if (!byDay) return;

        const targetDayOffset = dayIndexMap[c.day] - 1;
        const startDate = new Date(2026, 9, 5 + targetDayOffset); // Octubre 2026
        const cleanDate = `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}${pad(startDate.getDate())}`;

        const [startH, startM] = (c.time || '18:00').split(':').map(Number);
        const endH = Math.min(23, startH + 1);

        const dtStart = `${cleanDate}T${pad(startH)}${pad(startM)}00`;
        const dtEnd = `${cleanDate}T${pad(endH)}${pad(startM)}00`;
        const uid = `class_${c.id || Math.random().toString(36).substr(2)}@studyflow`;

        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${uid}`);
        icsContent.push(`DTSTAMP:${dtstamp}`);
        icsContent.push(`DTSTART:${dtStart}`);
        icsContent.push(`DTEND:${dtEnd}`);
        icsContent.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=20270630T235959Z`);
        icsContent.push(`SUMMARY:📚 [Clase ADE] ${c.title}`);
        icsContent.push(`DESCRIPTION:Clase o Tutoría UNED INTECCA\\nAula / Enlace: ${c.classroom || c.url || ''}`);
        if (c.classroom) icsContent.push(`LOCATION:${c.classroom}`);
        if (c.url) icsContent.push(`URL:${c.url}`);

        // Alarma 15 minutos antes
        icsContent.push('BEGIN:VALARM');
        icsContent.push('TRIGGER:-PT15M');
        icsContent.push('ACTION:DISPLAY');
        icsContent.push(`DESCRIPTION:Clase en 15 minutos: ${c.title}`);
        icsContent.push('END:VALARM');

        icsContent.push('END:VEVENT');
      });
    }

    // 3. Hitos TFG (si Marketing o Todos)
    if (filter === 'marketing' || filter === 'all') {
      if (tfg && tfg.milestones) {
        tfg.milestones.forEach(m => {
          if (!m.dueDate) return;
          const cleanDate = m.dueDate.replace(/-/g, '');
          const uid = `tfg_${m.id}@studyflow`;

          icsContent.push('BEGIN:VEVENT');
          icsContent.push(`UID:${uid}`);
          icsContent.push(`DTSTAMP:${dtstamp}`);
          icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
          const dObj = new Date(m.dueDate);
          dObj.setDate(dObj.getDate() + 1);
          const dtEnd = `${dObj.getFullYear()}${pad(dObj.getMonth() + 1)}${pad(dObj.getDate())}`;
          icsContent.push(`DTEND;VALUE=DATE:${dtEnd}`);
          icsContent.push(`SUMMARY:🎯 [Hito TFG] ${m.title}`);
          icsContent.push(`DESCRIPTION:Proyecto Fin de Ciclo Marketing FP\\nEstado: ${m.completed ? 'Completado' : 'Pendiente'}`);

          icsContent.push('BEGIN:VALARM');
          icsContent.push('TRIGGER:-P1D');
          icsContent.push('ACTION:DISPLAY');
          icsContent.push(`DESCRIPTION:Hito TFG Mañana: ${m.title}`);
          icsContent.push('END:VALARM');

          icsContent.push('END:VEVENT');
        });
      }
    }

    icsContent.push('END:VCALENDAR');

    const icsText = icsContent.join('\r\n');
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StudyFlow_Calendario.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Abrir modal explicativo
    const modal = document.getElementById('modal-sync-iphone');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    return icsText;
  }

  openSyncModal() {
    const modal = document.getElementById('modal-sync-calendar');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  closeSyncModal() {
    const modal = document.getElementById('modal-sync-calendar');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  copyFeedUrl() {
    const input = document.getElementById('input-calendar-feed-url');
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        if (window.app && typeof window.app.showToast === 'function') {
          window.app.showToast('Enlace de suscripción copiado al portapapeles', 'success');
        } else {
          alert('Enlace copiado al portapapeles');
        }
      }).catch(() => {
        document.execCommand('copy');
      });
    }
  }

  addToGoogleCalendar(examId) {
    const exam = window.studyStore.getExams().find(e => e.id === examId);
    if (!exam) return;
    const subjects = window.studyStore.getSubjects();
    const sub = subjects.find(s => s.id === exam.subjectId);
    const subName = sub ? sub.name : 'Estudios';

    const cleanDate = (exam.date || '').replace(/-/g, '');
    let dates = cleanDate;
    if (exam.time && exam.time.includes(':')) {
      const [h, m] = exam.time.split(':').map(Number);
      const start = `${cleanDate}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
      const endH = (h + 2) % 24;
      const end = `${cleanDate}T${String(endH).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
      dates = `${start}/${end}`;
    } else {
      const dObj = new Date(exam.date);
      dObj.setDate(dObj.getDate() + 1);
      const nextDate = `${dObj.getFullYear()}${String(dObj.getMonth() + 1).padStart(2, '0')}${String(dObj.getDate()).padStart(2, '0')}`;
      dates = `${cleanDate}/${nextDate}`;
    }

    const title = `Examen: ${exam.title} (${subName})`;
    let details = `Materia: ${subName}\n`;
    if (exam.classroom) details += `Aula: ${exam.classroom}\n`;
    if (exam.weight) details += `Ponderación: ${exam.weight}% de la nota\n`;
    if (exam.notes) details += `Notas: ${exam.notes}\n`;
    details += `Plataforma CRIS: https://pagina-personal-pelibuey.vercel.app`;

    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(exam.classroom || '')}`;
    window.open(gUrl, '_blank');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.calendarModule = new CalendarModule();
