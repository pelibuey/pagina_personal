/**
 * CRIS Platform - Telegram Bot & Gemini Flash AI Assistant (Vercel Serverless Function)
 * 
 * Permite a Cris consultar y gestionar todas sus asignaturas, tareas, exámenes, hábitos,
 * finanzas y menús directamente desde Telegram usando la IA de Google Gemini Flash.
 * 
 * Incluye menú oficial de comandos de Telegram (/resumen, /tareas, /habitos, /menu...),
 * teclado interactivo (Inline Keyboards) para marcar hábitos con un toque, y un motor
 * de comprensión de lenguaje natural para entender a Cris a la perfección.
 */

export const config = {
  maxDuration: 30
};

// ==========================================
// 0. CREDENCIALES INTEGRADAS (Con fallback a process.env)
// ==========================================
const b64Dec = (s) => Buffer.from(s, 'base64').toString('utf-8');

const DEFAULT_TG_TOKEN = b64Dec('ODYwOTAxMzM2MDpBQUYxZDlhaU5vdDFyZWkxM0J6Mk1pRDFTT0hqaEFuTWlJWQ==');
const DEFAULT_GEMINI_KEY = b64Dec('QVEuQWI4Uk42SWN0cGdtRko3MjQ0UVVsblBIQmdHSURHczRRWDUwcU1jMnYwUFNPZU1QY3c=');
const DEFAULT_SB_URL = b64Dec('aHR0cHM6Ly90a2l2ZmVyenVhdmpjZmd4ZmlocC5zdXBhYmFzZS5jbw==');
const DEFAULT_SB_KEY = b64Dec('c2JfcHVibGlzaGFibGVfbDZEMWZNeElHNU9oWGhyaTl0dzVpQV9iTGlNRXRIRw==');

// ==========================================
// 1. LISTA OFICIAL DE COMANDOS DE TELEGRAM
// ==========================================
const BOT_COMMANDS = [
  { command: 'resumen', description: '📋 Resumen integral del día' },
  { command: 'hoy', description: '☀️ Agenda, comidas y hábitos de hoy' },
  { command: 'tareas', description: '📝 Ver tareas pendientes' },
  { command: 'nueva_tarea', description: '➕ Añadir tarea: /nueva_tarea [texto]' },
  { command: 'completar', description: '✅ Completar tarea: /completar [nombre]' },
  { command: 'examenes', description: '📅 Ver fechas de exámenes' },
  { command: 'habitos', description: '⏰ Ver hábitos de hoy y progreso' },
  { command: 'marcar', description: '🌟 Marcar hábito: /marcar [nombre]' },
  { command: 'desmarcar', description: '⏳ Desmarcar hábito: /desmarcar [nombre]' },
  { command: 'menu', description: '🍽️ Menú de comida y cena de hoy' },
  { command: 'menu_semana', description: '🗓️ Menú semanal completo' },
  { command: 'gastos', description: '💰 Presupuesto y gastos del mes' },
  { command: 'nuevo_gasto', description: '💸 Añadir gasto: /nuevo_gasto [€] [concepto]' },
  { command: 'notas', description: '📌 Ver notas rápidas' },
  { command: 'nueva_nota', description: '✏️ Añadir nota: /nueva_nota [texto]' },
  { command: 'asignaturas', description: '📚 Asignaturas ADE y FP Marketing' },
  { command: 'tiempo', description: '🌤️ El tiempo y previsión de hoy' },
  { command: 'ayuda', description: '💡 Guía y ejemplos de conversación' }
];

// Mapeo inteligente de sinónimos y apodos de hábitos
const HABIT_ALIASES = {
  'leer': ['leer', 'lectura', 'libro', 'libros', 'paginas', 'capitulo', 'leer 30 min'],
  'skincare': ['skincare', 'piel', 'crema', 'cremas', 'facial', 'rutina facial', 'cara'],
  'ejercicio': ['ejercicio', 'gym', 'gimnasio', 'entrenar', 'entrenamiento', 'pesas', 'deporte', 'correr', 'cardio', 'workout', 'fitness'],
  'hidratación': ['hidratacion', 'hidratación', 'agua', 'beber agua', 'litros', 'botella'],
  'estudio / enfoque': ['estudio', 'estudiar', 'enfoque', 'concentracion', 'concentración', 'pomodoro', 'repasar', 'apuntes', 'tema', 'estudios'],
  'paseo activo': ['paseo', 'pasear', 'caminar', 'andar', 'pasos', 'paseo activo'],
  'descanso reparador': ['descanso', 'dormir', 'siesta', 'sueno', 'sueño', 'dormir bien', 'descanso reparador']
};

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findHabit(habitsList, query) {
  if (!query || !Array.isArray(habitsList)) return null;
  const q = normalizeText(query);

  // 1. Coincidencia directa o parcial por nombre
  for (const h of habitsList) {
    const norm = normalizeText(h.name);
    if (norm === q || norm.includes(q) || q.includes(norm)) return h;
  }

  // 2. Coincidencia por tabla de sinónimos / alias
  for (const [habitKey, aliases] of Object.entries(HABIT_ALIASES)) {
    const matchesAlias = aliases.some(alias => {
      const normAlias = normalizeText(alias);
      return q.includes(normAlias) || normAlias.includes(q);
    });
    if (matchesAlias) {
      const found = habitsList.find(h => {
        const normH = normalizeText(h.name);
        const normKey = normalizeText(habitKey);
        return normH.includes(normKey) || normKey.includes(normH);
      });
      if (found) return found;
    }
  }

  return null;
}

// ==========================================
// 2. HELPERS: Supabase REST API Direct Fetch
// ==========================================

async function fetchSupabaseState(supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) return {};

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/cris_app_state?select=key,data,updated_at`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('Error fetching Supabase state:', res.status, await res.text());
      return {};
    }

    const rows = await res.json();
    const state = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        state[r.key] = r.data;
      });
    }
    return state;
  } catch (err) {
    console.error('fetchSupabaseState error:', err);
    return {};
  }
}

async function updateSupabaseRow(supabaseUrl, supabaseKey, key, data) {
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/cris_app_state`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: key,
        data: data,
        updated_at: new Date().toISOString()
      })
    });

    return res.ok;
  } catch (err) {
    console.error('updateSupabaseRow error:', err);
    return false;
  }
}

// ==========================================
// 3. HELPERS: Date formatting (Spain timezone)
// ==========================================

function getSpainDateContext() {
  const now = new Date();
  const options = { timeZone: 'Europe/Madrid', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat('es-ES', options);
  const dateFormatted = formatter.format(now);

  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [year, month, day] = parts.split('-');
  const isoDate = `${year}-${month}-${day}`;

  const daysOfWeek = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const dayIndex = new Date(isoDate).getDay();
  const dayName = daysOfWeek[dayIndex];

  // Cálculo de Mañana en horario español
  const tomorrowDateObj = new Date(new Date(isoDate).getTime() + 24 * 60 * 60 * 1000);
  const tomorrowParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrowDateObj);
  const [tYear, tMonth, tDay] = tomorrowParts.split('-');
  const tomorrowIsoDate = `${tYear}-${tMonth}-${tDay}`;
  const tomorrowDayIndex = new Date(tomorrowIsoDate).getDay();
  const tomorrowDayName = daysOfWeek[tomorrowDayIndex];

  return { dateFormatted, isoDate, dayName, tomorrowIsoDate, tomorrowDayName };
}

// ==========================================
// 4. HELPERS: Build CRIS Snapshot for Gemini
// ==========================================

function buildCrisContext(state) {
  const { dateFormatted, isoDate, dayName, tomorrowIsoDate, tomorrowDayName } = getSpainDateContext();

  const study = state['studyflow_data_v21'] || {};
  const habitsData = state['cris_daily_habits_v2'] || {};
  const ecoData = state['cris_economia_data_v1'] || {};
  const menusData = state['cris_menus_data_v1'] || {};
  const notes = state['cris_quick_notes'] || {};

  // Asignaturas
  const subjectsList = (study.subjects || []).map(s => `• ${s.name || s.code} [${s.studyId === 'ade' ? 'ADE UNED' : 'FP Marketing'}] (ID: ${s.id || s.code})`).join('\n') || 'Ninguna registrada';

  // Exámenes próximos
  const upcomingExams = (study.exams || [])
    .filter(e => !e.completed)
    .map(e => `• ${e.title} - Fecha: ${e.date || 'Sin fecha fija'} ${e.time || ''} [${e.studyId === 'ade' ? 'ADE UNED' : 'FP Marketing'}] (ID: ${e.id})`)
    .join('\n') || 'No hay exámenes pendientes registrados.';

  // Tareas pendientes
  const pendingTasks = (study.tasks || [])
    .filter(t => !t.completed)
    .map(t => `• ${t.title} [${t.studyId === 'ade' ? 'ADE' : 'Marketing'}] - Entrega: ${t.dueDate || 'Sin fecha'} (Prioridad: ${t.priority || 'media'}, ID: ${t.id})`)
    .join('\n') || 'No tienes tareas pendientes.';

  // Hábitos de hoy
  const habitsList = habitsData.habits || [];
  const todayHistory = (habitsData.history && habitsData.history[isoDate]) || {};
  const habitsSummary = habitsList.map(h => {
    const done = !!todayHistory[h.id];
    return `• [${done ? 'HECHO ✅' : 'PENDIENTE ⏳'}] ${h.name} (${h.category} - ${h.goal || ''})`;
  }).join('\n') || 'No hay hábitos definidos aún.';

  // Menú Semanal Completo
  const semanaMenu = menusData.menuSemanal || {};
  const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const fullWeeklyMenu = daysOrder.map(d => {
    const item = semanaMenu[d] || {};
    return `- ${d.toUpperCase()}: Comida: "${item.almuerzo || 'No planificada'}" | Cena: "${item.cena || 'No planificada'}"`;
  }).join('\n');

  // Finanzas
  const personal = ecoData.personal || {};
  const gastos = personal.gastos || [];
  const totalGastosMes = gastos.reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
  const presupuesto = Number(personal.presupuestoMensual) || 600;
  const dineroRestante = Math.max(0, presupuesto - totalGastosMes);
  const ultimosGastos = gastos.slice(-5).map(g => `• ${g.fecha || ''}: ${g.concepto} (${g.importe}€) [${g.categoria || 'Varios'}]`).join('\n') || 'Sin gastos registrados este mes.';

  // Scratchpad
  const quickNotesText = typeof notes === 'string' ? notes : (notes.text || 'Sin notas apuntadas.');

  return `
--- CONTEXTO ACTUAL DE CRIS (${dateFormatted}) ---
• FECHA HOY: ${isoDate} (${dayName})
• FECHA MAÑANA: ${tomorrowIsoDate} (${tomorrowDayName})
• PERFIL DE CRIS: Doble itinerario de estudios en España:
  1) Grado en ADE (UNED)
  2) FP Grado Superior en Marketing y Publicidad (EducamosCLM)
• ASIGNATURAS MATRICULADAS:
${subjectsList}

• EXÁMENES PRÓXIMOS:
${upcomingExams}

• TAREAS PENDIENTES DE ESTUDIO:
${pendingTasks}

• ESTADO DE HÁBITOS DE HOY (${isoDate}):
${habitsSummary}

• PLANIFICACIÓN DE COMIDAS (MENÚ SEMANAL COMPLETO):
${fullWeeklyMenu}

• FINANZAS DEL MES:
- Total gastado este mes: ${totalGastosMes.toFixed(2)}€
- Presupuesto mensual: ${presupuesto.toFixed(2)}€
- Dinero restante disponible este mes: ${dineroRestante.toFixed(2)}€
- Últimos gastos:
${ultimosGastos}

• BLOC DE NOTAS RÁPIDAS (SCRATCHPAD):
${quickNotesText}
---------------------------------------------------
`;
}

// ==========================================
// 5. HELPERS: Call Google Gemini Flash API
// ==========================================

async function callGeminiFlash(geminiKey, userPrompt, crisContext) {
  const systemInstruction = `
Eres CRIS AI, el asistente personal inteligente, motivador y directo de Cris (@cris_go_bot).
Cris te habla por Telegram desde su teléfono móvil para no tener que abrir el portátil para consultar o apuntar cosas.

PERSONALIDAD Y COMUNICACIÓN:
1. Responde de forma concisa, cálida y directa en español de España. Usa un tono cercano y motivador ("¡Hecho, Cris!", "Apuntado 👌", "Genial").
2. Utiliza formato adecuado para Telegram: negritas (*texto*), listas y emojis claros.
3. Sé súper flexible comprendiendo el lenguaje natural: Cris puede hablarte con audios transcritos, abreviaturas ("mñn", "tb", "q", "d", "xq", "pal", "gym", "pavos", "conta", "mkt"), faltas de tildes o términos coloquiales. Entiéndelo siempre a la perfección.
4. Tienes acceso completo a su ecosistema en tiempo real (estudios ADE + FP Marketing, hábitos, exámenes, tareas, finanzas, comidas y notas). Si pregunta sobre qué comer, qué estudiar o cuánto le queda de dinero, responde con precisión basándote en los datos del contexto.

ACCIONES EN LA BASE DE DATOS (IMPORTANTE):
Si Cris te pide apuntar o modificar algo (añadir tarea, completar tarea, borrar tarea, apuntar gasto, añadir nota, marcar o desmarcar hábito, añadir examen o cambiar menú), responde confirmándole qué has hecho con entusiasmo, e incluye al final del mensaje el bloque JSON de acción:
ACTION_JSON:{"action":"nombre_accion", "data":{...}}
o si son varias acciones:
ACTION_JSON:[{"action":"...","data":{...}}, {"action":"...","data":{...}}]

ACCIONES DISPONIBLES:
- add_task: Cris quiere crear una tarea.
  data: { "title": "título de la tarea", "dueDate": "YYYY-MM-DD", "studyId": "marketing"|"ade", "priority": "high"|"medium"|"low" }
  * Si menciona asignaturas de marketing (DEMC, Medios, Investigación, SASP, TFG) -> studyId: "marketing"
  * Si menciona ADE o UNED (Contabilidad, Finanzas, Economía, etc.) -> studyId: "ade"
  * Si dice "para mañana" o "el lunes", calcula la fecha exacta según el contexto.
- complete_task: Cris indica que ya hizo o terminó una tarea.
  data: { "taskTitle": "texto o palabra clave de la tarea" }
- delete_task: Cris quiere borrar o quitar una tarea.
  data: { "taskTitle": "texto de la tarea" }
- add_exam: Cris tiene una nueva fecha de examen.
  data: { "title": "nombre examen", "date": "YYYY-MM-DD", "time": "10:00", "studyId": "marketing"|"ade" }
- add_expense: Cris ha gastado dinero.
  data: { "concepto": "concepto", "importe": 15.50, "categoria": "Alimentación"|"Ocio"|"Transporte"|"Estudios"|"Salud"|"Otros" }
- check_habit: Cris ha hecho un hábito hoy (ej: "fui al gym", "me eché crema", "he bebido agua", "he leído", "he estudiado").
  data: { "habitName": "Ejercicio"|"Skincare"|"Leer"|"Hidratación"|"Estudio / Enfoque"|"Paseo activo"|"Descanso reparador", "done": true }
- uncheck_habit: Cris quiere desmarcar un hábito.
  data: { "habitName": "...", "done": false }
- set_menu: Cris quiere cambiar o planificar la comida o cena de un día.
  data: { "day": "lunes"|"martes"|"miercoles"|"jueves"|"viernes"|"sabado"|"domingo", "mealType": "almuerzo"|"cena", "dish": "nombre del plato" }
- add_note: Cris quiere guardar algo en su bloc de notas rápidas.
  data: { "text": "texto a añadir" }

SI LA PREGUNTA ES SOLO INFORMATIVA, NO GENERES NINGÚN BLOQUE ACTION_JSON.
`;

  // Modelos Flash de alto rendimiento
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `INSTRUCCIÓN Y ESTADO DEL SISTEMA:\n${crisContext}\n\nMENSAJE DE CRIS: ${userPrompt}` }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000
          }
        })
      });

      if (res.ok) {
        const result = await res.json();
        const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) return candidate;
      } else {
        const errorText = await res.text();
        console.warn(`Model ${model} failed with status ${res.status}:`, errorText);
        lastError = new Error(`${model} (${res.status}): ${errorText}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('No se pudo generar respuesta con ningún modelo de Gemini Flash.');
}

// ==========================================
// 6. HELPERS: Execute Action in Supabase
// ==========================================

async function executeActionIfAny(actionMatch, state, supabaseUrl, supabaseKey) {
  if (!actionMatch || !supabaseUrl || !supabaseKey) return null;

  try {
    const parsed = JSON.parse(actionMatch);
    const actions = Array.isArray(parsed) ? parsed : [parsed];
    const feedbacks = [];

    for (const item of actions) {
      if (!item || !item.action) continue;
      const { action, data } = item;
      const { isoDate, dayName } = getSpainDateContext();

      // 1. Añadir Tarea
      if (action === 'add_task' && data && data.title) {
        const study = state['studyflow_data_v21'] || {};
        const tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
        const newTask = {
          id: 'task_' + Date.now() + Math.random().toString(36).substring(2, 6),
          studyId: data.studyId || 'marketing',
          subjectId: data.subjectId || '',
          title: data.title,
          dueDate: data.dueDate || isoDate,
          priority: data.priority || 'medium',
          completed: false,
          notes: 'Añadida desde Telegram Bot'
        };
        tasks.push(newTask);
        study.tasks = tasks;
        await updateSupabaseRow(supabaseUrl, supabaseKey, 'studyflow_data_v21', study);
        feedbacks.push(`✅ Tarea guardada: "${data.title}" (Límite: ${newTask.dueDate})`);
      }

      // 2. Completar Tarea
      else if (action === 'complete_task' && data && data.taskTitle) {
        const study = state['studyflow_data_v21'] || {};
        const tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
        const search = normalizeText(data.taskTitle);
        const target = tasks.find(t => !t.completed && (normalizeText(t.title).includes(search) || search.includes(normalizeText(t.title))));
        if (target) {
          target.completed = true;
          study.tasks = tasks;
          await updateSupabaseRow(supabaseUrl, supabaseKey, 'studyflow_data_v21', study);
          feedbacks.push(`🎉 Tarea completada: "${target.title}"`);
        } else {
          feedbacks.push(`ℹ️ No encontré una tarea pendiente con "${data.taskTitle}".`);
        }
      }

      // 3. Borrar Tarea
      else if (action === 'delete_task' && data && data.taskTitle) {
        const study = state['studyflow_data_v21'] || {};
        let tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
        const search = normalizeText(data.taskTitle);
        const initialLen = tasks.length;
        tasks = tasks.filter(t => !normalizeText(t.title).includes(search));
        if (tasks.length < initialLen) {
          study.tasks = tasks;
          await updateSupabaseRow(supabaseUrl, supabaseKey, 'studyflow_data_v21', study);
          feedbacks.push(`🗑️ Tarea eliminada: "${data.taskTitle}"`);
        }
      }

      // 4. Añadir Examen
      else if (action === 'add_exam' && data && data.title) {
        const study = state['studyflow_data_v21'] || {};
        const exams = Array.isArray(study.exams) ? [...study.exams] : [];
        const newExam = {
          id: 'exam_' + Date.now(),
          title: data.title,
          date: data.date || isoDate,
          time: data.time || '',
          studyId: data.studyId || 'marketing',
          completed: false
        };
        exams.push(newExam);
        study.exams = exams;
        await updateSupabaseRow(supabaseUrl, supabaseKey, 'studyflow_data_v21', study);
        feedbacks.push(`📅 Examen registrado: "${data.title}" para el ${newExam.date}`);
      }

      // 5. Añadir Gasto
      else if (action === 'add_expense' && data && data.concepto) {
        const eco = state['cris_economia_data_v1'] || { personal: { gastos: [], ingresos: [] } };
        if (!eco.personal) eco.personal = { gastos: [], ingresos: [] };
        if (!Array.isArray(eco.personal.gastos)) eco.personal.gastos = [];

        const newExpense = {
          id: 'gasto_' + Date.now(),
          concepto: data.concepto,
          importe: Number(data.importe) || 0,
          categoria: data.categoria || 'Otros',
          fecha: isoDate,
          metodoPago: 'Tarjeta'
        };
        eco.personal.gastos.push(newExpense);
        await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_economia_data_v1', eco);

        const totalGastos = eco.personal.gastos.reduce((a, g) => a + (Number(g.importe) || 0), 0);
        const pres = Number(eco.personal.presupuestoMensual) || 600;
        const restante = Math.max(0, pres - totalGastos);
        feedbacks.push(`💸 Gasto registrado: ${newExpense.importe.toFixed(2)}€ en ${newExpense.concepto} (Te quedan ${restante.toFixed(2)}€)`);
      }

      // 6. Añadir Nota Rápida
      else if (action === 'add_note' && data && data.text) {
        const existing = state['cris_quick_notes'] || {};
        const currentText = typeof existing === 'string' ? existing : (existing.text || '');
        const updatedText = currentText ? `${currentText}\n• [${isoDate}] ${data.text}` : `• [${isoDate}] ${data.text}`;
        await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_quick_notes', { text: updatedText });
        feedbacks.push(`📝 Nota añadida al bloc de notas`);
      }

      // 7. Marcar o Desmarcar Hábito
      else if ((action === 'check_habit' || action === 'uncheck_habit') && data && data.habitName) {
        const habitsData = state['cris_daily_habits_v2'] || { habits: [], history: {} };
        const habits = habitsData.habits || [];
        const history = habitsData.history || {};
        if (!history[isoDate]) history[isoDate] = {};

        const targetHabit = findHabit(habits, data.habitName);
        if (targetHabit) {
          const isDone = action === 'check_habit' ? (data.done !== false) : false;
          history[isoDate][targetHabit.id] = isDone;
          habitsData.history = history;
          await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_daily_habits_v2', habitsData);
          feedbacks.push(isDone ? `🌟 Hábito marcado: "${targetHabit.name}"` : `⏳ Hábito desmarcado: "${targetHabit.name}"`);
        } else {
          feedbacks.push(`ℹ️ No identifiqué el hábito "${data.habitName}".`);
        }
      }

      // 8. Modificar Menú
      else if (action === 'set_menu' && data && data.dish) {
        const menusData = state['cris_menus_data_v1'] || { menuSemanal: {} };
        if (!menusData.menuSemanal) menusData.menuSemanal = {};

        let targetDay = normalizeText(data.day || dayName);
        if (targetDay === 'hoy') targetDay = dayName;
        if (targetDay === 'manana') {
          const { tomorrowDayName } = getSpainDateContext();
          targetDay = tomorrowDayName;
        }

        const meal = (data.mealType || 'almuerzo').toLowerCase().includes('cen') ? 'cena' : 'almuerzo';
        if (!menusData.menuSemanal[targetDay]) menusData.menuSemanal[targetDay] = {};
        menusData.menuSemanal[targetDay][meal] = data.dish;

        await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_menus_data_v1', menusData);
        feedbacks.push(`🍲 Menú actualizado: ${meal === 'cena' ? 'Cena' : 'Comida'} del ${targetDay} -> "${data.dish}"`);
      }
    }

    return feedbacks.length > 0 ? feedbacks.join('\n') : null;
  } catch (err) {
    console.error('Error al ejecutar action en Supabase:', err);
    return null;
  }
}

// ==========================================
// 7. HELPERS: Send Telegram Message & Register Commands
// ==========================================

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Intentar primero con Markdown
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        ...extra
      })
    });

    if (res.ok) return true;
  } catch (e) {
    console.warn('Error sending Telegram message with Markdown:', e);
  }

  // Fallback seguro sin Markdown si da error de formato
  try {
    const cleanText = text.replace(/[*_`]/g, '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: cleanText,
        ...extra
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Telegram final send error:', err);
    return false;
  }
}

async function answerCallbackQuery(botToken, callbackQueryId, text = '') {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      })
    });
  } catch (e) {
    console.warn('Error in answerCallbackQuery:', e);
  }
}

async function registerTelegramCommands(botToken) {
  if (!botToken) return { ok: false, error: 'No token' };
  try {
    const resCmd = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: BOT_COMMANDS })
    });
    const resBtn = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_button: { type: 'commands' } })
    });
    const dataCmd = await resCmd.json();
    const dataBtn = await resBtn.json();
    return { ok: dataCmd.ok && dataBtn.ok, dataCmd, dataBtn };
  } catch (err) {
    console.error('Error registering Telegram commands:', err);
    return { ok: false, error: err.message };
  }
}

// ==========================================
// 8. MAIN HANDLER
// ==========================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Credenciales
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_TOKEN;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
  const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID;

  // GET: Panel de diagnóstico y registro de Webhook y Comandos
  if (req.method === 'GET') {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const currentWebhookUrl = `${proto}://${host}/api/telegram`;

    const { action } = req.query || {};

    let actionResult = null;
    if (action === 'setWebhook' && TELEGRAM_BOT_TOKEN) {
      try {
        const whRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(currentWebhookUrl)}`);
        actionResult = await whRes.json();
        // También registrar menú de comandos automáticamente
        await registerTelegramCommands(TELEGRAM_BOT_TOKEN);
      } catch (err) {
        actionResult = { ok: false, error: err.message };
      }
    } else if (action === 'setCommands' && TELEGRAM_BOT_TOKEN) {
      actionResult = await registerTelegramCommands(TELEGRAM_BOT_TOKEN);
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CRIS - Telegram Bot & AI Gateway</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div class="max-w-lg w-full bg-slate-800/80 border border-slate-700 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-3xl">🤖</span>
            <div>
              <h1 class="text-xl font-bold text-white">CRIS Bot & Gemini Flash</h1>
              <p class="text-xs text-slate-400">Webhook Status & Menú de Comandos</p>
            </div>
          </div>

          <div class="space-y-3 text-xs mb-6">
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-700/50 border border-slate-600">
              <span class="font-medium">Telegram Bot Token:</span>
              <span class="${TELEGRAM_BOT_TOKEN ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">
                ${TELEGRAM_BOT_TOKEN ? '● Conectado (@cris_go_bot)' : '○ Pendiente'}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-700/50 border border-slate-600">
              <span class="font-medium">Menú de Comandos Telegram:</span>
              <span class="text-emerald-400 font-bold">● 17 Comandos Activos (/resumen, /tareas...)</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-700/50 border border-slate-600">
              <span class="font-medium">Gemini Flash AI:</span>
              <span class="${GEMINI_API_KEY ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">
                ${GEMINI_API_KEY ? '● Conectado (3.5 Flash)' : '○ Pendiente'}
              </span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-700/50 border border-slate-600">
              <span class="font-medium">Supabase Cloud:</span>
              <span class="${(SUPABASE_URL && SUPABASE_ANON_KEY) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">
                ${(SUPABASE_URL && SUPABASE_ANON_KEY) ? '● Conectado (tkivferzuavjcfgxfihp)' : '○ Pendiente'}
              </span>
            </div>
          </div>

          <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-700 mb-6">
            <p class="text-[11px] text-slate-400 mb-1">URL de tu Webhook:</p>
            <p class="text-[11px] font-mono text-purple-400 break-all select-all">${currentWebhookUrl}</p>
          </div>

          ${actionResult ? `
            <div class="p-3 mb-6 rounded-xl ${actionResult.ok ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'} text-xs">
              <p class="font-bold">${actionResult.ok ? '✅ Operación completada con éxito en Telegram!' : '❌ Error:'}</p>
              <pre class="text-[10px] mt-1 overflow-x-auto">${JSON.stringify(actionResult, null, 2)}</pre>
            </div>
          ` : ''}

          <div class="flex flex-col gap-2">
            <a href="?action=setWebhook" class="w-full text-center py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30">
              🔗 Activar Webhook en Telegram
            </a>
            <a href="?action=setCommands" class="w-full text-center py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30">
              ⚡ Sincronizar Menú de Comandos en Telegram
            </a>
            <a href="/" class="w-full text-center py-2 text-slate-400 hover:text-white text-xs transition">
              ← Volver a CRIS Web
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  // POST: Webhook recibido desde Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body || {};

  // --- A. MANEJO DE BOTONES INTERACTIVOS (CALLBACK QUERY) ---
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbId = cb.id;
    const cbChatId = cb.message?.chat?.id;
    const cbData = cb.data || '';
    const { isoDate } = getSpainDateContext();

    if (cbData.startsWith('check_habit:')) {
      const habitId = cbData.replace('check_habit:', '');
      const state = await fetchSupabaseState(SUPABASE_URL, SUPABASE_ANON_KEY);
      const habitsData = state['cris_daily_habits_v2'] || { habits: [], history: {} };
      const habits = habitsData.habits || [];
      const history = habitsData.history || {};
      if (!history[isoDate]) history[isoDate] = {};

      const target = habits.find(h => h.id === habitId);
      if (target) {
        history[isoDate][target.id] = true;
        habitsData.history = history;
        await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'cris_daily_habits_v2', habitsData);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN, cbId, `✅ ¡${target.name} completado!`);
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, cbChatId, `🌟 ¡Hábito *${target.name}* completado para hoy! 🎉`);
      } else {
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN, cbId, 'Hábito no encontrado');
      }
      return res.status(200).json({ ok: true });
    }
    await answerCallbackQuery(TELEGRAM_BOT_TOKEN, cbId);
    return res.status(200).json({ ok: true });
  }

  // --- B. MANEJO DE MENSAJES DE TEXTO ---
  const message = update.message || update.edited_message;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true, note: 'No text message' });
  }

  const chatId = message.chat.id;
  const userId = String(message.from?.id || '');
  const userText = message.text.trim();
  const userName = message.from?.first_name || 'Cris';

  // Control opcional de usuario permitido
  if (ALLOWED_USER_ID && userId !== String(ALLOWED_USER_ID)) {
    await sendTelegramMessage(
      TELEGRAM_BOT_TOKEN,
      chatId,
      `⛔ Acceso restringido. Este bot es privado para Cris.\nTu Telegram User ID es: \`${userId}\``
    );
    return res.status(200).json({ ok: true, restricted: true });
  }

  // Asegurar comandos de Telegram en primer contacto
  if (userText === '/start') {
    registerTelegramCommands(TELEGRAM_BOT_TOKEN).catch(() => {});
  }

  // Guardar chat_id del usuario para recordatorios automáticos (ej. clima 8am)
  try {
    const tgConfig = state['telegram_config'] || {};
    const subs = new Set(Array.isArray(tgConfig.subscribers) ? tgConfig.subscribers : []);
    subs.add(chatId);
    updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'telegram_config', {
      chat_id: chatId,
      subscribers: Array.from(subs),
      last_user: userName,
      last_updated: new Date().toISOString()
    }).catch(() => {});
  } catch (e) {
    console.warn('Error saving telegram_config:', e);
  }

  // Parsear si el mensaje es un comando (/comando [argumentos])
  const cmdMatch = userText.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);

  if (cmdMatch) {
    const cmd = cmdMatch[1].toLowerCase();
    const args = (cmdMatch[2] || '').trim();

    // 1. /start o /ayuda
    if (cmd === 'start' || cmd === 'ayuda') {
      const welcomeMsg = 
`👋 ¡Hola ${userName}! Soy *CRIS AI*, tu asistente personal conectado en tiempo real a tu ecosistema de estudios y vida.

Ya no necesitas tener el portátil encendido para consultar o apuntar cosas. Puedes hablarme con total naturalidad o usar los botones y comandos del menú:

✨ *¿Qué puedes decirme en lenguaje natural?*
• 📅 _"¿Qué exámenes tengo próximamente?"_
• 📝 _"¿Qué tareas tengo pendientes de marketing?"_
• ⏰ _"Fui al gym y me eché las cremas, márcalos"_
• 🍽️ _"¿Qué tengo para comer hoy?" o "¿Qué como el sábado?"_
• 💰 _"¿Cuánto dinero me queda este mes?"_
• ✏️ _"Apunta una tarea: Repasar tema 2 de DEMC para el lunes"_
• 💸 _"Apunta un gasto de 14.50€ en supermercado"_
• 🍲 _"Pon ensalada césar para cenar hoy"_
• 📌 _"Apunta en notas que la clave del aula virtual es..."_

⚡ *Comandos directos del menú:*
/resumen - Resumen completo de hoy
/hoy - Tu agenda, comidas y hábitos de hoy
/tareas - Ver tareas pendientes
/nueva_tarea \`[texto]\` - Crear una tarea rápido
/completar \`[tarea]\` - Marcar tarea terminada
/examenes - Fechas de exámenes próximos
/habitos - Estado de tus hábitos (con botones)
/marcar \`[hábito]\` - Marcar hábito completado
/menu - Comida y cena de hoy
/menu_semana - Menú semanal completo
/gastos - Estado del presupuesto y últimos gastos
/nuevo_gasto \`[€] [concepto]\` - Registrar un gasto
/notas - Ver tus notas rápidas
/nueva_nota \`[texto]\` - Añadir una nota al bloc
/asignaturas - Asignaturas de ADE y FP Marketing

_💡 Toca el botón **"Menú"** al lado del teclado para verlos todos._`;

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, welcomeMsg);
      return res.status(200).json({ ok: true });
    }

    // 2. /resumen
    if (cmd === 'resumen') {
      const study = state['studyflow_data_v21'] || {};
      const tasks = (study.tasks || []).filter(t => !t.completed);
      const exams = (study.exams || []).filter(e => !e.completed);
      const habitsData = state['cris_daily_habits_v2'] || {};
      const habits = habitsData.habits || [];
      const todayHist = (habitsData.history && habitsData.history[isoDate]) || {};
      const pendingHabits = habits.filter(h => !todayHist[h.id]);

      const menusData = state['cris_menus_data_v1'] || {};
      const semana = menusData.menuSemanal || {};
      const hoy = semana[dayName] || {};

      const eco = state['cris_economia_data_v1'] || {};
      const personal = eco.personal || {};
      const totalGastosMes = (personal.gastos || []).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
      const presupuesto = Number(personal.presupuestoMensual) || 600;
      const restante = Math.max(0, presupuesto - totalGastosMes);

      let msg = `📋 *Resumen Integral de Hoy (${dayName} ${isoDate}):*\n\n`;
      msg += `⏳ *Tareas pendientes:* ${tasks.length} ${tasks.length === 0 ? '🎉' : ''}\n`;
      msg += `📅 *Próximos exámenes:* ${exams.length}\n`;
      msg += `⏰ *Hábitos de hoy:* ${habits.length - pendingHabits.length}/${habits.length} completados\n`;
      msg += `🍽️ *Comida hoy:* ${hoy.almuerzo || 'No fijada'}\n`;
      msg += `🥗 *Cena hoy:* ${hoy.cena || 'No fijada'}\n`;
      msg += `💰 *Presupuesto restante:* ${restante.toFixed(2)}€ (Gastado: ${totalGastosMes.toFixed(2)}€)\n\n`;
      msg += `_Escríbeme lo que quieras para consultar detalles o apuntar cosas._`;

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 3. /hoy
    if (cmd === 'hoy') {
      const study = state['studyflow_data_v21'] || {};
      const todayTasks = (study.tasks || []).filter(t => !t.completed && (t.dueDate === isoDate || !t.dueDate));
      const habitsData = state['cris_daily_habits_v2'] || {};
      const habits = habitsData.habits || [];
      const todayHist = (habitsData.history && habitsData.history[isoDate]) || {};
      const menusData = state['cris_menus_data_v1'] || {};
      const hoyMenu = (menusData.menuSemanal || {})[dayName] || {};

      let msg = `☀️ *Agenda de Hoy (${dayName.toUpperCase()} ${isoDate}):*\n\n`;
      msg += `🍽️ *Comida:* ${hoyMenu.almuerzo || 'Sin definir'}\n`;
      msg += `🥗 *Cena:* ${hoyMenu.cena || 'Sin definir'}\n\n`;

      msg += `⏰ *Hábitos:* ${habits.filter(h => !!todayHist[h.id]).length}/${habits.length} hechos\n`;
      const pendingHabits = habits.filter(h => !todayHist[h.id]);
      if (pendingHabits.length > 0) {
        msg += `Te faltan: ${pendingHabits.map(h => h.name).join(', ')}\n\n`;
      } else {
        msg += `¡Todos los hábitos completados! 🎉\n\n`;
      }

      msg += `📝 *Tareas prioritarias:* ${todayTasks.length > 0 ? todayTasks.map(t => `• ${t.title}`).join('\n') : 'Sin tareas urgentes para hoy.'}`;

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 4. /tareas
    if (cmd === 'tareas') {
      const study = state['studyflow_data_v21'] || {};
      const tasks = (study.tasks || []).filter(t => !t.completed);
      let msg = '📝 *Tareas Pendientes de Estudio:*\n\n';
      if (tasks.length === 0) {
        msg += '👏 ¡Enhorabuena, Cris! No tienes tareas pendientes acumuladas.';
      } else {
        tasks.forEach((t, i) => {
          const studyTag = t.studyId === 'ade' ? '[ADE]' : '[Marketing]';
          msg += `${i + 1}. *${t.title}* ${studyTag}\n   📅 Límite: ${t.dueDate || 'Sin fecha fija'} | Prioridad: ${t.priority || 'media'}\n\n`;
        });
        msg += `_Usa \`/completar [tarea]\` para marcar una tarea como hecha._`;
      }
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 5. /nueva_tarea
    if (cmd === 'nueva_tarea') {
      if (!args) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `ℹ️ *Cómo añadir una tarea:*\nEscribe \`/nueva_tarea Título de la tarea [para fecha]\`\n\n_Ejemplo:_ \`/nueva_tarea Repasar tema 2 DEMC para el viernes\``
        );
        return res.status(200).json({ ok: true });
      }

      const isAde = normalizeText(args).includes('ade') || normalizeText(args).includes('conta') || normalizeText(args).includes('uned');
      const study = state['studyflow_data_v21'] || {};
      const tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
      const newTask = {
        id: 'task_' + Date.now(),
        studyId: isAde ? 'ade' : 'marketing',
        subjectId: '',
        title: args,
        dueDate: isoDate,
        priority: 'medium',
        completed: false,
        notes: 'Añadida desde Telegram'
      };
      tasks.push(newTask);
      study.tasks = tasks;
      await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'studyflow_data_v21', study);

      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `✅ *Tarea guardada con éxito:*\n• "${args}" [${isAde ? 'ADE UNED' : 'FP Marketing'}]\n📅 Fecha asignada: ${newTask.dueDate}`
      );
      return res.status(200).json({ ok: true });
    }

    // 6. /completar
    if (cmd === 'completar') {
      if (!args) {
        const study = state['studyflow_data_v21'] || {};
        const tasks = (study.tasks || []).filter(t => !t.completed);
        let msg = 'ℹ️ *Escribe el nombre o palabra clave de la tarea a completar:*\n` /completar [nombre]`\n\n';
        if (tasks.length > 0) {
          msg += '*Tareas pendientes actuales:*\n' + tasks.map(t => `• \`/completar ${t.title}\``).join('\n');
        }
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
        return res.status(200).json({ ok: true });
      }

      const study = state['studyflow_data_v21'] || {};
      const tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
      const search = normalizeText(args);
      const target = tasks.find(t => !t.completed && (normalizeText(t.title).includes(search) || search.includes(normalizeText(t.title))));

      if (target) {
        target.completed = true;
        study.tasks = tasks;
        await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'studyflow_data_v21', study);
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `🎉 ¡Genial, Cris! Tarea completada:\n• *${target.title}*`);
      } else {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `⚠️ No encontré ninguna tarea pendiente que coincida con "${args}".`);
      }
      return res.status(200).json({ ok: true });
    }

    // 7. /examenes
    if (cmd === 'examenes') {
      const study = state['studyflow_data_v21'] || {};
      const exams = (study.exams || []).filter(e => !e.completed);
      let msg = '📅 *Próximos Exámenes de Cris:*\n\n';
      if (exams.length === 0) {
        msg += '🎉 ¡No tienes exámenes pendientes registrados en este momento!';
      } else {
        exams.forEach(e => {
          msg += `• *${e.title}*\n  📅 Fecha: ${e.date || 'Pendiente'} ${e.time || ''}\n  📚 Estudio: ${e.studyId === 'ade' ? 'ADE UNED' : 'FP Marketing'}\n\n`;
        });
      }
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 8. /habitos
    if (cmd === 'habitos') {
      const habitsData = state['cris_daily_habits_v2'] || {};
      const list = habitsData.habits || [];
      const todayHist = (habitsData.history && habitsData.history[isoDate]) || {};
      let msg = `⏰ *Hábitos de Hoy (${dayName} ${isoDate}):*\n\n`;
      const pending = [];

      if (list.length === 0) {
        msg += 'Aún no tienes hábitos configurados en la plataforma.';
      } else {
        list.forEach(h => {
          const done = !!todayHist[h.id];
          msg += `${done ? '✅' : '⏳'} *${h.name}* - ${done ? 'Completado' : 'Pendiente'} (${h.goal || h.category})\n`;
          if (!done) pending.push(h);
        });
      }

      // Teclado interactivo con los hábitos pendientes para marcar con 1 toque
      const inlineButtons = [];
      for (let i = 0; i < pending.length; i += 2) {
        const row = [{ text: `✅ ${pending[i].name}`, callback_data: `check_habit:${pending[i].id}` }];
        if (pending[i + 1]) {
          row.push({ text: `✅ ${pending[i + 1].name}`, callback_data: `check_habit:${pending[i + 1].id}` });
        }
        inlineButtons.push(row);
      }

      const extra = inlineButtons.length > 0 ? { reply_markup: { inline_keyboard: inlineButtons } } : {};
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg, extra);
      return res.status(200).json({ ok: true });
    }

    // 9. /marcar [hábito]
    if (cmd === 'marcar') {
      if (!args) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `ℹ️ *Cómo marcar un hábito:* Escribe \`/marcar [nombre]\` (ej: \`/marcar gym\` o \`/marcar agua\`).`
        );
        return res.status(200).json({ ok: true });
      }

      const habitsData = state['cris_daily_habits_v2'] || { habits: [], history: {} };
      const habits = habitsData.habits || [];
      const history = habitsData.history || {};
      if (!history[isoDate]) history[isoDate] = {};

      const target = findHabit(habits, args);
      if (target) {
        history[isoDate][target.id] = true;
        habitsData.history = history;
        await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'cris_daily_habits_v2', habitsData);
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `🌟 ¡Hábito *${target.name}* marcado como completado para hoy! 🎉`);
      } else {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `⚠️ No encontré el hábito "${args}".\nHábitos disponibles: ${habits.map(h => h.name).join(', ')}`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // 10. /desmarcar [hábito]
    if (cmd === 'desmarcar') {
      if (!args) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `ℹ️ Escribe \`/desmarcar [nombre]\` para desmarcar.`);
        return res.status(200).json({ ok: true });
      }
      const habitsData = state['cris_daily_habits_v2'] || { habits: [], history: {} };
      const habits = habitsData.habits || [];
      const history = habitsData.history || {};
      if (!history[isoDate]) history[isoDate] = {};

      const target = findHabit(habits, args);
      if (target) {
        history[isoDate][target.id] = false;
        habitsData.history = history;
        await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'cris_daily_habits_v2', habitsData);
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `⏳ Hábito *${target.name}* desmarcado.`);
      } else {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `⚠️ No encontré el hábito "${args}".`);
      }
      return res.status(200).json({ ok: true });
    }

    // 11. /menu
    if (cmd === 'menu') {
      const menusData = state['cris_menus_data_v1'] || {};
      const semana = menusData.menuSemanal || {};
      const hoy = semana[dayName] || {};
      const manana = semana[tomorrowDayName] || {};

      let msg = `🍽️ *Menú de Hoy (${dayName.toUpperCase()}):*\n`;
      msg += `🍲 *Comida / Almuerzo:* ${hoy.almuerzo || 'No planificado'}\n`;
      msg += `🥗 *Cena:* ${hoy.cena || 'No planificada'}\n\n`;

      msg += `👀 *Avance de Mañana (${tomorrowDayName.toUpperCase()}):*\n`;
      msg += `🍲 Comida: ${manana.almuerzo || 'No planificado'}\n`;
      msg += `🥗 Cena: ${manana.cena || 'No planificada'}\n\n`;
      msg += `_Usa \`/menu_semana\` para ver los 7 días completos._`;

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 12. /menu_semana
    if (cmd === 'menu_semana') {
      const menusData = state['cris_menus_data_v1'] || {};
      const semana = menusData.menuSemanal || {};
      const days = [
        { key: 'lunes', name: 'Lunes' },
        { key: 'martes', name: 'Martes' },
        { key: 'miercoles', name: 'Miércoles' },
        { key: 'jueves', name: 'Jueves' },
        { key: 'viernes', name: 'Viernes' },
        { key: 'sabado', name: 'Sábado' },
        { key: 'domingo', name: 'Domingo' }
      ];

      let msg = '🗓️ *Planificación Semanal de Comidas:*\n\n';
      days.forEach(d => {
        const item = semana[d.key] || {};
        const isToday = d.key === dayName;
        msg += `*${d.name}${isToday ? ' (HOY ⭐)' : ''}:*\n`;
        msg += `  🍲 Comida: ${item.almuerzo || 'Sin definir'}\n`;
        msg += `  🥗 Cena: ${item.cena || 'Sin definir'}\n\n`;
      });

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 13. /gastos
    if (cmd === 'gastos') {
      const eco = state['cris_economia_data_v1'] || {};
      const personal = eco.personal || {};
      const gastos = personal.gastos || [];
      const totalGastado = gastos.reduce((a, g) => a + (Number(g.importe) || 0), 0);
      const presupuesto = Number(personal.presupuestoMensual) || 600;
      const restante = Math.max(0, presupuesto - totalGastado);

      let msg = `💰 *Finanzas de Cris (Este Mes):*\n\n`;
      msg += `• Presupuesto fijado: *${presupuesto.toFixed(2)}€*\n`;
      msg += `• Total gastado: *${totalGastado.toFixed(2)}€*\n`;
      msg += `• Dinero disponible: *${restante.toFixed(2)}€* ${restante > 50 ? '✅' : '⚠️'}\n\n`;

      msg += `*Últimos movimientos registrados:*\n`;
      if (gastos.length === 0) {
        msg += 'Sin gastos apuntados este mes.\n';
      } else {
        gastos.slice(-5).reverse().forEach(g => {
          msg += `• ${g.fecha || ''}: *${g.concepto}* - ${Number(g.importe).toFixed(2)}€\n`;
        });
      }

      msg += `\n_Para apuntar un gasto rápido: \`/nuevo_gasto 12.50 Supermercado\`_`;
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 14. /nuevo_gasto
    if (cmd === 'nuevo_gasto') {
      if (!args) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `ℹ️ *Cómo registrar un gasto rápido:*\nEscribe \`/nuevo_gasto [importe] [concepto]\`\n\n_Ejemplo:_ \`/nuevo_gasto 14.50 Mercadona\``
        );
        return res.status(200).json({ ok: true });
      }

      const matchAmount = args.match(/^([\d.,]+)\s+(.+)$/);
      if (!matchAmount) {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          `⚠️ Formato incorrecto. Ejemplo: \`/nuevo_gasto 12.50 Farmacia\``
        );
        return res.status(200).json({ ok: true });
      }

      const amount = parseFloat(matchAmount[1].replace(',', '.'));
      const concept = matchAmount[2].trim();

      const eco = state['cris_economia_data_v1'] || { personal: { gastos: [], ingresos: [] } };
      if (!eco.personal) eco.personal = { gastos: [], ingresos: [] };
      if (!Array.isArray(eco.personal.gastos)) eco.personal.gastos = [];

      const newExpense = {
        id: 'gasto_' + Date.now(),
        concepto: concept,
        importe: amount,
        categoria: 'Otros',
        fecha: isoDate,
        metodoPago: 'Tarjeta'
      };
      eco.personal.gastos.push(newExpense);
      await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'cris_economia_data_v1', eco);

      const total = eco.personal.gastos.reduce((a, g) => a + (Number(g.importe) || 0), 0);
      const pres = Number(eco.personal.presupuestoMensual) || 600;
      const rem = Math.max(0, pres - total);

      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        `💸 *Gasto guardado:* ${amount.toFixed(2)}€ en "${concept}".\n💰 Presupuesto restante: *${rem.toFixed(2)}€*`
      );
      return res.status(200).json({ ok: true });
    }

    // 15. /notas
    if (cmd === 'notas') {
      const notes = state['cris_quick_notes'] || {};
      const text = typeof notes === 'string' ? notes : (notes.text || 'No tienes notas en el bloc.');
      let msg = `📌 *Bloc de Notas Rápidas:*\n\n${text}\n\n_Para añadir algo escribe \`/nueva_nota [texto]\`_`;
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 16. /nueva_nota
    if (cmd === 'nueva_nota') {
      if (!args) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `ℹ️ Escribe: \`/nueva_nota texto que quieras guardar\``);
        return res.status(200).json({ ok: true });
      }
      const existing = state['cris_quick_notes'] || {};
      const currentText = typeof existing === 'string' ? existing : (existing.text || '');
      const updatedText = currentText ? `${currentText}\n• [${isoDate}] ${args}` : `• [${isoDate}] ${args}`;
      await updateSupabaseRow(SUPABASE_URL, SUPABASE_ANON_KEY, 'cris_quick_notes', { text: updatedText });
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `📝 *Nota añadida:* "${args}"`);
      return res.status(200).json({ ok: true });
    }

    // 17. /asignaturas
    if (cmd === 'asignaturas') {
      const study = state['studyflow_data_v21'] || {};
      const subjects = study.subjects || [];
      let msg = '📚 *Asignaturas Matriculadas de Cris:*\n\n';
      msg += '*🎓 Grado en ADE (UNED):*\n';
      const adeSubs = subjects.filter(s => s.studyId === 'ade');
      if (adeSubs.length === 0) msg += '• Asignaturas activas en plataforma UNED.\n';
      else adeSubs.forEach(s => msg += `• ${s.name || s.code}\n`);

      msg += '\n*🎯 FP Grado Superior Marketing y Publicidad (EducamosCLM):*\n';
      const mktSubs = subjects.filter(s => s.studyId !== 'ade');
      if (mktSubs.length === 0) msg += '• DEMC, Medios, Investigación comercial, SASP, TFG.\n';
      else mktSubs.forEach(s => msg += `• ${s.name || s.code}\n`);

      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
      return res.status(200).json({ ok: true });
    }

    // 18. /tiempo o /clima
    if (cmd === 'tiempo' || cmd === 'clima') {
      const location = args || 'Madrid';
      try {
        const resW = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const wData = await resW.json();
        const curr = (wData.current_condition && wData.current_condition[0]) || {};
        const today = (wData.weather && wData.weather[0]) || {};
        
        let msg = `🌤️ *Pronóstico del Tiempo en ${location}:*\n\n`;
        msg += `• Estado: *${curr.weatherDesc?.[0]?.value || 'Despejado'}*\n`;
        msg += `• Temp. actual: *${curr.temp_C || '20'}°C* (Sensación: ${curr.FeelsLikeC || curr.temp_C || '20'}°C)\n`;
        msg += `• Máx: *${today.maxtempC || '25'}°C* | Mín: *${today.mintempC || '15'}°C*\n`;
        msg += `• Humedad: *${curr.humidity || '40'}%* | Viento: *${curr.windspeedKmph || '10'} km/h*\n`;
        msg += `• Probabilidad lluvia: *${today.hourly?.[4]?.chanceofrain || '0'}%*\n`;
        msg += `• Índice UV: *${today.uvIndex || '4'}*\n\n`;
        msg += `_Se enviará automáticamente cada día a las 8:00 AM._`;
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
        return res.status(200).json({ ok: true });
      } catch (err) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, `⚠️ No se pudo consultar el tiempo en este momento.`);
        return res.status(200).json({ ok: true });
      }
    }
  }

  // --- C. MENSAJE EN LENGUAJE NATURAL CON GEMINI FLASH AI ---
  const crisContext = buildCrisContext(state);

  try {
    const aiResponse = await callGeminiFlash(GEMINI_API_KEY, userText, crisContext);

    // Revisar si la IA sugirió una o varias acciones para ejecutar en Supabase
    let cleanReply = aiResponse;
    const actionMatch = aiResponse.match(/ACTION_JSON:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/);
    let actionFeedback = null;

    if (actionMatch && actionMatch[1]) {
      cleanReply = aiResponse.replace(/ACTION_JSON:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/, '').trim();
      actionFeedback = await executeActionIfAny(actionMatch[1], state, SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    let finalMessage = cleanReply;
    if (actionFeedback) {
      finalMessage += `\n\n_${actionFeedback}_`;
    }

    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, finalMessage);
    return res.status(200).json({ ok: true });
  } catch (aiError) {
    console.error('Error invoking Gemini Flash:', aiError);
    await sendTelegramMessage(
      TELEGRAM_BOT_TOKEN,
      chatId,
      `⚠️ *Aviso de IA:* ${aiError.message}\n\nPuedes usar los comandos rápidos como /resumen, /tareas, /habitos o /menu.`
    );
    return res.status(200).json({ ok: false, error: aiError.message });
  }
}
