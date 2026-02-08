import { CalendarService } from "../services/storage.js";
import { Utils } from "../utils.js"; // Para Utils.escaparHTML si fuera necesario

let eventos = {};
let eventosSinFecha = {};
let fechaActual = new Date();

const dom = {
  grid: document.getElementById("grid-calendario"),
  mesAnio: document.getElementById("mes-anio"),
  listaEventos: document.getElementById("eventos-calendario"),
  listaSinFecha: document.getElementById("eventos-sin-asignar"),
  btnAnterior: document.getElementById("btn-mes-anterior"),
  btnSiguiente: document.getElementById("btn-mes-siguiente"),
  btnNuevoEvento: document.getElementById("btn-nuevo-evento"),
};

export function iniciarCalendario() {
  const eventosRaw = CalendarService.getEvents() || {};
  eventos = migrarEventosAArray(eventosRaw);
  eventosSinFecha = CalendarService.getNoDateEvents() || {};

  if (dom.btnAnterior) dom.btnAnterior.onclick = () => cambiarMes(-1);
  if (dom.btnSiguiente) dom.btnSiguiente.onclick = () => cambiarMes(1);
  if (dom.btnNuevoEvento) dom.btnNuevoEvento.onclick = agregarEventoSinFecha;

  renderizarCalendario();
  renderizarEventosSinFecha();
}

function migrarEventosAArray(data) {
  const newData = {};
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      newData[key] = val;
    } else {
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

function renderizarCalendario() {
  if (!dom.grid) return;

  const anio = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const meses = [
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

  dom.mesAnio.textContent = `${meses[mes]} ${anio}`;
  dom.grid.innerHTML = "";
  dom.listaEventos.innerHTML = "";

  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // Espacios vacíos
  for (let i = 0; i < primerDia; i++) {
    dom.grid.appendChild(document.createElement("div"));
  }

  // Días
  for (let i = 1; i <= diasEnMes; i++) {
    const div = document.createElement("div");
    div.className = "day-cell";

    // Header del día
    const headerDia = document.createElement("div");
    headerDia.className = "day-header";
    headerDia.textContent = i;
    div.appendChild(headerDia);

    // Click para agregar evento
    div.onclick = () => agregarEventoEnFecha(anio, mes, i);

    // Buscar eventos
    const fechaKey = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(
      i,
    ).padStart(2, "0")}`;
    const evtsDia = eventos[fechaKey];

    if (evtsDia && evtsDia.length > 0) {
      if (
        fechaKey === new Date().toISOString().split("T")[0] // Si es hoy
      ) {
        renderizarListaEventos(evtsDia, fechaKey);
      }

      // Mostrar indicador en celda
      evtsDia.forEach((e) => {
        const dot = document.createElement("div");
        dot.className = "event-dot-marker";
        // Colores hardcodeados por simplicidad o mapeo
        const colores = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"]; // Azul, Rojo, Verde, Amarillo
        const color = colores[(e.colorIdx || 1) - 1] || colores[0];
        dot.style.backgroundColor = color;
        dot.title = e.titulo;
        div.appendChild(dot);
      });
    }

    if (
      i === new Date().getDate() &&
      mes === new Date().getMonth() &&
      anio === new Date().getFullYear()
    ) {
      div.classList.add("today");
    }

    dom.grid.appendChild(div);
  }
}

function renderizarListaEventos(listaEventos, fecha) {
  dom.listaEventos.innerHTML = `<h3>Eventos del ${fecha}</h3>`;
  listaEventos.forEach((evt, index) => {
    const div = document.createElement("div");
    div.className = "event-item";
    div.innerHTML = `
            <span>${evt.titulo}</span>
            <button class="btn-delete-mini">×</button>
        `;
    div.querySelector("button").onclick = () => eliminarEvento(fecha, index);
    dom.listaEventos.appendChild(div);
  });
}

function renderizarEventosSinFecha() {
  if (!dom.listaSinFecha) return;
  dom.listaSinFecha.innerHTML = "";
  // Implementación similar si fuera necesario
}

function agregarEventoEnFecha(anio, mes, dia) {
  const titulo = prompt(`Evento para el ${dia}/${mes + 1}:`);
  if (titulo) {
    const fechaKey = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(
      dia,
    ).padStart(2, "0")}`;
    if (!eventos[fechaKey]) eventos[fechaKey] = [];

    eventos[fechaKey].push({
      titulo: titulo,
      etiqueta: "General",
      colorIdx: 1
    });

    CalendarService.saveEvents(eventos);
    renderizarCalendario();
  }
}

function eliminarEvento(fechaKey, index) {
  if (eventos[fechaKey]) {
    eventos[fechaKey].splice(index, 1);
    if (eventos[fechaKey].length === 0) delete eventos[fechaKey];
    CalendarService.saveEvents(eventos);
    renderizarCalendario();
  }
}

function agregarEventoSinFecha() {
  const titulo = prompt("Recordatorio sin fecha:");
  if (titulo) {
    // Lógica para eventos sin fecha
    alert("Función en desarrollo por refactorización.");
  }
}

function cambiarMes(delta) {
  fechaActual.setMonth(fechaActual.getMonth() + delta);
  renderizarCalendario();
}
