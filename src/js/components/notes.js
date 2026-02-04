import { Storage } from "../services/storage.js";

// Estado local
let state = {
  notes: [],
  selectedId: null,
  searchQuery: "",
  tagFilter: "",
};

export function initNotes() {
  state.notes = Storage.get("notes") || [];
  renderLayout();
}

function save() {
  Storage.set("notes", state.notes);
}

// Obtener todas las etiquetas únicas para el selector
function getAllUniqueTags() {
  const tags = new Set();
  state.notes.forEach((note) => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach((t) => tags.add(t));
    }
  });
  return Array.from(tags);
}

function renderLayout() {
  const container = document.getElementById("vistaNotas");
  if (!container) return;

  // Generar opciones del selector de filtro
  const uniqueTags = getAllUniqueTags();
  const optionsHTML = uniqueTags
    .map((tag) => `<option value="${tag}">${tag}</option>`)
    .join("");

  container.innerHTML = `
        <div class="notes-layout">
            <aside class="notes-sidebar">
                <div class="notes-header">
                    <h2>Notas</h2>
                    <button id="btn-create-note" class="btn-icon-soft" title="Nueva Nota">＋</button>
                </div>

                <div class="search-combo">
                    <input type="text" id="notes-search" placeholder="Buscar título...">
                    <select id="notes-filter-select">
                        <option value="">Todas</option>
                        ${optionsHTML}
                    </select>
                </div>

                <div class="notes-list" id="notes-list-container"></div>
            </aside>

            <main class="note-editor-area" id="note-editor">
                <div class="empty-editor">
                    <div style="font-size:3rem; opacity:0.3; margin-bottom:10px;">📝</div>
                    <p>Selecciona una nota para editar</p>
                </div>
            </main>
        </div>
    `;

  // Eventos Sidebar
  document
    .getElementById("btn-create-note")
    .addEventListener("click", createNote);

  document.getElementById("notes-search").addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderList();
  });

  document
    .getElementById("notes-filter-select")
    .addEventListener("change", (e) => {
      state.tagFilter = e.target.value;
      renderList();
    });

  renderList();
}

function renderList() {
  const listContainer = document.getElementById("notes-list-container");
  listContainer.innerHTML = "";

  // Filtrar por texto Y por etiqueta
  const filtered = state.notes.filter((n) => {
    const matchesText =
      (n.title || "").toLowerCase().includes(state.searchQuery) ||
      (n.content || "").toLowerCase().includes(state.searchQuery);

    const matchesTag =
      state.tagFilter === "" || (n.tags && n.tags.includes(state.tagFilter));

    return matchesText && matchesTag;
  });

  // Ordenar (Recientes primero)
  filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  filtered.forEach((note) => {
    const card = document.createElement("div");
    card.className = `note-item-card ${state.selectedId === note.id ? "active" : ""}`;

    // Renderizar etiquetas mini
    const tagsHTML = (note.tags || [])
      .map((t) => `<span class="mini-tag">#${t}</span>`)
      .join("");

    card.innerHTML = `
            <div class="card-title">${note.title || "Sin Título"}</div>
            <div class="card-preview">${note.content || "Texto vacío..."}</div>
            <div class="card-tags-preview">${tagsHTML}</div>
        `;

    card.addEventListener("click", () => {
      state.selectedId = note.id;
      renderList();
      renderEditor();
    });

    listContainer.appendChild(card);
  });
}

function createNote() {
  const newNote = {
    id: Date.now(),
    title: "",
    content: "",
    tags: [],
    updatedAt: new Date().toISOString(),
  };
  state.notes.unshift(newNote);
  save();
  state.selectedId = newNote.id;

  renderLayout();
  renderEditor();
}
function renderEditor() {
  const editor = document.getElementById("note-editor");
  const note = state.notes.find((n) => n.id === state.selectedId);

  if (!note) {
    editor.innerHTML = `
            <div class="empty-editor">
                <div style="font-size:3rem; opacity:0.3; margin-bottom:10px;">📝</div>
                <p>Selecciona o crea una nota</p>
            </div>`;
    return;
  }

  const dateStr = new Date(note.updatedAt).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  editor.innerHTML = `
        <div class="editor-top-bar">
            <span class="editor-date">${dateStr}</span>
            <div class="menu-container">
                <button id="btn-menu-dots" class="btn-menu-dots" title="Opciones">•••</button>
                <div id="dropdown-menu" class="dropdown-menu">
                    <button id="btn-delete-note" class="menu-item danger">Eliminar</button>
                </div>
            </div>
        </div>

        <input type="text" id="input-title" class="editor-title" placeholder="Título..." value="${note.title}">
        
        <textarea id="input-content" class="editor-content" placeholder="Escribe aquí...">${note.content}</textarea>

        <div class="tags-input-area">
            <small style="color:var(--text-muted); display:block; margin-bottom:5px;">Etiquetas (Máx 5) - Presiona Enter</small>
            <div class="tags-wrapper" id="tags-wrapper">
                <input type="text" id="input-tag-new" class="input-new-tag" placeholder="+ Añadir etiqueta">
            </div>
        </div>
    `;

  // --- LOGICA DE EVENTOS ---

  // 1. Abrir/Cerrar Menú (CORREGIDO)
  const btnMenu = document.getElementById("btn-menu-dots");
  const dropdown = document.getElementById("dropdown-menu");

  // Al hacer clic en los 3 puntos
  btnMenu.onclick = (e) => {
    e.stopPropagation();
    const isVisible = dropdown.classList.contains("show");

    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => m.classList.remove("show"));

    if (!isVisible) {
      dropdown.classList.add("show");
    }
  };

  // Cerrar menú al hacer clic en cualquier otro lado (Listener Global Único)
  window.onclick = (e) => {
    if (!e.target.closest(".menu-container")) {
      dropdown.classList.remove("show");
    }
  };

  // 2. Eliminar Nota
  document.getElementById("btn-delete-note").onclick = () => {
    if (confirm("¿Eliminar esta nota permanentemente?")) {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      save(); // Guardar cambios en localStorage
      state.selectedId = null; // Deseleccionar
      renderLayout(); // Recargar layout (cierra el editor y actualiza la lista)
    }
  };

  // 3. Auto-Guardado
  const titleInput = document.getElementById("input-title");
  const contentInput = document.getElementById("input-content");

  const autoSave = () => {
    note.title = titleInput.value;
    note.content = contentInput.value;
    note.updatedAt = new Date().toISOString();
    save();
    renderList();
  };

  titleInput.oninput = autoSave;
  contentInput.oninput = autoSave;

  // 4. Renderizar Etiquetas
  renderTags(note);
}
function renderTags(note) {
  const wrapper = document.getElementById("tags-wrapper");
  const input = document.getElementById("input-tag-new");

  // Limpiar chips existentes (dejar el input)

  const existingChips = wrapper.querySelectorAll(".tag-chip");
  existingChips.forEach((chip) => chip.remove());

  // Crear Chips
  (note.tags || []).forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.innerHTML = `${tag} <span class="tag-remove" data-tag="${tag}">×</span>`;

    // Evento borrar etiqueta
    chip.querySelector(".tag-remove").addEventListener("click", () => {
      note.tags = note.tags.filter((t) => t !== tag);
      save();
      renderTags(note); // Re-renderizar zona de tags
      renderList(); // Actualizar lista lateral
    });

    // Insertar antes del input
    wrapper.insertBefore(chip, input);
  });

  // Evento Añadir Etiqueta (Enter)

  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  newInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = newInput.value.trim().toLowerCase();

      if (val && !note.tags.includes(val)) {
        if (note.tags.length >= 5) {
          alert("Máximo 5 etiquetas por nota");
          return;
        }
        if (!note.tags) note.tags = [];
        note.tags.push(val);
        save();
        newInput.value = "";
        renderTags(note);
        renderList();
      }
    }
  });
}
