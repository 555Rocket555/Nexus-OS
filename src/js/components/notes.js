import { Utils } from "../utils.js";
import { Storage } from "../services/storage.js";
// TagHub deleted

// Estado local
let estado = {
  notas: [],
  idSeleccionado: null,
  busqueda: "",
  etiquetaActiva: "Todas",
  modoVista: Storage.get("notes_view_mode") || "grid", // "list" | "grid"
  editorAbierto: false
};

export function iniciarNotas() {
  estado.notas = Storage.get("notes") || [];
  renderizarInterfaz();
}

function guardar() {
  Storage.set("notes", estado.notas);
}

// Obtener tags únicos
function obtenerEtiquetasUnicas() {
  const etiquetas = new Set();
  estado.notas.forEach((nota) => {
    nota.tags?.forEach((t) => etiquetas.add(t));
  });
  return Array.from(etiquetas).sort();
}

function renderizarInterfaz() {
  // Nota: El ID del contenedor principal en index.html debe coincidir.
  // Se actualizará index.html a 'vista-notas' en el siguiente paso.
  const contenedor = document.getElementById("vistaNotas") || document.getElementById("vista-notas");
  if (!contenedor) return;

  const esCuadricula = estado.modoVista === "grid";
  // Si el editor está abierto, forzamos la vista sidebar, sino usamos la preferencia
  const claseEditor = estado.editorAbierto ? "editor-open" : "editor-closed";

  contenedor.innerHTML = `
        <div class="notes-layout ${claseEditor}">
            <aside class="notes-sidebar">
                <div class="notes-header">
                    <h2>Notas</h2>
                    <div class="notes-actions">
                        <button id="btn-cambiar-vista" class="btn-icon-soft" title="Cambiar Vista">
                            ${esCuadricula ? "≣" : "☷"}
                        </button>
                        <button id="btn-crear-nota" class="btn-icon-soft" title="Nueva Nota">＋</button>
                    </div>
                </div>

                <div class="search-bar-container">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="input-busqueda-notas" placeholder="Buscar en notas...">
                </div>

                <!-- Tabs de Etiquetas -->
                <div class="tags-tabs-container" id="tabs-etiquetas"></div>

                <div class="notes-list ${estado.modoVista}" id="contenedor-lista-notas">
                    <!-- Lista de notas -->
                </div>
            </aside>

            <main class="note-editor-area" id="editor-nota">
                <!-- Editor dinámico -->
            </main>
        </div>
    `;

  // Eventos
  document.getElementById("btn-crear-nota").addEventListener("click", crearNota);

  document.getElementById("btn-cambiar-vista").addEventListener("click", () => {
    // Toggle
    estado.modoVista = estado.modoVista === "grid" ? "list" : "grid";
    Storage.set("notes_view_mode", estado.modoVista);
    renderizarInterfaz();
    // Si el editor está abierto, mantenerlo abierto
    if (estado.editorAbierto) renderizarEditor();
  });

  document.getElementById("input-busqueda-notas").addEventListener("input", (e) => {
    estado.busqueda = e.target.value.toLowerCase();
    renderizarLista();
  });

  renderizarTabsEtiquetas();
  renderizarLista();

  if (estado.editorAbierto) {
    renderizarEditor();
  } else {
    document.getElementById("editor-nota").innerHTML = ""; // Limpiar si cerrado
  }
}

function renderizarTabsEtiquetas() {
  const contenedor = document.getElementById('tabs-etiquetas');
  if (!contenedor) return;

  const etiquetasUnicas = obtenerEtiquetasUnicas();
  const todasEtiquetas = ["Todas", ...etiquetasUnicas];

  contenedor.innerHTML = todasEtiquetas.map(etiqueta => `
        <button class="tag-tab ${estado.etiquetaActiva === etiqueta ? 'active' : ''}" 
                data-tag="${etiqueta}">
            ${etiqueta === 'Todas' ? '📂' : '#'} ${etiqueta}
        </button>
    `).join('');

  contenedor.querySelectorAll('.tag-tab').forEach(btn => {
    btn.onclick = () => {
      estado.etiquetaActiva = btn.dataset.tag;
      renderizarTabsEtiquetas();
      renderizarLista();
    };
  });
}

function renderizarLista() {
  const contenedorLista = document.getElementById("contenedor-lista-notas");
  if (!contenedorLista) return;
  contenedorLista.innerHTML = "";

  // Actualizar clases de vista
  contenedorLista.className = `notes-list ${estado.modoVista}`;

  const filtradas = estado.notas.filter((n) => {
    const coincideTexto =
      (n.title || "").toLowerCase().includes(estado.busqueda) ||
      (n.content || "").toLowerCase().includes(estado.busqueda);
    const coincideEtiqueta = estado.etiquetaActiva === "Todas" || (n.tags && n.tags.includes(estado.etiquetaActiva));
    return coincideTexto && coincideEtiqueta;
  });

  if (filtradas.length === 0) {
    contenedorLista.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); width:100%;">No se encontraron notas</div>`;
    return;
  }

  filtradas.sort((a, b) => new Date(b.updatedAt || b.id) - new Date(a.updatedAt || a.id));

  filtradas.forEach((nota) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = `note-item-card ${estado.idSeleccionado === nota.id ? "active" : ""}`;

    const htmlEtiquetas = (nota.tags || []).slice(0, 3).map(t => `<span class="mini-tag">#${t}</span>`).join('');

    // Contenido condicional para Grid vs List
    // En Grid queremos ver más preview
    const longitudPreview = estado.modoVista === 'grid' && !estado.editorAbierto ? 100 : 50;
    const vistaPreviaContenido = (nota.content || "").substring(0, longitudPreview) + "...";

    tarjeta.innerHTML = `
            <div class="card-title">${Utils.escaparHTML(nota.title || "Sin título")}</div>
            <div class="card-preview">${Utils.escaparHTML(vistaPreviaContenido)}</div>
            <div class="card-tags-preview">${htmlEtiquetas}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:auto; text-align:right;">
                ${Utils.formatearFecha(nota.updatedAt || nota.id).split(',')[0]}
            </div>
        `;

    tarjeta.addEventListener("click", () => {
      estado.editorAbierto = true;
      seleccionarNota(nota.id);
      renderizarInterfaz(); // Re-render para aplicar layout abierto
      // Mobile scroll
      if (window.innerWidth <= 768) {
        document.getElementById('editor-nota').classList.add('mobile-visible');
      }
    });
    contenedorLista.appendChild(tarjeta);
  });
}

function seleccionarNota(id) {
  estado.idSeleccionado = id;
  renderizarEditor();
}

function crearNota() {
  const nuevaNota = {
    id: Utils.generarId(),
    title: "",
    content: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (estado.etiquetaActiva !== "Todas") nuevaNota.tags.push(estado.etiquetaActiva);

  estado.notas.unshift(nuevaNota);
  guardar();
  estado.editorAbierto = true; // Abrir editor al crear
  estado.idSeleccionado = nuevaNota.id;
  renderizarInterfaz();
  setTimeout(() => document.getElementById("input-titulo-editor")?.focus(), 100);
}

function renderizarEditor() {
  const contenedor = document.getElementById("editor-nota");
  if (!contenedor) return;

  const nota = estado.notas.find((n) => n.id === estado.idSeleccionado);

  if (!nota) {
    if (estado.editorAbierto) {
      estado.editorAbierto = false;
      renderizarInterfaz();
    }
    return;
  }

  // Lógica Botón Cerrar
  const btnCerrar = `<button class="btn-icon-soft" id="btn-cerrar-editor" title="Cerrar Editor" style="background:var(--bg-input); color:var(--text-main);">✕</button>`;
  const btnVolver = window.innerWidth <= 768 ?
    `<button class="btn-icon-soft" id="btn-volver-lista" style="margin-right:auto;">←</button>` : btnCerrar;

  contenedor.innerHTML = `
        <div class="editor-top-bar">
            ${window.innerWidth <= 768 ? btnVolver : ''}
            ${window.innerWidth > 768 ? btnVolver : ''} <!-- Desktop Close Btn -->
            
            <span class="editor-date" style="margin-right:auto; margin-left:10px;">
                ${Utils.formatearFecha(nota.updatedAt)}
            </span>
            
            <div class="menu-container">
                <button class="btn-menu-dots" id="btn-menu-nota">⋮</button>
                <div class="dropdown-menu" id="dropdown-nota">
                    <button class="menu-item" id="btn-eliminar-nota">🗑️ Eliminar</button>
                </div>
            </div>
        </div>

        <input type="text" id="input-titulo-editor" class="editor-title" placeholder="Título" value="${Utils.escaparHTML(nota.title)}">
        
        <textarea id="textarea-contenido" class="editor-content" placeholder="Escribe...">${nota.content}</textarea>

        <div class="tags-input-area">
            <div class="tags-wrapper" id="lista-etiquetas-editor"></div>
            <div style="position:relative; margin-top:10px;">
                 <input type="text" id="input-nueva-etiqueta" class="input-new-tag" placeholder="+ Añadir etiqueta (Enter hace match)">
                 <div id="sugerencias-etiquetas" class="dropdown-menu" style="width:100%; top:100%;"></div>
            </div>
        </div>
    `;

  // Listeners Cerrar / Volver
  const domBtnCerrar = document.getElementById('btn-cerrar-editor');
  if (domBtnCerrar) {
    domBtnCerrar.onclick = () => {
      estado.editorAbierto = false;
      renderizarInterfaz();
    };
  }

  const domBtnVolver = document.getElementById('btn-volver-lista');
  if (domBtnVolver) {
    domBtnVolver.onclick = () => {
      document.getElementById('editor-nota').classList.remove('mobile-visible');
    }
  }

  // Auto-guardado listeners
  const inputTitulo = document.getElementById("input-titulo-editor");
  const areaContenido = document.getElementById("textarea-contenido");

  const autoGuardar = () => {
    nota.title = inputTitulo.value;
    nota.content = areaContenido.value;
    nota.updatedAt = new Date().toISOString();
    guardar();
    renderizarLista();
  };

  inputTitulo.addEventListener("input", autoGuardar);
  areaContenido.addEventListener("input", autoGuardar);

  // Menú dropdown
  const btnMenu = document.getElementById("btn-menu-nota");
  const dropdown = document.getElementById("dropdown-nota");

  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });

  document.addEventListener("click", () => dropdown.classList.remove("show"));

  document.getElementById("btn-eliminar-nota").addEventListener("click", () => {
    if (confirm("¿Eliminar?")) {
      estado.notas = estado.notas.filter(n => n.id !== nota.id);
      guardar();
      estado.idSeleccionado = null;
      estado.editorAbierto = false;
      renderizarInterfaz();
    }
  });

  // Lógica Etiquetas
  renderizarEtiquetasEditor(nota);
  configurarInputEtiquetas(nota);
}

function renderizarEtiquetasEditor(nota) {
  const contenedor = document.getElementById("lista-etiquetas-editor");
  contenedor.innerHTML = nota.tags.map(etiqueta => `
        <span class="tag-chip" style="cursor:default;" title="Etiqueta: ${etiqueta}">
            #${etiqueta}
            <span class="tag-remove" data-tag="${etiqueta}">×</span>
        </span>
    `).join('');

  contenedor.querySelectorAll(".tag-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const etiquetaAEliminar = e.target.dataset.tag;
      nota.tags = nota.tags.filter(t => t !== etiquetaAEliminar);
      guardar();
      renderizarEtiquetasEditor(nota);
      renderizarLista();
    });
  });
}

function configurarInputEtiquetas(nota) {
  const input = document.getElementById("input-nueva-etiqueta");
  const cajaSugerencias = document.getElementById("sugerencias-etiquetas");

  // Solo escuchar Enter para agregar tag directo
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        agregarEtiquetaNota(nota, val);
        input.value = "";
        if (cajaSugerencias) cajaSugerencias.classList.remove("show");
      }
    }
  });
}

function agregarEtiquetaNota(nota, etiqueta) {
  if (!nota.tags) nota.tags = [];
  if (!nota.tags.includes(etiqueta)) {
    nota.tags.push(etiqueta);
    guardar();
    renderizarEtiquetasEditor(nota);
    renderizarLista();
    renderizarTabsEtiquetas();
  }
}

// TagHub removed
