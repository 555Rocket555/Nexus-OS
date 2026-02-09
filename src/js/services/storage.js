// --- UTILIDADES PRIVADAS ---
const guardar = (clave, datos) => {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
    } catch (e) {
        console.error(`Error guardando en ${clave}:`, e);
    }
};

const cargar = (clave) => {
    try {
        const datos = localStorage.getItem(clave);
        return datos ? JSON.parse(datos) : null;
    } catch (e) {
        console.error(`Error cargando de ${clave}:`, e);
        return null;
    }
};

// --- SERVICIOS ESPECÍFICOS ---

export const ServicioNotas = {
    obtenerTodas: () => cargar("quickNotes") || [],
    
    guardar: (nota) => {
        const notas = ServicioNotas.obtenerTodas();
        if (nota.id) {
            // Editar
            const indice = notas.findIndex((n) => n.id === nota.id);
            if (indice !== -1) {
                notas[indice] = { ...notas[indice], ...nota, updatedAt: new Date().toISOString() };
            }
        } else {
            // Crear
            nota.id = Date.now().toString();
            nota.fecha = new Date().toLocaleDateString("es-MX", {
                day: "numeric", month: "short", year: "numeric"
            });
            nota.updatedAt = new Date().toISOString();
            notas.unshift(nota);
        }
        guardar("quickNotes", notas);
    },

    eliminar: (id) => {
        const notas = ServicioNotas.obtenerTodas();
        const filtradas = notas.filter((n) => n.id !== id);
        guardar("quickNotes", filtradas);
    },
};

// Se agregó ServicioProyectos (Requerido por Dashboard y Tags)
export const ServicioProyectos = {
    obtenerTodos: () => cargar("projects") || [],
    guardarTodos: (proyectos) => guardar("projects", proyectos),
};

export const ServicioCalendario = {
    obtenerEventos: () => cargar("eventosGuardados") || {},
    guardarEventos: (eventos) => guardar("eventosGuardados", eventos),
    
    obtenerEventosSinFecha: () => cargar("eventosSinFecha") || {},
    guardarEventosSinFecha: (eventos) => guardar("eventosSinFecha", eventos),
};

export const ServicioFinanzas = {
    obtenerConfiguracion: () =>
        cargar("finanzasConfig") || { ingreso: 0, ahorroPct: 10, diaPago: 15 },
    guardarConfiguracion: (config) => guardar("finanzasConfig", config),

    obtenerGastosFijos: () => cargar("finanzasFijos") || [],
    guardarGastosFijos: (lista) => guardar("finanzasFijos", lista),

    obtenerMovimientos: () => cargar("finanzasMovimientos") || [],
    guardarMovimiento: (mov) => {
        const lista = cargar("finanzasMovimientos") || [];
        lista.unshift(mov);
        guardar("finanzasMovimientos", lista);
    },
};

// Kanban usa una clave específica
const CLAVE_KANBAN = "nexus_kanban_data";

export const ServicioKanban = {
    obtenerTodos: () => cargar(CLAVE_KANBAN) || [],
    guardarTodos: (items) => guardar(CLAVE_KANBAN, items),
};

// Mantener ServicioTareas por compatibilidad legacy si existe código viejo usándolo
export const ServicioTareas = {
    obtenerTodas: ServicioKanban.obtenerTodos,
    guardarTodas: ServicioKanban.guardarTodos
};

// --- SERVICIO DE ETIQUETAS (Centralizado) ---
export const ServicioEtiquetas = {
    obtenerTodas: () => {
        // Usamos los servicios para garantizar que leemos las mismas claves
        const notas = ServicioNotas.obtenerTodas();
        const proyectos = ServicioProyectos.obtenerTodos(); 
        const tareas = ServicioKanban.obtenerTodos();
        const eventos = ServicioCalendario.obtenerEventos(); // Objeto { fecha: [arrays] }
        const eventosSinFecha = ServicioCalendario.obtenerEventosSinFecha(); // Objeto { id: objeto }

        const tags = new Set();

        // Arrays directos
        notas.forEach(n => n.tags?.forEach(t => tags.add(t)));
        proyectos.forEach(p => p.tags?.forEach(t => tags.add(t)));
        tareas.forEach(t => t.tags?.forEach(t => tags.add(t)));

        // Estructuras complejas (Eventos)
        Object.values(eventos).flat().forEach(e => e.tags?.forEach(t => tags.add(t)));
        Object.values(eventosSinFecha).forEach(e => e.tags?.forEach(t => tags.add(t)));

        return Array.from(tags).sort();
    },

    obtenerConfiguracionColores: () => cargar("etiquetasColores") || {},

    asignarColor: (tag) => {
        if (!tag) return 1;
        const config = ServicioEtiquetas.obtenerConfiguracionColores();
        
        // Si ya tiene color, devolverlo
        if (config[tag]) return config[tag];

        // Asignar nuevo color cíclico (1-5) basado en cuántos tenemos
        const totalAsignados = Object.keys(config).length;
        const nuevoColor = (totalAsignados % 5) + 1;

        config[tag] = nuevoColor;
        guardar("etiquetasColores", config);
        return nuevoColor;
    },

    buscar: (texto) => {
        if (!texto) return [];
        const lower = texto.toLowerCase();
        return ServicioEtiquetas.obtenerTodas().filter(t => t.toLowerCase().includes(lower));
    }
};

// API Genérica
export const Almacenamiento = {
    obtener: cargar,
    guardar: guardar,
    inicializar: (clave, valorPorDefecto) => {
        const existente = cargar(clave);
        if (existente === null || existente === undefined) {
            guardar(clave, valorPorDefecto);
            return valorPorDefecto;
        }
        return existente;
    },
};