import { Almacenamiento } from "../services/storage.js";
import { Utils } from "../utils.js";

export function iniciarDashboard() {
  renderizarDashboard();
  // Evento para recargar si vuelves al dashboard desde el menú
  document.addEventListener("reload-dashboard", renderizarDashboard);
  // Evento para actualizar saludo si cambias el perfil en Ajustes
  document.addEventListener("profile-updated", actualizarEncabezado);
}

export function renderizarDashboard() {
  const contenedor = document.getElementById("contenido-dashboard");
  if (!contenedor) return;

  actualizarEncabezado();
  contenedor.innerHTML = "";

  // 1. Clima
  const clima = crearWidgetClima();
  clima.classList.add("widget-wide", "glass-effect");
  contenedor.appendChild(clima);

  // 2. Calendario
  const calendario = crearWidgetCalendario();
  calendario.classList.add("widget-medium");
  contenedor.appendChild(calendario);

  // 3. Finanzas
  const finanzas = crearWidgetFinanzas();
  contenedor.appendChild(finanzas);

  // 4. Tablero (Kanban)
  const tablero = crearWidgetTablero();
  contenedor.appendChild(tablero);

  // 5. Proyectos
  const proyectos = crearWidgetProyectos();
  proyectos.classList.add("widget-medium");
  contenedor.appendChild(proyectos);
}

function actualizarEncabezado() {
  // Fecha
  const elFecha = document.getElementById("fecha-dashboard");
  if (elFecha) {
    const opciones = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const fecha = new Date().toLocaleDateString("es-MX", opciones);
    elFecha.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  }

  // Saludo Personalizado
  const elSaludo = document.getElementById("saludo-dashboard");
  if (elSaludo) {
    const perfil = Almacenamiento.obtener("user_profile") || { name: "Usuario" };

    const hora = new Date().getHours();
    let saludo = "Hola";
    if (hora >= 5 && hora < 12) saludo = "Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "Buenas tardes";
    else saludo = "Buenas noches";

    elSaludo.textContent = `${saludo}, ${perfil.name} 👋`;
  }
}

// --- GENERADORES DE WIDGETS ---

function crearBaseTarjeta(titulo, seccionObjetivo) {
  const div = document.createElement("div");
  div.className = "dashboard-card";

  if (seccionObjetivo) {
    div.onclick = () => {
      const btn = document.querySelector(
        `.menu-btn[data-target="${seccionObjetivo}"]`,
      );
      if (btn) btn.click();
    };
  }

  if (titulo) {
    div.innerHTML = `<h3>${titulo}</h3>`;
  }
  return div;
}

// WIDGET CLIMA
function crearWidgetClima() {
  const tarjeta = crearBaseTarjeta(null, null);
  tarjeta.classList.add("weather-card");
  const contenido = document.createElement("div");
  contenido.innerHTML = `<div style="text-align:center; color:white;">📍 Cargando clima...</div>`;
  tarjeta.appendChild(contenido);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => obtenerClima(pos.coords.latitude, pos.coords.longitude, contenido),
      () =>
        (contenido.innerHTML = `<div style="color:white; text-align:center">Ubicación desactivada</div>`),
    );
  } else {
    contenido.innerHTML = "No soportado";
  }
  return tarjeta;
}

async function obtenerClima(lat, lon, contenedor) {
  try {
    const [resClima, resGeo] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
      ),
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`,
      ),
    ]);
    const datosClima = await resClima.json();
    const datosGeo = await resGeo.json();

    const ciudad = datosGeo.locality || datosGeo.city || "Tu Ubicación";
    const temp = Math.round(datosClima.current.temperature_2m);
    const icono = obtenerIconoClima(datosClima.current.weather_code);

    contenedor.innerHTML = `
            <div class="weather-compact-layout">
                <div class="wc-left"><span class="wc-icon">${icono}</span><span class="wc-temp">${temp}°</span></div>
                <div class="wc-center"><span class="wc-city">📍 ${ciudad}</span><span class="wc-desc">Sensación ${Math.round(datosClima.current.apparent_temperature)}°</span></div>
                <div class="wc-right"><div class="wc-pill">Min ${Math.round(datosClima.daily.temperature_2m_min[0])}°</div><div class="wc-pill">Max ${Math.round(datosClima.daily.temperature_2m_max[0])}°</div></div>
            </div>`;
  } catch (e) {
    contenedor.innerHTML = "Error clima";
  }
}

// WIDGET PROYECTOS
function crearWidgetProyectos() {
  const tarjeta = crearBaseTarjeta("Proyectos Activos", "seccion-proyectos");
  const proyectos = Almacenamiento.obtener("projects") || [];
  const proyectosActivos = proyectos
    .filter((p) => p.status === "active")
    .slice(0, 3);

  if (proyectosActivos.length === 0) {
    tarjeta.innerHTML += `<div class="empty-widget">No hay proyectos activos.</div>`;
  } else {
    const lista = document.createElement("div");
    lista.style.cssText =
      "display:flex; flex-direction:column; gap:10px; width:100%";

    proyectosActivos.forEach((p) => {
      let total = 0,
        hecho = 0;
      if (p.sections) {
        p.sections.forEach((s) => {
          total += s.tasks.length;
          hecho += s.tasks.filter((t) => t.done).length;
        });
      } else if (p.subtasks) {
        total = p.subtasks.length;
        hecho = p.subtasks.filter((s) => s.done).length;
      }

      const pct = total === 0 ? 0 : Math.round((hecho / total) * 100);

      lista.innerHTML += `
                <div class="dash-proj-item">
                    <div class="dash-proj-header">
                        <span>${Utils.escaparHTML(p.title)}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="dash-proj-bar-bg">
                        <div class="dash-proj-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
    });
    tarjeta.appendChild(lista);
  }
  return tarjeta;
}

// WIDGET FINANZAS
function crearWidgetFinanzas() {
  const tarjeta = crearBaseTarjeta(" $ Disponible Hoy", "seccion-finanzas");
  const configuracion = Almacenamiento.obtener("finance_config") || { ingreso: 0, ahorroPct: 0 };
  const fijos = Almacenamiento.obtener("finance_fixed") || [];
  const movimientos = Almacenamiento.obtener("finance_movements") || [];

  const ingreso = Number(configuracion.ingreso);
  const totalFijos = fijos.reduce((suma, i) => suma + Number(i.amount), 0);
  const totalMovs = movimientos.reduce((suma, i) => suma + Number(i.amount), 0);

  const ahorro = ingreso * (configuracion.ahorroPct / 100);
  const libreReal = ingreso - totalFijos - ahorro - totalMovs;

  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(1, ultimoDia - hoy.getDate());
  const diario = libreReal / diasRestantes;

  const div = document.createElement("div");
  div.className = "money-widget-content";
  div.innerHTML = `
        <div class="money-big ${diario < 0 ? 'text-danger' : 'text-success'}">${Utils.formatearMoneda(diario)}</div>
        <div class="money-sub">quedan ${diasRestantes} días</div>
    `;
  tarjeta.appendChild(div);
  return tarjeta;
}

// WIDGET TABLERO (KANBAN)
function crearWidgetTablero() {
  const tarjeta = crearBaseTarjeta("Tareas Pendientes", "seccion-planner");
  const tareas = Almacenamiento.obtener("kanban_tasks") || [];
  const pendientes = tareas.filter((t) => t.status === "todo").length;
  const enProgreso = tareas.filter((t) => t.status === "doing").length;

  const div = document.createElement("div");
  div.style.cssText = "display:flex; justify-content:space-around; align-items:center; height:100%;";
  div.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:1.5rem; font-weight:bold;">${pendientes}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Por hacer</div>
        </div>
        <div style="width:1px; height:30px; background:var(--border-color);"></div>
        <div style="text-align:center;">
            <div style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${enProgreso}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">En curso</div>
        </div>
    `;
  tarjeta.appendChild(div);
  return tarjeta;
}

// WIDGET CALENDARIO
function crearWidgetCalendario() {
  const tarjeta = crearBaseTarjeta("Agenda Hoy", "seccion-calendario");
  const eventos = Almacenamiento.obtener("calendar_events") || [];
  const hoyStr = new Date().toISOString().split("T")[0];
  const eventosHoy = eventos.filter((e) => e.date === hoyStr);

  if (eventosHoy.length === 0) {
    tarjeta.innerHTML += `<div class="empty-widget">Nada programado para hoy 🎉</div>`;
  } else {
    const lista = document.createElement("div");
    lista.className = "widget-list";
    eventosHoy.forEach((e) => {
      lista.innerHTML += `
                <div class="widget-list-item">
                    <span class="event-dot" style="background:${e.color || 'var(--primary)'}"></span>
                    <span>${Utils.escaparHTML(e.title)}</span>
                </div>
            `;
    });
    tarjeta.appendChild(lista);
  }
  return tarjeta;
}

function obtenerIconoClima(codigo) {
  // Simple mapping WMO Weather interpretation codes (WW)
  if (codigo === 0) return "☀️";
  if (codigo >= 1 && codigo <= 3) return "⛅";
  if (codigo >= 45 && codigo <= 48) return "🌫";
  if (codigo >= 51 && codigo <= 67) return "🌧";
  if (codigo >= 71 && codigo <= 77) return "❄️";
  if (codigo >= 80 && codigo <= 82) return "🌦";
  if (codigo >= 95) return "⛈";
  return "❓";
}
