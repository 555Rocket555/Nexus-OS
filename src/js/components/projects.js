import { Utils } from "../utils.js";
import { Storage } from "../services/storage.js";

// Estado local
let proyectos = [];
let filtroEstadoActual = "all";
let etiquetasTemporales = [];
let seccionesTemporales = [];
let idProyectoEditando = null;
let vistaActual = localStorage.getItem("proj_view_mode") || "list";

export function iniciarProyectos() {
  // 1. Cargar datos
  proyectos = Storage.get("projects") || [];
  // 2. Renderizar estructura
  renderizarInterfaz();
  // 3. Renderizar contenido
  renderizarListaProyectos();
  actualizarKPIs();
  // 4. Activar eventos
  configurarListenersGlobales();
  configurarLogicaModal();
}

function guardar() {
  Storage.set("projects", proyectos);
  actualizarKPIs();
  renderizarListaProyectos();
}

function renderizarInterfaz() {
  const contenedor = document.getElementById("vista-proyectos") || document.getElementById("vistaProyectos");
  if (!contenedor) return;

  contenedor.innerHTML = `
        <div class="projects-layout">
            <div class="header-content">
                <div class="seccion-header">
                    <h1>Proyectos</h1>
                    <button class="btn-plus" id="btn-nuevo-proyecto">+ Nuevo Proyecto</button>
                </div>

            </div>

            <div class="proj-toolbar">
                <div class="toolbar-top" style="display:flex; justify-content:space-between; width:100%;">
                    <input type="text" id="input-busqueda-proyectos" class="search-proj" placeholder="Buscar proyecto..." style="flex:1;">
                    
                    <div class="view-toggles" style="margin-left:10px;">
                        <button class="btn-view" id="btn-vista-lista" title="Vista Lista">☰</button>
                        <button class="btn-view" id="btn-vista-cuadricula" title="Vista Cuadrícula">⊞</button>
                    </div>
                </div>

            </div>
            
            <div class="proj-kpi-grid">
                <div class="tab-btn active" data-filter="all"><div class="kpi-box kpi-total"><span class="kpi-title">Total</span><span class="kpi-value" id="val-total">0</span></div></div>
                <div class="tab-btn" data-filter="active"><div class="kpi-box kpi-active"><span class="kpi-title">Activos</span><span class="kpi-value purple" id="val-activos">0</span></div></div>
                <div class="tab-btn" data-filter="paused"><div class="kpi-box kpi-inactive"><span class="kpi-title">Pausados</span><span class="kpi-value" id="val-pausados">0</span></div></div>
                <div class="tab-btn" data-filter="completed"><div class="kpi-box kpi-completed"><span class="kpi-title">Completados</span><span class="kpi-value" style="color:var(--success)" id="val-completados">0</span></div></div>
            </div>

            <div class="projects-list-scroll" id="contenedor-proyectos">
            </div>
        </div>

        <div id="modal-nuevo-proyecto" class="form-card-container hidden">
            <div class="form-card">
                <h2 id="titulo-modal">Nuevo Proyecto</h2>
                <form id="form-proyecto">
                    
                    <div class="input-group">
                        <label>Nombre del Proyecto</label>
                        <input type="text" id="input-titulo-proyecto" required placeholder="Ej. Lanzamiento Web">
                    </div>
                    
                    <div class="input-group" style="margin-top:15px;">
                        <label>Descripción</label>
                        <textarea id="textarea-descripcion-proyecto" rows="2" placeholder="Objetivo principal..."></textarea>
                    </div>

                    <div class="modal-divider"></div>

                    <div class="input-group">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <label>Plan de Trabajo</label>
                            <button type="button" id="btn-agregar-seccion" class="btn-secondary" style="font-size:0.8rem; padding:5px 10px;">
                                + Añadir Grupo de Tareas
                            </button>
                        </div>
                        
                        <div class="sections-container" id="lista-secciones-modal">
                            </div>
                    </div>

                    <div class="modal-divider"></div>

                    <div class="input-group">
                        <label>Prioridad</label>
                        <select id="select-prioridad-proyecto">
                            <option value="baja">Baja ⚪</option>
                            <option value="media">Media 🔵</option>
                            <option value="alta">Alta 🔴</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label>Status Inicial</label>
                        <select id="select-estado-proyecto">
                            <option value="active">Activo 🚀</option>
                            <option value="paused">En Pausa ⏸</option>
                            <option value="completed">Completado ✅</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="btn-cancelar-modal" class="btn-secondary">Cancelar</button>
                        <button type="submit" id="btn-guardar-proyecto" class="btn-primary">Guardar Proyecto</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function actualizarKPIs() {
  const total = proyectos.length;
  const activos = proyectos.filter(p => p.status === 'active').length;
  const pausados = proyectos.filter(p => p.status === 'paused').length;
  const completados = proyectos.filter(p => p.status === 'completed').length;

  const safeText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

  safeText('val-total', total);
  safeText('val-activos', activos);
  safeText('val-pausados', pausados);
  safeText('val-completados', completados);
}

function renderizarListaProyectos() {
  const contenedor = document.getElementById("contenedor-proyectos");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const filtrados = proyectos.filter(p => {
    if (filtroEstadoActual === "all") return true;
    return p.status === filtroEstadoActual;
  });

  const busqueda = (document.getElementById("input-busqueda-proyectos")?.value || "").toLowerCase();
  const resultados = filtrados.filter(p => p.title.toLowerCase().includes(busqueda));

  if (resultados.length === 0) {
    contenedor.innerHTML = `<div class="empty-state">No hay proyectos en esta vista.</div>`;
    return;
  }

  // Clases CSS según vista
  // Asumimos que existen clases .proj-list-view y .proj-grid-view en CSS
  const claseContenedor = vistaActual === 'list' ? 'bg-list' : 'bg-grid';
  contenedor.className = `projects-list-scroll ${claseContenedor}`;

  resultados.forEach(proy => {
    const tarjeta = document.createElement("div");
    // Clase base: proj-card-list o proj-card-grid
    const claseTarjeta = vistaActual === 'list' ? 'proj-card-list' : 'proj-card-grid';
    tarjeta.className = claseTarjeta;

    // Cálculo de progreso
    const totalTareas = proy.stats?.totalTasks || 0;
    const tareasCompletadas = proy.stats?.completedTasks || 0;
    const porcentaje = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

    tarjeta.innerHTML = `
        <div class="proj-card-content" onclick="window.editarProyecto('${proy.id}')">
            <div class="proj-header">
                <h3>${Utils.escaparHTML(proy.title)}</h3>
                <span class="status-badge ${proy.status}">${proy.status}</span>
            </div>
            <p class="proj-desc">${Utils.escaparHTML(proy.description || "")}</p>
            
            <div class="proj-meta">
                <div class="progress-bar-mini">
                    <div class="fill" style="width:${porcentaje}%"></div>
                </div>
                <span class="progress-text">${porcentaje}% (${tareasCompletadas}/${totalTareas})</span>
                <span class="priority-dot ${proy.priority}" title="Prioridad ${proy.priority}"></span>
            </div>
        </div>
        <div class="proj-actions">
           <button onclick="window.eliminarProyecto('${proy.id}')" class="btn-icon-soft text-danger" title="Eliminar">🗑️</button>
        </div>
    `;
    contenedor.appendChild(tarjeta);
  });
}

function configurarListenersGlobales() {
  // Busqueda
  const inputBusqueda = document.getElementById("input-busqueda-proyectos");
  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", renderizarListaProyectos);
  }

  // Filtros Tabs
  const tabs = document.querySelectorAll(".proj-kpi-grid .tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".proj-kpi-grid .tab-btn.active")?.classList.remove("active");
      tab.classList.add("active");
      filtroEstadoActual = tab.dataset.filter;
      renderizarListaProyectos();
    });
  });

  // Toggle Vistas
  document.getElementById("btn-vista-lista")?.addEventListener("click", () => {
    vistaActual = "list";
    localStorage.setItem("proj_view_mode", "list");
    renderizarListaProyectos();
  });

  document.getElementById("btn-vista-cuadricula")?.addEventListener("click", () => {
    vistaActual = "grid";
    localStorage.setItem("proj_view_mode", "grid");
    renderizarListaProyectos();
  });

  // Modal
  const modal = document.getElementById("modal-nuevo-proyecto");
  const btnNuevo = document.getElementById("btn-nuevo-proyecto");
  const btnCancelar = document.getElementById("btn-cancelar-modal");

  if (btnNuevo) {
    btnNuevo.addEventListener("click", () => {
      abrirModal();
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Funciones Globales
  window.editarProyecto = (id) => {
    const proyecto = proyectos.find(p => p.id === id);
    if (proyecto) abrirModal(proyecto);
  };

  window.eliminarProyecto = (id) => {
    if (confirm('¿Seguro que deseas eliminar este proyecto y todas sus tareas?')) {
      proyectos = proyectos.filter(p => p.id !== id);
      guardar();
    }
  }
}

function abrirModal(proyectoEditar = null) {
  const modal = document.getElementById("modal-nuevo-proyecto");
  const form = document.getElementById("form-proyecto");
  const titulo = document.getElementById("titulo-modal");

  if (!modal) return;

  form.reset();
  seccionesTemporales = []; // Reset secciones

  // Limpiar contenedor de secciones
  const contenedorSecciones = document.getElementById("lista-secciones-modal");
  if (contenedorSecciones) contenedorSecciones.innerHTML = "";


  if (proyectoEditar) {
    idProyectoEditando = proyectoEditar.id;
    titulo.innerText = "Editar Proyecto";
    document.getElementById("input-titulo-proyecto").value = proyectoEditar.title;
    document.getElementById("textarea-descripcion-proyecto").value = proyectoEditar.description || "";
    document.getElementById("select-prioridad-proyecto").value = proyectoEditar.priority || "media";
    document.getElementById("select-estado-proyecto").value = proyectoEditar.status || "active";

    // Cargar secciones existentes (si hubiera lógica compleja)
    // Por simplicidad, no cargamos las secciones en detalle aquí para edición completa, 
    // pero si existieran, se deberían renderizar.
  } else {
    idProyectoEditando = null;
    titulo.innerText = "Nuevo Proyecto";
    document.getElementById("select-estado-proyecto").value = "active";
  }

  modal.classList.remove("hidden");
}

function configurarLogicaModal() {
  const form = document.getElementById("form-proyecto");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const datos = {
        title: document.getElementById("input-titulo-proyecto").value,
        description: document.getElementById("textarea-descripcion-proyecto").value,
        priority: document.getElementById("select-prioridad-proyecto").value,
        status: document.getElementById("select-estado-proyecto").value,
        updatedAt: new Date().toISOString()
      };

      if (idProyectoEditando) {
        // Editar
        const index = proyectos.findIndex(p => p.id === idProyectoEditando);
        if (index !== -1) {
          proyectos[index] = { ...proyectos[index], ...datos };
        }
      } else {
        // Crear
        const nuevoProyecto = {
          id: Utils.generarId(),
          ...datos,
          createdAt: new Date().toISOString(),
          stats: { totalTasks: 0, completedTasks: 0 },
          secciones: [] // Las secciones se añadirían aquí si implementamos la UI completa
        };
        proyectos.push(nuevoProyecto);
      }

      guardar();
      document.getElementById("modal-nuevo-proyecto").classList.add("hidden");
    });
  }
}
