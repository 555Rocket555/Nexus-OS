import { KanbanService } from "../services/storage.js";

// Columnas
const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "dot-backlog" },
  { id: "todo", title: "Por Hacer", color: "dot-todo" },
  { id: "doing", title: "En Progreso", color: "dot-doing" },
  { id: "done", title: "Terminado", color: "dot-done" },
];

let items = [];

export function renderKanban() {
  const container = document.getElementById("vistaKanban");
  const section = container || document.getElementById("seccion-planner");

  if (!section) return;

  // Cargar items en el orden guardado
  items = KanbanService.getAll() || [];

  section.innerHTML = `
        <div class="kanban-layout">
            <div class="header-content" style="padding: 0 20px 20px 20px;">
                <div class="seccion-header" style="justify-content: center; margin-bottom: 10px;">
                    <h1>Kanban Board</h1>
                </div>
            </div>
            <div class="kanban-board" id="kanban-board-container"></div>
        </div>
    `;

  const boardContainer = document.getElementById("kanban-board-container");

  COLUMNS.forEach((col) => {
    // Filtrar items por columna manteniendo el orden del array principal
    const colItems = items.filter((item) => item.status === col.id);

    const colDiv = document.createElement("div");
    colDiv.className = "k-column";

    colDiv.innerHTML = `
            <div class="k-column-header">
                <div class="k-header-left">
                    <span class="dot-status ${col.color}"></span>
                    <span>${col.title}</span>
                    <span class="k-count">${colItems.length}</span>
                </div>
                <button class="btn-k-add" id="btn-add-${col.id}"> + </button>
            </div> 
            <div class="k-column-body" id="col-body-${col.id}" data-status="${col.id}"></div>
        `;

    const body = colDiv.querySelector(".k-column-body");

    // Configurar la zona de drop avanzada
    setupDropZone(body);

    colDiv.querySelector(`#btn-add-${col.id}`).addEventListener("click", () => {
      addNewItem(col.id);
    });

    colItems.forEach((item) => {
      const card = createCard(item);
      body.appendChild(card);
    });

    boardContainer.appendChild(colDiv);
  });
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = "k-card";
  card.draggable = true;
  card.dataset.id = item.id; // Importante para recuperar ID

  card.innerHTML = `
        <div class="k-card-title" contenteditable="true" title="Clic para editar">${item.title}</div>
        <button class="btn-k-delete" title="Eliminar">✕</button>
    `;

  const titleDiv = card.querySelector(".k-card-title");

  // Evitar arrastre al editar
  titleDiv.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    card.setAttribute("draggable", "false");
  });
  titleDiv.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleDiv.blur();
    }
  });
  titleDiv.addEventListener("blur", () => {
    card.setAttribute("draggable", "true");
    const newText = titleDiv.innerText.trim();
    if (newText && newText !== item.title) updateItemTitle(item.id, newText);
    else if (!newText) titleDiv.innerText = item.title;
  });

  // --- LOGICA DRAG & DROP MEJORADA ---
  card.addEventListener("dragstart", (e) => {
    card.classList.add("dragging"); // Clase CSS clave para identificar
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document
      .querySelectorAll(".k-column-body")
      .forEach((el) => el.classList.remove("drag-over"));

    // Al soltar, guardamos el estado visual actual como el nuevo orden
    saveBoardState();
  });

  card.querySelector(".btn-k-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });

  return card;
}

function updateItemTitle(id, newTitle) {
  const item = items.find((i) => i.id === id);
  if (item) {
    item.title = newTitle;
    KanbanService.saveAll(items);
  }
}

// --- ZONA DE DROP INTELIGENTE ---
function setupDropZone(columnBody) {
  columnBody.addEventListener("dragover", (e) => {
    e.preventDefault(); // Necesario para permitir drop
    columnBody.classList.add("drag-over");

    // Elemento que se está arrastrando
    const draggable = document.querySelector(".dragging");
    if (!draggable) return;

    // Calcular dónde insertar usando la posición del mouse (Y)
    const afterElement = getDragAfterElement(columnBody, e.clientY);

    if (afterElement == null) {
      // Si no hay elemento después, añadir al final
      columnBody.appendChild(draggable);
    } else {
      // Si hay elemento, insertar antes de él
      columnBody.insertBefore(draggable, afterElement);
    }
  });

  columnBody.addEventListener("dragleave", () => {
    columnBody.classList.remove("drag-over");
  });

  // El evento drop ya no mueve el elemento (lo hace dragover),
  // solo limpia estilos y actualiza contadores si es necesario.
  columnBody.addEventListener("drop", (e) => {
    e.preventDefault();
    columnBody.classList.remove("drag-over");
    saveBoardState(); // Guardar cambios finales
  });
}

// Función auxiliar matemática para detectar posición
function getDragAfterElement(container, y) {
  // Seleccionar todos los elementos arrastrables que NO son el que estoy moviendo
  const draggableElements = [
    ...container.querySelectorAll(".k-card:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      // offset: distancia entre el mouse y el centro de la caja del elemento
      const offset = y - box.top - box.height / 2;

      // Buscamos el elemento donde el offset sea negativo (estamos arriba de su centro)
      // y que sea el más cercano a 0 (el más próximo inmediato)
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

// --- GUARDADO BASADO EN DOM ---
function saveBoardState() {
  const newItemsOrder = [];
  const boardContainer = document.getElementById("kanban-board-container");

  // Recorrer columnas en orden visual
  const cols = boardContainer.querySelectorAll(".k-column");

  cols.forEach((col) => {
    const status = col.querySelector(".k-column-body").dataset.status;
    const cards = col.querySelectorAll(".k-card");

    // Actualizar contador visualmente
    col.querySelector(".k-count").textContent = cards.length;

    // Recorrer tarjetas en el orden que quedaron
    cards.forEach((card) => {
      const id = Number(card.dataset.id);
      const originalItem = items.find((i) => i.id === id);
      if (originalItem) {
        // Actualizar estado y agregar al nuevo array
        originalItem.status = status;
        newItemsOrder.push(originalItem);
      }
    });
  });

  // Actualizar array principal y guardar
  items = newItemsOrder;
  KanbanService.saveAll(items);
}

// --- ACCIONES DE DATOS ---
function addNewItem(status) {
  const newItem = {
    id: Date.now(),
    title: "",
    status: status,
    tag: "",
  };
  items.push(newItem);
  KanbanService.saveAll(items);
  renderKanban();
}

function deleteItem(id) {
  if (confirm("¿Eliminar tarea?")) {
    items = items.filter((i) => i.id !== id);
    KanbanService.saveAll(items);
    renderKanban();
  }
}
