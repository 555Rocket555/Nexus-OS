import { Storage } from "../services/storage.js";

// Configuración inicial de colores
const DEFAULT_COLORS = {
  primary: "#4F46E5",
  secondary: "#ec4899",
  neonColor: "#4F46E5",
  neonIntensity: "0.3",
  neonSpread: "10px",
  neonBlur: "15px",
};

const THEME_PRESETS = {
  "": DEFAULT_COLORS,
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
    primary: "#22c55e",
    secondary: "#86efac",
    neonColor: "#22c55e",
    neonIntensity: "0.5",
    neonSpread: "12px",
    neonBlur: "15px",
  },
  "dark-purple": {
    primary: "#8b5cf6",
    secondary: "#d8b4fe",
    neonColor: "#8b5cf6",
    neonIntensity: "0.7",
    neonSpread: "18px",
    neonBlur: "25px",
  },
  "warm-mode": {
    primary: "#f59e0b",
    secondary: "#fb923c",
    neonColor: "#f59e0b",
    neonIntensity: "0.5",
    neonSpread: "12px",
    neonBlur: "15px",
  },
};

// DOM Cache
const dom = {
  root: document.documentElement,
  selector: document.getElementById("themeSelector"),
  pickerPri: document.getElementById("colorPickerPrimary"),
  pickerSec: document.getElementById("colorPickerSecondary"),
  btnReset: document.getElementById("btnResetColors"),
  tabs: document.querySelectorAll(".settings-tab"),
  panels: document.querySelectorAll(".settings-panel"),

  // Elementos de Perfil
  userName: document.getElementById("user-name"),
  userLastname: document.getElementById("user-lastname"),
  btnSaveProfile: document.getElementById("btnSaveProfile"),
  avatarText: document.querySelector(".avatar-preview"),
};

export function initSettings() {
  // 1. Cargar Preferencias desde Storage
  const savedTheme = localStorage.getItem("app-theme") || "";
  const savedPrimary = localStorage.getItem("app-primary");
  const savedSecondary = localStorage.getItem("app-secondary");
  const modulesConfig = Storage.get("app_modules") || {};

  // 2. Aplicar Tema y Colores
  applyThemeClass(savedTheme);
  const themeColors = THEME_PRESETS[savedTheme] || DEFAULT_COLORS;
  const finalPri = savedPrimary || themeColors.primary;
  const finalSec = savedSecondary || themeColors.secondary;
  const finalNeon = savedPrimary ? savedPrimary : themeColors.neonColor;

  applyCssVars(finalPri, finalSec, {
    color: finalNeon,
    intensity: themeColors.neonIntensity,
    spread: themeColors.neonSpread,
    blur: themeColors.neonBlur,
  });

  // 3. Sincronizar Inputs de la UI
  if (dom.selector) dom.selector.value = savedTheme;
  if (dom.pickerPri) dom.pickerPri.value = finalPri;
  if (dom.pickerSec) dom.pickerSec.value = finalSec;

  // 4. Cargar configuraciones específicas
  applyModulesVisibility(modulesConfig);
  loadProfile();

  // 5. Iniciar listeners
  setupListeners();
  setupTabs();
}

function setupTabs() {
  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Quitar clase active de todos
      dom.tabs.forEach((t) => t.classList.remove("active"));
      dom.panels.forEach((p) => p.classList.add("hidden"));

      // Activar el seleccionado
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      const panel = document.getElementById(target);
      if (panel) panel.classList.remove("hidden");
    });
  });
}

function setupListeners() {
  // A) CAMBIO DE TEMA
  if (dom.selector) {
    dom.selector.addEventListener("change", (e) => {
      const theme = e.target.value;
      applyThemeClass(theme);
      localStorage.setItem("app-theme", theme);

      const preset = THEME_PRESETS[theme] || DEFAULT_COLORS;
      applyCssVars(preset.primary, preset.secondary, {
        color: preset.neonColor,
        intensity: preset.neonIntensity,
        spread: preset.neonSpread,
        blur: preset.neonBlur,
      });

      dom.pickerPri.value = preset.primary;
      dom.pickerSec.value = preset.secondary;

      // Limpiar overrides manuales al cambiar de tema base
      localStorage.removeItem("app-primary");
      localStorage.removeItem("app-secondary");
    });
  }

  // B) PICKERS MANUALES
  if (dom.pickerPri) {
    dom.pickerPri.addEventListener("input", (e) => {
      applyCssVars(e.target.value, null, { color: e.target.value });
      localStorage.setItem("app-primary", e.target.value);
    });
  }

  if (dom.pickerSec) {
    dom.pickerSec.addEventListener("input", (e) => {
      applyCssVars(null, e.target.value);
      localStorage.setItem("app-secondary", e.target.value);
    });
  }

  // C) RESET
  if (dom.btnReset) {
    dom.btnReset.addEventListener("click", () => {
      applyThemeClass("");
      applyCssVars(DEFAULT_COLORS.primary, DEFAULT_COLORS.secondary, {
        color: DEFAULT_COLORS.neonColor,
        intensity: DEFAULT_COLORS.neonIntensity,
        spread: DEFAULT_COLORS.neonSpread,
        blur: DEFAULT_COLORS.neonBlur,
      });
      dom.selector.value = "";
      dom.pickerPri.value = DEFAULT_COLORS.primary;
      dom.pickerSec.value = DEFAULT_COLORS.secondary;
      localStorage.removeItem("app-theme");
      localStorage.removeItem("app-primary");
      localStorage.removeItem("app-secondary");
    });
  }

  // D) EXPORT GLOBAL PARA TOGGLE DE MODULOS (Llamado desde el HTML onclick)
  window.toggleModule = (moduleId, isChecked) => {
    const currentConfig = Storage.get("app_modules") || {};
    currentConfig[moduleId] = isChecked;
    Storage.set("app_modules", currentConfig);

    // Buscar el botón en el sidebar y ocultarlo/mostrarlo
    const menuBtn = document.querySelector(
      `.menu-btn[data-target="${moduleId}"]`,
    );
    if (menuBtn) {
      menuBtn.style.display = isChecked ? "flex" : "none";
    }
  };

  // E) GUARDAR PERFIL
  if (dom.btnSaveProfile) {
    dom.btnSaveProfile.addEventListener("click", () => {
      const profile = {
        name: dom.userName.value.trim() || "Usuario",
        lastname: dom.userLastname.value.trim() || "",
      };

      Storage.set("user_profile", profile);
      updateAvatar(profile.name, profile.lastname);

      // Feedback visual en el botón
      const originalText = dom.btnSaveProfile.textContent;
      dom.btnSaveProfile.textContent = "¡Guardado!";
      dom.btnSaveProfile.style.backgroundColor = "var(--success)";
      dom.btnSaveProfile.style.color = "white";

      setTimeout(() => {
        dom.btnSaveProfile.textContent = originalText;
        dom.btnSaveProfile.style.backgroundColor = "";
        dom.btnSaveProfile.style.color = "";
        // Disparar evento para que el Dashboard actualice el saludo
        document.dispatchEvent(new Event("profile-updated"));
      }, 1500);
    });
  }
}

// Cargar datos del perfil en los inputs
function loadProfile() {
  const profile = Storage.get("user_profile") || {
    name: "Usuario",
    lastname: "",
  };
  if (dom.userName) dom.userName.value = profile.name;
  if (dom.userLastname) dom.userLastname.value = profile.lastname;
  updateAvatar(profile.name, profile.lastname);
}

// Actualizar el círculo con iniciales
function updateAvatar(name, lastname) {
  if (dom.avatarText) {
    const initials = (
      name.charAt(0) + (lastname ? lastname.charAt(0) : "")
    ).toUpperCase();
    dom.avatarText.textContent = initials || "UD";
  }
}

// Aplicar visibilidad de módulos al cargar
function applyModulesVisibility(config) {
  const modules = [
    "seccion-notas",
    "seccion-proyectos",
    "seccion-planner",
    "seccion-calendario",
    "seccion-finanzas",
  ];

  modules.forEach((modId) => {
    // Si no existe config, por defecto es true
    const isVisible = config.hasOwnProperty(modId) ? config[modId] : true;

    // 1. Sincronizar el checkbox
    const switchId = "toggle-mod-" + modId.replace("seccion-", "");
    const checkbox = document.getElementById(switchId);
    if (checkbox) checkbox.checked = isVisible;

    // 2. Sincronizar el menú lateral
    const menuBtn = document.querySelector(`.menu-btn[data-target="${modId}"]`);
    if (menuBtn) {
      menuBtn.style.display = isVisible ? "flex" : "none";
    }
  });
}

function applyThemeClass(theme) {
  document.body.className = "";
  const icons = document.querySelectorAll(".icon");
  icons.forEach((icon) => icon.classList.remove("iconInvert", "iconNoInvert"));

  if (theme !== "light-blue" && theme !== "light-gray" && theme !== "") {
    icons.forEach((icon) => icon.classList.add("iconInvert"));
  } else {
    icons.forEach((icon) => icon.classList.add("iconNoInvert"));
  }
  if (theme) document.body.classList.add(theme);
}

function applyCssVars(primary, secondary, neonOptions = {}) {
  if (primary) dom.root.style.setProperty("--primary", primary);
  if (secondary) dom.root.style.setProperty("--secondary", secondary);
  if (neonOptions.color)
    dom.root.style.setProperty("--neon-color", neonOptions.color);
  if (neonOptions.intensity)
    dom.root.style.setProperty("--neon-intensity", neonOptions.intensity);
  if (neonOptions.spread)
    dom.root.style.setProperty("--neon-spread", neonOptions.spread);
  if (neonOptions.blur)
    dom.root.style.setProperty("--neon-blur", neonOptions.blur);
}
