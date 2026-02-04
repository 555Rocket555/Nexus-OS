const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const load = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

export const NotesService = {
  getAll: () => {
    return load("quickNotes") || [];
  },

  save: (note) => {
    const notes = NotesService.getAll();
    if (note.id) {
      // CASO A: EDITAR (Ya tiene ID)
      const index = notes.findIndex((n) => n.id === note.id); // Buscamos la nota original y la reemplazamos
      if (index !== -1) {
        notes[index] = { ...notes[index], ...note }; // Actualizamos datos
      }
    } else {
      // CASO B: CREAR (No tiene ID)
      // Le creamos un ID único usando la fecha/hora actual
      note.id = Date.now();
      // Agregamos la fecha automáticamente
      note.fecha = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      // La agregamos al principio del array para que salga primero
      notes.unshift(note);
    }
    // Guardamos la LISTA COMPLETA actualizada
    save("quickNotes", notes);
  },

  // 3. Eliminar una nota
  delete: (id) => {
    const notes = NotesService.getAll(); // Filtramos: "Dame todas las notas EXCEPTO la que tiene este ID"
    const filteredNotes = notes.filter((n) => n.id !== id);
    save("quickNotes", filteredNotes);
  },
};

export const TaskService = {
  getAll: () => {
    const data = load("tareasKanban") || [];
    // Migración rápida: asegurar que tengan estado
    return data.map((t) => ({
      ...t,
      estado: t.estado || (t.completada ? "done" : "todo"),
    }));
  },
  saveAll: (tareas) => save("tareasKanban", tareas),
};

export const PlannerService = {
  getAll: () => load("plannerData") || {},
  saveAll: (data) => save("plannerData", data),
};

export const CalendarService = {
  getEvents: () => load("eventosGuardados") || {},
  saveEvents: (events) => save("eventosGuardados", events),
  getNoDateEvents: () => load("eventosSinFecha") || {},
  saveNoDateEvents: (events) => save("eventosSinFecha", events),
};

// --- SERVICIO FINANCIERO ---
export const FinanceService = {
  // 1. Configuración General (Salario, % Ahorro, Día de Pago)
  getConfig: () =>
    load("finanzasConfig") || { ingreso: 0, ahorroPct: 10, diaPago: 15 },
  saveConfig: (config) => save("finanzasConfig", config),

  // 2. Gastos Fijos (Renta, Internet, Netflix)
  getFixedExpenses: () => load("finanzasFijos") || [],
  saveFixedExpenses: (list) => save("finanzasFijos", list),

  // 3. Gastos Variables (El café, el taxi - Para la Fase 2)
  getDailyMovements: () => load("finanzasMovimientos") || [],
  saveMovement: (mov) => {
    const list = load("finanzasMovimientos") || [];
    list.unshift(mov);
    save("finanzasMovimientos", list);
  },
};

// Agrega esto dentro de tu archivo storage.js existente

// Clave para localStorage
const KANBAN_KEY = "nexus_kanban_data";

export const KanbanService = {
  getAll: () => {
    const data = localStorage.getItem(KANBAN_KEY);
    // Si no hay datos, devolvemos array vacío
    return data ? JSON.parse(data) : [];
  },

  saveAll: (items) => {
    localStorage.setItem(KANBAN_KEY, JSON.stringify(items));
  },
};

export const Storage = {
  get: (key) => {
    // Reutilizamos tu función load() existente
    return load(key);
  },

  set: (key, value) => {
    // Reutilizamos tu función save() existente
    save(key, value);
  },

  // Función auxiliar para inicializar datos si están vacíos
  init: (key, defaultValue) => {
    const existing = load(key);
    if (!existing) {
      save(key, defaultValue);
      return defaultValue;
    }
    return existing;
  },
};
