import { Utils } from "../utils.js";
import { TaskService } from "../services/storage.js";

let tareas = [];

// Elementos del DOM
const dom = {
  modal: document.getElementById("vistaFormulario"),
  form: document.getElementById("formNuevaTarea"),
  contenedorSubtareas: document.getElementById("contenedor-subtareas"),
  inputSubtarea: document.getElementById("input-subtarea"),
  contenido: document.getElementById("contenido-tareas"), // Renombrado de taskContent
  btnNueva: document.getElementById("btn-nueva-tarea"),
  btnCancelar: document.getElementById("btn-cancelar"),
  btnAgregarSub: document.getElementById("btn-agregar-subtarea"),
};

export function iniciarTareas() {
  tareas = TaskService.getAll();
  renderizarTareas();
  configurarListeners();
}

function configurarListeners() {
  if (dom.btnNueva) dom.btnNueva.addEventListener("click", abrirModal);
  if (dom.btnCancelar) dom.btnCancelar.addEventListener("click", cerrarModal);
  if (dom.btnAgregarSub) dom.btnAgregarSub.addEventListener("click", pedirSubtarea);

  if (dom.form) {
    dom.form.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarTarea();
    });
  }
}

function renderizarTareas() {
  if (!dom.contenido) return;

  dom.contenido.innerHTML = ""; // Limpiar grid

  const fragmento = document.createDocumentFragment();

  tareas.forEach((tarea) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = `card ${tarea.completada ? "completada" : ""}`;

    // --- 1. Header (Checkbox + Título) ---
    const encabezado = document.createElement("div");
    encabezado.style.cssText = "display:flex; align-items:center; gap:10px;";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = tarea.completada;
    check.onchange = () => alternarCompletada(tarea.id);

    const titulo = document.createElement("h3");
    titulo.textContent = tarea.titulo;
    encabezado.append(titulo, check);


    const fecha = document.createElement("p");
    fecha.className = "fecha-creacion";

    const fechaObj = tarea.createdAt ? new Date(tarea.createdAt) : new Date(tarea.id);

    fecha.textContent = "📅 " + Utils.formatearFecha(fechaObj);

    const descripcion = document.createElement("p");
    descripcion.textContent = tarea.descripcion;

    // --- 3. Subtareas ---
    const contenedorSub = document.createElement("div");
    contenedorSub.className = "subtareas-container";

    if (tarea.subtareas && tarea.subtareas.length > 0) {
      const ul = document.createElement("ul");
      tarea.subtareas.forEach((sub) => {
        const li = document.createElement("li");
        li.style.cssText =
          "display:flex; gap:8px; align-items:center; margin-bottom:4px;";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.completada;

        if (tarjeta.className.includes("completada")) {
          cb.checked = true;
        }

        cb.onclick = () => {
          sub.completada = !sub.completada;
          TaskService.saveAll(tareas);
          renderizarTareas();
        };

        const span = document.createElement("span");
        span.textContent = sub.texto;
        if (sub.completada) span.style.textDecoration = "line-through";

        li.append(cb, span);
        ul.appendChild(li);
      });
      contenedorSub.appendChild(ul);
    }

    // --- 4. Botón Eliminar ---
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "🗑 Eliminar";
    btnEliminar.className = "btn-danger";
    btnEliminar.style.marginTop = "10px";
    btnEliminar.onclick = () => eliminarTarea(tarea.id);

    tarjeta.append(encabezado, fecha, descripcion, contenedorSub, btnEliminar);
    fragmento.appendChild(tarjeta);
  });

  dom.contenido.appendChild(fragmento);
}

function alternarCompletada(id) {
  const tarea = tareas.find((t) => t.id === id);
  if (tarea) {
    tarea.completada = !tarea.completada;
    TaskService.saveAll(tareas);
    renderizarTareas();
  }
}

function eliminarTarea(id) {
  if (confirm("¿Estás seguro de eliminar esta tarea?")) {
    tareas = tareas.filter((t) => t.id !== id);
    TaskService.saveAll(tareas);
    renderizarTareas();
  }
}

// Funciones para Modal (placeholders si no existen en el DOM original)
function abrirModal() {
  if (dom.modal) dom.modal.style.display = "flex";
}
function cerrarModal() {
  if (dom.modal) dom.modal.style.display = "none";
}
function pedirSubtarea() {
  // Lógica de subtareas (simplificada)
  const texto = prompt("Subtarea:");
  if (texto) {
    // lógica temporal
  }
}
function guardarTarea() {
  // lógica de guardado
}
