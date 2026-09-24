/**
 * StudyFlow - Pomodoro & Focus Timer Module
 * Temporizador Pomodoro, descansos, alertas de audio Web Audio API y registro de sesiones.
 */

class PomodoroModule {
  constructor() {
    this.timer = null;
    this.mode = 'pomodoro'; // 'pomodoro' | 'shortBreak' | 'longBreak'
    this.timeLeft = 25 * 60;
    this.totalTime = 25 * 60;
    this.isRunning = false;
    this.completedCount = 0;

    this.displayEl = document.getElementById('pomodoro-display');
    this.labelEl = document.getElementById('pomodoro-mode-label');
    this.startBtn = document.getElementById('btn-pomodoro-start');
    this.pauseBtn = document.getElementById('btn-pomodoro-pause');
    this.resetBtn = document.getElementById('btn-pomodoro-reset');
    this.subjectSelect = document.getElementById('pomodoro-subject-select');
    this.taskNoteInput = document.getElementById('pomodoro-task-note');
    this.historyContainer = document.getElementById('pomodoro-history-list');
    this.progressBar = document.getElementById('pomodoro-progress');

    this.init();
  }

  init() {
    window.addEventListener('studyflow:change', () => {
      this.populateSubjects();
      this.renderHistory();
    });
    this.bindEvents();
    this.populateSubjects();
    this.updateMode('pomodoro');
    this.renderHistory();
  }

  bindEvents() {
    if (this.startBtn) this.startBtn.addEventListener('click', () => this.start());
    if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.pause());
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.reset());

    const modeButtons = document.querySelectorAll('[data-pomodoro-mode]');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-pomodoro-mode');
        this.updateMode(mode);
      });
    });
  }

  populateSubjects() {
    if (!this.subjectSelect) return;
    const currentVal = this.subjectSelect.value;
    const subjects = window.studyStore.getSubjects();
    this.subjectSelect.innerHTML = `<option value="">General / Sin materia</option>` +
      subjects.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`).join('');
    this.subjectSelect.value = currentVal || '';
  }

  getTimes() {
    const settings = window.studyStore.getSettings();
    return {
      pomodoro: (settings.pomodoroWorkTime || 25) * 60,
      shortBreak: (settings.pomodoroShortBreak || 5) * 60,
      longBreak: (settings.pomodoroLongBreak || 15) * 60
    };
  }

  updateMode(newMode) {
    this.pause();
    this.mode = newMode;
    const times = this.getTimes();
    this.totalTime = times[newMode] || 25 * 60;
    this.timeLeft = this.totalTime;

    // Actualizar botones de modo activos
    const modeButtons = document.querySelectorAll('[data-pomodoro-mode]');
    modeButtons.forEach(btn => {
      if (btn.getAttribute('data-pomodoro-mode') === newMode) {
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
      }
    });

    if (this.labelEl) {
      if (newMode === 'pomodoro') this.labelEl.textContent = 'Modo Concentración';
      else if (newMode === 'shortBreak') this.labelEl.textContent = 'Descanso Corto';
      else this.labelEl.textContent = 'Descanso Largo';
    }

    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startBtn.classList.add('hidden');
    this.pauseBtn.classList.remove('hidden');

    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateDisplay();
      } else {
        this.completeSession();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.startBtn) this.startBtn.classList.remove('hidden');
    if (this.pauseBtn) this.pauseBtn.classList.add('hidden');
    document.title = 'StudyFlow - Panel de Estudios';
  }

  reset() {
    this.pause();
    const times = this.getTimes();
    this.totalTime = times[this.mode] || 25 * 60;
    this.timeLeft = this.totalTime;
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (this.displayEl) {
      this.displayEl.textContent = formatted;
    }

    if (this.progressBar) {
      const percentage = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
      this.progressBar.style.width = `${percentage}%`;
    }

    if (this.isRunning) {
      const modeName = this.mode === 'pomodoro' ? 'Estudio' : 'Descanso';
      document.title = `(${formatted}) ${modeName} - StudyFlow`;
    }
  }

  completeSession() {
    this.pause();
    this.playNotificationSound();

    if (this.mode === 'pomodoro') {
      this.completedCount++;
      const subjectId = this.subjectSelect ? this.subjectSelect.value : '';
      const taskNote = this.taskNoteInput ? this.taskNoteInput.value.trim() : '';
      const duration = Math.round(this.totalTime / 60);

      window.studyStore.logPomodoroSession({
        subjectId,
        durationMinutes: duration,
        date: window.getLocalDateString(new Date()),
        taskNote: taskNote || 'Sesión de concentración'
      });

      if (window.confetti) {
        window.confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Sugerir descanso largo o corto
      if (this.completedCount % 4 === 0) {
        alert('¡Increíble trabajo! Has completado 4 bloques de concentración. Tómate un descanso largo de 15 minutos.');
        this.updateMode('longBreak');
      } else {
        alert('¡Excelente sesión! Has completado tus 25 minutos. Tómate 5 minutos de descanso.');
        this.updateMode('shortBreak');
      }
    } else {
      alert('¡Fin del descanso! ¿Listo para otra ronda de estudio productivo?');
      this.updateMode('pomodoro');
    }
  }

  playNotificationSound() {
    const settings = window.studyStore.getSettings();
    if (!settings.soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Melodía agradable de campana (Do - Mi - Sol - Do agudo)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + idx * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch (e) {
      console.log('Audio no disponible o silenciado por el navegador:', e);
    }
  }

  renderHistory() {
    if (!this.historyContainer) return;
    const sessions = window.studyStore.getPomodoroSessions() || [];
    const subjects = window.studyStore.getSubjects();

    // Mostrar las últimas 5 sesiones (más recientes primero)
    const recent = [...sessions].reverse().slice(0, 5);

    if (recent.length === 0) {
      this.historyContainer.innerHTML = `
        <p class="text-xs text-slate-400 italic text-center py-4">Aún no has completado sesiones de estudio hoy.</p>
      `;
      return;
    }

    this.historyContainer.innerHTML = recent.map(s => {
      const sub = subjects.find(item => item.id === s.subjectId);
      return `
        <div class="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background-color: ${sub ? sub.color : '#3B82F6'}"></span>
            <div>
              <span class="font-medium text-slate-800 dark:text-slate-200 block">${this.escapeHtml(s.taskNote || 'Sesión de estudio')}</span>
              <span class="text-[10px] text-slate-400">${sub ? this.escapeHtml(sub.name) : 'General'} • ${s.date}</span>
            </div>
          </div>
          <span class="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">
            +${s.durationMinutes} min
          </span>
        </div>
      `;
    }).join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.pomodoroModule = new PomodoroModule();
