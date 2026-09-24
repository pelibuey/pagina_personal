/**
 * CRIS Platform - Telegram Bot & Gemini Flash AI Assistant (Vercel Serverless Function)
 * 
 * Permite a Cris consultar y gestionar todas sus asignaturas, tareas, exámenes, hábitos,
 * finanzas y menús directamente desde Telegram usando la IA de Google Gemini Flash (gratis).
 * 
 * Soporta variables de entorno de Vercel y credenciales directas preconfiguradas.
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
// 1. HELPERS: Supabase REST API Direct Fetch
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
// 2. HELPERS: Date formatting (Spain timezone)
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

  return { dateFormatted, isoDate, dayName };
}

// ==========================================
// 3. HELPERS: Build CRIS Snapshot for Gemini
// ==========================================

function buildCrisContext(state) {
  const { dateFormatted, isoDate, dayName } = getSpainDateContext();

  const study = state['studyflow_data_v21'] || {};
  const habitsData = state['cris_daily_habits_v2'] || {};
  const ecoData = state['cris_economia_data_v1'] || {};
  const menusData = state['cris_menus_data_v1'] || {};
  const notes = state['cris_quick_notes'] || {};

  // Formato de Asignaturas & Exámenes
  const subjects = (study.subjects || []).map(s => `${s.code || s.name} (${s.studyId === 'ade' ? 'ADE UNED' : 'FP Marketing'})`).join(', ');
  
  const upcomingExams = (study.exams || [])
    .filter(e => !e.completed)
    .map(e => `• ${e.title} - Fecha: ${e.date || 'Sin fecha fija'} ${e.time || ''} (${e.studyId || ''})`)
    .join('\n') || 'No hay exámenes pendientes registrados.';

  const pendingTasks = (study.tasks || [])
    .filter(t => !t.completed)
    .map(t => `• ${t.title} [${t.subjectId || 'General'}] - Límite: ${t.dueDate || 'Sin fecha'}`)
    .join('\n') || 'No tienes tareas pendientes.';

  // Hábitos de hoy
  const habitsList = habitsData.habits || [];
  const todayHistory = (habitsData.history && habitsData.history[isoDate]) || {};
  const habitsSummary = habitsList.map(h => {
    const done = !!todayHistory[h.id];
    return `• [${done ? 'HECHO ✅' : 'PENDIENTE ⏳'}] ${h.name} (${h.category} - ${h.goal || ''})`;
  }).join('\n') || 'No hay hábitos definidos aún.';

  // Menú de hoy
  const semanaMenu = menusData.menuSemanal || {};
  const todayMenu = semanaMenu[dayName] || { almuerzo: 'No planificado', cena: 'No planificado' };
  
  // Economía
  const personal = ecoData.personal || {};
  const totalGastosMes = (personal.gastos || []).reduce((acc, g) => acc + (Number(g.importe) || 0), 0);
  const presupuesto = Number(personal.presupuestoMensual) || 0;
  const ultimosGastos = (personal.gastos || []).slice(-5).map(g => `• ${g.fecha || ''}: ${g.concepto} (${g.importe}€)`).join('\n') || 'Sin gastos registrados.';

  // Scratchpad
  const quickNotesText = typeof notes === 'string' ? notes : (notes.text || 'Sin notas apuntadas.');

  return `
--- CONTEXTO ACTUAL DE CRIS (${dateFormatted}) ---
• FECHA HOY: ${isoDate} (${dayName})
• ESTUDIOS: Doble itinerario de Cris -> Grado en ADE (UNED) y FP Grado Superior en Marketing y Publicidad (EducamosCLM).
• ASIGNATURAS ACTIVAS: ${subjects || 'Ninguna registrada'}

• EXÁMENES PRÓXIMOS:
${upcomingExams}

• TAREAS PENDIENTES:
${pendingTasks}

• ESTADO DE HÁBITOS PARA HOY (${isoDate}):
${habitsSummary}

• MENÚ DE HOY (${dayName}):
- Comida/Almuerzo: ${todayMenu.almuerzo || 'No asignado'}
- Cena: ${todayMenu.cena || 'No asignada'}

• FINANZAS DEL MES:
- Total gastado este mes: ${totalGastosMes.toFixed(2)}€
- Presupuesto mensual: ${presupuesto > 0 ? presupuesto.toFixed(2) + '€' : 'No fijado'}
- Últimos gastos:
${ultimosGastos}

• BLOC DE NOTAS RÁPIDAS (SCRATCHPAD):
${quickNotesText}
---------------------------------------------------
`;
}

// ==========================================
// 4. HELPERS: Call Google Gemini Flash API
// ==========================================

async function callGeminiFlash(geminiKey, userPrompt, crisContext) {
  const systemInstruction = `
Eres CRIS AI, el asistente personal inteligente, motivador y directo de Cris (@cris_go_bot).
Cris te habla por Telegram desde su teléfono móvil para no tener que abrir el portátil para consultar o apuntar cosas.

Tienes acceso completo al ecosistema de Cris en tiempo real (estudios ADE + FP Marketing, hábitos, exámenes, tareas, finanzas, menús de comida y notas).

REGLAS DE RESPUESTA:
1. Responde de forma concisa, cálida y directa en español.
2. Utiliza formato adecuado para Telegram: negritas (*texto*), listas y emojis claros.
3. Sé preciso: usa exactamente los datos proporcionados en el contexto actual de Cris. Si algo no está apuntado, indícalo con amabilidad.
4. Si Cris te pide apuntar algo (tarea, gasto, nota, o marcar hábito), responde confirmándole qué has apuntado, e incluye al final un bloque de acción JSON en una sola línea con el formato exacto:
ACTION_JSON:{"action":"add_task"|"add_expense"|"add_note"|"check_habit", "data":{...}}

Acciones soportadas:
- add_task: data={ "title": "...", "dueDate": "YYYY-MM-DD", "studyId": "marketing"|"ade" }
- add_expense: data={ "concepto": "...", "importe": 15.50, "categoria": "Alimentación"|"Ocio"|"Transporte"|"Otros" }
- add_note: data={ "text": "texto a añadir" }
- check_habit: data={ "habitName": "Leer"|"Skincare"|"Ejercicio"|"Hidratación"|"Estudio", "done": true }

Si no se requiere modificar nada en la base de datos, NO generes ningún ACTION_JSON.
`;

  // Probamos los modelos Flash compatibles en orden de rendimiento y disponibilidad
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
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
            maxOutputTokens: 900
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
// 5. HELPERS: Execute Action in Supabase
// ==========================================

async function executeActionIfAny(actionMatch, state, supabaseUrl, supabaseKey) {
  if (!actionMatch || !supabaseUrl || !supabaseKey) return null;

  try {
    const actionObj = JSON.parse(actionMatch);
    const { action, data } = actionObj;
    const { isoDate } = getSpainDateContext();

    // 1. Añadir Tarea
    if (action === 'add_task' && data && data.title) {
      const study = state['studyflow_data_v21'] || {};
      const tasks = Array.isArray(study.tasks) ? [...study.tasks] : [];
      const newTask = {
        id: 'task_' + Date.now(),
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
      return `✅ Tarea guardada: "${data.title}"`;
    }

    // 2. Añadir Gasto
    if (action === 'add_expense' && data && data.concepto) {
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
      return `💸 Gasto registrado: ${newExpense.importe}€ en ${newExpense.concepto}`;
    }

    // 3. Añadir Nota Rápida
    if (action === 'add_note' && data && data.text) {
      const existing = state['cris_quick_notes'] || {};
      const currentText = typeof existing === 'string' ? existing : (existing.text || '');
      const updatedText = currentText ? `${currentText}\n• [${isoDate}] ${data.text}` : `• [${isoDate}] ${data.text}`;
      await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_quick_notes', { text: updatedText });
      return `📝 Nota añadida al bloc de notas`;
    }

    // 4. Marcar Hábito
    if (action === 'check_habit' && data && data.habitName) {
      const habitsData = state['cris_daily_habits_v2'] || { habits: [], history: {} };
      const habits = habitsData.habits || [];
      const history = habitsData.history || {};
      if (!history[isoDate]) history[isoDate] = {};

      const search = data.habitName.toLowerCase().trim();
      const targetHabit = habits.find(h => h.name.toLowerCase().includes(search));
      if (targetHabit) {
        history[isoDate][targetHabit.id] = data.done !== false;
        habitsData.history = history;
        await updateSupabaseRow(supabaseUrl, supabaseKey, 'cris_daily_habits_v2', habitsData);
        return `🌟 Hábito "${targetHabit.name}" marcado como completado`;
      }
    }
  } catch (err) {
    console.error('Error al ejecutar action en Supabase:', err);
  }
  return null;
}

// ==========================================
// 6. HELPERS: Send Telegram Message
// ==========================================

async function sendTelegramMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // Intentar primero con Markdown
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    if (res.ok) return;
  } catch (e) {
    console.warn('Error sending Telegram message with Markdown:', e);
  }

  // Fallback seguro si Markdown falla
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
  } catch (err) {
    console.error('Telegram final send error:', err);
  }
}

// ==========================================
// 7. MAIN HANDLER
// ==========================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Obtener credenciales de variables de Vercel o de los fallbacks directos
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_TOKEN;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SB_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
  const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID;

  // GET: Panel de diagnóstico y registro de Webhook con 1 clic
  if (req.method === 'GET') {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const currentWebhookUrl = `${proto}://${host}/api/telegram`;

    const { action } = req.query || {};

    let webhookResult = null;
    if (action === 'setWebhook' && TELEGRAM_BOT_TOKEN) {
      try {
        const whRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(currentWebhookUrl)}`);
        webhookResult = await whRes.json();
      } catch (err) {
        webhookResult = { ok: false, error: err.message };
      }
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
              <p class="text-xs text-slate-400">Webhook Status & Conexión Nube</p>
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
              <span class="font-medium">Gemini Flash AI Key:</span>
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

          ${webhookResult ? `
            <div class="p-3 mb-6 rounded-xl ${webhookResult.ok ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'} text-xs">
              <p class="font-bold">${webhookResult.ok ? '✅ Webhook registrado correctamente en Telegram!' : '❌ Error al registrar webhook:'}</p>
              <pre class="text-[10px] mt-1 overflow-x-auto">${JSON.stringify(webhookResult, null, 2)}</pre>
            </div>
          ` : ''}

          <div class="flex flex-col gap-2">
            <a href="?action=setWebhook" class="w-full text-center py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30">
              🔗 Activar Webhook en Telegram con 1 Clic
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

  // 1. COMANDOS RÁPIDOS DIRECTOS
  if (userText === '/start' || userText === '/ayuda') {
    const welcomeMsg = 
`👋 ¡Hola ${userName}! Soy *CRIS AI*, tu asistente personal conectado a tu plataforma de estudios y vida.

Ya no necesitas tener el portátil encendido todo el día. Puedes preguntarme cualquier cosa en lenguaje natural:

✨ *Ejemplos de preguntas:*
• 📅 _"¿Qué exámenes tengo próximamente?"_
• 📝 _"¿Qué tareas tengo pendientes?"_
• ⏰ _"¿Qué hábitos me faltan hoy?"_
• 🍽️ _"¿Qué me toca para comer y cenar hoy?"_
• 💰 _"¿Cuánto he gastado este mes?"_
• ✏️ _"Apunta una tarea: Repasar tema 2 de DEMC"_
• 💸 _"Apunta un gasto de 14.50€ en supermercado"_
• 🌟 _"Marca el hábito de leer como completado"_

⚡ *Comandos rápidos:*
/resumen - Resumen integral de tu día
/examenes - Ver fechas de exámenes
/tareas - Lista de tareas pendientes
/habitos - Ver hábitos diarios
/menu - Comida y cena de hoy
/gastos - Estado de tu presupuesto

_(Tu Telegram ID: \`${userId}\`)_`;

    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, welcomeMsg);
    return res.status(200).json({ ok: true });
  }

  // 2. CONSULTAR DATOS EN SUPABASE
  const state = await fetchSupabaseState(SUPABASE_URL, SUPABASE_ANON_KEY);
  const crisContext = buildCrisContext(state);

  // Comandos de respuesta rápida
  if (userText === '/examenes') {
    const study = state['studyflow_data_v21'] || {};
    const exams = (study.exams || []).filter(e => !e.completed);
    let msg = '📅 *Próximos Exámenes de Cris:*\n\n';
    if (exams.length === 0) {
      msg += '🎉 ¡No tienes exámenes pendientes registrados en este momento!';
    } else {
      exams.forEach(e => {
        msg += `• *${e.title}*\n  Fecha: ${e.date || 'Pendiente de definir'} ${e.time || ''}\n  Estudio: ${e.studyId === 'ade' ? 'ADE UNED' : 'FP Marketing'}\n\n`;
      });
    }
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
    return res.status(200).json({ ok: true });
  }

  if (userText === '/tareas') {
    const study = state['studyflow_data_v21'] || {};
    const tasks = (study.tasks || []).filter(t => !t.completed);
    let msg = '📝 *Tareas Pendientes:*\n\n';
    if (tasks.length === 0) {
      msg += '👏 ¡Enhorabuena! No tienes tareas pendientes acumuladas.';
    } else {
      tasks.forEach(t => {
        msg += `• *${t.title}*\n  Entrega: ${t.dueDate || 'Sin fecha'}\n\n`;
      });
    }
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
    return res.status(200).json({ ok: true });
  }

  if (userText === '/habitos') {
    const { isoDate } = getSpainDateContext();
    const habitsData = state['cris_daily_habits_v2'] || {};
    const list = habitsData.habits || [];
    const todayHist = (habitsData.history && habitsData.history[isoDate]) || {};
    let msg = `⏰ *Hábitos de Hoy (${isoDate}):*\n\n`;
    if (list.length === 0) {
      msg += 'Aún no tienes hábitos configurados en la plataforma.';
    } else {
      list.forEach(h => {
        const done = !!todayHist[h.id];
        msg += `${done ? '✅' : '⏳'} *${h.name}* - ${done ? 'Completado' : 'Pendiente'} (${h.goal || h.category})\n`;
      });
    }
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
    return res.status(200).json({ ok: true });
  }

  if (userText === '/menu') {
    const { dayName } = getSpainDateContext();
    const menusData = state['cris_menus_data_v1'] || {};
    const semana = menusData.menuSemanal || {};
    const hoy = semana[dayName] || {};
    let msg = `🍽️ *Menú de Hoy (${dayName.toUpperCase()}):*\n\n`;
    msg += `🍲 *Almuerzo / Comida:* ${hoy.almuerzo || 'No planificado'}\n`;
    msg += `🥗 *Cena:* ${hoy.cena || 'No planificada'}\n`;
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
    return res.status(200).json({ ok: true });
  }

  if (userText === '/resumen') {
    const { isoDate, dayName } = getSpainDateContext();
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

    let msg = `📋 *Resumen de Hoy (${dayName} ${isoDate}):*\n\n`;
    msg += `⏳ *Tareas pendientes:* ${tasks.length}\n`;
    msg += `📅 *Próximos exámenes:* ${exams.length}\n`;
    msg += `⏰ *Hábitos restantes hoy:* ${pendingHabits.length} de ${habits.length}\n`;
    msg += `🍲 *Comida hoy:* ${hoy.almuerzo || 'No fijada'}\n`;
    msg += `🥗 *Cena hoy:* ${hoy.cena || 'No fijada'}\n\n`;
    msg += `_Escríbeme lo que quieras para consultar detalles o apuntar cosas._`;

    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
    return res.status(200).json({ ok: true });
  }

  // 3. CONSULTA CON INTELIGENCIA ARTIFICIAL (GEMINI FLASH)
  try {
    const aiResponse = await callGeminiFlash(GEMINI_API_KEY, userText, crisContext);

    // Revisar si la IA sugirió una acción para ejecutar en Supabase
    let cleanReply = aiResponse;
    const actionMatch = aiResponse.match(/ACTION_JSON:\s*(\{.*\})/);
    let actionFeedback = null;

    if (actionMatch && actionMatch[1]) {
      cleanReply = aiResponse.replace(/ACTION_JSON:\s*\{.*\}/, '').trim();
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
      `⚠️ *Aviso de IA:* ${aiError.message}\n\nPuedes seguir usando los comandos rápidos como /resumen, /examenes, /tareas o /habitos.`
    );
    return res.status(200).json({ ok: false, error: aiError.message });
  }
}
