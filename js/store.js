/**
 * StudyFlow - Store & Persistence Manager (Versión Dual: ADE + Marketing FP)
 * Gestiona almacenamiento local (localStorage), modelo curricular, plan semanal y TFG.
 */

const STORAGE_KEY = 'studyflow_data_v21';

window.getLocalDateString = function(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

window.generateDefaultTopics = function(subjectCode = '') {
  const topics = [];
  for (let i = 1; i <= 9; i++) {
    topics.push({
      number: i,
      name: `Tema ${i}`,
      dueDate: '', // En blanco: la asignará el usuario cuando disponga de las fechas oficiales
      task: {
        name: `Tarea Tema ${i}`,
        dueDate: '',
        score: null,
        completed: false,
        weight: null,
        notes: ''
      },
      miniExam: {
        name: `Mini Examen Tema ${i}`,
        date: '',
        dueDate: '',
        score: null,
        completed: false,
        weight: null,
        notes: ''
      }
    });
  }
  return topics;
};

const DEFAULT_DATA = {
  activeStudyFilter: 'all', // 'all' | 'ade' | 'marketing'
  studies: [
    {
      id: 'ade',
      name: 'ADE (Carrera Universitaria - UNED)',
      shortName: 'ADE UNED',
      type: 'Carrera Universitaria (100% Online • UNED)',
      totalCredits: 336,
      badgeColor: '#9333EA',
      description: 'Carrera 100% Online (UNED) • 336 Créditos totales a cursar (asignaturas pendientes de definir)',
      campusUrl: 'https://www.uned.es/universidad/campus/estudiantes/estudios.html',
      classesUrl: 'https://www.intecca.uned.es/portal/inicio'
    },
    {
      id: 'marketing',
      name: 'Marketing y Publicidad (FP - EducamosCLM)',
      shortName: 'Marketing FP',
      type: 'Formación Profesional (Ciclo Superior 100% Online • EducamosCLM)',
      totalModules: 17,
      badgeColor: '#7C3AED',
      description: 'FP 100% Online (EducamosCLM) • 17 Módulos oficiales (Sin créditos ECTS) • 5 en curso este año (4 módulos + TFG)',
      campusUrl: 'https://educamosclm.castillalamancha.es/s/home'
    }
  ],

  // Asignaturas activas este curso (Marketing FP activas + ADE pendientes de definir)
  subjects: [
    // --- MARKETING FP (5 Asignaturas Activas Este Curso • Sin Créditos ECTS • EducamosCLM) ---
    {
      id: 'mkt_sub_1',
      studyId: 'marketing',
      name: 'Diseño y elaboración de material de comunicación',
      code: 'DEMC',
      color: '#8B5CF6', // Purple-500
      teacher: 'Profesorado EducamosCLM',
      classroom: 'EducamosCLM • Aula Virtual FP',
      onlineUrl: 'https://educamosclm.castillalamancha.es/s/home',
      credits: null,
      grades: [],
      weightings: { tasks: null, miniExams: null },
      topics: window.generateDefaultTopics('DEMC')
    },
    {
      id: 'mkt_sub_2',
      studyId: 'marketing',
      name: 'Medios y soportes de comunicación',
      code: 'MSC',
      color: '#6D28D9', // Violet-700
      teacher: 'Profesorado EducamosCLM',
      classroom: 'EducamosCLM • Aula Virtual FP',
      onlineUrl: 'https://educamosclm.castillalamancha.es/s/home',
      credits: null,
      grades: [],
      weightings: { tasks: null, miniExams: null },
      topics: window.generateDefaultTopics('MSC')
    },
    {
      id: 'mkt_sub_3',
      studyId: 'marketing',
      name: 'Trabajo de campo en la investigación comercial',
      code: 'TCIC',
      color: '#A21CAF', // Fuchsia-700
      teacher: 'Profesorado EducamosCLM',
      classroom: 'EducamosCLM • Aula Virtual FP',
      onlineUrl: 'https://educamosclm.castillalamancha.es/s/home',
      credits: null,
      grades: [],
      weightings: { tasks: null, miniExams: null },
      topics: window.generateDefaultTopics('TCIC')
    },
    {
      id: 'mkt_sub_4',
      studyId: 'marketing',
      name: 'Sostenibilidad aplicada al sistema productivo',
      code: 'SOST',
      color: '#C026D3', // Fuchsia-600
      teacher: 'Profesorado EducamosCLM',
      classroom: 'EducamosCLM • Aula Virtual FP',
      onlineUrl: 'https://educamosclm.castillalamancha.es/s/home',
      credits: null,
      grades: [],
      weightings: { tasks: null, miniExams: null },
      topics: window.generateDefaultTopics('SOST')
    },
    {
      id: 'mkt_sub_tfg',
      studyId: 'marketing',
      name: 'Proyecto intermodular de marketing y publicidad (TFG)',
      code: 'TFG',
      color: '#DB2777', // Pink-600
      teacher: 'Profesorado EducamosCLM / Por asignar',
      classroom: 'EducamosCLM • Tutorías TFG',
      onlineUrl: 'https://educamosclm.castillalamancha.es/s/home',
      credits: null,
      grades: []
    }
  ],

  // Control Curricular Completo (Expedientes Oficiales)
  curriculum: {
    // ADE: Asignaturas eliminadas, pendiente de recibir la lista oficial (336 créditos totales)
    ade: [],
    // EXACTAMENTE las 17 asignaturas oficiales de FP Marketing (SIN CRÉDITOS, SIN FCT)
    marketing: [
      // Bloque 1 (1º Curso)
      { id: 'cur_mkt_1', num: 1, name: 'Gestión económica y financiera de la empresa', code: 'GEFE', status: 'convalidada', substatus: 'A convalidar', credits: null, grade: null, term: '1º Curso' },
      { id: 'cur_mkt_2', num: 2, name: 'Investigación Comercial', code: 'INC', status: 'cursada', substatus: 'Superada', credits: null, grade: 7.0, term: '1º Curso' },
      { id: 'cur_mkt_3', num: 3, name: 'Políticas de Marketing', code: 'POM', status: 'cursada', substatus: 'Superada', credits: null, grade: 7.0, term: '1º Curso' },
      { id: 'cur_mkt_4', num: 4, name: 'Marketing Digital', code: 'MD', status: 'cursada', substatus: 'Superada', credits: null, grade: 8.0, term: '1º Curso' },
      { id: 'cur_mkt_5', num: 5, name: 'Inglés profesional para ciclos formativos de Grado Superior', code: 'ING', status: 'convalidada', substatus: 'A convalidar', credits: null, grade: null, term: '1º Curso' },
      { id: 'cur_mkt_6', num: 6, name: 'Digitalización aplicada al sector productivo', code: 'DASP', status: 'cursada', substatus: 'Superada', credits: null, grade: 7.0, term: '1º Curso' },
      { id: 'cur_mkt_7', num: 7, name: 'Sostenibilidad aplicada al sistema productivo', code: 'SOST', status: 'cursando', substatus: 'Cursar 2027', credits: null, grade: null, term: '1º Curso' },
      { id: 'cur_mkt_8', num: 8, name: 'Itinerario personal para la empleabilidad I.', code: 'IPE I', status: 'cursada', substatus: 'Superada', credits: null, grade: 7.0, term: '1º Curso' },
      
      // Bloque 2 (2º Curso)
      { id: 'cur_mkt_9', num: 9, name: 'Diseño y elaboración de material de comunicación', code: 'DEMC', status: 'cursando', substatus: 'Cursar 2027', credits: null, grade: null, term: '2º Curso' },
      { id: 'cur_mkt_10', num: 10, name: 'Medios y soportes de comunicación', code: 'MSC', status: 'cursando', substatus: 'Cursar 2027', credits: null, grade: null, term: '2º Curso' },
      { id: 'cur_mkt_11', num: 11, name: 'Relaciones públicas y organización de eventos de marketing', code: 'RPOE', status: 'cursada', substatus: 'Superada', credits: null, grade: 8.0, term: '2º Curso' },
      { id: 'cur_mkt_12', num: 12, name: 'Trabajo de campo en la investigación comercial', code: 'TCIC', status: 'cursando', substatus: 'Cursar 2027', credits: null, grade: null, term: '2º Curso' },
      { id: 'cur_mkt_13', num: 13, name: 'Lanzamiento de productos y servicios', code: 'LPS', status: 'cursada', substatus: 'Superada', credits: null, grade: 8.0, term: '2º Curso' },
      { id: 'cur_mkt_14', num: 14, name: 'Atención al cliente consumidor y usuario', code: 'ACCU', status: 'convalidada', substatus: 'A convalidar', credits: null, grade: null, term: '2º Curso' },
      { id: 'cur_mkt_15', num: 15, name: 'Itinerario personal para la empleabilidad II', code: 'IPE II', status: 'cursada', substatus: 'Superada', credits: null, grade: 7.0, term: '2º Curso' },
      { id: 'cur_mkt_16', num: 16, name: 'Ciudadanía e identidad digital.', code: 'CIU', status: 'cursada', substatus: 'Superada', credits: null, grade: 9.0, term: '2º Curso' },
      
      // Bloque 3 (Módulo 17: Proyecto)
      { id: 'cur_mkt_17', num: 17, name: 'Proyecto intermodular de marketing y publicidad.', code: 'TFG', status: 'cursando', substatus: 'Cursar 2027', credits: null, grade: null, term: 'Proyecto Final' }
    ]
  },

  // Plan de Estudio Semanal (Activo a partir del 1 de octubre de 2026 • Lunes a Jueves hasta las 21:00)
  weeklyStudyPlan: {
    startDate: '2026-10-01',
    lunes: {
      dayName: 'Lunes',
      startTime: '18:15',
      endTime: '21:00',
      totalMinutes: 165,
      slots: [
        { id: 'slot_lun_1', time: '18:15 - 19:30', studyId: 'ade', title: 'ADE: Sesión de Estudio', activity: 'Espacio reservado para las asignaturas de ADE (UNED)' },
        { id: 'slot_lun_break', time: '19:30 - 19:45', isBreak: true, title: '☕ Descanso (15 min)', activity: 'Desconexión y descanso visual de pantalla' },
        { id: 'slot_lun_2', time: '19:45 - 21:00', studyId: 'marketing', title: 'Marketing: DEMC (Diseño Material)', activity: 'Estudio de temas y actividades en EducamosCLM' }
      ]
    },
    martes: {
      dayName: 'Martes',
      startTime: '18:45',
      endTime: '21:00',
      totalMinutes: 135,
      slots: [
        { id: 'slot_mar_1', time: '18:45 - 19:45', studyId: 'ade', title: 'ADE: Sesión de Estudio', activity: 'Espacio reservado para las asignaturas de ADE (UNED)' },
        { id: 'slot_mar_break', time: '19:45 - 20:00', isBreak: true, title: '☕ Descanso (15 min)', activity: 'Estiramientos y descanso visual' },
        { id: 'slot_mar_2', time: '20:00 - 21:00', studyId: 'marketing', title: 'Marketing: Proyecto TFG', activity: 'Redacción de memoria en Docs y consulta de fuentes online' }
      ]
    },
    miercoles: {
      dayName: 'Miércoles',
      startTime: '18:45',
      endTime: '21:00',
      totalMinutes: 135,
      slots: [
        { id: 'slot_mie_1', time: '18:45 - 19:45', studyId: 'ade', title: 'ADE: Sesión de Estudio', activity: 'Espacio reservado para las asignaturas de ADE (UNED)' },
        { id: 'slot_mie_break', time: '19:45 - 20:00', isBreak: true, title: '☕ Descanso (15 min)', activity: 'Hidratación y descanso de ojos' },
        { id: 'slot_mie_2', time: '20:00 - 21:00', studyId: 'marketing', title: 'Marketing: MSC (Medios y Soportes)', activity: 'Estudio de temas y actividades en EducamosCLM' }
      ]
    },
    jueves: {
      dayName: 'Jueves',
      startTime: '18:15',
      endTime: '21:00',
      totalMinutes: 165,
      slots: [
        { id: 'slot_jue_1', time: '18:15 - 19:30', studyId: 'ade', title: 'ADE: Sesión de Estudio', activity: 'Espacio reservado para las asignaturas de ADE (UNED)' },
        { id: 'slot_jue_break', time: '19:30 - 19:45', isBreak: true, title: '☕ Descanso (15 min)', activity: 'Paseo breve y merienda' },
        { id: 'slot_jue_2', time: '19:45 - 21:00', studyId: 'marketing', title: 'Marketing: TCIC / SOST', activity: 'Estudio de temas y actividades en EducamosCLM' }
      ]
    }
  },

  // Horario de Clases Semanales (ESTO SOLO PARA ADE - En blanco inicialmente)
  classSchedule: [],

  // Proyecto Fin de Ciclo (TFG) - De momento en blanco
  tfgData: {
    title: '',
    tutor: '',
    studyId: 'marketing',
    finalDeadline: '',
    defenseDate: '',
    generalNotes: '',
    milestones: []
  },

  // Tareas y Deberes - En blanco de momento
  tasks: [],

  // Calendario y Exámenes - En blanco de momento
  exams: [],

  // Sesiones Pomodoro de estudio
  pomodoroSessions: [],

  // Notas y apuntes de estudio
  notes: [],

  resources: [
    {
      id: 'r_uned',
      studyId: 'ade',
      subjectId: '',
      title: 'Campus UNED: Portal de Estudios (ADE)',
      url: 'https://www.uned.es/universidad/campus/estudiantes/estudios.html',
      category: 'Campus Oficial',
      notes: 'Portal oficial de la UNED: acceso al campus del estudiante, cursos virtuales y exámenes.'
    },
    {
      id: 'r_intecca',
      studyId: 'ade',
      subjectId: '',
      title: 'INTECCA UNED: Clases en Directo y Grabaciones',
      url: 'https://www.intecca.uned.es/portal/inicio',
      category: 'Clases Virtuales',
      notes: 'Plataforma oficial INTECCA de la UNED: tutorías telemáticas, salas de reunión y repositorio de clases grabadas.'
    },
    {
      id: 'r_educamosclm',
      studyId: 'marketing',
      subjectId: '',
      title: 'EducamosCLM: Portal FP Marketing y Publicidad',
      url: 'https://educamosclm.castillalamancha.es/s/home',
      category: 'Campus Oficial',
      notes: 'Plataforma oficial de Castilla-La Mancha: acceso a módulos de FP, tareas, foros y comunicación con tutores.'
    },
    {
      id: 'r_1',
      studyId: 'marketing',
      subjectId: 'mkt_sub_tfg',
      title: 'Google Drive: Carpeta Oficial TFG',
      url: 'https://drive.google.com',
      category: 'Documento TFG',
      notes: 'Borrador de la memoria en la nube, anexos y bibliografía en normas APA.'
    }
  ],

  settings: {
    pomodoroWorkTime: 25,
    pomodoroShortBreak: 5,
    pomodoroLongBreak: 15,
    soundEnabled: true,
    userName: 'Estudiante',
    themeColor: 'purple'
  }
};

class Store {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      // Limpiar versiones anteriores de localStorage para prevenir datos obsoletos en caché
      ['studyflow_data_v19', 'studyflow_data_v18', 'studyflow_data_v17', 'studyflow_data_v16', 'studyflow_data_v15', 'studyflow_data_v14', 'studyflow_data_v13', 'studyflow_data_v12', 'studyflow_data_v11', 'studyflow_data_v10', 'studyflow_data_v9', 'studyflow_data_v8', 'studyflow_data_v7', 'studyflow_data_v6', 'studyflow_data_v5', 'studyflow_data_v4', 'studyflow_data_v3', 'studyflow_data_v2', 'studyflow_data'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = localStorage.getItem('studyflow_data_v20');
        if (stored) {
          try { localStorage.removeItem('studyflow_data_v20'); } catch (e) {}
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        // ADE limpio (sin asignaturas dummy, 336 créditos) y Marketing FP oficial (17 asignaturas)
        let curAde = (parsed.curriculum && Array.isArray(parsed.curriculum.ade))
          ? parsed.curriculum.ade.filter(a => !a.id.startsWith('cur_ade_'))
          : [];

        let curriculum = {
          ade: curAde,
          marketing: DEFAULT_DATA.curriculum.marketing
        };

        // En "Materias en curso", solo materias activas reales (eliminar cualquier ade_sub_ dummy)
        let subjects = DEFAULT_DATA.subjects;
        if (parsed.subjects && Array.isArray(parsed.subjects)) {
          const userSubjects = parsed.subjects.filter(s => !s.id.startsWith('ade_sub_'));
          if (userSubjects.length > 0) {
            subjects = userSubjects.map(s => {
              if (s.studyId === 'marketing' && s.id !== 'mkt_sub_tfg') {
                if (!s.topics || !Array.isArray(s.topics) || s.topics.length === 0) {
                  return {
                    ...s,
                    topics: window.generateDefaultTopics(s.code),
                    weightings: s.weightings || { tasks: null, miniExams: null }
                  };
                } else {
                  // Asegurar que no haya temas con nombres inventados y las fechas estén en blanco
                  const topics = s.topics.map(top => {
                    const dDate = top.dueDate || '';
                    let cleanName = `Tema ${top.number}`;
                    if (top.name && !top.name.includes(':') && !top.name.startsWith('Tema ') && top.name.trim() !== '') {
                      cleanName = top.name.trim();
                    }
                    return {
                      ...top,
                      number: top.number,
                      name: cleanName,
                      dueDate: dDate,
                      task: {
                        ...(top.task || {}),
                        name: `Tarea Tema ${top.number}`,
                        dueDate: dDate
                      },
                      miniExam: {
                        ...(top.miniExam || {}),
                        name: `Mini Examen Tema ${top.number}`,
                        date: dDate,
                        dueDate: dDate
                      }
                    };
                  });
                  return { ...s, topics, weightings: s.weightings || { tasks: null, miniExams: null } };
                }
              }
              return s;
            });
          }
        }

        // Horario semanal de estudio
        let weeklyStudyPlan = parsed.weeklyStudyPlan || DEFAULT_DATA.weeklyStudyPlan;
        if (JSON.stringify(weeklyStudyPlan).includes('Contabilidad Financiera')) {
          weeklyStudyPlan = DEFAULT_DATA.weeklyStudyPlan;
        }

        // Horario de clases: exclusivo para ADE (en blanco inicialmente)
        let classSchedule = (parsed.classSchedule && Array.isArray(parsed.classSchedule))
          ? parsed.classSchedule.filter(cs => cs.studyId === 'ade' && !cs.id.startsWith('cs_'))
          : [];

        // Tareas y deberes: en blanco de momento
        let tasks = (parsed.tasks && Array.isArray(parsed.tasks))
          ? parsed.tasks.filter(t => !t.id.startsWith('t_'))
          : [];

        // Exámenes y calendario: en blanco de momento
        let exams = (parsed.exams && Array.isArray(parsed.exams))
          ? parsed.exams.filter(e => !e.id.startsWith('ex_'))
          : [];

        // Proyecto Fin de Ciclo (TFG): en blanco de momento
        let tfgData = (parsed.tfgData && typeof parsed.tfgData === 'object' && parsed.tfgData.title && !parsed.tfgData.title.includes('E-Commerce Sostenible'))
          ? parsed.tfgData
          : DEFAULT_DATA.tfgData;

        // Pomodoro y notas limpios
        let pomodoroSessions = (parsed.pomodoroSessions && Array.isArray(parsed.pomodoroSessions))
          ? parsed.pomodoroSessions.filter(p => !p.id.startsWith('pom_'))
          : [];
        let notes = (parsed.notes && Array.isArray(parsed.notes))
          ? parsed.notes.filter(n => !n.id.startsWith('n_'))
          : [];

        // Garantizar recursos oficiales de UNED, INTECCA y EducamosCLM
        let resources = (parsed.resources && parsed.resources.length >= 3) ? parsed.resources : DEFAULT_DATA.resources;

        const data = {
          activeStudyFilter: parsed.activeStudyFilter || DEFAULT_DATA.activeStudyFilter,
          studies: DEFAULT_DATA.studies,
          subjects: subjects,
          curriculum: curriculum,
          weeklyStudyPlan: weeklyStudyPlan,
          classSchedule: classSchedule,
          tfgData: tfgData,
          tasks: tasks,
          exams: exams,
          pomodoroSessions: pomodoroSessions,
          notes: notes,
          resources: resources,
          settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) }
        };
        this._save(data);
        return data;
      }
    } catch (e) {
      console.error('Error cargando localStorage:', e);
    }
    this._save(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  _save(data) {
    try {
      this._data = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('studyflow:change', { detail: { data: this._data } }));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  getData() {
    return this._data;
  }

  // --- FILTRO ACTIVO DE ESTUDIOS (ALL / ADE / MARKETING) ---
  getActiveStudyFilter() {
    return this._data.activeStudyFilter || 'all';
  }

  setActiveStudyFilter(filter) {
    this._save({ ...this._data, activeStudyFilter: filter });
  }

  getStudies() {
    return this._data.studies;
  }

  // --- MATERIAS EN CURSO ---
  getSubjects(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    if (filter === 'all') return this._data.subjects;
    return this._data.subjects.filter(s => s.studyId === filter);
  }

  getSubjectById(id) {
    return this._data.subjects.find(s => s.id === id);
  }

  saveSubject(subject) {
    const subjects = [...this._data.subjects];
    const index = subjects.findIndex(s => s.id === subject.id);
    if (index >= 0) {
      subjects[index] = { ...subjects[index], ...subject };
    } else {
      subjects.push({
        id: subject.id || 'sub_' + Date.now(),
        studyId: subject.studyId || (this.getActiveStudyFilter() !== 'all' ? this.getActiveStudyFilter() : 'ade'),
        name: subject.name || 'Nueva Asignatura',
        code: subject.code || '',
        color: subject.color || '#9333EA',
        teacher: subject.teacher || '',
        classroom: subject.classroom || '',
        credits: Number(subject.credits) || 6,
        grades: subject.grades || []
      });
    }
    this._save({ ...this._data, subjects });
  }

  deleteSubject(id) {
    const subjects = this._data.subjects.filter(s => s.id !== id);
    const tasks = this._data.tasks.filter(t => t.subjectId !== id);
    const exams = this._data.exams.filter(e => e.subjectId !== id);
    const notes = this._data.notes.filter(n => n.subjectId !== id);
    const resources = this._data.resources.filter(r => r.subjectId !== id);
    this._save({ ...this._data, subjects, tasks, exams, notes, resources });
  }

  // --- CALIFICACIONES ---
  addGrade(subjectId, grade) {
    const subjects = this._data.subjects.map(sub => {
      if (sub.id === subjectId) {
        const grades = sub.grades || [];
        grades.push({
          id: 'g_' + Date.now(),
          name: grade.name,
          score: Number(grade.score),
          weight: Number(grade.weight) || 0,
          date: grade.date || window.getLocalDateString(new Date())
        });
        return { ...sub, grades };
      }
      return sub;
    });
    this._save({ ...this._data, subjects });
  }

  deleteGrade(subjectId, gradeId) {
    const subjects = this._data.subjects.map(sub => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          grades: (sub.grades || []).filter(g => g.id !== gradeId)
        };
      }
      return sub;
    });
    this._save({ ...this._data, subjects });
  }

  calculateSubjectAverage(subject) {
    if (subject.studyId === 'marketing' && subject.id !== 'mkt_sub_tfg') {
      const mktSummary = this.calculateMarketingSubjectSummary(subject.id);
      if (mktSummary.average !== null) {
        return mktSummary.average;
      }
    }

    if (!subject.grades || subject.grades.length === 0) return null;
    let totalScore = 0;
    let totalWeight = 0;
    let hasWeighted = false;

    for (const g of subject.grades) {
      if (g.weight && g.weight > 0) {
        hasWeighted = true;
        totalScore += g.score * (g.weight / 100);
        totalWeight += g.weight;
      }
    }

    if (hasWeighted && totalWeight > 0) {
      return Number((totalScore / (totalWeight / 100)).toFixed(2));
    }

    const sum = subject.grades.reduce((acc, g) => acc + g.score, 0);
    return Number((sum / subject.grades.length).toFixed(2));
  }

  // --- CALIFICACIONES POR TEMAS (MARKETING FP) ---
  getMarketingTopicGrades(subjectId) {
    const sub = this._data.subjects.find(s => s.id === subjectId);
    if (!sub) return [];
    if (!sub.topics || !Array.isArray(sub.topics) || sub.topics.length === 0) {
      sub.topics = window.generateDefaultTopics(sub.code);
      sub.weightings = sub.weightings || { tasks: null, miniExams: null };
      this._save(this._data);
    }
    return sub.topics;
  }

  saveMarketingTopic(subjectId, topicNumber, updatedTopicData) {
    const subjects = this._data.subjects.map(sub => {
      if (sub.id === subjectId) {
        if (!sub.topics || !Array.isArray(sub.topics) || sub.topics.length === 0) {
          sub.topics = window.generateDefaultTopics(sub.code);
        }
        const topics = sub.topics.map(top => {
          if (top.number === topicNumber) {
            const newDueDate = updatedTopicData.dueDate !== undefined ? updatedTopicData.dueDate : (top.dueDate || '');
            return {
              ...top,
              ...updatedTopicData,
              dueDate: newDueDate,
              task: {
                ...(top.task || {}),
                dueDate: newDueDate,
                ...(updatedTopicData.task || {})
              },
              miniExam: {
                ...(top.miniExam || {}),
                date: newDueDate,
                dueDate: newDueDate,
                ...(updatedTopicData.miniExam || {})
              }
            };
          }
          return top;
        });
        return { ...sub, topics };
      }
      return sub;
    });
    this._save({ ...this._data, subjects });
  }

  saveMarketingWeightings(subjectId, weightings) {
    const subjects = this._data.subjects.map(sub => {
      if (sub.id === subjectId) {
        return { ...sub, weightings: { ...(sub.weightings || {}), ...weightings } };
      }
      return sub;
    });
    this._save({ ...this._data, subjects });
  }

  calculateMarketingTopicAverage(topic, weightings = null) {
    if (!topic) return null;
    const taskScore = (topic.task && topic.task.score !== null && topic.task.score !== '' && !isNaN(topic.task.score)) ? Number(topic.task.score) : null;
    const examScore = (topic.miniExam && topic.miniExam.score !== null && topic.miniExam.score !== '' && !isNaN(topic.miniExam.score)) ? Number(topic.miniExam.score) : null;

    if (taskScore === null && examScore === null) return null;
    if (taskScore !== null && examScore === null) return taskScore;
    if (taskScore === null && examScore !== null) return examScore;

    if (weightings && weightings.tasks && weightings.miniExams) {
      const totalW = Number(weightings.tasks) + Number(weightings.miniExams);
      if (totalW > 0) {
        return Number(((taskScore * weightings.tasks + examScore * weightings.miniExams) / totalW).toFixed(2));
      }
    }
    return Number(((taskScore + examScore) / 2).toFixed(2));
  }

  calculateMarketingSubjectSummary(subjectId) {
    const sub = this._data.subjects.find(s => s.id === subjectId);
    if (!sub) return { average: null, tasksAverage: null, examsAverage: null, progress: 0, completedTasks: 0, completedExams: 0, totalTopics: 9, weightings: { tasks: null, miniExams: null }, nextDueDate: null, nextTopic: null };

    const topics = sub.topics || [];
    let taskSum = 0, taskCount = 0;
    let examSum = 0, examCount = 0;
    let completedTasks = 0, completedExams = 0;

    topics.forEach(top => {
      if (top.task) {
        const hasScore = top.task.score !== null && top.task.score !== '' && !isNaN(top.task.score);
        if (top.task.completed || hasScore) completedTasks++;
        if (hasScore) {
          taskSum += Number(top.task.score);
          taskCount++;
        }
      }
      if (top.miniExam) {
        const hasScore = top.miniExam.score !== null && top.miniExam.score !== '' && !isNaN(top.miniExam.score);
        if (top.miniExam.completed || hasScore) completedExams++;
        if (hasScore) {
          examSum += Number(top.miniExam.score);
          examCount++;
        }
      }
    });

    const tasksAverage = taskCount > 0 ? Number((taskSum / taskCount).toFixed(2)) : null;
    const examsAverage = examCount > 0 ? Number((examSum / examCount).toFixed(2)) : null;

    let overallAverage = null;
    const w = sub.weightings;
    if (tasksAverage !== null && examsAverage !== null) {
      if (w && w.tasks && w.miniExams && (Number(w.tasks) + Number(w.miniExams) > 0)) {
        const totalW = Number(w.tasks) + Number(w.miniExams);
        overallAverage = Number(((tasksAverage * w.tasks + examsAverage * w.miniExams) / totalW).toFixed(2));
      } else {
        overallAverage = Number(((tasksAverage + examsAverage) / 2).toFixed(2));
      }
    } else if (tasksAverage !== null) {
      overallAverage = tasksAverage;
    } else if (examsAverage !== null) {
      overallAverage = examsAverage;
    }

    const totalElements = (topics.length || 9) * 2;
    const completedElements = completedTasks + completedExams;
    const progress = totalElements > 0 ? Math.round((completedElements / totalElements) * 100) : 0;

    // Próxima fecha de entrega pendiente en este módulo
    const todayStr = window.getLocalDateString(new Date());
    let nextDueDate = null;
    let nextTopic = null;

    const topicsWithDates = [...topics].filter(t => t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    for (const top of topicsWithDates) {
      const isDone = Boolean(top.task && top.task.completed && top.miniExam && top.miniExam.completed);
      if (!isDone && top.dueDate >= todayStr) {
        nextDueDate = top.dueDate;
        nextTopic = top;
        break;
      }
    }
    if (!nextDueDate && topicsWithDates.length > 0) {
      for (const top of topicsWithDates) {
        const isDone = Boolean(top.task && top.task.completed && top.miniExam && top.miniExam.completed);
        if (!isDone) {
          nextDueDate = top.dueDate;
          nextTopic = top;
          break;
        }
      }
    }

    return {
      average: overallAverage,
      tasksAverage,
      examsAverage,
      progress,
      completedTasks,
      completedExams,
      totalTopics: topics.length || 9,
      weightings: w || { tasks: null, miniExams: null },
      nextDueDate,
      nextTopic
    };
  }

  // --- CONTROL CURRICULAR / EXPEDIENTE (ADE & MARKETING) ---
  getCurriculum(studyId) {
    const cur = this._data.curriculum || DEFAULT_DATA.curriculum;
    return cur[studyId] || [];
  }

  saveCurriculumSubject(studyId, item) {
    const cur = { ...this._data.curriculum };
    const list = [...(cur[studyId] || [])];
    const index = list.findIndex(c => c.id === item.id);

    if (index >= 0) {
      list[index] = { ...list[index], ...item };
      if (studyId === 'marketing') list[index].credits = null;
    } else {
      list.push({
        id: item.id || 'cur_' + studyId + '_' + Date.now(),
        name: item.name,
        status: item.status || 'pendiente', // cursada, convalidada, cursando, pendiente
        credits: studyId === 'marketing' ? null : (Number(item.credits) || 6),
        grade: item.grade ? Number(item.grade) : null,
        term: item.term || 'General'
      });
    }

    cur[studyId] = list;
    this._save({ ...this._data, curriculum: cur });
  }

  deleteCurriculumSubject(studyId, id) {
    const cur = { ...this._data.curriculum };
    cur[studyId] = (cur[studyId] || []).filter(c => c.id !== id);
    this._save({ ...this._data, curriculum: cur });
  }

  // --- PLAN DE ESTUDIO SEMANAL (LUNES A JUEVES) ---
  getWeeklyStudyPlan() {
    return this._data.weeklyStudyPlan || DEFAULT_DATA.weeklyStudyPlan;
  }

  saveWeeklyStudyPlan(plan) {
    this._save({ ...this._data, weeklyStudyPlan: plan });
  }

  // --- HORARIO DE CLASES (SOLO ADE) ---
  getClassSchedule() {
    return this._data.classSchedule || DEFAULT_DATA.classSchedule;
  }

  saveClassSlot(slot) {
    const list = [...(this._data.classSchedule || [])];
    const index = list.findIndex(s => s.id === slot.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...slot, studyId: 'ade' };
    } else {
      list.push({
        id: slot.id || 'cs_ade_' + Date.now(),
        day: slot.day,
        time: slot.time,
        studyId: 'ade', // Exclusivo para ADE
        title: slot.title,
        classroom: slot.classroom || '',
        url: slot.url || ''
      });
    }
    this._save({ ...this._data, classSchedule: list });
  }

  deleteClassSlot(id) {
    const list = (this._data.classSchedule || []).filter(s => s.id !== id);
    this._save({ ...this._data, classSchedule: list });
  }

  // --- PROYECTO TFG (MARKETING) ---
  getTfgData() {
    return this._data.tfgData || DEFAULT_DATA.tfgData;
  }

  saveTfgData(updates) {
    const tfgData = { ...this._data.tfgData, ...updates };
    this._save({ ...this._data, tfgData });
  }

  addTfgMilestone(milestone) {
    const tfgData = { ...this._data.tfgData };
    tfgData.milestones = [...(tfgData.milestones || []), {
      id: milestone.id || 'tfg_m_' + Date.now(),
      name: milestone.name,
      date: milestone.date || '',
      completed: false
    }];
    this._save({ ...this._data, tfgData });
  }

  deleteTfgMilestone(id) {
    const tfgData = { ...this._data.tfgData };
    tfgData.milestones = (tfgData.milestones || []).filter(m => m.id !== id);
    this._save({ ...this._data, tfgData });
  }

  toggleTfgMilestone(milestoneId) {
    const tfgData = { ...this._data.tfgData };
    tfgData.milestones = (tfgData.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return { ...m, completed: !m.completed };
      }
      return m;
    });
    this._save({ ...this._data, tfgData });
  }

  // --- TAREAS ---
  getTasks(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    let tasks = [...this._data.tasks];

    // Incluir automáticamente las tareas de los temas de Marketing FP que tengan fecha de entrega asignada
    if (filter === 'all' || filter === 'marketing') {
      const mktSubs = (this._data.subjects || []).filter(s => s.studyId === 'marketing' && s.topics && Array.isArray(s.topics));
      for (const sub of mktSubs) {
        for (const top of sub.topics) {
          if (top.dueDate) {
            const hasCustomTitle = top.name && top.name.trim() !== `Tema ${top.number}` && top.name.trim() !== String(top.number) && !top.name.includes(':');
            const taskTitle = hasCustomTitle
              ? `${sub.code || 'MKT'} • Tarea T${top.number}: ${top.name}`
              : `${sub.code || 'MKT'} • Tarea Tema ${top.number}`;
            tasks.push({
              id: `mkt_task_${sub.id}_t${top.number}`,
              isMktTopicTask: true,
              topicNumber: top.number,
              studyId: 'marketing',
              subjectId: sub.id,
              title: taskTitle,
              dueDate: top.dueDate,
              priority: 'medium',
              status: (top.task && top.task.completed) ? 'completed' : 'pending',
              notes: (top.task && top.task.notes) ? top.task.notes : `Tarea evaluable Tema ${top.number} (${sub.code})`,
              score: (top.task && top.task.score !== null && top.task.score !== undefined) ? top.task.score : null
            });
          }
        }
      }
    }

    if (filter === 'all') return tasks;
    return tasks.filter(t => t.studyId === filter);
  }

  saveTask(task) {
    const tasks = [...this._data.tasks];
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...task };
    } else {
      tasks.unshift({
        id: task.id || 't_' + Date.now(),
        studyId: task.studyId || (this.getActiveStudyFilter() !== 'all' ? this.getActiveStudyFilter() : 'ade'),
        title: task.title,
        subjectId: task.subjectId || '',
        dueDate: task.dueDate || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        notes: task.notes || ''
      });
    }
    this._save({ ...this._data, tasks });
  }

  deleteTask(id) {
    if (id && id.startsWith('mkt_task_')) {
      const match = id.match(/^mkt_task_(.+)_t(\d+)$/);
      if (match) {
        const subId = match[1];
        const topicNum = parseInt(match[2], 10);
        this.saveMarketingTopic(subId, topicNum, { dueDate: '' });
        return;
      }
    }
    const tasks = this._data.tasks.filter(t => t.id !== id);
    this._save({ ...this._data, tasks });
  }

  toggleTaskStatus(id) {
    if (id && id.startsWith('mkt_task_')) {
      const match = id.match(/^mkt_task_(.+)_t(\d+)$/);
      if (match) {
        const subId = match[1];
        const topicNum = parseInt(match[2], 10);
        const sub = this._data.subjects.find(s => s.id === subId);
        if (sub && sub.topics) {
          const top = sub.topics.find(t => t.number === topicNum);
          if (top && top.task) {
            const newCompleted = !top.task.completed;
            this.saveMarketingTopic(subId, topicNum, {
              task: { completed: newCompleted }
            });
            return;
          }
        }
      }
    }

    const tasks = this._data.tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    this._save({ ...this._data, tasks });
  }

  // --- EXÁMENES ---
  getExams(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    let exams = [...this._data.exams];

    // Incluir automáticamente los mini exámenes de los temas de Marketing FP que tengan fecha asignada
    if (filter === 'all' || filter === 'marketing') {
      const mktSubs = (this._data.subjects || []).filter(s => s.studyId === 'marketing' && s.topics && Array.isArray(s.topics));
      for (const sub of mktSubs) {
        for (const top of sub.topics) {
          if (top.dueDate) {
            const hasCustomTitle = top.name && top.name.trim() !== `Tema ${top.number}` && top.name.trim() !== String(top.number) && !top.name.includes(':');
            const examTitle = hasCustomTitle
              ? `${sub.code || 'MKT'} • Mini Examen T${top.number}: ${top.name}`
              : `${sub.code || 'MKT'} • Mini Examen Tema ${top.number}`;
            exams.push({
              id: `mkt_exam_${sub.id}_t${top.number}`,
              isMktTopicExam: true,
              topicNumber: top.number,
              studyId: 'marketing',
              subjectId: sub.id,
              title: examTitle,
              date: top.dueDate,
              time: '20:00',
              classroom: 'EducamosCLM • Aula Virtual FP',
              weight: 0,
              completed: Boolean(top.miniExam && top.miniExam.completed),
              notes: (top.miniExam && top.miniExam.notes) ? top.miniExam.notes : `Cuestionario mini examen Tema ${top.number} (${sub.code})`,
              score: (top.miniExam && top.miniExam.score !== null && top.miniExam.score !== undefined) ? top.miniExam.score : null
            });
          }
        }
      }
    }

    if (filter !== 'all') {
      exams = exams.filter(e => e.studyId === filter);
    }
    exams.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return exams;
  }

  saveExam(exam) {
    const exams = [...this._data.exams];
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      exams[index] = { ...exams[index], ...exam };
    } else {
      exams.push({
        id: exam.id || 'ex_' + Date.now(),
        studyId: exam.studyId || (this.getActiveStudyFilter() !== 'all' ? this.getActiveStudyFilter() : 'ade'),
        title: exam.title,
        subjectId: exam.subjectId || '',
        date: exam.date,
        time: exam.time || '09:00',
        classroom: exam.classroom || '',
        weight: Number(exam.weight) || 0,
        notes: exam.notes || ''
      });
    }
    exams.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    this._save({ ...this._data, exams });
  }

  deleteExam(id) {
    if (id && id.startsWith('mkt_exam_')) {
      const match = id.match(/^mkt_exam_(.+)_t(\d+)$/);
      if (match) {
        const subId = match[1];
        const topicNum = parseInt(match[2], 10);
        this.saveMarketingTopic(subId, topicNum, { dueDate: '' });
        return;
      }
    }
    const exams = this._data.exams.filter(e => e.id !== id);
    this._save({ ...this._data, exams });
  }

  // --- POMODORO ---
  getPomodoroSessions(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    if (filter === 'all') return this._data.pomodoroSessions;
    return this._data.pomodoroSessions.filter(p => p.studyId === filter);
  }

  logPomodoroSession(session) {
    const pomodoroSessions = [...(this._data.pomodoroSessions || [])];
    pomodoroSessions.push({
      id: 'pom_' + Date.now(),
      studyId: session.studyId || 'ade',
      subjectId: session.subjectId || '',
      durationMinutes: Number(session.durationMinutes) || 25,
      date: session.date || window.getLocalDateString(new Date()),
      taskNote: session.taskNote || ''
    });
    this._save({ ...this._data, pomodoroSessions });
  }

  // --- APUNTES ---
  getNotes(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    if (filter === 'all') return this._data.notes;
    return this._data.notes.filter(n => n.studyId === filter);
  }

  saveNote(note) {
    const notes = [...this._data.notes];
    const index = notes.findIndex(n => n.id === note.id);
    if (index >= 0) {
      notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
    } else {
      notes.unshift({
        id: note.id || 'note_' + Date.now(),
        studyId: note.studyId || (this.getActiveStudyFilter() !== 'all' ? this.getActiveStudyFilter() : 'ade'),
        title: note.title || 'Nota sin título',
        subjectId: note.subjectId || '',
        content: note.content || '',
        updatedAt: new Date().toISOString()
      });
    }
    this._save({ ...this._data, notes });
  }

  deleteNote(id) {
    const notes = this._data.notes.filter(n => n.id !== id);
    this._save({ ...this._data, notes });
  }

  // --- RECURSOS ---
  getResources(studyId = null) {
    const filter = studyId || this.getActiveStudyFilter();
    if (filter === 'all') return this._data.resources;
    return this._data.resources.filter(r => r.studyId === filter);
  }

  saveResource(resource) {
    const resources = [...this._data.resources];
    const index = resources.findIndex(r => r.id === resource.id);
    if (index >= 0) {
      resources[index] = { ...resources[index], ...resource };
    } else {
      resources.unshift({
        id: resource.id || 'res_' + Date.now(),
        studyId: resource.studyId || (this.getActiveStudyFilter() !== 'all' ? this.getActiveStudyFilter() : 'ade'),
        title: resource.title,
        subjectId: resource.subjectId || '',
        url: resource.url,
        category: resource.category || 'General',
        notes: resource.notes || ''
      });
    }
    this._save({ ...this._data, resources });
  }

  deleteResource(id) {
    const resources = this._data.resources.filter(r => r.id !== id);
    this._save({ ...this._data, resources });
  }

  // --- AJUSTES ---
  getSettings() {
    return this._data.settings;
  }

  saveSettings(newSettings) {
    const settings = { ...this._data.settings, ...newSettings };
    this._save({ ...this._data, settings });
  }

  // --- BACKUP ---
  exportBackup() {
    const dataStr = JSON.stringify(this._data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = window.getLocalDateString(new Date());
    a.href = url;
    a.download = `StudyFlow_Dual_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.subjects && parsed.tasks) {
        this._save(parsed);
        return { success: true };
      } else {
        return { success: false, error: 'El archivo no tiene el formato correcto.' };
      }
    } catch (e) {
      return { success: false, error: 'Error: ' + e.message };
    }
  }

  resetToDemo() {
    this._save(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  }
}

window.studyStore = new Store();
