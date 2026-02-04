import { Storage } from "../services/storage.js";

// Estado local
let projects = [];
let currentFilterStatus = "all";
let tempTags = [];
let tempSections = [];
let editingProjectId = null;
let currentView = localStorage.getItem("proj_view_mode") || "list";

export function initProjects() {
  // 1. Cargar datos
  projects = Storage.get("projects") || [];
  // 2. Renderizar estructura
  renderLayout();
  // 3. Renderizar contenido
  renderProjectList();
  updateKPIs();
  // 4. Activar eventos
  setupGlobalListeners();
  setupModalLogic();
}

function save() {
  Storage.set("projects", projects);
  updateKPIs();
  renderProjectList();
}

function renderLayout() {
  const container = document.getElementById("vistaProyectos");
  if (!container) return;

  container.innerHTML = `
        <div class="projects-layout">
            <div class="header-content">
                <div class="seccion-header">
                    <h1>Proyectos</h1>
                    <button class="btn-primary" id="btnOpenModal">+ Nuevo Proyecto</button>
                </div>

            </div>

            <div class="proj-toolbar">
                <div class="toolbar-top" style="display:flex; justify-content:space-between; width:100%;">
                    <input type="text" id="search-proj" class="search-proj" placeholder="Buscar proyecto..." style="flex:1;">
                    
                    <div class="view-toggles" style="margin-left:10px;">
                        <button class="btn-view" id="btnViewList" title="Vista Lista">☰</button>
                        <button class="btn-view" id="btnViewGrid" title="Vista Cuadrícula">⊞</button>
                    </div>
                    </div>

            </div>
            
            <div class="proj-kpi-grid">
                <div class="tab-btn active" data-filter="all"><div class="kpi-box kpi-total"><span class="kpi-title">Total</span><span class="kpi-value" id="val-total">0</span></div></div>
                <div class="tab-btn" data-filter="active"><div class="kpi-box kpi-active"><span class="kpi-title">Activos</span><span class="kpi-value purple" id="val-active">0</span></div></div>
                <div class="tab-btn" data-filter="paused"><div class="kpi-box kpi-inactive"><span class="kpi-title">Pausados</span><span class="kpi-value" id="val-paused">0</span></div></div>
                <div class="tab-btn" data-filter="completed"><div class="kpi-box kpi-completed"><span class="kpi-title">Completados</span><span class="kpi-value" style="color:var(--success)" id="val-completed">0</span></div></div>
            </div>

            <div class="projects-list-scroll" id="projects-container">
            </div>
        </div>

        <div id="modal-new-project" class="form-card-container hidden">
            <div class="form-card">
                <h2 id="modal-title">Nuevo Proyecto</h2>
                <form id="form-project">
                    
                    <div class="input-group">
                        <label>Nombre del Proyecto</label>
                        <input type="text" id="in-title" required placeholder="Ej. Lanzamiento Web">
                    </div>
                    
                    <div class="input-group" style="margin-top:15px;">
                        <label>Descripción</label>
                        <textarea id="in-desc" rows="2" placeholder="Objetivo principal..."></textarea>
                    </div>

                    <div class="modal-divider"></div>

                    <div class="input-group">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <label>Plan de Trabajo</label>
                            <button type="button" id="btn-add-section" class="btn-secondary" style="font-size:0.8rem; padding:5px 10px;">
                                + Añadir Grupo de Tareas
                            </button>
                        </div>
                        
                        <div class="sections-container" id="modal-sections-list">
                            </div>
                    </div>

                    <div class="modal-divider"></div>

                    <div class="input-group">
                        <label>Prioridad</label>
                        <div class="priority-selector" id="prio-selector">
                            <div class="prio-option bg-red" data-val="high" title="Alta"></div>
                            <div class="prio-option bg-yellow selected" data-val="medium" title="Media"></div>
                            <div class="prio-option bg-green" data-val="low" title="Baja"></div>
                        </div>
                        <input type="hidden" id="in-priority" value="medium">
                    </div>
                    <br>

                    <div class="modal-grid-2">
                        <div class="input-group">
                            <label>Fecha Inicio</label>
                            <input type="date" id="in-start" required>
                        </div>
                        <div class="input-group">
                            <label>Fecha Límite</label>
                            <input type="date" id="in-end" required>
                        </div>
                    </div>

                    <div class="input-group" style="margin-top:15px;">
                        <label>Etiquetas</label>
                        <div class="tags-input-container" id="modal-tags-container">
                            <input type="text" id="in-tag-ghost" class="tag-input-ghost" placeholder="Escribe y Enter...">
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top:30px;">
                        <button type="button" id="btn-cancel-modal" class="btn-secondary">Cancelar</button>
                        <button type="submit" class="btn-primary" id="btn-save-project">Guardar Proyecto</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderProjectList() {
  const container = document.getElementById("projects-container");
  const searchInput = document.getElementById("search-proj");
  const search = searchInput ? searchInput.value.toLowerCase() : "";

  // Aplicar clase GRID si corresponde
  container.className = `projects-list-scroll projects-container ${currentView === "grid" ? "grid-view" : ""}`;

  container.innerHTML = "";

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(search)));

    const matchesStatus =
      currentFilterStatus === "all" ? true : p.status === currentFilterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); width:100%;">No hay proyectos aquí.</div>`;
    return;
  }

  filtered.forEach((p) => {
    // Calcular Progreso
    let totalTasks = 0;
    let doneTasks = 0;
    let tasksHTML = "";

    if (p.sections && Array.isArray(p.sections)) {
      p.sections.forEach((sec, secIdx) => {
        totalTasks += sec.tasks.length;
        doneTasks += sec.tasks.filter((t) => t.done).length;

        if (sec.tasks.length > 0) {
          tasksHTML += `
                        <div style="margin-top:12px;">
                            <div style="font-size:0.75rem; font-weight:700; color:var(--primary); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">${sec.title}</div>
                            ${sec.tasks
                              .map(
                                (task, taskIdx) => `
                                <div class="pc-subtask-item ${task.done ? "completed" : ""}">
                                    <input type="checkbox" ${task.done ? "checked" : ""} 
                                        onchange="window.toggleSectionTask(${p.id}, ${secIdx}, ${taskIdx})">
                                    <span>${task.text}</span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        }
      });
    } else if (p.subtasks) {
      // Legacy
      totalTasks = p.subtasks.length;
      doneTasks = p.subtasks.filter((t) => t.done).length;
      tasksHTML = p.subtasks
        .map(
          (task, idx) => `
                <div class="pc-subtask-item ${task.done ? "completed" : ""}">
                    <input type="checkbox" ${task.done ? "checked" : ""} 
                        onchange="window.toggleSubtask(${p.id}, ${idx})">
                    <span>${task.text}</span>
                </div>
            `,
        )
        .join("");
    }

    const progress =
      totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    const isFinished = progress === 100 || p.status === "completed";
    const cardClass = isFinished ? "project-card is-finished" : "project-card";

    let statusLabel = "En curso";
    if (p.status === "paused") statusLabel = "Pausado";
    if (isFinished) statusLabel = "Finalizado";

    const footerHTML = isFinished
      ? `<div class="finished-message" style="margin-top:auto;">✨ ¡Proyecto Completado!</div>`
      : `<div class="pc-progress" style="margin-top:auto;">
                 <div class="pc-progress-text"><span>Progreso</span><span>${progress}%</span></div>
                 <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
               </div>`;

    const card = document.createElement("div");
    card.className = cardClass;
    // Estructura adaptada para grid (flex column)
    card.innerHTML = `
            <div style="flex:1;">
                <div class="pc-header">
                    <div class="pc-title-area">
                        <h3>${p.title}</h3>
                        <p class="pc-desc">${p.desc || ""}</p>
                    </div>
                    <div class="pc-actions">
                        <button class="status-badge st-${p.status}" onclick="${isFinished ? "" : `window.toggleProjectStatus(${p.id})`}">${statusLabel}</button>
                        <div style="position:relative;">
                            <button class="btn-dots" onclick="window.toggleMenu(${p.id})">•••</button>
                            <div id="menu-${p.id}" class="dropdown-menu" style="display:none; position:absolute; right:0; top:30px; background:var(--bg-card); border:1px solid var(--border-color); padding:5px; border-radius:8px; z-index:100; min-width:120px; box-shadow:var(--shadow);">
                                <button class="menu-item" onclick="window.editProject(${p.id})">✏️ Editar</button>
                                <button class="menu-item" style="color:var(--danger)" onclick="window.deleteProject(${p.id})">🗑 Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pc-info-grid">
                    <div class="info-item"><label>Fechas</label><span>${formatDate(p.startDate)} - ${formatDate(p.endDate)}</span></div>
                    <div class="info-item">
                        <label>Etiquetas</label>
                        <div style="display:flex; gap:5px; flex-wrap:wrap;">
                            ${(p.tags || []).map((t) => `<span class="mini-tag">#${t}</span>`).join("")}
                        </div>
                    </div>
                </div>

                <div class="pc-subtasks-list" style="margin-bottom:15px;">
                    ${tasksHTML}
                </div>
            </div>

            ${footerHTML}
        `;
    container.appendChild(card);
  });
}

function updateKPIs() {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;
  const paused = projects.filter((p) => p.status === "paused").length;
  const completed = projects.filter(
    (p) => p.status === "completed" || isProjectFinished(p),
  ).length;

  const displayActive = Math.max(
    0,
    active -
      projects.filter((p) => p.status === "active" && isProjectFinished(p))
        .length,
  );

  document.getElementById("val-total").textContent = total;
  document.getElementById("val-active").textContent = displayActive;
  document.getElementById("val-paused").textContent = paused;
  document.getElementById("val-completed").textContent = completed;
}

function isProjectFinished(p) {
  if (p.sections) {
    let total = 0,
      done = 0;
    p.sections.forEach((s) => {
      total += s.tasks.length;
      done += s.tasks.filter((t) => t.done).length;
    });
    return total > 0 && total === done;
  }
  if (p.subtasks && p.subtasks.length > 0)
    return p.subtasks.every((s) => s.done);
  return false;
}

// --- LOGICA MODAL ---
function setupModalLogic() {
  const modal = document.getElementById("modal-new-project");
  const form = document.getElementById("form-project");

  // Variables para el Drag & Drop
  let draggedItemIndex = null;
  let draggedSectionIndex = null;

  const renderSections = () => {
    const list = document.getElementById("modal-sections-list");
    if (!list) return;
    list.innerHTML = "";

    if (tempSections.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:10px;">Añade un grupo de tareas para comenzar.</div>`;
      return;
    }

    tempSections.forEach((sec, sIdx) => {
      const block = document.createElement("div");
      block.className = "proj-section-block";

      // Renderizar Tareas con Drag & Drop
      const tasksHTML = sec.tasks
        .map(
          (t, tIdx) => `
        <div class="task-input-row" 
             draggable="true" 
             ondragstart="window.dragStart(${sIdx}, ${tIdx})" 
             ondragover="window.dragOver(event)" 
             ondrop="window.dropTask(${sIdx}, ${tIdx})">
            
            <span class="drag-handle" title="Arrastrar para ordenar">⋮</span>
            
            <input type="text" class="task-input-real" value="${t.text}" 
                   placeholder="Escribe una tarea..." 
                   onchange="window.updateTempTaskText(${sIdx}, ${tIdx}, this.value)">
            
            <button type="button" class="btn-icon-delete" 
                    onclick="window.removeTempTask(${sIdx}, ${tIdx})" title="Eliminar tarea">×</button>
        </div>
      `,
        )
        .join("");

      block.innerHTML = `
        <div class="section-header-row">
            <input type="text" class="input-section-title" value="${sec.title}" 
                   placeholder="Nombre del Grupo (ej. Fase 1)" 
                   onchange="window.updateTempSectionTitle(${sIdx}, this.value)">
            <button type="button" class="btn-icon-delete" onclick="window.removeTempSection(${sIdx})" title="Eliminar grupo">🗑</button>
        </div>
        <div class="section-tasks-list">
            ${tasksHTML}
        </div>
        <button type="button" class="btn-mini-add" onclick="window.addTempTask(${sIdx})">+ Añadir Tarea</button>
      `;
      list.appendChild(block);
    });
  };

  // --- FUNCIONES GLOBALES (Expuestas para HTML en string) ---

  window.renderModalSectionsGlobal = renderSections;

  // Actualizar datos al escribir
  window.updateTempSectionTitle = (idx, val) => {
    tempSections[idx].title = val;
  };
  window.updateTempTaskText = (sIdx, tIdx, val) => {
    tempSections[sIdx].tasks[tIdx].text = val;
  };

  // ABM Tareas
  window.addTempTask = (sIdx) => {
    tempSections[sIdx].tasks.push({ text: "", done: false });
    renderSections();
  };
  window.removeTempTask = (sIdx, tIdx) => {
    tempSections[sIdx].tasks.splice(tIdx, 1);
    renderSections();
  };
  window.removeTempSection = (sIdx) => {
    if (confirm("¿Eliminar este grupo de tareas?")) {
      tempSections.splice(sIdx, 1);
      renderSections();
    }
  };

  // --- LOGICA DRAG AND DROP ---
  window.dragStart = (sIdx, tIdx) => {
    draggedSectionIndex = sIdx;
    draggedItemIndex = tIdx;
  };

  window.dragOver = (e) => {
    e.preventDefault(); // Necesario para permitir el drop
  };

  window.dropTask = (targetSectionIdx, targetTaskIdx) => {
    // Solo permitir reordenar dentro de la misma sección para evitar caos
    if (draggedSectionIndex === targetSectionIdx && draggedItemIndex !== null) {
      // Sacar el elemento arrastrado
      const itemToMove = tempSections[draggedSectionIndex].tasks.splice(
        draggedItemIndex,
        1,
      )[0];

      // Insertarlo en la nueva posición
      tempSections[targetSectionIdx].tasks.splice(targetTaskIdx, 0, itemToMove);

      // Limpiar y repintar
      draggedItemIndex = null;
      draggedSectionIndex = null;
      renderSections();
    }
  };

  // --- EVENTOS DEL MODAL ---
  document.getElementById("btnOpenModal").onclick = () => {
    editingProjectId = null;
    document.getElementById("modal-title").textContent = "Nuevo Proyecto";
    form.reset();
    tempTags = [];
    tempSections = [{ title: "Fase 1", tasks: [{ text: "", done: false }] }];

    // Fechas default
    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("in-start").value = hoy;

    renderModalSectionsGlobal();
    renderModalTags();
    modal.classList.remove("hidden");
  };

  document.getElementById("btn-cancel-modal").onclick = () =>
    modal.classList.add("hidden");

  document.getElementById("btn-add-section").onclick = () => {
    tempSections.push({ title: "", tasks: [{ text: "", done: false }] });
    renderSections();
  };

  // Prioridad y Tags (Sin cambios)
  const prioOptions = document.querySelectorAll(".prio-option");
  prioOptions.forEach((opt) => {
    opt.onclick = () => {
      prioOptions.forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      document.getElementById("in-priority").value = opt.dataset.val;
    };
  });

  const tagInput = document.getElementById("in-tag-ghost");
  tagInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.value.trim();
      if (val && !tempTags.includes(val)) {
        tempTags.push(val);
        renderModalTags();
        tagInput.value = "";
      }
    }
  };

  // Submit del Formulario
  form.onsubmit = (e) => {
    e.preventDefault();

    const finalSections = tempSections.filter(
      (s) => s.title.trim() !== "" || s.tasks.length > 0,
    );

    const projectData = {
      id: editingProjectId || Date.now(),
      title: document.getElementById("in-title").value,
      desc: document.getElementById("in-desc").value,
      startDate: document.getElementById("in-start").value,
      endDate: document.getElementById("in-end").value,
      priority: document.getElementById("in-priority").value,
      tags: tempTags,
      sections: finalSections,
      subtasks: [],
      status: editingProjectId
        ? projects.find((p) => p.id === editingProjectId).status
        : "active",
    };

    // Auto-completar si todo está listo
    if (isProjectFinished(projectData)) projectData.status = "completed";
    else if (projectData.status === "completed") projectData.status = "active";

    if (editingProjectId) {
      const idx = projects.findIndex((p) => p.id === editingProjectId);
      projects[idx] = projectData;
    } else {
      projects.unshift(projectData);
    }

    save();
    modal.classList.add("hidden");
  };
}

function renderModalTags() {
  const container = document.getElementById("modal-tags-container");
  const input = document.getElementById("in-tag-ghost");
  container.querySelectorAll(".tag-chip").forEach((e) => e.remove());
  tempTags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.innerHTML = `${tag} <span style="cursor:pointer; margin-left:5px;" onclick="window.removeTempTag('${tag}')">×</span>`;
    container.insertBefore(chip, input);
  });
}

// --- GLOBAL LISTENERS ---
function setupGlobalListeners() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterStatus = btn.dataset.filter;
      renderProjectList();
    };
  });

  const search = document.getElementById("search-proj");
  if (search) search.oninput = renderProjectList;

  // Listeners para los botones de vista
  const btnList = document.getElementById("btnViewList");
  const btnGrid = document.getElementById("btnViewGrid");

  if (btnList && btnGrid) {
    // Restaurar estado visual inicial
    updateViewButtons();

    btnList.onclick = () => {
      currentView = "list";
      localStorage.setItem("proj_view_mode", "list");
      updateViewButtons();
      renderProjectList();
    };

    btnGrid.onclick = () => {
      currentView = "grid";
      localStorage.setItem("proj_view_mode", "grid");
      updateViewButtons();
      renderProjectList();
    };
  }

  // --- WINDOW EXPORTS ---
  window.removeTempTag = (tag) => {
    tempTags = tempTags.filter((t) => t !== tag);
    renderModalTags();
  };

  window.toggleMenu = (id) => {
    const menu = document.getElementById(`menu-${id}`);
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      if (m !== menu) m.style.display = "none";
    });
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };

  window.deleteProject = (id) => {
    if (confirm("¿Eliminar proyecto?")) {
      projects = projects.filter((p) => p.id !== id);
      save();
    }
  };

  window.toggleProjectStatus = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (p.status === "active") p.status = "paused";
    else if (p.status === "paused") p.status = "active";
    save();
  };

  window.toggleSubtask = (projId, subIdx) => {
    const p = projects.find((x) => x.id === projId);
    if (!p) return;
    p.subtasks[subIdx].done = !p.subtasks[subIdx].done;
    checkFinish(p);
    save();
  };

  window.toggleSectionTask = (projId, secIdx, taskIdx) => {
    const p = projects.find((x) => x.id === projId);
    if (p && p.sections) {
      p.sections[secIdx].tasks[taskIdx].done =
        !p.sections[secIdx].tasks[taskIdx].done;
      checkFinish(p);
      save();
    }
  };

  function checkFinish(p) {
    if (isProjectFinished(p)) p.status = "completed";
    else if (p.status === "completed") p.status = "active";
  }

  window.editProject = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;

    editingProjectId = id;
    document.getElementById("modal-title").textContent = "Editar Proyecto";
    document.getElementById("btn-save-project").textContent = "Guardar Cambios";

    document.getElementById("in-title").value = p.title;
    document.getElementById("in-desc").value = p.desc || "";

    document.getElementById("in-start").value = p.startDate
      ? p.startDate.split("T")[0]
      : "";
    document.getElementById("in-end").value = p.endDate ? p.endDate : "";

    document.getElementById("in-priority").value = p.priority;

    document
      .querySelectorAll(".prio-option")
      .forEach((o) => o.classList.remove("selected"));
    document
      .querySelector(`.prio-option[data-val="${p.priority}"]`)
      ?.classList.add("selected");

    tempTags = [...(p.tags || [])];

    if (p.sections) {
      tempSections = JSON.parse(JSON.stringify(p.sections));
    } else if (p.subtasks) {
      tempSections = [
        {
          title: "Tareas Generales",
          tasks: JSON.parse(JSON.stringify(p.subtasks)),
        },
      ];
    } else {
      tempSections = [];
    }

    renderModalTags();
    if (window.renderModalSectionsGlobal) window.renderModalSectionsGlobal();

    document.getElementById("modal-new-project").classList.remove("hidden");
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((m) => (m.style.display = "none"));
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-dots")) {
      document
        .querySelectorAll(".dropdown-menu")
        .forEach((m) => (m.style.display = "none"));
    }
  });
}

function updateViewButtons() {
  const btnList = document.getElementById("btnViewList");
  const btnGrid = document.getElementById("btnViewGrid");
  if (btnList && btnGrid) {
    btnList.classList.toggle("active", currentView === "list");
    btnGrid.classList.toggle("active", currentView === "grid");
  }
}

function formatDate(d) {
  if (!d) return "--";
  const date = new Date(d.includes("T") ? d : d + "T00:00:00");
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
