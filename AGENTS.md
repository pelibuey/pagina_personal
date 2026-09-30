# Guía de Desarrollo y Memoria del Proyecto - Plataforma CRIS

Este documento establece las directrices, convenciones arquitectónicas y aprendizajes esenciales para el asistente de IA y desarrolladores de la plataforma **CRIS**.

---

## 🏛️ 1. Arquitectura de la Plataforma
CRIS es una plataforma web modular (PWA) de alto rendimiento orientada a la productividad personal y académica.

### 🧩 Subproyectos Activos
1. **Estudios** (`js/subjects.js`, `js/curriculum.js`, `js/schedule.js`, `js/calendar.js`, `js/mkt-grades.js`, `js/tasks.js`, `js/pomodoro.js`, `js/notes.js`, `js/stats.js`):
   - Doble titulación: FP Marketing y Publicidad + Grado ADE (UNED).
   - Filtro de estudios (`all`, `ade`, `marketing`), seguimiento curricular por créditos ECTS, exámenes, notas de temas 1-9 y proyecto TFG.
   - Color temático: **Púrpura** (`#9333ea` / `#7e22ce`).

2. **Habit Tracker** (`js/checklist.js`):
   - Cuadro/Matriz semanal interactiva de Lunes a Domingo.
   - Métricas de racha activa, promedio de efectividad semanal y gráficas en vivo (Evolución diaria y éxito por hábito).
   - Conceptos 100% editables (nombre, meta diaria, categoría y color).
   - Color temático: **Cian Glaciar / Turquesa** (`#06b6d4` / `#0891b2`).

3. **Gestión Económica** (`js/economia.js`):
   - División en 1.1 Personal y 1.2 De Casa.
   - Registro de ingresos, gastos, control de aportaciones al hogar, presupuestos mensuales y gráficos por categoría.
   - Color temático: **Esmeralda** (`#10b981` / `#059669`).

4. **Menús Semanales** (`js/menus.js`):
   - Planificador semanal de comidas Lunes a Domingo (Desayuno, Almuerzo, Comida, Merienda, Cena).
   - Catálogo de recetas con ingredientes y lista de la compra sincronizada.
   - Color temático: **Ámbar / Naranja** (`#f59e0b` / `#d97706`).

5. **Proyectos Cris** (`js/proyectos.js`):
   - Hoja de cálculo tipo Excel / Google Sheets con filtrado, búsqueda, ordenación, CSV export/import y vista de tarjetas alternativa.
   - Almacén de credenciales seguras protegidas con máscara `••••••••`, botón de visibilidad individual/global y generador de contraseñas.
   - **Regla estricta**: Iniciar vacía por defecto (`[]`), sin datos de prueba inventados.
   - Color temático: **Esmeralda / Verde Hoja** (`#059669` / `#10b981`).

---

## ⚡ 2. Reglas Técnicas y Convenciones Críticas

### 🔄 Auto-Updater y Recargas
- **NUNCA** forzar `window.location.reload()` ni `window.location.replace()` de forma no solicitada en segundo plano al cambiar de pestaña o al recibir un nuevo hash.
- Mostrar siempre un banner flotante discreto (`✨ Nueva versión disponible • [Actualizar]`) para que el usuario controle cuándo actualizar.

### 🎨 Iconografía y Logos (Lucide Icons)
- Cargar siempre Lucide desde el CDN fijado de alta velocidad: `https://cdn.jsdelivr.net/npm/lucide@0.468.0/dist/umd/lucide.min.js`.
- **NUNCA** envolver `lucide.createIcons()` en flags que descarten ejecuciones concurrentes. Ejecutar de forma síncrona en cada renderizado de componente o modal.

### 📊 Ciclo de Vida de Chart.js
- Antes de crear cualquier `new window.Chart(ctx, ...)`, destruir siempre cualquier instancia activa previa sobre ese `<canvas>` usando:
  ```javascript
  const old = window.Chart.getChart(canvasElement);
  if (old) old.destroy();
  ```
- Aplicar debouncing de ~60ms en los métodos de renderizado de gráficas para evitar colisiones ante clics rápidos.

### 🚀 Rendimiento y Estilos
- Mantener CSS ligero y optimizado para GPU (evitar `backdrop-filter: blur(20px)` pesados en bucles de listas y nunca usar `transition: all` de forma global).
- Mantener siempre la versión sincronizada en `version.json` y actualizar los cache-busters `?v=XX` en `index.html` en cada despliegue.

---

## 🔒 3. Seguridad y Persistencia
- PIN de desbloqueo: `250419`.
- Autenticación opcional 2FA con Google Authenticator y código de rescate.
- Persistencia local mediante `localStorage` con respaldo JSON/CSV exportable y sincronización con Supabase si está configurado.

---

## ⏰ 4. Recordatorios y Notificaciones Automáticas (Telegram @cris_go_bot)
- **1. Recordatorio Matutino (8:00 AM)**:
  - 📍 El tiempo en Hoyo de Manzanares (temperatura actual, sensación térmica, mín/máx, probabilidad de lluvia y viento).
  - 🍽️ Menú del día (comida y cena planificadas en Menús Semanales).
  - 💎 Habit Tracker (hábitos activos para el arranque de la jornada).
  - 📝 Estudios (tareas prioritarias y fechas de entrega).
  - 💰 Resumen económico mensual acumulado.

- **2. Recordatorio de la Tarde (3:00 PM / 15:00)**:
  - 💊 **Toma de Pastilla**: Alerta directa para la toma de la pastilla tras la comida (sincronizado con el hábito `Pastilla` en Habit Tracker).
  - 🍽️ Cena planificada para esta noche.
  - 💎 Habit Tracker: Progreso de cumplimiento y hábitos restantes para la tarde.
  - 📝 Tareas pendientes para la sesión de tarde.
  - 📍 Estado del tiempo actual.

- **3. Verificación de Cierre del Día (20:00 / 8:00 PM)**:
  - 💎 **Verificación de Hábitos**: Chequeo exhaustivo de todos los hábitos diarios para comprobar que se ha completado todo antes de finalizar la jornada.
  - 💊 **Alerta de Pastilla**: Aviso prioritario si la pastilla aún no ha sido marcada como tomada.
  - 🍽️ Recordatorio de la cena de hoy.
  - 📝 Resumen de tareas completadas y organización para mañana.
  - ✨ Mensaje de descanso y desconexión.
