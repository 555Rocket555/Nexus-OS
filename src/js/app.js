import { initTasks } from "./components/tasks.js";
import { initProjects } from "./components/projects.js";
import { renderKanban } from "./components/kanban.js";
import { initCalendar } from "./components/calendar.js";
import { initSettings } from "./components/settings.js";
import { initDashboard, renderDashboard } from "./components/dashboard.js";
import { initNotes } from "./components/notes.js";
import { initFinance } from "./components/finance.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Sistema Iniciado 🚀");

  // 1. Inicializar Módulos de la App
  initNotes();
  initProjects();
  initTasks();
  initCalendar();
  initSettings();
  initDashboard();
  initFinance();
  renderKanban(); // Asegurar render inicial

  // 2. Configurar la Interfaz Global
  setupSidebar();
});

function setupSidebar() {
  // Referencias al DOM
  const sidebar = document.getElementById("sidebar");
  const btnToggle = document.getElementById("btnToggle"); // Botón interno (Escritorio)
  const btnMobile = document.getElementById("btnMobileMenu"); // Botón externo (Móvil)
  const overlay = document.getElementById("sidebarOverlay"); // Fondo oscuro
  const menuBtns = document.querySelectorAll(".menu-btn");
  const sections = document.querySelectorAll(".pagina");

  // Validación básica
  if (!sidebar) return;

  // --- FUNCIONES AUXILIARES ---

  // Alternar estado del menú según el dispositivo
  const toggleMenu = () => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Lógica Móvil: Abrir/Cerrar slide + Overlay
      sidebar.classList.toggle("mobile-open");
      if (overlay) overlay.classList.toggle("show");

      // Bloquear scroll del fondo si está abierto
      document.body.style.overflow = sidebar.classList.contains("mobile-open")
        ? "hidden"
        : "";
    } else {
      // Lógica Desktop: Colapsar/Expandir ancho
      sidebar.classList.toggle("collapsed");
    }
  };

  // Forzar cierre del menú móvil (al hacer clic en enlace u overlay)
  const closeMobileMenu = () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("mobile-open");
      if (overlay) overlay.classList.remove("show");
      document.body.style.overflow = "";
    }
  };

  // --- LISTENERS ---

  // 1. Botón Hamburguesa Escritorio (Dentro del sidebar)
  if (btnToggle) {
    btnToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  }

  // 2. Botón Hamburguesa Móvil (Header superior)
  if (btnMobile) {
    btnMobile.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  }

  // 3. Clic en el Overlay (Fondo oscuro) -> Cerrar
  if (overlay) {
    overlay.addEventListener("click", closeMobileMenu);
  }

  // 4. Navegación (Botones del menú)
  menuBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // A. Gestión visual del botón activo
      document.querySelector(".menu-btn.active")?.classList.remove("active");
      btn.classList.add("active");

      // B. Gestión de visibilidad de secciones
      const targetId = btn.getAttribute("data-target");
      sections.forEach((s) => s.classList.add("hidden")); // Ocultar todas

      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.remove("hidden"); // Mostrar target

      // C. Recargas específicas de módulos (Refrescar datos al entrar)
      if (targetId === "seccion-dashboard") {
        // Disparar evento personalizado para recargar widgets
        document.dispatchEvent(new Event("reload-dashboard"));
      } else if (targetId === "seccion-proyectos") {
        initProjects();
      } else if (targetId === "seccion-planner") {
        renderKanban();
      } else if (targetId === "seccion-finanzas") {
        initFinance();
      } else if (targetId === "seccion-notas") {
        initNotes();
      }

      // D. Cerrar menú automáticamente si estamos en móvil
      closeMobileMenu();
    });
  });

  // 5. Ajuste al redimensionar ventana (Resize)
  window.addEventListener("resize", () => {
    // Si pasamos a escritorio, limpiar clases móviles para evitar bugs visuales
    if (window.innerWidth > 768) {
      sidebar.classList.remove("mobile-open");
      if (overlay) overlay.classList.remove("show");
      document.body.style.overflow = "";
    }
  });

  // 6. Cerrar con tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileMenu();
  });
}

// Función utilitaria para debug (Opcional)
function mostrarLocalStorage() {
  const resultado = {};
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    try {
      resultado[clave] = JSON.parse(localStorage.getItem(clave));
    } catch {
      resultado[clave] = localStorage.getItem(clave);
    }
  }
  console.table(resultado);
}
mostrarLocalStorage();
