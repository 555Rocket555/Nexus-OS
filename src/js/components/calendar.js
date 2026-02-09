import { ServicioCalendario, ServicioEtiquetas } from "../services/storage.js";

let eventos = {};
let eventosSinFecha = {};
let fechaActual = new Date();
let tagsTemporales = [];
let fechaSeleccionada = null;
let eventoEditandoIndex = null;
let eventoEditandoId = null;

const dom = {
    grid: document.getElementById("grid-calendario"),
    mesAnio: document.getElementById("mes-anio"),
    listaEventos: document.getElementById("eventos-calendario"),
    listaSinFecha: document.getElementById("eventos-sin-asignar"),
    btnAnterior: document.getElementById("btn-mes-anterior"),
    btnSiguiente: document.getElementById("btn-mes-siguiente"),
    btnNuevoEvento: document.getElementById("btn-nuevo-evento"),
    modal: document.getElementById("modal-evento"),
    inputTitulo: document.getElementById("input-evento-titulo"),
    inputFecha: document.getElementById("input-evento-fecha"),
    inputTag: document.getElementById("input-evento-tag"),
    listaTagsModal: document.getElementById("lista-etiquetas-modal"),
    btnGuardar: document.getElementById("btn-guardar-evento"),
    btnCancelar: document.getElementById("btn-cancelar-evento")
};

export function iniciarCalendario() {
    const raw = ServicioCalendario.obtenerEventos() || {};
    eventos = migrarDatos(raw);
    eventosSinFecha = ServicioCalendario.obtenerEventosSinFecha() || {};

    if (dom.btnAnterior) dom.btnAnterior.onclick = () => cambiarMes(-1);
    if (dom.btnSiguiente) dom.btnSiguiente.onclick = () => cambiarMes(1);
    if (dom.btnNuevoEvento) dom.btnNuevoEvento.onclick = () => abrirModal(null, true);
    if (dom.btnCancelar) dom.btnCancelar.onclick = cerrarModal;
    if (dom.btnGuardar) dom.btnGuardar.onclick = guardarEvento;

    if (dom.inputTag) {
        dom.inputTag.addEventListener("keydown", (e) => {
            if(e.key === "Enter") {
                e.preventDefault();
                agregarTag(dom.inputTag.value.trim());
            }
        });
    }

    renderizarCalendario();
    renderizarRecordatorios();
}

function migrarDatos(data) {
    const nuevo = {};
    for (const [k, v] of Object.entries(data)) {
        nuevo[k] = Array.isArray(v) ? v : [v];
    }
    return nuevo;
}

function formatearKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderizarCalendario() {
    if (!dom.grid) return;
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    dom.mesAnio.textContent = `${meses[month]} ${year}`;
    dom.grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) dom.grid.appendChild(document.createElement("div"));

    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement("div");
        div.className = "day-cell";
        
        const fecha = new Date(year, month, i);
        const key = formatearKey(fecha);
        
        div.innerHTML = `<div class="day-label">${i}</div>`;
        div.onclick = (e) => {
            // Si el clic fue en un evento, no abrir modal vacío
            if (e.target.classList.contains('evento-mark')) return;
            abrirModal(fecha, false);
        };

        if (eventos[key]) {
            eventos[key].forEach((evt, idx) => {
                const pill = document.createElement("div");
                const colorIdx = ServicioEtiquetas.asignarColor(evt.tags?.[0] || "General");
                pill.className = `evento-mark bg-c${colorIdx}`;
                pill.textContent = evt.titulo;
                pill.title = evt.titulo;
                pill.onclick = (e) => {
                    e.stopPropagation();
                    abrirModal(fecha, false, evt, idx);
                };
                div.appendChild(pill);
            });
        }

        if (key === formatearKey(new Date())) div.classList.add("today");
        dom.grid.appendChild(div);
    }
    renderizarListaLateral();
}

function renderizarListaLateral() {
    if(!dom.listaEventos) return;
    dom.listaEventos.innerHTML = "";
    
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    let hayEventos = false;

    // Ordenar fechas
    Object.keys(eventos).sort().forEach(key => {
        const [y, m, d] = key.split('-').map(Number);
        if (y === year && m === (month + 1)) {
            eventos[key].forEach((evt, idx) => {
                hayEventos = true;
                const card = crearTarjetaEvento(evt, d, key, idx);
                dom.listaEventos.appendChild(card);
            });
        }
    });

    if (!hayEventos) {
        dom.listaEventos.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.9rem;">No hay eventos este mes.</div>`;
    }
}

function crearTarjetaEvento(evt, dia, key, idx) {
    const div = document.createElement("div");
    // Si no hay tags, mostrar algo genérico visualmente, pero no agregar el tag al dato
    const tagVisual = evt.tags?.[0] || ""; 
    const colorIdx = ServicioEtiquetas.asignarColor(tagVisual || "General");
    
    div.className = `agenda-item evt-type-${colorIdx}`;
    div.innerHTML = `
        <div class="agenda-date-box"><span class="dia-num">${dia}</span></div>
        <div class="agenda-content">
            <span>${evt.titulo}</span>
            ${tagVisual ? `<small>#${tagVisual}</small>` : ''}
        </div>
        <button class="btn-delete-event">×</button>
    `;

    div.querySelector(".btn-delete-event").onclick = (e) => {
        e.stopPropagation();
        if(confirm("¿Eliminar evento?")) {
            eventos[key].splice(idx, 1);
            if(eventos[key].length === 0) delete eventos[key];
            ServicioCalendario.guardarEventos(eventos);
            renderizarCalendario();
        }
    };

    // Parsear fecha correctamente para evitar problemas de zona horaria
    const [yy, mm, dd] = key.split('-').map(Number);
    const fechaObj = new Date(yy, mm - 1, dd);
    div.onclick = () => abrirModal(fechaObj, false, evt, idx);
    
    return div;
}

function renderizarRecordatorios() {
    if(!dom.listaSinFecha) return;
    dom.listaSinFecha.innerHTML = "";
    
    const ids = Object.keys(eventosSinFecha);
    if (ids.length === 0) {
        dom.listaSinFecha.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.9rem;">Sin recordatorios.</div>`;
        return;
    }

    ids.forEach(id => {
        const item = eventosSinFecha[id];
        const div = document.createElement("div");
        const tagVisual = item.tags?.[0] || "";
        const colorIdx = ServicioEtiquetas.asignarColor(tagVisual || "Recordatorio");

        div.className = `agenda-item evt-type-${colorIdx}`;
        div.innerHTML = `
            <div class="agenda-icon-box">📌</div>
            <div class="agenda-content">
                <span>${item.titulo}</span>
                ${tagVisual ? `<small>#${tagVisual}</small>` : ''}
            </div>
            <button class="btn-delete-event">×</button>
        `;

        div.onclick = () => { item.id = id; abrirModal(null, true, item); };
        div.querySelector(".btn-delete-event").onclick = (e) => {
            e.stopPropagation();
            if(confirm("¿Borrar?")) {
                delete eventosSinFecha[id];
                ServicioCalendario.guardarEventosSinFecha(eventosSinFecha);
                renderizarRecordatorios();
            }
        };
        dom.listaSinFecha.appendChild(div);
    });
}

// --- MODAL ---
function abrirModal(fecha, esRecordatorio, data = null, index = null) {
    // 1. Limpiar Tags: Si hay datos, úsalos; si no, array vacío.
    tagsTemporales = data?.tags ? [...data.tags] : []; 
    dom.inputTitulo.value = data?.titulo || "";
    
    fechaSeleccionada = fecha;
    eventoEditandoIndex = index;
    eventoEditandoId = data?.id || null;

    const esEdicion = data !== null;
    dom.modal.querySelector("h3").textContent = esRecordatorio ? "⏰ Recordatorio" : (esEdicion ? "✏️ Editar Evento" : "📅 Nuevo Evento");
    
    // 2. Lógica del Input de Fecha
    if (esRecordatorio) {
        dom.inputFecha.style.display = "none";
    } else {
        dom.inputFecha.style.display = "block";
        if (fecha) {
            dom.inputFecha.value = formatearKey(fecha);
            // 3. BLOQUEAR INPUT: Si abrimos desde una celda (fecha existe) y NO es recordatorio
            // Si es edición desde la lista lateral, tal vez quieras permitir cambiar fecha, pero
            // si el usuario hizo click en el día 20, bloqueamos para que sea el 20.
            dom.inputFecha.disabled = true; 
        } else {
            // Caso botón flotante (+) o error
            dom.inputFecha.disabled = false;
        }
    }
    
    // Si estamos editando un evento existente desde la lista, permitimos cambiar la fecha si se desea (opcional)
    // Pero tu requerimiento fue "no tiene logica cambiar fecha si selecciona recuadro".
    // La lógica de arriba cumple eso.

    renderizarTagsModal();
    dom.modal.classList.remove("hidden");
    setTimeout(() => dom.inputTitulo.focus(), 100);
}

function cerrarModal() {
    dom.modal.classList.add("hidden");
}

function guardarEvento() {
    const titulo = dom.inputTitulo.value.trim();
    if(!titulo) return alert("Falta el título");

    // 4. Guardar sin forzar "General"
    const nuevo = { titulo, tags: tagsTemporales, createdAt: new Date().toISOString() };
    const esRecordatorio = dom.inputFecha.style.display === "none";

    if (esRecordatorio) {
        const id = eventoEditandoId || Date.now().toString();
        eventosSinFecha[id] = nuevo;
        ServicioCalendario.guardarEventosSinFecha(eventosSinFecha);
        renderizarRecordatorios();
    } else {
        const key = dom.inputFecha.value;
        // Lógica de Edición vs Creación
        if (eventoEditandoIndex !== null && fechaSeleccionada) {
            // Es edición
            const oldKey = formatearKey(fechaSeleccionada);
            // Si la fecha es la misma (que debe serlo si está disabled), reemplazamos
            if (oldKey === key && eventos[key]) {
                eventos[key][eventoEditandoIndex] = nuevo;
            } else {
                // Si por alguna razón cambió (ej. desbloqueo futuro), movemos
                if (eventos[oldKey]) {
                    eventos[oldKey].splice(eventoEditandoIndex, 1);
                    if(eventos[oldKey].length===0) delete eventos[oldKey];
                }
                if (!eventos[key]) eventos[key] = [];
                eventos[key].push(nuevo);
            }
        } else {
            // Es nuevo
            if (!eventos[key]) eventos[key] = [];
            eventos[key].push(nuevo);
        }
        
        ServicioCalendario.guardarEventos(eventos);
        renderizarCalendario();
    }
    cerrarModal();
}

function agregarTag(val) {
    if(val && !tagsTemporales.includes(val)) {
        tagsTemporales.push(val);
        renderizarTagsModal();
        dom.inputTag.value = "";
    }
}

function renderizarTagsModal() {
    dom.listaTagsModal.innerHTML = tagsTemporales.map(t => `
        <span class="tag-chip bg-c${ServicioEtiquetas.asignarColor(t)}">#${t} <span style="cursor:pointer;margin-left:4px;" onclick="this.parentElement.remove()">×</span></span>
    `).join("");
}

function cambiarMes(d) {
    fechaActual.setMonth(fechaActual.getMonth() + d);
    renderizarCalendario();
}