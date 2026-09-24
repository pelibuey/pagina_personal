/**
 * StudyFlow - Marketing FP Grades Module
 * Control detallado de notas por Temas (1 al 9) con Tareas y Mini Exámenes para FP Marketing.
 * Soporta asignaturas individuales (DEMC, MSC, TCIC, SOST), títulos de temas editables con auto-guardado,
 * fecha de entrega compartida por tema (misma para tarea y examen), y Matriz Global comparativa.
 */

class MarketingGradesModule {
  constructor() {
    this.activeSubjectId = 'mkt_sub_1'; // Por defecto DEMC o 'all'
    this.tabsContainer = document.getElementById('mkt-grades-subject-tabs');
    this.topicsGrid = document.getElementById('mkt-topics-grid');
    this.summaryContainer = document.getElementById('mkt-grades-summary');
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
    const formWeights = document.getElementById('form-mkt-weightings');
    if (formWeights) {
      formWeights.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveWeightingsFromModal();
      });
    }
  }

  getMarketingSubjects() {
    return window.studyStore.getSubjects('marketing').filter(s => s.id !== 'mkt_sub_tfg');
  }

  switchSubject(subjectId) {
    this.activeSubjectId = subjectId;
    this.render();
  }

  render() {
    const subjects = this.getMarketingSubjects();
    if (subjects.length === 0) return;

    // Verificar que activeSubjectId sea 'all' o un id válido
    if (this.activeSubjectId !== 'all' && !subjects.some(s => s.id === this.activeSubjectId)) {
      this.activeSubjectId = subjects[0].id;
    }

    this.renderSubjectTabs(subjects);

    if (this.activeSubjectId === 'all') {
      this.renderGlobalSummary(subjects);
      this.renderGlobalMatrix(subjects);
    } else {
      this.renderSummary();
      this.renderTopics();
    }

    if (window.lucide) window.lucide.createIcons();
  }

  renderSubjectTabs(subjects) {
    if (!this.tabsContainer) return;

    const isGlobal = this.activeSubjectId === 'all';

    // Cálculo de estadísticas globales para el botón de Vista Global
    let totalScoreSum = 0;
    let subjectsWithGrades = 0;
    subjects.forEach(sub => {
      const summary = window.studyStore.calculateMarketingSubjectSummary(sub.id);
      if (summary.average !== null) {
        totalScoreSum += summary.average;
        subjectsWithGrades++;
      }
    });
    const globalAvgStr = subjectsWithGrades > 0 ? (totalScoreSum / subjectsWithGrades).toFixed(1) : '—';

    const globalTabHtml = `
      <button type="button" onclick="window.marketingGradesModule.switchSubject('all')"
        class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-shrink-0 ${
          isGlobal
            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
        }">
        <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
        <span>📊 Vista Global (4 Asignaturas)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
          isGlobal
            ? 'bg-white/20 text-white'
            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
        }">
          ${globalAvgStr}
        </span>
      </button>
    `;

    const subjectTabsHtml = subjects.map(sub => {
      const isActive = sub.id === this.activeSubjectId;
      const summary = window.studyStore.calculateMarketingSubjectSummary(sub.id);
      const avgStr = summary.average !== null ? summary.average.toFixed(1) : '—';

      return `
        <button type="button" onclick="window.marketingGradesModule.switchSubject('${sub.id}')"
          title="${this.escapeHtml(sub.name)}"
          class="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex-shrink-0 ${
            isActive
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
          }">
          <span>${this.escapeHtml(sub.code || sub.name)}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
          }">
            ${avgStr}
          </span>
        </button>
      `;
    }).join('');

    this.tabsContainer.innerHTML = globalTabHtml + subjectTabsHtml;
  }

  // ==========================================
  // VISTA GLOBAL (MATRIZ COMPARATIVA DE 4 ASIGNATURAS)
  // ==========================================
  renderGlobalSummary(subjects) {
    if (!this.summaryContainer) return;

    let totalTasksCompleted = 0;
    let totalExamsCompleted = 0;
    let totalScoreSum = 0;
    let subjectsWithGrades = 0;
    const totalPossibleTasks = subjects.length * 9;
    const totalPossibleExams = subjects.length * 9;

    const todayStr = window.getLocalDateString(new Date());
    let nextGlobalDueDate = null;
    let nextGlobalSubject = null;
    let nextGlobalTopic = null;

    subjects.forEach(sub => {
      const summary = window.studyStore.calculateMarketingSubjectSummary(sub.id);
      totalTasksCompleted += summary.completedTasks;
      totalExamsCompleted += summary.completedExams;
      if (summary.average !== null) {
        totalScoreSum += summary.average;
        subjectsWithGrades++;
      }

      const topics = window.studyStore.getMarketingTopicGrades(sub.id);
      topics.forEach(top => {
        if (top.dueDate) {
          const isDone = Boolean(top.task && top.task.completed && top.miniExam && top.miniExam.completed);
          if (!isDone && top.dueDate >= todayStr) {
            if (!nextGlobalDueDate || top.dueDate < nextGlobalDueDate) {
              nextGlobalDueDate = top.dueDate;
              nextGlobalSubject = sub;
              nextGlobalTopic = top;
            }
          }
        }
      });
    });

    const globalAvg = subjectsWithGrades > 0 ? (totalScoreSum / subjectsWithGrades) : null;
    const globalProgress = Math.round(((totalTasksCompleted + totalExamsCompleted) / (totalPossibleTasks + totalPossibleExams)) * 100);

    let scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-slate-100 dark:bg-slate-700 text-slate-500">Sin notas</span>`;
    if (globalAvg !== null) {
      if (globalAvg >= 9) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Sobresaliente (${globalAvg.toFixed(1)})</span>`;
      } else if (globalAvg >= 7) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Notable (${globalAvg.toFixed(1)})</span>`;
      } else if (globalAvg >= 5) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Aprobado (${globalAvg.toFixed(1)})</span>`;
      } else {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Suspenso (${globalAvg.toFixed(1)})</span>`;
      }
    }

    this.summaryContainer.innerHTML = `
      <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-bold uppercase">
                VISTA MATRIZ GLOBAL
              </span>
              <h3 class="text-xl font-extrabold text-slate-800 dark:text-slate-100">Evaluación Continua • 4 Módulos en Curso</h3>
            </div>
            <p class="text-xs text-slate-400 mt-1">Fechas sincronizadas: en cada tema, la tarea y el mini examen comparten la misma fecha de entrega.</p>
          </div>
          <div class="flex items-center gap-3">
            ${nextGlobalDueDate ? `
              <div class="px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
                <span class="text-slate-600 dark:text-slate-300">Próxima entrega:</span>
                <strong class="text-purple-700 dark:text-purple-300">${this.escapeHtml(nextGlobalSubject.code)} T${nextGlobalTopic.number} (${this.formatDateEs(nextGlobalDueDate)})</strong>
              </div>
            ` : ''}
            ${scoreBadge}
          </div>
        </div>

        <!-- KPI Grid Global -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Media General FP</span>
            <span class="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
              ${globalAvg !== null ? globalAvg.toFixed(2) : '—'}
            </span>
            <span class="text-[10px] text-slate-400">${subjectsWithGrades} de 4 módulos con notas</span>
          </div>

          <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tareas Entregadas</span>
            <span class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              ${totalTasksCompleted} <span class="text-xs font-normal text-slate-400">/ ${totalPossibleTasks}</span>
            </span>
            <span class="text-[10px] text-slate-400">${Math.round((totalTasksCompleted / totalPossibleTasks) * 100)}% de entregas</span>
          </div>

          <div class="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Exámenes Hechos</span>
            <span class="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1 block">
              ${totalExamsCompleted} <span class="text-xs font-normal text-slate-400">/ ${totalPossibleExams}</span>
            </span>
            <span class="text-[10px] text-slate-400">${Math.round((totalExamsCompleted / totalPossibleExams) * 100)}% completados</span>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700/80">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avance Global</span>
            <span class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
              ${globalProgress}%
            </span>
            <span class="text-[10px] text-slate-400">${totalTasksCompleted + totalExamsCompleted} de ${totalPossibleTasks + totalPossibleExams} evaluaciones</span>
          </div>
        </div>

        <!-- Módulos en curso con acceso directo -->
        <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Módulos en curso:</span>
          ${subjects.map(sub => {
            const summary = window.studyStore.calculateMarketingSubjectSummary(sub.id);
            const avg = summary.average !== null ? summary.average.toFixed(1) : '—';
            return `
              <button type="button" onclick="window.marketingGradesModule.switchSubject('${sub.id}')"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-purple-100 dark:bg-slate-700 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition">
                <span>${this.escapeHtml(sub.code)}:</span>
                <span class="text-purple-600 dark:text-purple-400">${avg}</span>
                <span class="text-[10px] text-slate-400">(${summary.completedTasks + summary.completedExams}/18)</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderGlobalMatrix(subjects) {
    if (!this.topicsGrid) return;
    this.topicsGrid.className = 'space-y-4';

    // Renderiza 9 tarjetas, una para cada Tema (1 al 9), comparando los 4 módulos
    let matrixHtml = '';

    for (let tNum = 1; tNum <= 9; tNum++) {
      let temaTasksCompleted = 0;
      let temaExamsCompleted = 0;

      const columnsHtml = subjects.map(sub => {
        const topics = window.studyStore.getMarketingTopicGrades(sub.id);
        const topic = topics.find(t => t.number === tNum) || {
          number: tNum,
          name: `Tema ${tNum}`,
          dueDate: '',
          task: { score: null, completed: false },
          miniExam: { score: null, completed: false }
        };

        if (topic.task && topic.task.completed) temaTasksCompleted++;
        if (topic.miniExam && topic.miniExam.completed) temaExamsCompleted++;

        const isTopicCompleted = Boolean(topic.task && topic.task.completed && topic.miniExam && topic.miniExam.completed);

        const avg = window.studyStore.calculateMarketingTopicAverage(topic, sub.weightings);
        let avgBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400">Sin nota</span>`;
        if (avg !== null) {
          if (avg >= 9) {
            avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">${avg.toFixed(1)}</span>`;
          } else if (avg >= 7) {
            avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">${avg.toFixed(1)}</span>`;
          } else if (avg >= 5) {
            avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">${avg.toFixed(1)}</span>`;
          } else {
            avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">${avg.toFixed(1)}</span>`;
          }
        }

        const taskScore = (topic.task && topic.task.score !== null && topic.task.score !== undefined) ? topic.task.score : '';
        const taskCompleted = Boolean(topic.task && topic.task.completed);

        const examScore = (topic.miniExam && topic.miniExam.score !== null && topic.miniExam.score !== undefined) ? topic.miniExam.score : '';
        const examCompleted = Boolean(topic.miniExam && topic.miniExam.completed);

        return `
          <div class="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span class="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-extrabold text-[11px]">
                  ${this.escapeHtml(sub.code)}
                </span>
                <div class="flex items-center gap-1">
                  ${avgBadge}
                  <button type="button" onclick="window.marketingGradesModule.switchSubject('${sub.id}')"
                    title="Ver tema y observaciones en ${this.escapeHtml(sub.name)}"
                    class="p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200/60 dark:hover:bg-slate-600 transition">
                    <i data-lucide="arrow-right" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>
              ${(topic.name && topic.name.trim() !== `Tema ${tNum}` && topic.name.trim() !== String(tNum) && !topic.name.includes(':')) ? `
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 line-clamp-2" title="${this.escapeHtml(topic.name)}">
                ${this.escapeHtml(topic.name)}
              </p>` : ''}
            </div>

            <!-- Fecha de entrega compartida por tema -->
            <div class="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100/80 dark:border-purple-800/30">
              <span class="flex items-center gap-1 font-bold text-purple-900 dark:text-purple-300 text-[10px]">
                <i data-lucide="calendar" class="w-3 h-3 text-purple-600"></i> Límite:
              </span>
              <div class="flex items-center gap-1">
                ${this.getDueDateBadge(topic.dueDate, isTopicCompleted)}
                <input type="date"
                  value="${topic.dueDate || ''}"
                  title="Fecha límite compartida para tarea y examen: ${sub.code} Tema ${tNum}"
                  onchange="window.marketingGradesModule.updateTopicDueDate(${tNum}, this.value, '${sub.id}')"
                  class="w-28 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500">
              </div>
            </div>

            <!-- Tarea y Mini Examen compactos -->
            <div class="space-y-2 pt-0.5">
              <!-- Fila Tarea -->
              <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-800/30">
                <label class="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 dark:text-blue-300 cursor-pointer select-none">
                  <input type="checkbox"
                    ${taskCompleted ? 'checked' : ''}
                    onchange="window.marketingGradesModule.updateTaskCompleted(${tNum}, this.checked, '${sub.id}')"
                    class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600">
                  <span>Tarea</span>
                </label>
                <input type="number" step="0.1" min="0" max="10" placeholder="Nota"
                  value="${taskScore}"
                  onchange="window.marketingGradesModule.updateTaskScore(${tNum}, this.value, '${sub.id}')"
                  class="w-14 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <!-- Fila Mini Examen -->
              <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100/80 dark:border-violet-800/30">
                <label class="flex items-center gap-1.5 text-[11px] font-bold text-violet-900 dark:text-violet-300 cursor-pointer select-none">
                  <input type="checkbox"
                    ${examCompleted ? 'checked' : ''}
                    onchange="window.marketingGradesModule.updateExamCompleted(${tNum}, this.checked, '${sub.id}')"
                    class="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-600">
                  <span>Examen</span>
                </label>
                <input type="number" step="0.1" min="0" max="10" placeholder="Nota"
                  value="${examScore}"
                  onchange="window.marketingGradesModule.updateExamScore(${tNum}, this.value, '${sub.id}')"
                  class="w-14 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500">
              </div>
            </div>
          </div>
        `;
      }).join('');

      matrixHtml += `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm shadow-purple-600/30">
                T${tNum}
              </span>
              <div>
                <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                  Tema ${tNum} • Comparativa en los 4 Módulos
                </h4>
                <p class="text-[11px] text-slate-400">DEMC, MSC, TCIC y SOST (fecha de entrega asociada por materia)</p>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-[11px]">
                ${temaTasksCompleted}/4 Tareas
              </span>
              <span class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-[11px]">
                ${temaExamsCompleted}/4 Exámenes
              </span>
            </div>
          </div>

          <!-- 4 Columnas de asignaturas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            ${columnsHtml}
          </div>
        </div>
      `;
    }

    this.topicsGrid.innerHTML = matrixHtml;
  }

  // ==========================================
  // VISTA POR ASIGNATURA INDIVIDUAL (DEMC, MSC, TCIC, SOST)
  // ==========================================
  renderSummary() {
    if (!this.summaryContainer) return;
    const sub = window.studyStore.getSubjectById(this.activeSubjectId);
    if (!sub) return;

    const summary = window.studyStore.calculateMarketingSubjectSummary(this.activeSubjectId);
    const w = summary.weightings || { tasks: null, miniExams: null };
    const hasCustomWeighting = w.tasks !== null && w.miniExams !== null;

    let scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-slate-100 dark:bg-slate-700 text-slate-500">Sin notas</span>`;
    if (summary.average !== null) {
      const avg = summary.average;
      if (avg >= 9) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Sobresaliente (${avg.toFixed(1)})</span>`;
      } else if (avg >= 7) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Notable (${avg.toFixed(1)})</span>`;
      } else if (avg >= 5) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Aprobado (${avg.toFixed(1)})</span>`;
      } else {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Suspenso (${avg.toFixed(1)})</span>`;
      }
    }

    this.summaryContainer.innerHTML = `
      <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-bold uppercase">
                ${this.escapeHtml(sub.code || 'MKT')}
              </span>
              <h3 class="text-xl font-extrabold text-slate-800 dark:text-slate-100">${this.escapeHtml(sub.name)}</h3>
            </div>
            <p class="text-xs text-slate-400 mt-1">Calificaciones continuas en 9 temas • Fechas asociadas y compartidas para tarea y mini examen</p>
          </div>
          <div class="flex items-center gap-3">
            ${summary.nextDueDate ? `
              <div class="px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
                <span class="text-slate-600 dark:text-slate-300">Próxima entrega:</span>
                <strong class="text-purple-700 dark:text-purple-300">Tema ${summary.nextTopic.number} (${this.formatDateEs(summary.nextDueDate)})</strong>
              </div>
            ` : ''}
            ${scoreBadge}
          </div>
        </div>

        <!-- KPI Grid de Medias y Progreso -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nota Media Módulo</span>
            <span class="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
              ${summary.average !== null ? summary.average.toFixed(2) : '—'}
            </span>
            <span class="text-[10px] text-slate-400">
              ${hasCustomWeighting ? `Pond: ${w.tasks}% T / ${w.miniExams}% E` : 'Media provisional (50/50)'}
            </span>
          </div>

          <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Media de Tareas</span>
            <span class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              ${summary.tasksAverage !== null ? summary.tasksAverage.toFixed(2) : '—'}
            </span>
            <span class="text-[10px] text-slate-400">Temas 1 al 9</span>
          </div>

          <div class="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/30">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Media Mini Exámenes</span>
            <span class="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1 block">
              ${summary.examsAverage !== null ? summary.examsAverage.toFixed(2) : '—'}
            </span>
            <span class="text-[10px] text-slate-400">Temas 1 al 9</span>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700/80">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avance de Evaluaciones</span>
            <span class="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
              ${summary.progress}%
            </span>
            <span class="text-[10px] text-slate-400">
              ${summary.completedTasks}/9 Tareas • ${summary.completedExams}/9 Exámenes
            </span>
          </div>
        </div>

        <!-- Aviso informativo de ponderación -->
        <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <i data-lucide="scale" class="w-4 h-4"></i>
            </div>
            <div>
              <span class="font-bold text-amber-900 dark:text-amber-200 block">Ponderación oficial: lista para configurar</span>
              <p class="text-amber-700/90 dark:text-amber-300/90 text-[11px] mt-0.5">
                ${hasCustomWeighting
                  ? `Configuración activa: <strong>${w.tasks}%</strong> Tareas y <strong>${w.miniExams}%</strong> Mini Exámenes.`
                  : `Actualmente calculando media estándar (50/50). Cuando tengas los porcentajes oficiales de tu profesor (ej: 60% tareas, 40% exámenes), se aplicarán automáticamente.`
                }
              </p>
            </div>
          </div>
          <button type="button" onclick="window.marketingGradesModule.openWeightingsModal()" class="px-3.5 py-1.5 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 font-bold text-xs flex-shrink-0 transition">
            ${hasCustomWeighting ? 'Modificar Ponderación' : 'Ajustar Ponderación'}
          </button>
        </div>
      </div>
    `;
  }

  renderTopics() {
    if (!this.topicsGrid) return;
    this.topicsGrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';

    const sub = window.studyStore.getSubjectById(this.activeSubjectId);
    if (!sub) return;

    const topics = window.studyStore.getMarketingTopicGrades(this.activeSubjectId);
    const w = sub.weightings || { tasks: null, miniExams: null };

    this.topicsGrid.innerHTML = topics.map(topic => {
      const avg = window.studyStore.calculateMarketingTopicAverage(topic, w);
      let avgBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400">Sin nota</span>`;
      if (avg !== null) {
        if (avg >= 9) {
          avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">${avg.toFixed(1)}</span>`;
        } else if (avg >= 7) {
          avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">${avg.toFixed(1)}</span>`;
        } else if (avg >= 5) {
          avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">${avg.toFixed(1)}</span>`;
        } else {
          avgBadge = `<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">${avg.toFixed(1)}</span>`;
        }
      }

      const taskScore = (topic.task && topic.task.score !== null && topic.task.score !== undefined) ? topic.task.score : '';
      const taskCompleted = Boolean(topic.task && topic.task.completed);
      const taskNotes = (topic.task && topic.task.notes) ? topic.task.notes : '';

      const examScore = (topic.miniExam && topic.miniExam.score !== null && topic.miniExam.score !== undefined) ? topic.miniExam.score : '';
      const examCompleted = Boolean(topic.miniExam && topic.miniExam.completed);
      const examNotes = (topic.miniExam && topic.miniExam.notes) ? topic.miniExam.notes : '';

      const isTopicCompleted = Boolean(taskCompleted && examCompleted);

      return `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 hover:border-purple-300 dark:hover:border-purple-700 transition">
          <!-- Cabecera del Tema (Con título editable) -->
          <div class="space-y-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center justify-center flex-shrink-0">
                  T${topic.number}
                </span>
                <span class="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Tema ${topic.number}
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] text-slate-400 font-medium">Media:</span>
                ${avgBadge}
              </div>
            </div>

            <!-- Título del tema (Tema 1, Tema 2...) con opción a editar si se desea -->
            <div>
              <input type="text"
                value="${this.escapeHtml((topic.name && !topic.name.includes(':')) ? topic.name : `Tema ${topic.number}`)}"
                title="Haz clic para editar el nombre del tema (se guarda automáticamente)"
                placeholder="Tema ${topic.number}"
                onchange="window.marketingGradesModule.updateTopicName(${topic.number}, this.value)"
                class="w-full text-sm font-extrabold text-slate-800 dark:text-slate-100 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-purple-600 rounded px-1.5 py-0.5 focus:outline-none transition">
            </div>

            <!-- Fila Fecha de Entrega y Examen Compartida -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/30">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                </div>
                <div>
                  <span class="text-xs font-extrabold text-purple-950 dark:text-purple-200 block">Fecha límite (Tarea y Examen)</span>
                  <span class="text-[10px] text-purple-700/80 dark:text-purple-300/80">Misma fecha para la tarea y el mini examen</span>
                </div>
              </div>
              <div class="flex items-center gap-2 self-end sm:self-center">
                ${this.getDueDateBadge(topic.dueDate, isTopicCompleted)}
                <input type="date"
                  value="${topic.dueDate || ''}"
                  title="Fecha límite compartida para la tarea y el mini examen del Tema ${topic.number}"
                  onchange="window.marketingGradesModule.updateTopicDueDate(${topic.number}, this.value)"
                  class="bg-white dark:bg-slate-700 border border-purple-200 dark:border-purple-700 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm cursor-pointer">
              </div>
            </div>
          </div>

          <!-- BLOQUE 1: TAREA -->
          <div class="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-200">
                <i data-lucide="clipboard-list" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>Tarea Tema ${topic.number}</span>
              </div>
              <label class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input type="checkbox"
                  ${taskCompleted ? 'checked' : ''}
                  onchange="window.marketingGradesModule.updateTaskCompleted(${topic.number}, this.checked)"
                  class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600">
                <span>Entregada</span>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative w-28 flex-shrink-0">
                <input type="number" step="0.1" min="0" max="10" placeholder="Nota (0-10)"
                  value="${taskScore}"
                  onchange="window.marketingGradesModule.updateTaskScore(${topic.number}, this.value)"
                  class="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              <input type="text" placeholder="Observaciones / Comentarios..."
                value="${this.escapeHtml(taskNotes)}"
                onchange="window.marketingGradesModule.updateTaskNotes(${topic.number}, this.value)"
                class="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <!-- BLOQUE 2: MINI EXAMEN -->
          <div class="p-3.5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/30 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-bold text-violet-950 dark:text-violet-200">
                <i data-lucide="help-circle" class="w-3.5 h-3.5 text-violet-600"></i>
                <span>Mini Examen Tema ${topic.number}</span>
              </div>
              <label class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input type="checkbox"
                  ${examCompleted ? 'checked' : ''}
                  onchange="window.marketingGradesModule.updateExamCompleted(${topic.number}, this.checked)"
                  class="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-600">
                <span>Realizado</span>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative w-28 flex-shrink-0">
                <input type="number" step="0.1" min="0" max="10" placeholder="Nota (0-10)"
                  value="${examScore}"
                  onchange="window.marketingGradesModule.updateExamScore(${topic.number}, this.value)"
                  class="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500">
              </div>
              <input type="text" placeholder="Observaciones / Comentarios..."
                value="${this.escapeHtml(examNotes)}"
                onchange="window.marketingGradesModule.updateExamNotes(${topic.number}, this.value)"
                class="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // ACTUALIZACIONES INSTANTÁNEAS (AUTO-SAVE)
  // ==========================================
  updateTopicName(topicNumber, name, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    const trimmed = (name || '').trim();
    const cleanName = trimmed && !trimmed.includes(':') ? trimmed : `Tema ${topicNumber}`;
    window.studyStore.saveMarketingTopic(sId, topicNumber, { name: cleanName });
    this.render();
  }

  updateTopicDueDate(topicNumber, dueDate, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    window.studyStore.saveMarketingTopic(sId, topicNumber, { dueDate: (dueDate || '').trim() });
    this.render();
  }

  updateTaskScore(topicNumber, val, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    const num = val === '' ? null : Math.max(0, Math.min(10, parseFloat(val)));
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      task: {
        score: (num !== null && !isNaN(num)) ? num : null,
        completed: (num !== null && !isNaN(num)) ? true : undefined
      }
    });
    this.render();
  }

  updateTaskCompleted(topicNumber, completed, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      task: { completed: Boolean(completed) }
    });
    this.render();
  }

  updateTaskNotes(topicNumber, notes, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      task: { notes: String(notes || '') }
    });
  }

  updateExamScore(topicNumber, val, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    const num = val === '' ? null : Math.max(0, Math.min(10, parseFloat(val)));
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      miniExam: {
        score: (num !== null && !isNaN(num)) ? num : null,
        completed: (num !== null && !isNaN(num)) ? true : undefined
      }
    });
    this.render();
  }

  updateExamCompleted(topicNumber, completed, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      miniExam: { completed: Boolean(completed) }
    });
    this.render();
  }

  updateExamNotes(topicNumber, notes, subjectId = null) {
    const sId = subjectId || this.activeSubjectId;
    window.studyStore.saveMarketingTopic(sId, topicNumber, {
      miniExam: { notes: String(notes || '') }
    });
  }

  // ==========================================
  // HELPERS DE FECHAS Y BADGES
  // ==========================================
  getDueDateBadge(dueDate, isCompleted = false) {
    if (!dueDate) {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-400">Sin fecha</span>`;
    }
    if (isCompleted) {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">✓ Completado</span>`;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dueDate.split('-');
    if (parts.length !== 3) return '';
    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Vencida (${Math.abs(diffDays)}d)</span>`;
    } else if (diffDays === 0) {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse">¡Hoy!</span>`;
    } else if (diffDays <= 7) {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Quedan ${diffDays}d</span>`;
    } else {
      return `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">En ${diffDays}d</span>`;
    }
  }

  formatDateEs(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }

  // ==========================================
  // MODAL DE PONDERACIONES
  // ==========================================
  openWeightingsModal() {
    const modal = document.getElementById('modal-mkt-weightings');
    if (!modal) return;

    // Si está en 'all', abrir la ponderación de la primera asignatura o permitir elegir
    const sId = (this.activeSubjectId === 'all') ? 'mkt_sub_1' : this.activeSubjectId;
    const sub = window.studyStore.getSubjectById(sId);
    const w = (sub && sub.weightings) ? sub.weightings : { tasks: 50, miniExams: 50 };

    const taskInput = document.getElementById('input-mkt-weight-tasks');
    const examInput = document.getElementById('input-mkt-weight-exams');
    const titleEl = document.getElementById('modal-mkt-weightings-title');

    if (titleEl && sub) titleEl.textContent = `Ponderación: ${sub.name}`;
    if (taskInput) taskInput.value = (w.tasks !== null) ? w.tasks : 50;
    if (examInput) examInput.value = (w.miniExams !== null) ? w.miniExams : 50;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  saveWeightingsFromModal() {
    const sId = (this.activeSubjectId === 'all') ? 'mkt_sub_1' : this.activeSubjectId;
    const taskInput = document.getElementById('input-mkt-weight-tasks');
    const examInput = document.getElementById('input-mkt-weight-exams');
    const tw = taskInput ? parseFloat(taskInput.value) : 50;
    const ew = examInput ? parseFloat(examInput.value) : 50;

    window.studyStore.saveMarketingWeightings(sId, {
      tasks: isNaN(tw) ? 50 : tw,
      miniExams: isNaN(ew) ? 50 : ew
    });

    const modal = document.getElementById('modal-mkt-weightings');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.render();
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.marketingGradesModule = new MarketingGradesModule();
