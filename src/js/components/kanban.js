import { Utils } from "../utils.js";
import { ServicioKanban } from "../services/storage.js";

// Columnas
const COLUMNAS = [
  { id: "backlog", title: "Backlog", color: "dot-backlog" },
  { id: "todo", title: "Por Hacer", color: "dot-todo" },
  { id: "doing", title: "En Progreso", color: "dot-doing" },
  { id: "done", title: "Terminado", color: "dot-done" },
];

let itemsTablero = [];

export function renderizarTablero() {
  const contenedor = document.getElementById("vista-tablero") || document.getElementById("vistaKanban");
  const seccion = contenedor || document.getElementById("seccion-tablero") || document.getElementById("seccion-planner");

  if (!seccion) return;

  // Cargar items en el orden guardado
  itemsTablero = ServicioKanban.obtenerTodos() || [];

  seccion.innerHTML = `
        <div class="kanban-layout">
            <div class="header-content" style="padding: 0 20px 20px 20px;">
                <div class="seccion-header" style="justify-content: center; margin-bottom: 10px;">
                    <h1>Tablero Kanban</h1>
                </div>
            </div>
            <div class="kanban-board" id="contenedor-tablero"></div>
        </div>
    `;

  const contenedorTablero = document.getElementById("contenedor-tablero");

  COLUMNAS.forEach((col) => {
    // Filtrar items por columna manteniendo el orden del array principal
    const itemsCol = itemsTablero.filter((item) => item.status === col.id);

    const divCol = document.createElement("div");
    divCol.className = "k-column";

    divCol.innerHTML = `
            <div class="k-column-header">
                <div class="k-header-left">
                    <span class="dot-status ${col.color}"></span>
                    <span>${col.title}</span>
                    <span class="k-count">${itemsCol.length}</span>
                </div>
                <button class="btn-k-add" id="btn-agregar-${col.id}"> + </button>
            </div> 
            <div class="k-column-body" id="cuerpo-col-${col.id}" data-status="${col.id}"></div>
        `;

    const cuerpo = divCol.querySelector(".k-column-body");

    // Configurar la zona de drop avanzada
    configurarZonaDrop(cuerpo);

    divCol.querySelector(`#btn-agregar-${col.id}`).addEventListener("click", () => {
      agregarNuevoItem(col.id);
    });

    itemsCol.forEach((item) => {
      const tarjeta = crearTarjeta(item);
      cuerpo.appendChild(tarjeta);
    });

    contenedorTablero.appendChild(divCol);
  });
}

function crearTarjeta(item) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "k-card";
  tarjeta.draggable = true;
  tarjeta.dataset.id = item.id; // Importante para recuperar ID

  tarjeta.innerHTML = `
        <div class="k-card-title" contenteditable="true" title="Clic para editar">${Utils.escaparHTML(item.title)}</div>
        <button class="btn-k-delete" title="Eliminar">✕</button>
    `;

  const divTitulo = tarjeta.querySelector(".k-card-title");

  // Evitar arrastre al editar
  divTitulo.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    tarjeta.setAttribute("draggable", "false");
  });
  divTitulo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      divTitulo.blur();
    }
  });
  divTitulo.addEventListener("blur", () => {
    tarjeta.setAttribute("draggable", "true");
    const nuevoTexto = divTitulo.innerText.trim();
    if (nuevoTexto && nuevoTexto !== item.title) actualizarTituloItem(item.id, nuevoTexto);
    else if (!nuevoTexto) divTitulo.innerText = item.title;
  });

  // --- LOGICA DRAG & DROP MEJORADA ---
  tarjeta.addEventListener("dragstart", (e) => {
    tarjeta.classList.add("dragging"); // Clase CSS clave para identificar
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  });

  tarjeta.addEventListener("dragend", () => {
    tarjeta.classList.remove("dragging");
    document
      .querySelectorAll(".k-column-body")
      .forEach((el) => el.classList.remove("drag-over"));

    // Al soltar, guardamos el estado visual actual como el nuevo orden
    guardarEstadoTablero();
  });

  tarjeta.querySelector(".btn-k-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    eliminarItem(item.id);
  });

  return tarjeta;
}

function actualizarTituloItem(id, nuevoTitulo) {
  const item = itemsTablero.find((i) => i.id === id);
  if (item) {
    item.title = nuevoTitulo;
    ServicioKanban.guardarTodos(itemsTablero);
  }
}

// --- ZONA DE DROP INTELIGENTE ---
function configurarZonaDrop(cuerpoColumna) {
  cuerpoColumna.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necesario para permitir drop
    cuerpoColumna.classList.add("drag-over");

    // Elemento que se está arrastrando
    const arrastrable = document.querySelector(".dragging");
    if (!arrastrable) return;

    // Calcular dónde insertar usando la posición del mouse (Y)
    const elementoDespues = obtenerElementoDespuesDeArrastre(cuerpoColumna, e.clientY);

    if (elementoDespues == null) {
      // Si no hay elemento después, añadir al final
      cuerpoColumna.appendChild(arrastrable);
    } else {
      // Si hay elemento, insertar antes de él
      cuerpoColumna.insertBefore(arrastrable, elementoDespues);
    }
  });

  cuerpoColumna.addEventListener("dragleave", () => {
    cuerpoColumna.classList.remove("drag-over");
  });

  // El evento drop ya no mueve el elemento (lo hace dragover),
  // solo limpia estilos y actualiza contadores si es necesario.
  cuerpoColumna.addEventListener("drop", (e) => {
    e.preventDefault();
    cuerpoColumna.classList.remove("drag-over");
    guardarEstadoTablero(); // Guardar cambios finales
  });
}

// Función auxiliar matemática para detectar posición
function obtenerElementoDespuesDeArrastre(contenedor, y) {
  // Seleccionar todos los elementos arrastrables que NO son el que estoy moviendo
  const elementosArrastrables = [
    ...contenedor.querySelectorAll(".k-card:not(.dragging)"),
  ];

  return elementosArrastrables.reduce(
    (masCercano, hijo) => {
      const box = hijo.getBoundingClientRect();
      // offset: distancia entre el mouse y el centro de la caja del elemento
      const offset = y - box.top - box.height / 2;

      // Buscamos el elemento donde el offset sea negativo (estamos arriba de su centro)
      // y que sea el más cercano a 0 (el más próximo inmediato)
      if (offset < 0 && offset > masCercano.offset) {
        return { offset: offset, element: hijo };
      } else {
        return masCercano;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

function agregarNuevoItem(status) {
  const titulo = prompt("Nueva tarea:");
  if (titulo) {
    const nuevoItem = {
      id: Utils.generarId(),
      title: titulo,
      status: status,
      createdAt: new Date().toISOString(),
    };
    itemsTablero.push(nuevoItem);
    ServicioKanban.guardarTodos(itemsTablero);
    renderizarTablero();
  }
}

function eliminarItem(id) {
  if (confirm("¿Eliminar tarea?")) {
    itemsTablero = itemsTablero.filter((i) => i.id !== id);
    ServicioKanban.guardarTodos(itemsTablero);
    renderizarTablero();
  }
}

function guardarEstadoTablero() {
  // Reconstruir el array items en base al DOM para preservar el orden visual
  const nuevoOrdenItems = [];

  const columnas = document.querySelectorAll(".k-column-body");
  columnas.forEach(col => {
    const status = col.dataset.status;
    const tarjetas = col.querySelectorAll(".k-card");

    tarjetas.forEach(tarjeta => {
      const id = tarjeta.dataset.id;
      // Buscar el item original para mantener otras propiedades si las hubiera
      const itemOriginal = itemsTablero.find(i => i.id === id);
      if (itemOriginal) {
        nuevoOrdenItems.push({
          ...itemOriginal,
          status: status // Actualizar status basado en la columna actual
        });
      }
    });
  });

  itemsTablero = nuevoOrdenItems;
  ServicioKanban.guardarTodos(itemsTablero);

  // Actualizar contadores visuales
  document.querySelectorAll(".k-column").forEach(col => {
    const body = col.querySelector(".k-column-body");
    const count = col.querySelector(".k-count");
    if (body && count) {
      count.innerText = body.children.length;
    }
  });
}
