const guardar = (clave, datos) => localStorage.setItem(clave, JSON.stringify(datos));
const cargar = (clave) => {
  const datos = localStorage.getItem(clave);
  return datos ? JSON.parse(datos) : null;
};

export const ServicioNotas = {
  obtenerTodas: () => {
    return cargar("quickNotes") || [];
  },

  guardar: (nota) => {
    const notas = ServicioNotas.obtenerTodas();
    if (nota.id) {
      // CASO A: EDITAR (Ya tiene ID)
      const indice = notas.findIndex((n) => n.id === nota.id);
      if (indice !== -1) {
        notas[indice] = { ...notas[indice], ...nota };
      }
    } else {
      // CASO B: CREAR (No tiene ID)
      nota.id = Date.now();
      nota.fecha = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      notas.unshift(nota);
    }
    guardar("quickNotes", notas);
  },

  eliminar: (id) => {
    const notas = ServicioNotas.obtenerTodas();
    const notasFiltradas = notas.filter((n) => n.id !== id);
    guardar("quickNotes", notasFiltradas);
  },
};

export const ServicioTareas = {
  obtenerTodas: () => {
    const datos = cargar("tareasKanban") || [];
    return datos.map((t) => ({
      ...t,
      estado: t.estado || (t.completada ? "done" : "todo"),
    }));
  },
  guardarTodas: (tareas) => guardar("tareasKanban", tareas),
};

export const ServicioCalendario = {
  obtenerEventos: () => cargar("eventosGuardados") || {},
  guardarEventos: (eventos) => guardar("eventosGuardados", eventos),
  obtenerEventosSinFecha: () => cargar("eventosSinFecha") || {},
  guardarEventosSinFecha: (eventos) => guardar("eventosSinFecha", eventos),
};

// --- SERVICIO FINANCIERO ---
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

const CLAVE_KANBAN = "nexus_kanban_data";

export const ServicioKanban = {
  obtenerTodos: () => {
    const datos = localStorage.getItem(CLAVE_KANBAN);
    return datos ? JSON.parse(datos) : [];
  },

  guardarTodos: (items) => {
    localStorage.setItem(CLAVE_KANBAN, JSON.stringify(items));
  },
};

export const Almacenamiento = {
  obtener: (clave) => {
    return cargar(clave);
  },

  guardar: (clave, valor) => {
    guardar(clave, valor);
  },

  inicializar: (clave, valorPorDefecto) => {
    const existente = cargar(clave);
    if (existente === null || existente === undefined) {
      guardar(clave, valorPorDefecto);
      return valorPorDefecto;
    }
    return existente;
  },
};
