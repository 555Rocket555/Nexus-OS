import { Almacenamiento, ServicioEtiquetas, ServicioCalendario, ServicioProyectos } from "../services/storage.js";
import { Utils } from "../utils.js";

let estado = {
    etiquetaActiva: null
};

export function iniciarEtiquetas() {
    renderizarVistaEtiquetas();
}

function obtenerDatosEtiquetas() {
    const notas = Almacenamiento.obtener("quickNotes") || [];
    const proyectos = Almacenamiento.obtener("projects") || [];
    const eventosRaw = ServicioCalendario.obtenerEventos() || {};
    const recordatoriosRaw = ServicioCalendario.obtenerEventosSinFecha() || {};

    const mapaEtiquetas = new Map();

    // 1. Notas
    notas.forEach(nota => {
        if (nota.tags && Array.isArray(nota.tags)) {
            nota.tags.forEach(tag => agregarItem(mapaEtiquetas, tag, { type: 'note', ...nota }));
        }
    });

    // 2. Proyectos
    proyectos.forEach(proy => {
        if (proy.tags && Array.isArray(proy.tags)) {
            proy.tags.forEach(tag => agregarItem(mapaEtiquetas, tag, { type: 'project', ...proy }));
        }
    });

    // 3. Eventos
    for (const [dateKey, listaEventos] of Object.entries(eventosRaw)) {
        const lista = Array.isArray(listaEventos) ? listaEventos : [listaEventos];
        lista.forEach((evt, index) => {
            if (evt.tags && Array.isArray(evt.tags)) {
                evt.tags.forEach(tag => agregarItem(mapaEtiquetas, tag, { type: 'event', dateKey, index, ...evt }));
            }
        });
    }

    // 4. Recordatorios
    for (const [id, item] of Object.entries(recordatoriosRaw)) {
        if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => agregarItem(mapaEtiquetas, tag, { type: 'reminder', id, ...item }));
        }
    }

    return mapaEtiquetas;
}

function agregarItem(mapa, tag, item) {
    if (!tag) return;
    if (!mapa.has(tag)) mapa.set(tag, { count: 0, items: [] });
    const entrada = mapa.get(tag);
    entrada.count++;
    entrada.items.push(item);
}

function renderizarVistaEtiquetas() {
    const contenedor = document.getElementById("vista-etiquetas");
    if (!contenedor) return;

    if (estado.etiquetaActiva) {
        renderizarDetalleEtiqueta(contenedor, estado.etiquetaActiva);
    } else {
        renderizarNubeEtiquetas(contenedor);
    }
}

function renderizarNubeEtiquetas(contenedor) {
    const mapaEtiquetas = obtenerDatosEtiquetas();
    const etiquetas = Array.from(mapaEtiquetas.entries()).sort((a, b) => b[1].count - a[1].count);

    let html = `
        <div class="tags-header">
            <h2>🏷️ Explorador de Etiquetas</h2>
            <p>Gestiona y visualiza todo tu contenido organizado por temas.</p>
        </div>
        <div class="tags-grid">
    `;

    if (etiquetas.length === 0) {
        html += `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">No hay etiquetas creadas aún.</div>`;
    } else {
        etiquetas.forEach(([nombre, data]) => {
            const colorIdx = ServicioEtiquetas.asignarColor(nombre);
            html += `
                <div class="tag-card" onclick="window.ModuloEtiquetas.abrirEtiqueta('${nombre}')">
                    <div class="tag-card-header">
                        <h3 class="bg-c${colorIdx}" style="background:transparent; color:var(--primary);">#${nombre}</h3>
                        <span class="tag-count">${data.count} items</span>
                    </div>
                    <div class="tag-card-preview">
                        ${data.items.slice(0, 4).map(item => `<span class="mini-item-icon">${obtenerIcono(item.type)}</span>`).join('')}
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;
    contenedor.innerHTML = html;
}

function renderizarDetalleEtiqueta(contenedor, nombre) {
    const mapa = obtenerDatosEtiquetas();
    const data = mapa.get(nombre);

    if (!data) { estado.etiquetaActiva = null; renderizarVistaEtiquetas(); return; }

    const colorIdx = ServicioEtiquetas.asignarColor(nombre);
    let html = `
        <div class="tags-header detail-header bg-c${colorIdx}" style="padding: 20px; border-radius: 12px; margin-bottom: 25px; color: white;">
            <div style="display:flex; align-items:center; gap:15px;">
                <button class="btn-back" onclick="window.ModuloEtiquetas.cerrarEtiqueta()" style="color: white; border-color: rgba(255,255,255,0.3);">← Volver</button>
                <h2 style="color: white; margin:0;">#${nombre}</h2>
            </div>
            <p style="margin-top:5px; opacity:0.9;">Resumen de todos los elementos relacionados.</p>
        </div>
        
        <div class="tag-detail-grid">
    `;

    const notas = data.items.filter(i => i.type === 'note');
    const proyectos = data.items.filter(i => i.type === 'project');
    const eventos = data.items.filter(i => i.type === 'event' || i.type === 'reminder');

    // 1. PROYECTOS (Renderizado Detallado)
    if (proyectos.length > 0) {
        html += `
            <div class="detail-column">
                <h3 class="column-title">🚀 Proyectos (${proyectos.length})</h3>
                <div class="detail-list">
                    ${proyectos.map(p => renderProyectoDetallado(p)).join('')}
                </div>
            </div>
        `;
    }

    // 2. NOTAS
    if (notas.length > 0) {
        html += `
            <div class="detail-column">
                <h3 class="column-title">📝 Notas (${notas.length})</h3>
                <div class="detail-list">
                    ${notas.map(n => `
                        <div class="detail-card note-card" onclick="window.editarNotaDesdeTags('${n.id}')">
                            <div class="card-top">
                                <h4>${Utils.escaparHTML(n.title || 'Sin título')}</h4>
                                <span class="date-small">${Utils.formatearFecha(n.updatedAt).split(',')[0]}</span>
                            </div>
                            <p>${Utils.escaparHTML((n.content || '').substring(0, 100))}...</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 3. EVENTOS
    if (eventos.length > 0) {
        html += `
            <div class="detail-column">
                <h3 class="column-title">📅 Agenda (${eventos.length})</h3>
                <div class="detail-list">
                    ${eventos.map(e => renderEventoEnEtiqueta(e)).join('')}
                </div>
            </div>
        `;
    }

    html += `</div>`; // End grid
    contenedor.innerHTML = html;
}

// --- RENDERIZADORES ESPECÍFICOS ---

function renderProyectoDetallado(p) {
    // Calcular progreso
    let total = 0;
    let done = 0;
    let tareasHtml = '';

    // Extraer las primeras 3 tareas pendientes o completadas para mostrar
    let tareasMostradas = 0;

    if (p.sections && Array.isArray(p.sections)) {
        p.sections.forEach((sec, sIdx) => {
            sec.tasks.forEach((task, tIdx) => {
                total++;
                if (task.done) done++;
                
                // Mostrar solo las primeras 4 tareas para no saturar
                if (tareasMostradas < 4) {
                    tareasHtml += `
                        <div class="mini-task-row">
                            <input type="checkbox" ${task.done ? 'checked' : ''} 
                                onclick="event.stopPropagation(); window.ModuloEtiquetas.toggleTask('${p.id}', ${sIdx}, ${tIdx})">
                            <span class="${task.done ? 'done' : ''}">${Utils.escaparHTML(task.text)}</span>
                        </div>
                    `;
                    tareasMostradas++;
                }
            });
        });
    }

    const porcentaje = total === 0 ? 0 : Math.round((done / total) * 100);

    return `
        <div class="detail-card project-card-rich" onclick="window.editProject('${p.id}'); document.querySelector('[data-target=\\'seccion-proyectos\\']').click();">
            <div class="p-header">
                <h4>${Utils.escaparHTML(p.title)}</h4>
                <span class="status-badge st-${p.status}">${p.status}</span>
            </div>
            
            <div class="p-progress-mini">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width:${porcentaje}%"></div>
                </div>
                <small>${porcentaje}% completado</small>
            </div>

            <div class="p-tasks-preview">
                ${tareasHtml || '<small style="color:var(--text-muted)">Sin tareas</small>'}
                ${total > 4 ? `<small style="display:block; margin-top:5px; color:var(--primary);">+ ${total - 4} tareas más...</small>` : ''}
            </div>
        </div>
    `;
}

function renderEventoEnEtiqueta(e) {
    const esRecordatorio = e.type === 'reminder';
    const clickAction = esRecordatorio 
        ? `window.NexusCalendar.editarRecordatorio('${e.id}')`
        : `window.NexusCalendar.editarEvento('${e.dateKey}', ${e.index})`;
    
    const fechaStr = esRecordatorio ? 'Recordatorio' : Utils.formatearFecha(e.dateKey);

    return `
    <div class="detail-card event-card" onclick="${clickAction}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4>${Utils.escaparHTML(e.titulo)}</h4>
            <span style="font-size:1.2rem;">${esRecordatorio ? '📌' : '📅'}</span>
        </div>
        <p style="color:var(--text-muted); font-size:0.8rem; margin-top:5px;">${fechaStr}</p>
    </div>
    `;
}

function obtenerIcono(tipo) {
    if (tipo === 'note') return '📝';
    if (tipo === 'project') return '🚀';
    if (tipo === 'event') return '📅';
    return '📌';
}

// API GLOBAL PARA ETIQUETAS
window.ModuloEtiquetas = {
    abrirEtiqueta: (n) => { estado.etiquetaActiva = n; renderizarVistaEtiquetas(); },
    cerrarEtiqueta: () => { estado.etiquetaActiva = null; renderizarVistaEtiquetas(); },
    
    // NUEVA FUNCIÓN: Marcar tarea desde la vista de etiquetas
    toggleTask: (projId, secIdx, taskIdx) => {
        // 1. Obtener proyectos frescos
        const projects = ServicioProyectos.obtenerTodos();
        const p = projects.find(x => x.id === projId); // El ID viene como string, comparar con cuidado
        
        if (p && p.sections && p.sections[secIdx] && p.sections[secIdx].tasks[taskIdx]) {
            // 2. Alternar estado
            const task = p.sections[secIdx].tasks[taskIdx];
            task.done = !task.done;
            
            // 3. Verificar si se completó el proyecto
            let total = 0, done = 0;
            p.sections.forEach(s => {
                total += s.tasks.length;
                done += s.tasks.filter(t => t.done).length;
            });
            if (total > 0 && total === done) p.status = 'completed';
            else if (p.status === 'completed') p.status = 'active';

            // 4. Guardar
            ServicioProyectos.guardarTodos(projects);
            
            // 5. Re-renderizar la vista actual para ver el cambio
            renderizarVistaEtiquetas();
        }
    }
};