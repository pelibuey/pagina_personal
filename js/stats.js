/**
 * StudyFlow - Statistics & Productivity Module
 * Visualización de métricas de estudio, racha, distribución de tiempo y promedio global.
 */

class StatsModule {
  constructor() {
    this.chart = null;
    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => this.render());
    this.render();
  }

  render() {
    this.renderSummaryCards();
    this.renderChart();
  }

  renderSummaryCards() {
    const filter = window.studyStore.getActiveStudyFilter();
    const subjects = window.studyStore.getSubjects();
    const tasks = window.studyStore.getTasks();
    let sessions = window.studyStore.getPomodoroSessions() || [];

    if (filter !== 'all') {
      sessions = sessions.filter(s => s.studyId === filter);
    }

    // 1. Promedio general del curso o titulación
    let totalScoreWeighted = 0;
    let totalCredits = 0;
    let simpleSum = 0;
    let subjectsWithGrades = 0;

    subjects.forEach(s => {
      const avg = window.studyStore.calculateSubjectAverage(s);
      if (avg !== null) {
        subjectsWithGrades++;
        simpleSum += avg;
        if (s.credits && s.credits > 0) {
          totalScoreWeighted += avg * s.credits;
          totalCredits += s.credits;
        }
      }
    });

    let overallGpa = '—';
    if (totalCredits > 0) {
      overallGpa = (totalScoreWeighted / totalCredits).toFixed(2);
    } else if (subjectsWithGrades > 0) {
      overallGpa = (simpleSum / subjectsWithGrades).toFixed(2);
    } else if (filter === 'marketing') {
      // En Marketing FP, si aún no hay notas en las 5 de este año, mostrar la media de los 9 módulos superados (7.56)
      const mktCur = window.studyStore.getCurriculum('marketing').filter(i => i.status === 'cursada' && i.grade);
      if (mktCur.length > 0) {
        const sum = mktCur.reduce((a, b) => a + Number(b.grade), 0);
        overallGpa = (sum / mktCur.length).toFixed(2);
      }
    }

    const gpaEl = document.getElementById('stat-gpa');
    if (gpaEl) gpaEl.textContent = overallGpa;

    // 2. Tiempo total de estudio
    const totalMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeEl = document.getElementById('stat-study-time');
    if (timeEl) timeEl.textContent = `${hours}h ${mins}m`;

    // 3. Tasa de tareas completadas
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const taskRateEl = document.getElementById('stat-task-rate');
    if (taskRateEl) taskRateEl.textContent = `${rate}%`;

    // 4. Racha de días de estudio
    const streak = this.calculateStreak(sessions);
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = `${streak} ${streak === 1 ? 'día' : 'días'}`;
  }

  calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const todayStr = window.getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = window.getLocalDateString(yesterday);

    // La racha se mantiene si se estudió hoy o ayer
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    let expectedDate = new Date(uniqueDates[0]);

    for (const dStr of uniqueDates) {
      const d = new Date(dStr);
      const diffTime = Math.abs(expectedDate - d);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        expectedDate = d;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  renderChart() {
    const canvas = document.getElementById('study-distribution-chart');
    if (!canvas || !window.Chart) return;

    const sessions = window.studyStore.getPomodoroSessions() || [];
    const subjects = window.studyStore.getSubjects();

    // Sumar minutos por materia
    const subjectTimes = {};
    subjects.forEach(s => {
      subjectTimes[s.id] = { name: s.name, color: s.color, minutes: 0 };
    });
    subjectTimes['general'] = { name: 'General / Otros', color: '#94A3B8', minutes: 0 };

    sessions.forEach(s => {
      if (s.subjectId && subjectTimes[s.subjectId]) {
        subjectTimes[s.subjectId].minutes += Number(s.durationMinutes) || 0;
      } else {
        subjectTimes['general'].minutes += Number(s.durationMinutes) || 0;
      }
    });

    const activeEntries = Object.values(subjectTimes).filter(item => item.minutes > 0);

    const labels = activeEntries.length > 0 ? activeEntries.map(e => e.name) : ['Sin sesiones registradas'];
    const data = activeEntries.length > 0 ? activeEntries.map(e => e.minutes) : [1];
    const colors = activeEntries.length > 0 ? activeEntries.map(e => e.color) : ['#CBD5E1'];

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: document.documentElement.classList.contains('dark') ? '#1E293B' : '#FFFFFF',
          hoverOffset: 6
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
              padding: 14,
              font: { size: 11, family: 'sans-serif' },
              color: document.documentElement.classList.contains('dark') ? '#94A3B8' : '#64748B'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (activeEntries.length === 0) return 'Sin datos';
                const mins = context.parsed;
                const hrs = (mins / 60).toFixed(1);
                return ` ${mins} min (${hrs} hrs)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }
}

window.statsModule = new StatsModule();
