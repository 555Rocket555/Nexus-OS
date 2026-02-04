import { Storage } from "../services/storage.js";

export function initDashboard() {
  renderDashboard();
  // Evento para recargar si vuelves al dashboard desde el menú
  document.addEventListener("reload-dashboard", renderDashboard);
  // Evento para actualizar saludo si cambias el perfil en Ajustes
  document.addEventListener("profile-updated", updateHeader);
}

export function renderDashboard() {
  const container = document.getElementById("dashboard-content");
  if (!container) return;

  updateHeader();
  container.innerHTML = "";

  // 1. Clima
  const weather = createWeatherWidget();
  weather.classList.add("widget-wide", "glass-effect");
  container.appendChild(weather);

  // 2. Calendario
  const calendar = createCalendarWidget();
  calendar.classList.add("widget-medium");
  container.appendChild(calendar);

  // 3. Finanzas
  const finance = createFinanceWidget();
  container.appendChild(finance);

  // 4. Kanban
  const kanban = createKanbanWidget();
  container.appendChild(kanban);

  // 5. Proyectos
  const projects = createProjectsWidget();
  projects.classList.add("widget-medium");
  container.appendChild(projects);
}

function updateHeader() {
  // Fecha
  const dateElem = document.getElementById("dashboard-date");
  if (dateElem) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const fecha = new Date().toLocaleDateString("es-MX", options);
    dateElem.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  }

  // Saludo Personalizado
  const greetingElem = document.getElementById("dashboard-greeting");
  if (greetingElem) {
    const profile = Storage.get("user_profile") || { name: "Usuario" };

    const hora = new Date().getHours();
    let saludo = "Hola";
    if (hora >= 5 && hora < 12) saludo = "Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "Buenas tardes";
    else saludo = "Buenas noches";

    greetingElem.textContent = `${saludo}, ${profile.name} 👋`;
  }
}

// --- GENERADORES DE WIDGETS ---

function createCardBase(title, targetSection) {
  const div = document.createElement("div");
  div.className = "dashboard-card";

  if (targetSection) {
    div.onclick = () => {
      const btn = document.querySelector(
        `.menu-btn[data-target="${targetSection}"]`,
      );
      if (btn) btn.click();
    };
  }

  if (title) {
    div.innerHTML = `<h3>${title}</h3>`;
  }
  return div;
}

// WIDGET CLIMA
function createWeatherWidget() {
  const card = createCardBase(null, null);
  card.classList.add("weather-card");
  const content = document.createElement("div");
  content.innerHTML = `<div style="text-align:center; color:white;">📍 Cargando clima...</div>`;
  card.appendChild(content);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, content),
      () =>
        (content.innerHTML = `<div style="color:white; text-align:center">Ubicación desactivada</div>`),
    );
  } else {
    content.innerHTML = "No soportado";
  }
  return card;
}

async function fetchWeather(lat, lon, container) {
  try {
    const [wRes, gRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
      ),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
      ),
    ]);
    const wData = await wRes.json();
    const gData = await gRes.json();

    const ciudad = gData.locality || gData.city || "Tu Ubicación";
    const temp = Math.round(wData.current.temperature_2m);
    const icon = getWeatherIcon(wData.current.weather_code);

    container.innerHTML = `
            <div class="weather-compact-layout">
                <div class="wc-left"><span class="wc-icon">${icon}</span><span class="wc-temp">${temp}°</span></div>
                <div class="wc-center"><span class="wc-city">📍 ${ciudad}</span><span class="wc-desc">Sensación ${Math.round(wData.current.apparent_temperature)}°</span></div>
                <div class="wc-right"><div class="wc-pill">Min ${Math.round(wData.daily.temperature_2m_min[0])}°</div><div class="wc-pill">Max ${Math.round(wData.daily.temperature_2m_max[0])}°</div></div>
            </div>`;
  } catch (e) {
    container.innerHTML = "Error clima";
  }
}

// WIDGET PROYECTOS
function createProjectsWidget() {
  const card = createCardBase("Proyectos Activos", "seccion-proyectos");
  const projects = Storage.get("projects") || [];
  const activeProjects = projects
    .filter((p) => p.status === "active")
    .slice(0, 3);

  if (activeProjects.length === 0) {
    card.innerHTML += `<div class="empty-widget">No hay proyectos activos.</div>`;
  } else {
    const list = document.createElement("div");
    list.style.cssText =
      "display:flex; flex-direction:column; gap:10px; width:100%";

    activeProjects.forEach((p) => {
      let total = 0,
        done = 0;
      if (p.sections) {
        p.sections.forEach((s) => {
          total += s.tasks.length;
          done += s.tasks.filter((t) => t.done).length;
        });
      } else if (p.subtasks) {
        total = p.subtasks.length;
        done = p.subtasks.filter((s) => s.done).length;
      }

      const pct = total === 0 ? 0 : Math.round((done / total) * 100);

      list.innerHTML += `
                <div class="dash-proj-item">
                    <div class="dash-proj-header">
                        <span>${p.title}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="dash-proj-bar-bg">
                        <div class="dash-proj-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
    });
    card.appendChild(list);
  }
  return card;
}

// WIDGET FINANZAS
function createFinanceWidget() {
  const card = createCardBase(" $ Disponible Hoy", "seccion-finanzas");
  const config = Storage.get("finance_config") || { ingreso: 0, ahorroPct: 0 };
  const fijos = Storage.get("finance_fixed") || [];
  const movements = Storage.get("finance_movements") || [];

  const ingreso = Number(config.ingreso);
  const totalFijos = fijos.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalMovs = movements.reduce((sum, i) => sum + Number(i.amount), 0);

  const ahorro = ingreso * (config.ahorroPct / 100);
  const libreReal = ingreso - totalFijos - ahorro - totalMovs;

  const hoy = new Date();
  const ultimoDia = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  const restantes = Math.max(1, ultimoDia - hoy.getDate());
  const diario = libreReal / restantes;

  card.innerHTML += `
        <div class="money-widget-content">
            <span class="money-big">${formatMoney(diario)}</span>
            <span class="money-desc">para gastar hoy</span>
        </div>
    `;
  return card;
}

// WIDGET KANBAN
function createKanbanWidget() {
  const card = createCardBase("Tablero Kanban", "seccion-planner");
  const items = Storage.get("nexus_kanban_data") || [];
  const focusItems = items
    .filter((i) => i.status === "doing")
    .concat(items.filter((i) => i.status === "todo"))
    .slice(0, 3);

  if (focusItems.length === 0) {
    card.innerHTML += `<div class="empty-widget">Tablero limpio.</div>`;
  } else {
    const ul = document.createElement("ul");
    ul.className = "widget-list";
    focusItems.forEach((item) => {
      const icon = item.status === "doing" ? "🔥" : "📋";
      ul.innerHTML += `
                <li class="widget-item">
                    <span>${icon}</span>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
                </li>
            `;
    });
    card.appendChild(ul);
  }
  return card;
}

// --- WIDGET CALENDARIO (CORREGIDO PARA MÚLTIPLES EVENTOS) ---
function createCalendarWidget() {
  const card = createCardBase("Agenda", "seccion-calendario");
  const eventsObj = Storage.get("eventosGuardados") || {};
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let allEvents = [];

  // 1. Recorremos todas las fechas guardadas
  Object.entries(eventsObj).forEach(([fechaStr, data]) => {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const date = new Date(y, m, d);

    // 2. Normalizamos: Si es array (nuevo) o objeto (viejo)
    const dailyEvents = Array.isArray(data) ? data : [data];

    // 3. Procesamos cada evento individualmente
    dailyEvents.forEach((evt) => {
      // Soporte para datos viejos (strings)
      const texto = typeof evt === "string" ? evt : evt.titulo;
      const colorIdx = evt.colorIdx || 1; // Default a color 1

      // Convertimos índice de color a variable CSS
      let colorVar = "var(--primary)";
      if (colorIdx === 2) colorVar = "var(--secondary)";
      if (colorIdx === 3) colorVar = "var(--success)";
      if (colorIdx === 4) colorVar = "var(--danger)";
      if (colorIdx === 5) colorVar = "var(--warning)";

      allEvents.push({
        date: date,
        fechaStr: `${d}/${m + 1}`,
        texto: texto,
        color: colorVar,
      });
    });
  });

  // 4. Filtramos futuros, ordenamos por fecha y tomamos los 3 primeros
  const proximos = allEvents
    .filter((e) => e.date >= hoy)
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);

  if (proximos.length === 0) {
    card.innerHTML += `<div class="empty-widget">Sin eventos próximos.</div>`;
  } else {
    const ul = document.createElement("ul");
    ul.className = "event-list-compact";

    proximos.forEach((evt) => {
      ul.innerHTML += `
                <li class="evt-item" style="border-left: 3px solid ${evt.color}; padding-left:8px;">
                    <div class="evt-date-badge">${evt.fechaStr}</div>
                    <div class="evt-details">
                        <span class="evt-text">${evt.texto}</span>
                    </div>
                </li>
            `;
    });
    card.appendChild(ul);
  }
  return card;
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 67) return "🌧️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}
