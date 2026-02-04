import { TaskService } from "../services/storage.js";

let tareas = [];
let subtareasTemporales = [];
let tareaEditandoId = null;

// Elementos del DOM
const dom = {
  modal: document.getElementById("vistaFormulario"),
  form: document.getElementById("formNuevaTarea"),
  subList: document.getElementById("subTareasContainer"),
  inputSub: document.getElementById("inputSubTask"),
  content: document.getElementById("taskContent"),
  btnNew: document.getElementById("btnNuevaTarea"),
  btnCancel: document.getElementById("btnCancelar"),
  btnAddSub: document.getElementById("btnSubTarea"),
};

export function initTasks() {
  tareas = TaskService.getAll();
  renderTasks();
  setupListeners();
}

function setupListeners() {
  if (dom.btnNew) dom.btnNew.addEventListener("click", openModal);
  if (dom.btnCancel) dom.btnCancel.addEventListener("click", closeModal);
  if (dom.btnAddSub) dom.btnAddSub.addEventListener("click", addSubtaskPrompt);

  if (dom.form) {
    dom.form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveTask();
    });
  }
}

function renderTasks() {
  if (!dom.content) return;
  dom.content.innerHTML = ""; // Limpiar grid

  tareas.forEach((tarea) => {
    const card = document.createElement("div");
    card.className = `card ${tarea.completada ? "completada" : ""}`;

    // --- 1. Header (Checkbox + Título) ---
    const header = document.createElement("div");
    header.style.cssText = "display:flex; align-items:center; gap:10px;";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = tarea.completada;
    check.onchange = () => toggleCompletada(tarea.id);

    const title = document.createElement("h3");
    title.textContent = tarea.titulo;
    header.append(title, check);

    // --- 2. Detalles ---
    const fecha = document.createElement("p");
    fecha.className = "fecha-creacion";
    fecha.textContent =
      "📅 " +
      new Date(tarea.id).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      });

    const desc = document.createElement("p");
    desc.textContent = tarea.descripcion;

    // --- 3. Subtareas ---
    const subContainer = document.createElement("div");
    subContainer.className = "subtareas-container";

    if (tarea.subtareas && tarea.subtareas.length > 0) {
      const ul = document.createElement("ul");
      tarea.subtareas.forEach((sub) => {
        const li = document.createElement("li");
        li.style.cssText =
          "display:flex; gap:8px; align-items:center; margin-bottom:4px;";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.completada;

        if (card.className.includes("completada")) {
          cb.checked = true;
        }

        cb.onclick = () => {
          sub.completada = !sub.completada;
          TaskService.saveAll(tareas);
          renderTasks();
        };

        const span = document.createElement("span");
        span.textContent = sub.texto;
        if (sub.completada) {
          span.style.textDecoration = "line-through";
          span.style.color = "#aaa";
          cb.checked = true;
        }

        li.append(cb, span);
        ul.appendChild(li);
      });
      subContainer.appendChild(ul);
    } else {
      subContainer.innerHTML =
        "<small style='color:gray'>Sin pasos adicionales</small>";
    }

    // --- 4. Etiquetas y Prioridad (CORREGIDO) ---
    const tagsMap = {
      trabajo: { label: "Trabajo", color: "#3b82f6" },
      estudio: { label: "Estudio", color: "#8b5cf6" },
      personal: { label: "Personal", color: "#10b981" },
      hogar: { label: "Hogar", color: "#f59e0b" },
      otro: { label: "Otro", color: "#6b7280" },
    };

    const currentTag = tarea.tag || "otro";
    const tagInfo = tagsMap[currentTag] || tagsMap["otro"];

    /* card.innerHTML = `
    <div class="card-header">
        <span class="badge ${tarea.prioridad}">${tarea.prioridad.toUpperCase()}</span>
        <span class="badge-tag" style="background-color: ${tagInfo.color}20; color: ${tagInfo.color}; border: 1px solid ${tagInfo.color}">
            ${tagInfo.label}
        </span>
    </div>
    `;
*/
    const cardFooter = document.createElement("div");
    cardFooter.className = "card-footer";
    cardFooter.innerHTML = `
    <span class="badge ${tarea.prioridad}">Prioridad: ${tarea.prioridad.toUpperCase()}</span><br><br>
    <span>Etiqueta: </span><span class="badge-tag" style="background-color: ${tagInfo.color}20; color: ${tagInfo.color}; border: 1px solid ${tagInfo.color}"> 
        ${tagInfo.label}
    </span>
`;
    // --- 5. Botones ---
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Editar";
    btnEdit.className = "btn-edit";
    btnEdit.onclick = () => loadEdit(tarea.id);

    const btnDel = document.createElement("button");
    btnDel.textContent = "Eliminar";
    btnDel.className = "btn-delete";
    btnDel.onclick = () => deleteTask(tarea.id);

    actions.append(btnEdit, btnDel);

    // Armar tarjeta (El orden importa: Header visual > Título > Desc > Subtareas > Fecha > Botones)
    card.append(header, desc, subContainer, fecha, cardFooter, actions);
    dom.content.appendChild(card);
  });
}

// --- LÓGICA INTERNA ---

function saveTask() {
  const data = {
    titulo: document.getElementById("inputTitulo").value,
    descripcion: document.getElementById("inputDescripcion").value,
    prioridad: document.getElementById("prioridad").value,
    tag: document.getElementById("inputTag").value, // Guardar Tag
    subtareas: [...subtareasTemporales],
  };

  if (tareaEditandoId) {
    const t = tareas.find((x) => x.id === tareaEditandoId);
    Object.assign(t, data);
  } else {
    tareas.push({ id: Date.now(), completada: false, ...data });
  }

  TaskService.saveAll(tareas);
  closeModal();
  renderTasks();
}

function loadEdit(id) {
  const t = tareas.find((x) => x.id === id);
  if (!t) return;

  document.getElementById("inputTitulo").value = t.titulo;
  document.getElementById("inputDescripcion").value = t.descripcion;
  document.getElementById("prioridad").value = t.prioridad;

  // Cargar Tag si existe, si no default
  const tagSelect = document.getElementById("inputTag");
  if (tagSelect) tagSelect.value = t.tag || "otro";

  subtareasTemporales = t.subtareas ? [...t.subtareas] : [];

  renderSubTasksForm();
  tareaEditandoId = id;
  openModal();
}

function deleteTask(id) {
  if (confirm("¿Eliminar tarea?")) {
    tareas = tareas.filter((t) => t.id !== id);
    TaskService.saveAll(tareas);
    renderTasks();
  }
}

function toggleCompletada(id) {
  const t = tareas.find((x) => x.id === id);

  if (t) {
    t.completada = !t.completada;
    TaskService.saveAll(tareas);
    renderTasks();
  }
}

// Subtareas
function addSubtaskPrompt() {
  const txt = prompt("Escribe la subtarea:");
  if (txt && txt.trim()) {
    subtareasTemporales.push({ texto: txt, completada: false });
    renderSubTasksForm();
  }
}

function renderSubTasksForm() {
  dom.subList.innerHTML = "";
  subtareasTemporales.forEach((sub, i) => {
    const div = document.createElement("div");
    div.className = "subtarea-item-form";
    div.style.cssText =
      "display:flex; justify-content:space-between; margin-bottom:5px;";

    div.innerHTML = `<span>${sub.texto}</span>`;

    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.className = "btn-delete-mini";
    btn.onclick = () => {
      subtareasTemporales.splice(i, 1);
      renderSubTasksForm();
    };
    div.appendChild(btn);
    dom.subList.appendChild(div);
  });
}

function openModal() {
  if (dom.modal) dom.modal.classList.remove("hidden");
}
function closeModal() {
  dom.form.reset();
  subtareasTemporales = [];
  renderSubTasksForm();
  tareaEditandoId = null;
  if (dom.modal) dom.modal.classList.add("hidden");
}
