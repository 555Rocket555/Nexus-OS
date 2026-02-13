import { Utils } from "../utils.js";
import { ServicioNotas, Almacenamiento } from "../services/storage.js";

// Estado local
let estado = {
    notas: [],
    idSeleccionado: null,
    busqueda: "",
    etiquetaActiva: "Todas",
    modoVista: Almacenamiento.obtener("notes_view_mode") || "grid", // "list" | "grid"
    editorAbierto: false
};

export function iniciarNotas() {
    estado.notas = ServicioNotas.obtenerTodas();
    renderizarInterfaz();
}

function guardar() {
    // Guardamos en el servicio y actualizamos estado local si fuera necesario
    ServicioNotas.guardar(estado.notas); 
    // Nota: ServicioNotas.guardar suele esperar una nota individual en tu storage.js original,
    // pero aquí estamos guardando el array completo por simplicidad en la edición masiva.
    // Si tu storage.js espera 1 nota, usamos la linea de abajo. 
    // Si modificaste storage.js para usar 'guardarTodo', usa esa.
    // Para asegurar compatibilidad con tu storage.js original:
    Almacenamiento.guardar("quickNotes", estado.notas);
}

// Obtener tags únicos para los filtros
function obtenerEtiquetasUnicas() {
    const etiquetas = new Set();
    estado.notas.forEach((nota) => {
        if (nota.tags && Array.isArray(nota.tags)) {
            nota.tags.forEach((t) => etiquetas.add(t));
        }
    });
    return Array.from(etiquetas).sort();
}

function renderizarInterfaz() {
    const contenedor = document.getElementById("vista-notas");
    if (!contenedor) return;

    const esCuadricula = estado.modoVista === "grid";
    // Clase para controlar la animación CSS del sidebar
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
                    <input type="text" id="input-busqueda-notas" placeholder="Buscar en notas..." value="${estado.busqueda}">
                </div>

                <div class="tags-tabs-container" id="tabs-etiquetas"></div>

                <div class="notes-list ${estado.modoVista}" id="contenedor-lista-notas">
                    </div>
            </aside>

            <main class="note-editor-area" id="editor-nota">
                </main>
        </div>
    `;

    // Eventos Globales de la Interfaz
    document.getElementById("btn-crear-nota").addEventListener("click", crearNota);

    document.getElementById("btn-cambiar-vista").addEventListener("click", () => {
        estado.modoVista = estado.modoVista === "grid" ? "list" : "grid";
        Almacenamiento.guardar("notes_view_mode", estado.modoVista);
        // Re-renderizamos solo la interfaz para actualizar clases, manteniendo estado
        renderizarInterfaz();
        if (estado.editorAbierto) renderizarEditor();
    });

    const inputBusqueda = document.getElementById("input-busqueda-notas");
    inputBusqueda.addEventListener("input", (e) => {
        estado.busqueda = e.target.value.toLowerCase();
        renderizarLista();
    });
    // Restaurar foco si se estaba buscando
    if (estado.busqueda) {
        inputBusqueda.focus();
        // Mover cursor al final
        const val = inputBusqueda.value;
        inputBusqueda.value = '';
        inputBusqueda.value = val;
    }

    renderizarTabsEtiquetas();
    renderizarLista();

    if (estado.editorAbierto) {
        renderizarEditor();
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

    // Filtrado
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

    // Ordenar por fecha de actualización (más reciente primero)
    filtradas.sort((a, b) => new Date(b.updatedAt || b.id) - new Date(a.updatedAt || a.id));

    filtradas.forEach((nota) => {
        const tarjeta = document.createElement("div");
        tarjeta.className = `note-item-card ${estado.idSeleccionado === nota.id ? "active" : ""}`;

        // Generar HTML de etiquetas (máx 3)
        const htmlEtiquetas = (nota.tags || []).slice(0, 3).map(t => `<span class="mini-tag">#${t}</span>`).join('');
        
        // Preview de texto
        const textoPreview = (nota.content || "").substring(0, 60) + ((nota.content || "").length > 60 ? "..." : "");

        tarjeta.innerHTML = `
            <div class="card-content-click-area">
                <div class="card-header-row">
                    <div class="card-title">${Utils.escaparHTML(nota.title || "Sin título")}</div>
                     <div class="menu-container-card">
                        <button class="btn-card-menu">⋮</button>
                    </div>
                </div>
                <div class="card-preview">${Utils.escaparHTML(textoPreview)}</div>
                <div class="card-footer-row">
                    <div class="card-tags-preview">${htmlEtiquetas}</div>
                    <span class="card-date">${Utils.formatearFecha(nota.updatedAt || nota.id).split(',')[0]}</span>
                </div>
            </div>
            <div class="dropdown-menu card-dropdown" style="display:none;">
                <button class="menu-item btn-eliminar-desde-lista">🗑️ Eliminar</button>
            </div>
        `;

        // Click en la tarjeta para abrir editor (Área segura)
        tarjeta.querySelector(".card-content-click-area").addEventListener("click", () => {
            estado.editorAbierto = true;
            seleccionarNota(nota.id);
            // Forzar renderizado para aplicar animación de layout
            renderizarInterfaz(); 
        });

        // Lógica del botón de menú (3 puntos)
        const btnMenu = tarjeta.querySelector(".btn-card-menu");
        const dropdown = tarjeta.querySelector(".card-dropdown");
        const btnEliminar = tarjeta.querySelector(".btn-eliminar-desde-lista");

        btnMenu.addEventListener("click", (e) => {
            e.stopPropagation(); // Evitar abrir la nota
            // Cerrar otros menús primero
            document.querySelectorAll(".card-dropdown").forEach(d => d.style.display = "none");
            dropdown.style.display = "flex";
        });

        btnEliminar.addEventListener("click", (e) => {
            e.stopPropagation();
            if(confirm("¿Eliminar esta nota?")) {
                eliminarNota(nota.id);
            }
        });

        contenedorLista.appendChild(tarjeta);
    });
}

// Cerrar menús al hacer click fuera
document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-container-card")) {
        document.querySelectorAll(".card-dropdown").forEach(d => d.style.display = "none");
    }
});

function seleccionarNota(id) {
    estado.idSeleccionado = id;
    renderizarEditor();
}

function eliminarNota(id) {
    estado.notas = estado.notas.filter(n => n.id !== id);
    if (estado.idSeleccionado === id) {
        estado.idSeleccionado = null;
        estado.editorAbierto = false;
    }
    guardar();
    renderizarInterfaz();
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
    
    estado.editorAbierto = true; 
    estado.idSeleccionado = nuevaNota.id;
    
    renderizarInterfaz();
    
    // Enfocar título tras renderizado
    setTimeout(() => {
        const input = document.getElementById("input-titulo-editor");
        if(input) input.focus();
    }, 100);
}

function renderizarEditor() {
    const contenedor = document.getElementById("editor-nota");
    if (!contenedor) return;

    const nota = estado.notas.find((n) => n.id === estado.idSeleccionado);

    if (!nota) {
        // Si se borró la nota o no existe, cerrar editor
        if (estado.editorAbierto) {
            estado.editorAbierto = false;
            renderizarInterfaz();
        }
        return;
    }

    // Botones responsivos
    const btnCerrar = `<button class="btn-icon-soft" id="btn-cerrar-editor" title="Cerrar Editor">✕</button>`;
    
    contenedor.innerHTML = `
        <div class="editor-top-bar">
            ${btnCerrar}
            <span class="editor-date">
                Editado: ${Utils.formatearFecha(nota.updatedAt)}
            </span>
            <button class="btn-icon-soft text-danger" id="btn-eliminar-editor" title="Eliminar Nota">🗑</button>
        </div>

        <input type="text" id="input-titulo-editor" class="editor-title" placeholder="Título" value="${Utils.escaparHTML(nota.title)}">
        
        <textarea id="textarea-contenido" class="editor-content" placeholder="Escribe aquí...">${nota.content}</textarea>

        <div class="tags-input-area">
            <div class="tags-wrapper" id="lista-etiquetas-editor"></div>
            <input type="text" id="input-nueva-etiqueta" class="input-new-tag" placeholder="+ Añadir etiqueta (Enter)">
        </div>
    `;

    // Listeners Editor
    document.getElementById('btn-cerrar-editor').onclick = () => {
        estado.editorAbierto = false;
        renderizarInterfaz();
    };

    document.getElementById('btn-eliminar-editor').onclick = () => {
        if(confirm("¿Eliminar nota actual?")) {
            eliminarNota(nota.id);
        }
    };

    // Auto-guardado
    const inputTitulo = document.getElementById("input-titulo-editor");
    const areaContenido = document.getElementById("textarea-contenido");

    const autoGuardar = () => {
        nota.title = inputTitulo.value;
        nota.content = areaContenido.value;
        nota.updatedAt = new Date().toISOString();
        guardar();
        renderizarLista(); // Actualizar lista lateral en tiempo real
    };

    inputTitulo.addEventListener("input", autoGuardar);
    areaContenido.addEventListener("input", autoGuardar);

    // Renderizar Tags
    renderizarTagsEditor(nota);

    // Input Tags
    const inputTags = document.getElementById("input-nueva-etiqueta");
    inputTags.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const val = inputTags.value.trim();
            if (val) {
                agregarEtiquetaNota(nota, val);
                inputTags.value = "";
            }
        }
    });
}

function renderizarTagsEditor(nota) {
    const contenedor = document.getElementById("lista-etiquetas-editor");
    if(!contenedor) return;

    contenedor.innerHTML = (nota.tags || []).map(etiqueta => `
        <span class="tag-chip">
            #${etiqueta}
            <span class="tag-remove" data-tag="${etiqueta}">×</span>
        </span>
    `).join('');

    contenedor.querySelectorAll(".tag-remove").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const etiquetaAEliminar = e.target.dataset.tag;
            nota.tags = nota.tags.filter(t => t !== etiquetaAEliminar);
            guardar();
            renderizarTagsEditor(nota);
            renderizarLista(); // Actualizar mini tags en lista
        });
    });
}

function agregarEtiquetaNota(nota, etiqueta) {
    if (!nota.tags) nota.tags = [];
    if (!nota.tags.includes(etiqueta)) {
        nota.tags.push(etiqueta);
        guardar();
        renderizarTagsEditor(nota);
        renderizarLista();
        renderizarTabsEtiquetas(); // Actualizar filtros de arriba
    }
}

window.editarNotaDesdeTags = (id) => {
    document.querySelector('[data-target="seccion-notas"]').click();
    setTimeout(() => {
        estado.editorAbierto = true;
        seleccionarNota(id); // Esta función ya existe dentro de notes.js
        renderizarInterfaz();
    }, 100);
};