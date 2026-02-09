import { Almacenamiento } from "../services/storage.js";
import { Utils } from "../utils.js";

// Estado local del módulo
let estado = {
    etiquetaActiva: null, // Si es null, muestra la lista de tags. Si tiene valor, muestra el detalle.
    modoVista: 'cloud' // 'cloud' | 'detail'
};

export function iniciarEtiquetas() {
    renderizarVistaEtiquetas();
}

function obtenerDatosEtiquetas() {
    const datos = {
        notas: Almacenamiento.obtener("quickNotes") || [],
        proyectos: Almacenamiento.obtener("projects") || [],
        tareas: Almacenamiento.obtener("nexus_kanban_data") || [] // Asumiendo que las tareas pueden tener tags
    };

    const mapaEtiquetas = new Map(); // tagName -> { count, items: [] }

    // Procesar Notas
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

    // Procesar Proyectos
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
    const contenedor = document.getElementById("vista-etiquetas") || document.getElementById("vistaTags");
    if (!contenedor) return;

    if (estado.etiquetaActiva) {
        renderizarDetalleEtiqueta(contenedor, estado.etiquetaActiva);
    } else {
        renderizarNubeEtiquetas(contenedor);
    }
}

function renderizarNubeEtiquetas(contenedor) {
    const mapaEtiquetas = obtenerDatosEtiquetas();
    const etiquetas = Array.from(mapaEtiquetas.entries()).sort((a, b) => b[1].count - a[1].count); // Más frecuentes primero

    let html = `
        <div class="tags-header">
            <h2>🏷️ Explorador de Etiquetas</h2>
            <p>Gestiona y visualiza todo tu contenido organizado por temas.</p>
        </div>
        <div class="tags-grid">
    `;

    if (etiquetas.length === 0) {
        html += `<div class="empty-state">No hay etiquetas creadas aún. Agrega etiquetas a tus Notas o Proyectos.</div>`;
    } else {
        etiquetas.forEach(([nombreEtiqueta, data]) => {
            html += `
                <div class="tag-card" onclick="window.ModuloEtiquetas.abrirEtiqueta('${nombreEtiqueta}')">
                    <div class="tag-card-header">
                        <h3>#${nombreEtiqueta}</h3>
                        <span class="tag-count">${data.count} items</span>
                    </div>
                    <div class="tag-card-preview">
                        ${data.items.slice(0, 3).map(item => `
                            <span class="mini-item-icon">${obtenerIconoPorTipo(item.type)}</span>
                        `).join('')}
                        ${data.items.length > 3 ? '<span class="more-dots">...</span>' : ''}
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

    let html = `
        <div class="tags-header detail-header">
            <button class="btn-back" onclick="window.ModuloEtiquetas.cerrarEtiqueta()">← Volver</button>
            <h2>#${nombreEtiqueta}</h2>
            <span class="tag-count-badge">${data.count} Elementos encontrados</span>
        </div>
        
        <div class="tag-detail-content">
    `;

    // Agrupar por tipo
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
                            <span class="date">${Utils.formatearFecha(n.updatedAt)}</span>
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
                            <p>${Utils.escaparHTML(p.description || '')}</p>
                            <span class="status-badge ${p.status}">${p.status}</span>
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
    return '📄';
}

// Global API
window.ModuloEtiquetas = {
    abrirEtiqueta: (nombreEtiqueta) => {
        estado.etiquetaActiva = nombreEtiqueta;
        renderizarVistaEtiquetas();
    },
    cerrarEtiqueta: () => {
        estado.etiquetaActiva = null;
        renderizarVistaEtiquetas();
    }
};
