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
    
    // Modal
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
    const tag = evt.tags?.[0] || "";
    const colorIdx = ServicioEtiquetas.asignarColor(tag || "General");
    
    div.className = `agenda-item evt-type-${colorIdx}`;
    div.innerHTML = `
        <div class="agenda-date-box"><span class="dia-num">${dia}</span></div>
        <div class="agenda-content">
            <span>${evt.titulo}</span>
            ${tag ? `<small>#${tag}</small>` : ''}
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
    // Si data existe, copiamos sus tags. Si no, empezamos vacío.
    tagsTemporales = data && data.tags ? [...data.tags] : []; 
    
    dom.inputTitulo.value = data?.titulo || "";
    
    fechaSeleccionada = fecha;
    eventoEditandoIndex = index;
    // Guardamos el ID si existe, o null si es nuevo
    eventoEditandoId = data?.id || null;

    const esEdicion = data !== null;
    dom.modal.querySelector("h3").textContent = esRecordatorio ? "⏰ Recordatorio" : (esEdicion ? "✏️ Editar Evento" : "📅 Nuevo Evento");
    
    // Lógica del Input de Fecha
    if (esRecordatorio) {
        dom.inputFecha.style.display = "none";
    } else {
        dom.inputFecha.style.display = "block";
        if (fecha) {
            dom.inputFecha.value = formatearKey(fecha);
            // Bloqueamos fecha si venimos de un clic en celda para evitar incoherencias
            dom.inputFecha.disabled = true; 
        } else {
            dom.inputFecha.disabled = false;
        }
    }
    
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

    // CORRECCIÓN: tagsTemporales contiene el estado actual de los tags (incluyendo eliminaciones)
    const nuevo = { 
        titulo, 
        tags: [...tagsTemporales], 
        createdAt: new Date().toISOString() 
    };
    
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
            
            // Si estamos en la misma fecha (lo normal)
            if (oldKey === key && eventos[key]) {
                // Actualizamos el objeto en el array existente con los nuevos tags
                eventos[key][eventoEditandoIndex] = nuevo;
            } else {
                // Si cambió la fecha (caso raro si está disabled, pero por seguridad)
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

// CORRECCIÓN PRINCIPAL AQUÍ:
function renderizarTagsModal() {
    dom.listaTagsModal.innerHTML = tagsTemporales.map(t => `
        <span class="tag-chip bg-c${ServicioEtiquetas.asignarColor(t)}">
            #${t} 
            <span style="cursor:pointer;margin-left:4px;" class="btn-remove-tag" data-tag="${t}">×</span>
        </span>
    `).join("");

    // Agregar listeners reales para eliminar el tag del array
    dom.listaTagsModal.querySelectorAll('.btn-remove-tag').forEach(btn => {
        btn.onclick = (e) => {
            const tagToRemove = e.target.dataset.tag;
            tagsTemporales = tagsTemporales.filter(t => t !== tagToRemove);
            renderizarTagsModal(); // Re-renderizar para reflejar el cambio visualmente
        };
    });
}

function cambiarMes(d) {
    fechaActual.setMonth(fechaActual.getMonth() + d);
    renderizarCalendario();
}

/* ======================================================
   API GLOBAL PARA ETIQUETAS (Bridge)
   Permite que tag.js abra este modal
   ====================================================== */
window.NexusCalendar = {
    editarEvento: (dateKey, index) => {
        // Necesitamos abrir la sección de calendario primero para que el DOM exista
        document.querySelector('[data-target="seccion-calendario"]').click();
        
        // Pequeño timeout para dar tiempo a que se renderice el HTML de calendario
        setTimeout(() => {
            const [y, m, d] = dateKey.split('-').map(Number);
            const fechaObj = new Date(y, m - 1, d);
            const data = eventos[dateKey][index];
            if (data) {
                abrirModal(fechaObj, false, data, index);
            }
        }, 100);
    },
    editarRecordatorio: (id) => {
        document.querySelector('[data-target="seccion-calendario"]').click();
        setTimeout(() => {
            const data = eventosSinFecha[id];
            if (data) {
                // Inyectamos el ID temporalmente para que guardar sepa qué actualizar
                data.id = id; 
                abrirModal(null, true, data);
            }
        }, 100);
    }
};