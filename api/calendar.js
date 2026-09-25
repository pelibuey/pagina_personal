/**
 * CRIS Platform - Live iCalendar (.ics) & Google Calendar Sync Endpoint
 * Permite suscribirse y sincronizar en vivo todos los exámenes, entregas y eventos
 * de la Plataforma CRIS con Google Calendar, Apple Calendar (iPhone/Mac) y Outlook.
 */

const b64Dec = (s) => Buffer.from(s, 'base64').toString('utf-8');
const DEFAULT_SB_URL = b64Dec('aHR0cHM6Ly90a2l2ZmVyenVhdmpjZmd4ZmlocC5zdXBhYmFzZS5jbw==');
const DEFAULT_SB_KEY = b64Dec('c2JfcHVibGlzaGFibGVfbDZEMWZNeElHNU9oWGhyaTl0dzVpQV9iTGlNRXRIRw==');

async function getStudyDataFromSupabase() {
  const sbUrl = process.env.CRIS_SUPABASE_URL || DEFAULT_SB_URL;
  const sbKey = process.env.CRIS_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;

  try {
    const res = await fetch(`${sbUrl}/rest/v1/cris_app_state?key=eq.studyflow_data_v21&select=data,updated_at`, {
      headers: {
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    }
  } catch (e) {
    console.error('Error al consultar Supabase en calendar.js:', e);
  }
  return null;
}

function formatDateToICS(dateStr, timeStr) {
  // dateStr format: YYYY-MM-DD
  // timeStr format: HH:MM
  const cleanDate = (dateStr || '').replace(/-/g, '');
  if (!cleanDate) return null;

  if (timeStr && timeStr.includes(':')) {
    const [hh, mm] = timeStr.split(':');
    const cleanTime = `${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
    return `${cleanDate}T${cleanTime}`;
  }

  // Evento de día completo
  return cleanDate;
}

function escapeICSText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const studyData = await getStudyDataFromSupabase();
  const exams = (studyData && studyData.exams) ? studyData.exams : [];
  const subjects = (studyData && studyData.subjects) ? studyData.subjects : [];
  const tasks = (studyData && studyData.tasks) ? studyData.tasks.filter(t => t.dueDate && !t.completed) : [];

  const subjectMap = {};
  subjects.forEach(s => {
    subjectMap[s.id] = s;
  });

  const nowICS = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Construir archivo iCalendar (.ics)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRIS Platform//Calendario de Estudios//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CRIS - Calendario de Estudios & Exámenes',
    'X-WR-CALDESC:Sincronización en vivo de exámenes, entregas y fechas académicas de la Plataforma CRIS',
    'X-WR-TIMEZONE:Europe/Madrid',
    'X-PUBLISHED-TTL:PT15M'
  ];

  // 1. Añadir Exámenes
  exams.forEach((exam, idx) => {
    const sub = subjectMap[exam.subjectId] || {};
    const subName = sub.name || '';
    const studyTrack = sub.studyId === 'marketing' ? 'FP Marketing' : (sub.studyId === 'ade' ? 'ADE UNED' : 'Estudios');

    const dtStart = formatDateToICS(exam.date, exam.time || '10:00');
    if (!dtStart) return;

    // Calcular fin estimado (+2 horas para exámenes)
    let dtEnd = dtStart;
    if (exam.time && exam.time.includes(':')) {
      const [h, m] = exam.time.split(':').map(Number);
      const endH = String((h + 2) % 24).padStart(2, '0');
      const cleanDate = (exam.date || '').replace(/-/g, '');
      dtEnd = `${cleanDate}T${endH}${String(m).padStart(2, '0')}00`;
    }

    const uid = `cris-exam-${exam.id || idx}@pagina-personal-pelibuey.vercel.app`;
    const summary = `📝 Examen: ${exam.title || subName || 'Examen'}`;
    
    let desc = `📚 Titulación: ${studyTrack}\\n`;
    if (subName) desc += `📖 Materia: ${subName}\\n`;
    if (exam.classroom) desc += `🏫 Aula: ${exam.classroom}\\n`;
    if (exam.weight) desc += `⚖️ Ponderación: ${exam.weight}% de la nota\\n`;
    if (exam.notes) desc += `📌 Notas: ${exam.notes}\\n`;
    desc += `🔗 Plataforma CRIS: https://pagina-personal-pelibuey.vercel.app`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowICS}`);
    if (dtStart.length === 8) {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    } else {
      lines.push(`DTSTART;TZID=Europe/Madrid:${dtStart}`);
      lines.push(`DTEND;TZID=Europe/Madrid:${dtEnd}`);
    }
    lines.push(`SUMMARY:${escapeICSText(summary)}`);
    lines.push(`DESCRIPTION:${desc}`);
    if (exam.classroom) {
      lines.push(`LOCATION:${escapeICSText(exam.classroom)}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('CATEGORIES:Examen,Estudios,CRIS');

    // Recordatorio 1 día antes y 2 horas antes
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICSText(`Recordatorio: Mañana tienes ${summary}`)}`);
    lines.push('END:VALARM');

    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT2H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICSText(`Recordatorio: En 2 horas ${summary}`)}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  // 2. Añadir Tareas pendientes con fecha de entrega
  tasks.forEach((task, idx) => {
    const sub = subjectMap[task.subjectId] || {};
    const dtStart = formatDateToICS(task.dueDate, '20:00');
    if (!dtStart) return;

    const uid = `cris-task-${task.id || idx}@pagina-personal-pelibuey.vercel.app`;
    const summary = `📌 Entrega: ${task.title}`;
    let desc = `📝 Tarea / Entrega Académica\\n`;
    if (sub.name) desc += `📖 Materia: ${sub.name}\\n`;
    if (task.notes) desc += `📌 Detalles: ${task.notes}\\n`;
    desc += `🔗 Plataforma CRIS: https://pagina-personal-pelibuey.vercel.app`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowICS}`);
    if (dtStart.length === 8) {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    } else {
      lines.push(`DTSTART;TZID=Europe/Madrid:${dtStart}`);
      lines.push(`DTEND;TZID=Europe/Madrid:${dtStart}`);
    }
    lines.push(`SUMMARY:${escapeICSText(summary)}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('CATEGORIES:Entrega,Tareas,CRIS');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');

  // Si se pide formato JSON explícito
  if (req.query.format === 'json') {
    return res.status(200).json({
      success: true,
      totalExams: exams.length,
      totalTasks: tasks.length,
      calendarUrl: 'https://pagina-personal-pelibuey.vercel.app/api/calendar.ics',
      googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent('https://pagina-personal-pelibuey.vercel.app/api/calendar')}`,
      appleSubscribeUrl: 'webcal://pagina-personal-pelibuey.vercel.app/api/calendar'
    });
  }

  // Devolver archivo .ics estándar
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="cris_calendario.ics"');
  return res.status(200).send(icsContent);
}
