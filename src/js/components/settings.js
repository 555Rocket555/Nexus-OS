import { Almacenamiento } from "../services/storage.js";
import { Utils } from "../utils.js";

// --- CONSTANTES ---
const KEY_FAB_VISIBLE = "nexus_fab_visible";
const KEY_FAB_POS = "nexus_fab_position";

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

const dom = {
    root: document.documentElement,
    selector: document.getElementById("selector-tema"),
    pickerPri: document.getElementById("picker-color-primario"),
    pickerSec: document.getElementById("picker-color-secundario"),
    btnReset: document.getElementById("btn-reset-colores"),
    tabs: document.querySelectorAll(".pestana-configuracion"),
    panels: document.querySelectorAll(".panel-configuracion"),
    userName: document.getElementById("input-nombre-usuario"),
    userLastname: document.getElementById("input-apellido-usuario"),
    btnSaveProfile: document.getElementById("btn-guardar-perfil"),
    avatarText: document.querySelector(".avatar-preview"),
    // FAB Settings
    toggleFab: document.getElementById("toggle-fab-visibility"),
    btnResetFab: document.getElementById("btn-reset-fab-pos")
};

export function iniciarConfiguracion() {
    cargarTemaGuardado();
    cargarModulosGuardados();
    cargarPerfil();
    configurarTabs();
    configurarListenersGenerales();
    configurarFabSettings(); // Nueva función para el botón rayo
}

function cargarTemaGuardado() {
    const savedTheme = localStorage.getItem("app-theme") || "";
    const savedPrimary = localStorage.getItem("app-primary");
    const savedSecondary = localStorage.getItem("app-secondary");

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

    if (dom.selector) dom.selector.value = savedTheme;
    if (dom.pickerPri) dom.pickerPri.value = finalPri;
    if (dom.pickerSec) dom.pickerSec.value = finalSec;
}

function configurarTabs() {
    dom.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            dom.tabs.forEach((t) => t.classList.remove("active"));
            dom.panels.forEach((p) => p.classList.add("hidden"));
            tab.classList.add("active");
            const target = tab.dataset.target;
            const panel = document.getElementById(target);
            if (panel) panel.classList.remove("hidden");
        });
    });
}

function configurarListenersGenerales() {
    // A) CAMBIO DE TEMA (SELECTOR)
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
            
            // Limpiar overrides manuales al cambiar de preset
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

    // C) RESET COLORES
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

    // D) TOGGLES DE MÓDULOS (VISIBILIDAD SECCIONES)
    const modulesMap = [
        { key: "notas", id: "seccion-notas" },
        { key: "proyectos", id: "seccion-proyectos" },
        { key: "kanban", id: "seccion-tablero" },
        { key: "calendario", id: "seccion-calendario" },
        { key: "finanzas", id: "seccion-finanzas" },
    ];

    modulesMap.forEach((mod) => {
        const toggle = document.getElementById(`toggle-mod-${mod.key}`);
        if (toggle) {
            toggle.addEventListener("change", (e) => {
                toggleModuleVisibility(mod.id, e.target.checked);
            });
        }
    });

    // E) PERFIL USUARIO
    if (dom.btnSaveProfile) {
        dom.btnSaveProfile.addEventListener("click", () => {
            const profile = {
                name: dom.userName.value.trim() || "Usuario",
                lastname: dom.userLastname.value.trim() || "",
            };
            Almacenamiento.guardar("user_profile", profile);
            updateAvatar(profile.name, profile.lastname);
            
            // Notificar a otros módulos (ej. Dashboard saludo)
            document.dispatchEvent(new Event("profile-updated"));

            const originalText = dom.btnSaveProfile.textContent;
            dom.btnSaveProfile.textContent = "¡Guardado!";
            setTimeout(() => (dom.btnSaveProfile.textContent = originalText), 1500);
        });
    }
}

// --- CONFIGURACIÓN DEL BOTÓN FLOTANTE (FAB) ---
function configurarFabSettings() {
    if (!dom.toggleFab) return;

    // 1. Cargar estado guardado (Default: true si no existe)
    const isVisible = Almacenamiento.obtener(KEY_FAB_VISIBLE) !== false;
    dom.toggleFab.checked = isVisible;
    actualizarVisibilidadFab(isVisible);

    // 2. Listener del Toggle
    dom.toggleFab.addEventListener("change", (e) => {
        const estado = e.target.checked;
        Almacenamiento.guardar(KEY_FAB_VISIBLE, estado);
        actualizarVisibilidadFab(estado);
    });

    // 3. Listener Reset Posición
    if (dom.btnResetFab) {
        dom.btnResetFab.addEventListener("click", () => {
            Almacenamiento.eliminar(KEY_FAB_POS); // Usar método del servicio si existe, o localStorage
            // Si Almacenamiento no tiene eliminar, usar localStorage directo:
            // localStorage.removeItem(KEY_FAB_POS); 
            
            const fabContainer = document.getElementById("fab-actions");
            if (fabContainer) {
                fabContainer.style.right = "30px";
                fabContainer.style.bottom = "30px";
            }
            alert("Posición del botón restaurada.");
        });
    }
}

function actualizarVisibilidadFab(visible) {
    const fab = document.getElementById("fab-actions");
    if (!fab) return; // Si dashboard no ha cargado aún, no pasa nada
    
    if (visible) {
        fab.style.display = "flex";
        fab.style.opacity = "0";
        setTimeout(() => fab.style.opacity = "1", 50);
    } else {
        fab.style.display = "none";
    }
}

// --- HELPERS ---

function toggleModuleVisibility(moduleId, isChecked) {
    const currentConfig = Almacenamiento.obtener("app_modules") || {};
    currentConfig[moduleId] = isChecked;
    Almacenamiento.guardar("app_modules", currentConfig);

    const menuBtn = document.querySelector(`.menu-btn[data-target="${moduleId}"]`);
    if (menuBtn) {
        menuBtn.style.display = isChecked ? "flex" : "none";
    }
}

function cargarModulosGuardados() {
    const config = Almacenamiento.obtener("app_modules") || {};
    // Lista maestra de módulos
    const modules = [
        "seccion-notas",
        "seccion-proyectos",
        "seccion-tablero",
        "seccion-calendario",
        "seccion-finanzas",
    ];

    modules.forEach((modId) => {
        // Por defecto true si no está en config
        const isVisible = config.hasOwnProperty(modId) ? config[modId] : true;

        // Mapeo inverso ID Sección -> ID Checkbox
        let key = modId.replace("seccion-", "");
        if (modId === "seccion-tablero") key = "kanban";

        const checkbox = document.getElementById(`toggle-mod-${key}`);
        if (checkbox) checkbox.checked = isVisible;

        const menuBtn = document.querySelector(`.menu-btn[data-target="${modId}"]`);
        if (menuBtn) {
            menuBtn.style.display = isVisible ? "flex" : "none";
        }
    });
}

function cargarPerfil() {
    const profile = Almacenamiento.obtener("user_profile") || {
        name: "Usuario",
        lastname: "",
    };
    if (dom.userName) dom.userName.value = profile.name;
    if (dom.userLastname) dom.userLastname.value = profile.lastname;
    updateAvatar(profile.name, profile.lastname);
}

function updateAvatar(name, lastname) {
    if (dom.avatarText) {
        const initials = (
            name.charAt(0) + (lastname ? lastname.charAt(0) : "")
        ).toUpperCase();
        dom.avatarText.textContent = initials || "UD";
    }
}

function applyThemeClass(theme) {
    document.body.className = "";
    const icons = document.querySelectorAll(".icon");
    
    // Manejo de iconos invertidos para temas oscuros
    icons.forEach((icon) => icon.classList.remove("iconInvert", "iconNoInvert"));
    
    // Lista negra: temas claros donde NO invertimos iconos (asumiendo iconos negros por defecto)
    if (theme && !["", "light-blue", "light-gray"].includes(theme)) {
        icons.forEach((icon) => icon.classList.add("iconInvert"));
    } else {
        icons.forEach((icon) => icon.classList.add("iconNoInvert"));
    }
    
    if (theme) document.body.classList.add(theme);
}

function applyCssVars(primary, secondary, neonOptions = {}) {
    if (primary) {
        dom.root.style.setProperty("--primary", primary);
        const rgb = Utils.hexToRgb(primary);
        if (rgb) dom.root.style.setProperty("--primary-rgb", rgb);
    }
    if (secondary) dom.root.style.setProperty("--secondary", secondary);
    
    if (neonOptions.color) dom.root.style.setProperty("--neon-color", neonOptions.color);
    if (neonOptions.intensity) dom.root.style.setProperty("--neon-intensity", neonOptions.intensity);
    if (neonOptions.spread) dom.root.style.setProperty("--neon-spread", neonOptions.spread);
    if (neonOptions.blur) dom.root.style.setProperty("--neon-blur", neonOptions.blur);
}