import { Almacenamiento, ServicioKanban, ServicioFinanzas, ServicioCalendario, ServicioProyectos } from "../services/storage.js";
import { Utils } from "../utils.js";

export function iniciarDashboard() {
    renderizarDashboard();
    document.addEventListener("reload-dashboard", renderizarDashboard);
    document.addEventListener("profile-updated", renderizarDashboard);
}

export function renderizarDashboard() {
    const contenedor = document.getElementById("contenido-dashboard");
    if (!contenedor) return;

    // Actualizar Header
    actualizarEncabezadoYClima();

    contenedor.innerHTML = "";

    // Construcción del Grid de Widgets
    // 1. Calendario
    const calendario = crearWidgetCalendario();
    calendario.classList.add("widget-medium");
    contenedor.appendChild(calendario);

    // 2. Finanzas
    const finanzas = crearWidgetFinanzas();
    contenedor.appendChild(finanzas);

    // 3. Tablero (Kanban)
    const tablero = crearWidgetTablero();
    contenedor.appendChild(tablero);

    // 4. Proyectos
    const proyectos = crearWidgetProyectos();
    proyectos.classList.add("widget-medium");
    contenedor.appendChild(proyectos);
}

// --- HEADER ---
function actualizarEncabezadoYClima() {
    const headerContainer = document.getElementById("header-dashboard");
    if (!headerContainer) return;

    // Verificar estructura interna
    let welcomeDiv = document.getElementById("dashboard-welcome-container");
    let weatherDiv = document.getElementById("dashboard-weather-container");

    if (!welcomeDiv) {
        headerContainer.innerHTML = ''; 
        welcomeDiv = document.createElement("div");
        welcomeDiv.id = "dashboard-welcome-container";
        welcomeDiv.className = "dashboard-welcome";

        weatherDiv = document.createElement("div");
        weatherDiv.id = "dashboard-weather-container";
        weatherDiv.className = "weather-header-widget";

        headerContainer.appendChild(welcomeDiv);
        headerContainer.appendChild(weatherDiv);
    }

    const perfil = Almacenamiento.obtener("user_profile") || { name: "Usuario" };
    const hora = new Date().getHours();
    let saludo = "Hola";
    if (hora >= 5 && hora < 12) saludo = "Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "Buenas tardes";
    else saludo = "Buenas noches";

    const opciones = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const fecha = new Date().toLocaleDateString("es-MX", opciones);
    const fechaFmt = fecha.charAt(0).toUpperCase() + fecha.slice(1);

    welcomeDiv.innerHTML = `<h1>${saludo}, ${perfil.name} 👋</h1><p>${fechaFmt}</p>`;

    if (weatherDiv.innerHTML === "") {
        weatherDiv.innerHTML = `<span style="font-size:0.9rem; opacity:0.7;">📍 Cargando...</span>`;
        iniciarClima(weatherDiv);
    }
}

function iniciarClima(contenedor) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => obtenerClima(pos.coords.latitude, pos.coords.longitude, contenedor),
            () => (contenedor.innerHTML = `<span style="font-size:0.9rem;">Ubicación desactivada</span>`)
        );
    } else {
        contenedor.innerHTML = `<span style="font-size:0.9rem;">No soportado</span>`;
    }
}

async function obtenerClima(lat, lon, contenedor) {
    try {
        const [resClima, resGeo] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`),
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`)
        ]);
        const datosClima = await resClima.json();
        const datosGeo = await resGeo.json();

        const ciudad = datosGeo.locality || datosGeo.city || "Tu Ubicación";
        const temp = Math.round(datosClima.current.temperature_2m);
        const isDay = datosClima.current.is_day;
        const icono = obtenerIconoClima(datosClima.current.weather_code, isDay);

        contenedor.innerHTML = `
            <div class="weather-header-content">
                <span class="wh-icon">${icono}</span>
                <div class="wh-info">
                    <span class="wh-temp">${temp}°C</span>
                    <span class="wh-city">${ciudad}</span>
                </div>
            </div>`;
    } catch (e) {
        console.error(e);
        contenedor.innerHTML = `<span style="font-size:0.9rem;">Clima no disponible</span>`;
    }
}

function obtenerIconoClima(codigo, isDay) {
    if (codigo === 0) return isDay ? "☀️" : "🌙";
    if (codigo >= 1 && codigo <= 3) return isDay ? "⛅" : "☁️";
    if (codigo >= 45 && codigo <= 48) return "🌫";
    if (codigo >= 51 && codigo <= 67) return "🌧";
    if (codigo >= 71 && codigo <= 77) return "❄️";
    if (codigo >= 95) return "⛈";
    return "🌡️";
}

// --- WIDGETS ---

function crearBaseTarjeta(titulo, seccionObjetivo) {
    const div = document.createElement("div");
    div.className = "dashboard-card";
    if (seccionObjetivo) {
        div.onclick = () => {
            const btn = document.querySelector(`.menu-btn[data-target="${seccionObjetivo}"]`);
            if (btn) btn.click();
        };
    }
    if (titulo) div.innerHTML = `<h3>${titulo}</h3>`;
    return div;
}

function crearWidgetProyectos() {
    const tarjeta = crearBaseTarjeta("Proyectos Activos", "seccion-proyectos");
    // Usamos el servicio en lugar de acceso directo
    const proyectos = ServicioProyectos ? ServicioProyectos.obtenerTodos() : (Almacenamiento.obtener("projects") || []);
    
    const activos = proyectos.filter((p) => p.status === "active").slice(0, 3);

    if (activos.length === 0) {
        tarjeta.innerHTML += `<div class="empty-widget">Sin proyectos activos.</div>`;
    } else {
        const lista = document.createElement("div");
        lista.style.cssText = "display:flex; flex-direction:column; gap:10px; width:100%";
        activos.forEach((p) => {
            let total = 0, hecho = 0;
            if (p.sections) {
                p.sections.forEach(s => {
                    if(s.tasks) {
                        total += s.tasks.length;
                        hecho += s.tasks.filter(t => t.done).length;
                    }
                });
            } else if (p.subtasks) {
                total = p.subtasks.length;
                hecho = p.subtasks.filter(s => s.done).length;
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
                </div>`;
        });
        tarjeta.appendChild(lista);
    }
    return tarjeta;
}

function crearWidgetFinanzas() {
    const tarjeta = crearBaseTarjeta(" $ Disponible Hoy", "seccion-finanzas");
    const config = ServicioFinanzas.obtenerConfiguracion() || { ingreso: 0, ahorroPct: 0 };
    const fijos = ServicioFinanzas.obtenerGastosFijos() || [];
    const movs = ServicioFinanzas.obtenerMovimientos() || [];

    const ingreso = Number(config.ingreso) || 0;
    const totalFijos = fijos.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalMovs = movs.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const ahorro = ingreso * ((Number(config.ahorroPct) || 0) / 100);
    
    const libreReal = ingreso - totalFijos - ahorro - totalMovs;

    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diasRestantes = Math.max(1, ultimoDia - hoy.getDate());
    const diario = libreReal / diasRestantes;

    const div = document.createElement("div");
    div.className = "money-widget-content";
    div.innerHTML = `
        <div class="money-big ${diario < 0 ? 'text-danger' : 'text-success'}">${Utils.formatearMoneda(diario)}</div>
        <div class="money-desc">quedan ${diasRestantes} días</div>
    `;
    tarjeta.appendChild(div);
    return tarjeta;
}

function crearWidgetTablero() {
    const tarjeta = crearBaseTarjeta("Kanban", "seccion-tablero");
    const tareas = ServicioKanban.obtenerTodos() || [];
    const pendientes = tareas.filter((t) => t.status === "todo").length;
    const enProgreso = tareas.filter((t) => t.status === "doing").length;

    const div = document.createElement("div");
    div.style.cssText = "display:flex; justify-content:space-around; align-items:center; height:100%; width:100%;";
    div.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:1.5rem; font-weight:bold;">${pendientes}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Pendientes</div>
        </div>
        <div style="width:1px; height:30px; background:var(--border-color);"></div>
        <div style="text-align:center;">
            <div style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${enProgreso}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">En Curso</div>
        </div>
    `;
    tarjeta.appendChild(div);
    return tarjeta;
}

function crearWidgetCalendario() {
    const tarjeta = crearBaseTarjeta("Agenda Hoy", "seccion-calendario");
    const eventosMap = ServicioCalendario.obtenerEventos() || {}; 
    const hoyStr = new Date().toISOString().split("T")[0];
    const eventosHoy = eventosMap[hoyStr] || [];

    if (eventosHoy.length === 0) {
        tarjeta.innerHTML += `<div class="empty-widget">Nada para hoy.</div>`;
    } else {
        const lista = document.createElement("div");
        lista.className = "widget-list";
        eventosHoy.forEach((e) => {
            lista.innerHTML += `
                <div class="widget-item">
                    <span style="width:8px; height:8px; border-radius:50%; background:var(--primary); display:inline-block;"></span>
                    <span>${Utils.escaparHTML(e.titulo)}</span>
                </div>
            `;
        });
        tarjeta.appendChild(lista);
    }
    return tarjeta;
}