// src/js/components/calendar.js
import { CalendarService } from "../services/storage.js";

let eventos = {};
// Estructura NUEVA: { "2026-02-03": [ { titulo: "A", ... }, { titulo: "B", ... } ] }
let eventosSinFecha = {};
let currentDate = new Date();

const dom = {
  grid: document.getElementById("calendarGrid"),
  mesAnio: document.getElementById("mesAnio"),
  listaEventos: document.getElementById("calendarEvents"),
  listNoDate: document.getElementById("unassignedEvents"),
  btnPrev: document.getElementById("prevMonth"),
  btnNext: document.getElementById("nextMonth"),
  btnNoDate: document.getElementById("btnNuevoEvento"),
};

export function initCalendar() {
  const rawEvents = CalendarService.getEvents() || {};
  eventos = migrateEventsToArray(rawEvents); // Migración crítica
  eventosSinFecha = CalendarService.getNoDateEvents() || {};

  if (dom.btnPrev) dom.btnPrev.onclick = () => changeMonth(-1);
  if (dom.btnNext) dom.btnNext.onclick = () => changeMonth(1);
  if (dom.btnNoDate) dom.btnNoDate.onclick = addNoDateEvent;

  renderCalendar();
  renderNoDateEvents();
}

// Convierte datos antiguos (objeto único) a nuevos (array de objetos)
function migrateEventsToArray(data) {
  const newData = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      newData[key] = val; // Ya es array, todo bien
    } else {
      // Es formato antiguo, lo metemos en un array
      // También normalizamos colores si viene del formato muy viejo
      let evt = val;
      if (typeof val === "string")
        evt = { titulo: val, etiqueta: "Evento", colorIdx: 1 };
      else if (!val.colorIdx) {
        let cIdx = 1;
        if (val.categoria === "trabajo") cIdx = 1;
        else if (val.categoria === "personal") cIdx = 2;
        else if (val.categoria === "importante") cIdx = 4;
        else cIdx = 3;
        evt = {
          titulo: val.titulo,
          etiqueta: val.categoria || "Evento",
          colorIdx: cIdx,
        };
      }
      newData[key] = [evt];
    }
  }
  return newData;
}

function renderCalendar() {
  if (!dom.grid) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  dom.mesAnio.textContent = `${months[month]} ${year}`;
  dom.grid.innerHTML = "";
  dom.listaEventos.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let hasEvents = false;

  // Espacios vacíos
  for (let i = 0; i < firstDay; i++) {
    dom.grid.appendChild(document.createElement("div"));
  }

  // Días
  for (let i = 1; i <= daysInMonth; i++) {
    const div = document.createElement("div");
    div.className = "day-cell";

    // Header del día
    const dayLabel = document.createElement("div");
    dayLabel.className = "day-label";
    dayLabel.textContent = i;
    div.appendChild(dayLabel);

    const dateKey = `${year}-${month}-${i}`;
    const hoy = new Date();

    if (
      i === hoy.getDate() &&
      month === hoy.getMonth() &&
      year === hoy.getFullYear()
    ) {
      div.classList.add("today");
    }

    // --- RENDERIZADO MÚLTIPLE ---
    const dailyEvents = eventos[dateKey] || [];

    if (dailyEvents.length > 0) {
      hasEvents = true;
      div.classList.add("has-event");

      // Crear una pastilla por cada evento del día
      dailyEvents.forEach((evt, index) => {
        // 1. En el Calendario (Pastilla)
        const mark = document.createElement("div");
        mark.className = `evento-mark evt-type-${evt.colorIdx}`;
        mark.textContent = evt.titulo;

        // IMPORTANTE: Clic en la pastilla edita ESE evento específico
        mark.onclick = (e) => {
          e.stopPropagation(); // Evitar abrir "nuevo evento"
          openEventModal(dateKey, i, months[month], index);
        };
        div.appendChild(mark);

        // 2. En la Lista Lateral
        const item = document.createElement("div");
        item.className = `agenda-item evt-type-${evt.colorIdx}`;
        item.innerHTML = `
              <div class="agenda-date">
                <span class="dia-num">${i}</span>
                <span class="dia-nom">${months[month].substr(0, 3)}</span>
              </div>
              <div class="agenda-desc">
                <span>${evt.titulo}</span>
                <span class="agenda-tag">${evt.etiqueta || ""}</span>
              </div>
          `;
        item.onclick = () => openEventModal(dateKey, i, months[month], index);
        dom.listaEventos.appendChild(item);
      });
    }

    // Clic en el día vacío = Nuevo Evento
    div.onclick = () => openEventModal(dateKey, i, months[month], null); // null = nuevo
    dom.grid.appendChild(div);
  }

  if (!hasEvents) {
    dom.listaEventos.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">No hay eventos este mes.</div>`;
  }
}

// --- MODAL DE EVENTO (Soporta Create & Edit) ---
// eventIndex: null si es nuevo, número si es edición
function openEventModal(dateKey, dia, mes, eventIndex = null) {
  const existing = document.getElementById("calendar-modal");
  if (existing) existing.remove();

  // Obtener datos si estamos editando
  let evt = { titulo: "", etiqueta: "", colorIdx: 1 };
  if (eventIndex !== null && eventos[dateKey] && eventos[dateKey][eventIndex]) {
    evt = eventos[dateKey][eventIndex];
  }

  const isEdit = eventIndex !== null;

  const modalHTML = `
        <div id="calendar-modal" class="modal-event-overlay">
            <div class="modal-event-card">
                <h3>${isEdit ? "Editar Evento" : "Nuevo Evento"} (${dia} ${mes})</h3>
                
                <label style="display:block; margin-bottom:5px; color:var(--text-muted); font-size:0.85rem;">Título</label>
                <input type="text" id="evt-title" value="${evt.titulo}" placeholder="Ej. Reunión" autofocus autocomplete="off">
                
                <label style="display:block; margin-bottom:5px; color:var(--text-muted); font-size:0.85rem;">Etiqueta</label>
                <input type="text" id="evt-tag" value="${evt.etiqueta}" placeholder="Ej. Trabajo" autocomplete="off">

                <label style="display:block; margin-bottom:10px; color:var(--text-muted); font-size:0.85rem; text-align:center;">Color</label>
                <div class="color-picker-row">
                    <div class="color-circle bg-c1 ${evt.colorIdx == 1 ? "selected" : ""}" data-idx="1"></div>
                    <div class="color-circle bg-c2 ${evt.colorIdx == 2 ? "selected" : ""}" data-idx="2"></div>
                    <div class="color-circle bg-c3 ${evt.colorIdx == 3 ? "selected" : ""}" data-idx="3"></div>
                    <div class="color-circle bg-c4 ${evt.colorIdx == 4 ? "selected" : ""}" data-idx="4"></div>
                    <div class="color-circle bg-c5 ${evt.colorIdx == 5 ? "selected" : ""}" data-idx="5"></div>
                </div>
                <input type="hidden" id="evt-color-val" value="${evt.colorIdx}">

                <div class="modal-btns">
                    ${isEdit ? `<button id="btn-del-evt" class="btn-modal btn-delete">Eliminar</button>` : ""}
                    <button id="btn-cancel-evt" class="btn-modal btn-cancel">Cancelar</button>
                    <button id="btn-save-evt" class="btn-modal btn-save">Guardar</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Color Picker Logic
  const circles = document.querySelectorAll(".color-circle");
  circles.forEach((c) => {
    c.onclick = () => {
      circles.forEach((x) => x.classList.remove("selected"));
      c.classList.add("selected");
      document.getElementById("evt-color-val").value = c.dataset.idx;
    };
  });

  document.getElementById("btn-cancel-evt").onclick = closeEventModal;

  // GUARDAR EVENTO
  document.getElementById("btn-save-evt").onclick = () => {
    const title = document.getElementById("evt-title").value.trim();
    if (!title) {
      alert("Escribe un título");
      return;
    }

    const newEvt = {
      titulo: title,
      etiqueta: document.getElementById("evt-tag").value.trim(),
      colorIdx: parseInt(document.getElementById("evt-color-val").value),
    };

    // Asegurar que existe el array para ese día
    if (!eventos[dateKey]) eventos[dateKey] = [];

    if (isEdit) {
      // Actualizar existente
      eventos[dateKey][eventIndex] = newEvt;
    } else {
      // Agregar nuevo al array
      eventos[dateKey].push(newEvt);
    }

    CalendarService.saveEvents(eventos);
    renderCalendar();
    closeEventModal();
  };

  // ELIMINAR EVENTO
  const btnDel = document.getElementById("btn-del-evt");
  if (btnDel) {
    btnDel.onclick = () => {
      if (confirm("¿Eliminar este evento?")) {
        // Eliminar solo el índice seleccionado del array
        eventos[dateKey].splice(eventIndex, 1);

        // Limpieza: si el día queda vacío, borrar la key (opcional, pero limpio)
        if (eventos[dateKey].length === 0) delete eventos[dateKey];

        CalendarService.saveEvents(eventos);
        renderCalendar();
        closeEventModal();
      }
    };
  }
}

function closeEventModal() {
  const m = document.getElementById("calendar-modal");
  if (m) m.remove();
}

function renderNoDateEvents() {
  if (!dom.listNoDate) return;
  dom.listNoDate.innerHTML = "";

  for (const id in eventosSinFecha) {
    const item = document.createElement("div");
    item.className = "agenda-item no-category";
    item.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") item.querySelector("textarea").focus();
    };

    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "display:flex; width:100%; gap:15px; align-items:flex-start;";

    const input = document.createElement("textarea");
    input.value = eventosSinFecha[id];
    input.style.cssText =
      "width:100%; border:none; resize:none; background:transparent; outline:none; font-family:inherit; color:var(--text-main); font-size:0.95rem; padding:0; cursor:text; z-index:10; min-height:24px; overflow:hidden;";
    input.rows = 1;
    input.placeholder = "Escribe aquí...";

    // Auto-altura inicial
    setTimeout(() => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    }, 0);

    input.oninput = (e) => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      eventosSinFecha[id] = e.target.value;
      CalendarService.saveNoDateEvents(eventosSinFecha);
    };

    const btnDel = document.createElement("button");
    btnDel.innerHTML = "×";
    btnDel.style.cssText =
      "color:var(--text-muted); background:transparent; border:none; cursor:pointer; font-size:1.5rem; padding:0; line-height:1; flex-shrink:0; z-index:20;";
    btnDel.onclick = (e) => {
      e.stopPropagation();
      if (confirm("¿Borrar recordatorio?")) {
        delete eventosSinFecha[id];
        CalendarService.saveNoDateEvents(eventosSinFecha);
        renderNoDateEvents();
      }
    };

    wrapper.append(input, btnDel);
    item.appendChild(wrapper);
    dom.listNoDate.appendChild(item);
  }
}

function addNoDateEvent() {
  const id = Date.now().toString();
  eventosSinFecha[id] = "";
  CalendarService.saveNoDateEvents(eventosSinFecha);
  renderNoDateEvents();
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}
