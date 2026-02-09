import { Almacenamiento, ServicioEtiquetas } from "../services/storage.js";
import { Utils } from "../utils.js";

let estado = {
    etiquetaActiva: null,
    modoVista: 'cloud'
};

export function iniciarEtiquetas() {
    renderizarVistaEtiquetas();
}

function obtenerDatosEtiquetas() {
    const datos = {
        notas: Almacenamiento.obtener("quickNotes") || [],
        proyectos: Almacenamiento.obtener("projects") || [],
        tareas: Almacenamiento.obtener("nexus_kanban_data") || [] 
    };

    const mapaEtiquetas = new Map();

    // Notas
    datos.notas.forEach(nota => {
        if (nota.tags && Array.isArray(nota.tags)) {
            nota.tags.forEach(tag => {
                if (!mapaEtiquetas.has(tag)) mapaEtiquetas.set(tag, { count: 0, items: [] });
                const entrada = mapaEtiquetas.get(tag);
                entrada.count++;
                entrada.items.push({ type: 'note', ...nota });
            });
        }
    });

    // Proyectos
    datos.proyectos.forEach(proy => {
        if (proy.tags && Array.isArray(proy.tags)) {
            proy.tags.forEach(tag => {
                if (!mapaEtiquetas.has(tag)) mapaEtiquetas.set(tag, { count: 0, items: [] });
                const entrada = mapaEtiquetas.get(tag);
                entrada.count++;
                entrada.items.push({ type: 'project', ...proy });
            });
        }
    });

    return mapaEtiquetas;
}

function renderizarVistaEtiquetas() {
    // FIX: Selector correcto según index.html
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
        html += `<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding:40px;">No hay etiquetas creadas aún.</div>`;
    } else {
        etiquetas.forEach(([nombreEtiqueta, data]) => {
            const colorIdx = ServicioEtiquetas.asignarColor(nombreEtiqueta);
            html += `
                <div class="tag-card" onclick="window.ModuloEtiquetas.abrirEtiqueta('${nombreEtiqueta}')">
                    <div class="tag-card-header">
                        <h3 class="bg-c${colorIdx}" style="background:transparent; color:var(--primary);">#${nombreEtiqueta}</h3>
                        <span class="tag-count">${data.count} items</span>
                    </div>
                    <div class="tag-card-preview">
                        ${data.items.slice(0, 3).map(item => `
                            <span class="mini-item-icon" title="${item.type}">${obtenerIconoPorTipo(item.type)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    contenedor.innerHTML = html;
}

function renderizarDetalleEtiqueta(contenedor, nombreEtiqueta) {
    const mapaEtiquetas = obtenerDatosEtiquetas();
    const data = mapaEtiquetas.get(nombreEtiqueta);

    if (!data) {
        estado.etiquetaActiva = null;
        renderizarVistaEtiquetas();
        return;
    }

    const colorIdx = ServicioEtiquetas.asignarColor(nombreEtiqueta);
    let html = `
        <div class="tags-header detail-header bg-c${colorIdx}" style="padding: 20px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <button class="btn-back" onclick="window.ModuloEtiquetas.cerrarEtiqueta()" style="color: white; border-color: white;">← Volver</button>
            <h2 style="color: white;">#${nombreEtiqueta}</h2>
        </div>
        <div class="tag-detail-content">
    `;

    const notas = data.items.filter(i => i.type === 'note');
    const proyectos = data.items.filter(i => i.type === 'project');

    if (notas.length > 0) {
        html += `
            <div class="detail-section">
                <h3>📝 Notas (${notas.length})</h3>
                <div class="detail-list">
                    ${notas.map(n => `
                        <div class="detail-card note-card">
                            <h4>${Utils.escaparHTML(n.title || 'Sin título')}</h4>
                            <p>${Utils.escaparHTML((n.content || '').substring(0, 60))}...</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (proyectos.length > 0) {
        html += `
            <div class="detail-section">
                <h3>🚀 Proyectos (${proyectos.length})</h3>
                <div class="detail-list">
                    ${proyectos.map(p => `
                        <div class="detail-card project-card">
                            <h4>${Utils.escaparHTML(p.title)}</h4>
                            <span class="status-badge">${p.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += `</div>`;
    contenedor.innerHTML = html;
}

function obtenerIconoPorTipo(tipo) {
    if (tipo === 'note') return '📝';
    if (tipo === 'project') return '🚀';
    return '📌';
}

// Global API para onclicks HTML
window.ModuloEtiquetas = {
    abrirEtiqueta: (nombre) => {
        estado.etiquetaActiva = nombre;
        renderizarVistaEtiquetas();
    },
    cerrarEtiqueta: () => {
        estado.etiquetaActiva = null;
        renderizarVistaEtiquetas();
    }
};