import { Utils } from "../utils.js";
import { Storage } from "../services/storage.js";

// Configuración inicial de colores
const COLORES_POR_DEFECTO = {
  primary: "#4F46E5",
  secondary: "#ec4899",
  neonColor: "#4F46E5",
  neonIntensity: "0.3",
  neonSpread: "10px",
  neonBlur: "15px",
};

const PRESETS_TEMAS = {
  "": COLORES_POR_DEFECTO,
  "dark-mode": {
    primary: "#710014",
    secondary: "#F2F1ED",
    neonColor: "#710014",
    neonIntensity: "0.6",
    neonSpread: "15px",
    neonBlur: "20px",
  },
  "dark-mode2": {
    primary: "#3b82f6",
    secondary: "#10b981",
    neonColor: "#3b82f6",
    neonIntensity: "0.5",
    neonSpread: "12px",
    neonBlur: "15px",
  },
  "dark-green": {
    primary: "#059669",
    secondary: "#84cc16",
    neonColor: "#059669",
    neonIntensity: "0.4",
    neonSpread: "10px",
    neonBlur: "15px",
  },
  "dark-purple": {
    primary: "#7c3aed",
    secondary: "#c026d3",
    neonColor: "#7c3aed",
    neonIntensity: "0.5",
    neonSpread: "15px",
    neonBlur: "20px",
  },
  "warm-mode": {
    primary: "#ea580c",
    secondary: "#f59e0b",
    neonColor: "#ea580c",
    neonIntensity: "0.4",
    neonSpread: "12px",
    neonBlur: "15px",
  },
  "light-blue": {
    primary: "#0284c7",
    secondary: "#6366f1",
    neonColor: "#0284c7",
    neonIntensity: "0.1",
    neonSpread: "5px",
    neonBlur: "8px",
  },
  "light-gray": {
    primary: "#334155",
    secondary: "#cbd5e1",
    neonColor: "#334155",
    neonIntensity: "0.05",
    neonSpread: "3px",
    neonBlur: "5px",
  },
};

// DOM Cache
let dom = {};

export function iniciarConfiguracion() {
  // 0. Inicializar Referencias DOM
  dom = {
    root: document.body,
    selectorTema: document.getElementById("selector-tema"),
    pickerPrimario: document.getElementById("picker-color-primario"),
    pickerSecundario: document.getElementById("picker-color-secundario"),
    btnReset: document.getElementById("btn-reset-colores"),
    pestanas: document.querySelectorAll(".pestana-configuracion"),
    paneles: document.querySelectorAll(".panel-configuracion"),
    nombreUsuario: document.getElementById("input-nombre-usuario"),
    apellidoUsuario: document.getElementById("input-apellido-usuario"),
    btnGuardarPerfil: document.getElementById("btn-guardar-perfil"),
    textoAvatar: document.querySelector(".avatar-preview"),
  };

  console.log("Configuración: DOM inicializado", dom);

  // 1. Cargar Preferencias desde Storage
  const temaGuardado = localStorage.getItem("app-theme") || "";
  const primarioGuardado = localStorage.getItem("app-primary");
  const secundarioGuardado = localStorage.getItem("app-secondary");

  // 2. Aplicar Tema y Colores
  aplicarTema(temaGuardado);
  const coloresTema = PRESETS_TEMAS[temaGuardado] || COLORES_POR_DEFECTO;

  // Si hay colores personalizados guardados y NO es un preset (o queremos sobreescribir),
  // la lógica original priorizaba localStorage 'app-primary'.
  // Mantenemos esa lógica.
  if (primarioGuardado) {
    aplicarVariablesCSS({
      primary: primarioGuardado,
      secondary: secundarioGuardado || coloresTema.secondary
    });
    // Actualizar pickers
    if (dom.pickerPrimario) dom.pickerPrimario.value = primarioGuardado;
    if (dom.pickerSecundario) dom.pickerSecundario.value = secundarioGuardado || coloresTema.secondary;
  } else {
    // Aplicar colores del tema
    aplicarVariablesCSS(coloresTema);
    if (dom.pickerPrimario) dom.pickerPrimario.value = coloresTema.primary;
    if (dom.pickerSecundario) dom.pickerSecundario.value = coloresTema.secondary;
  }

  // Sincronizar select
  if (dom.selectorTema) dom.selectorTema.value = temaGuardado;

  // 3. Listeners
  configurarListeners();

  // 4. Cargar datos de perfil
  cargarPerfil();

  // Toggles de Módulos
  const modulos = ["notas", "proyectos", "kanban", "calendario", "finanzas"];
  modulos.forEach(mod => {
    const idSwitch = `switch-modulo-${mod}`;
    const elSwitch = document.getElementById(idSwitch);

    // Cargar estado inicial
    const estadoGuardado = localStorage.getItem(`mod_${mod}`) !== "false"; // Default true
    if (elSwitch) {
      elSwitch.checked = estadoGuardado;
      actualizarVisibilidadModulo(mod, estadoGuardado);

      elSwitch.addEventListener("change", (e) => {
        const activo = e.target.checked;
        localStorage.setItem(`mod_${mod}`, activo);
        actualizarVisibilidadModulo(mod, activo);
      });
    }
  });
}

function configurarListeners() {
  // Selector de Tema
  if (dom.selectorTema) {
    dom.selectorTema.addEventListener("change", (e) => {
      const nuevoTema = e.target.value;
      localStorage.setItem("app-theme", nuevoTema);

      // Limpiar colores custom al cambiar tema para adoptar los del preset
      localStorage.removeItem("app-primary");
      localStorage.removeItem("app-secondary");

      aplicarTema(nuevoTema);
      const colores = PRESETS_TEMAS[nuevoTema] || COLORES_POR_DEFECTO;
      aplicarVariablesCSS(colores);

      // Actualizar inputs de color
      if (dom.pickerPrimario) dom.pickerPrimario.value = colores.primary;
      if (dom.pickerSecundario) dom.pickerSecundario.value = colores.secondary;
    });
  }

  // Pickers de Color (Customización manual)
  const manejarCambioColor = () => {
    const primario = dom.pickerPrimario.value;
    const secundario = dom.pickerSecundario.value;

    aplicarVariablesCSS({ primary: primario, secondary: secundario });
    localStorage.setItem("app-primary", primario);
    localStorage.setItem("app-secondary", secundario);
  };

  if (dom.pickerPrimario) dom.pickerPrimario.addEventListener("input", manejarCambioColor);
  if (dom.pickerSecundario) dom.pickerSecundario.addEventListener("input", manejarCambioColor);

  // Reset
  if (dom.btnReset) {
    dom.btnReset.addEventListener("click", () => {
      const temaActual = localStorage.getItem("app-theme") || "";
      const coloresPorDefecto = PRESETS_TEMAS[temaActual] || COLORES_POR_DEFECTO;

      localStorage.removeItem("app-primary");
      localStorage.removeItem("app-secondary");

      aplicarVariablesCSS(coloresPorDefecto);
      if (dom.pickerPrimario) dom.pickerPrimario.value = coloresPorDefecto.primary;
      if (dom.pickerSecundario) dom.pickerSecundario.value = coloresPorDefecto.secondary;
    });
  }

  // Tabs de Configuración
  dom.pestanas.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remover activo de todos
      dom.pestanas.forEach(t => t.classList.remove("active"));
      dom.paneles.forEach(p => p.classList.add("hidden"));

      // Activar clickeado
      tab.classList.add("active");
      const targetId = tab.dataset.target; // "tab-general", etc.
      document.getElementById(targetId)?.classList.remove("hidden");
    });
  });

  // Toggles de Módulos
  const modulos = ["notas", "proyectos", "kanban", "calendario", "finanzas"];
  modulos.forEach(mod => {
    const idSwitch = `switch-modulo-${mod}`;
    const elSwitch = document.getElementById(idSwitch);

    // Cargar estado inicial
    const estadoGuardado = localStorage.getItem(`mod_${mod}`) !== "false"; // Default true
    if (elSwitch) {
      elSwitch.checked = estadoGuardado;
      actualizarVisibilidadModulo(mod, estadoGuardado);

      elSwitch.addEventListener("change", (e) => {
        const activo = e.target.checked;
        localStorage.setItem(`mod_${mod}`, activo);
        actualizarVisibilidadModulo(mod, activo);
      });
    }
  });

}


function actualizarVisibilidadModulo(nombreModulo, activo) {
  // Mapeo de nombres de modulo a IDs de botones del sidebar y secciones
  // notas -> data-target="seccion-notas"
  // kanban -> data-target="seccion-tablero" (Ojo aqui con el mapeo)

  let targetId = `seccion-${nombreModulo}`;
  if (nombreModulo === "kanban") targetId = "seccion-tablero";

  const btnSidebar = document.querySelector(`.menu-btn[data-target="${targetId}"]`);
  if (btnSidebar) {
    btnSidebar.style.display = activo ? "flex" : "none";
  }
}

function cargarPerfil() {
  const perfil = Storage.get("user_profile") || { name: "Usuario", lastname: "Demo" };
  if (dom.nombreUsuario) dom.nombreUsuario.value = perfil.name;
  if (dom.apellidoUsuario) dom.apellidoUsuario.value = perfil.lastname;

  if (dom.textoAvatar) {
    const iniciales = (perfil.name[0] || "") + (perfil.lastname[0] || "");
    dom.textoAvatar.textContent = iniciales.toUpperCase();
  }
}

function aplicarTema(nombreTema) {
  // Remover clases de temas previos
  dom.root.classList.remove(...Object.keys(PRESETS_TEMAS).filter(t => t));
  if (nombreTema) dom.root.classList.add(nombreTema);
}

function aplicarVariablesCSS(colores) {
  if (!colores) return;
  const rootStyle = dom.root.style;

  if (colores.primary) {
    rootStyle.setProperty("--primary", colores.primary);
    const rgbP = Utils.hexToRgb(colores.primary);
    if (rgbP) rootStyle.setProperty("--primary-rgb", rgbP);
  }

  if (colores.secondary) {
    rootStyle.setProperty("--secondary", colores.secondary);
  }

  // Variables Neon (Opcional, si vienen en el objeto)
  if (colores.neonColor) rootStyle.setProperty("--neon-color", colores.neonColor);
  if (colores.neonIntensity) rootStyle.setProperty("--neon-intensity", colores.neonIntensity);
}
