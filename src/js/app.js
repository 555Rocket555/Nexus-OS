import { iniciarTareas } from "./components/tasks.js";
import { iniciarProyectos } from "./components/projects.js";
import { renderizarTablero } from "./components/kanban.js";
import { iniciarCalendario } from "./components/calendar.js";
import { iniciarConfiguracion } from "./components/settings.js";
import { iniciarDashboard } from "./components/dashboard.js";
import { iniciarNotas } from "./components/notes.js";
import { iniciarFinanzas } from "./components/finance.js";
import { iniciarEtiquetas } from "./components/tags.js";

// --- ESTADO GLOBAL ---
const estadoGlobal = {
  seccionActual: "seccion-inicio",
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Sistema Iniciado 🚀");

  // 1. Inicializar Módulos con nombres en Español
  iniciarNotas();
  iniciarProyectos();
  iniciarTareas();
  iniciarCalendario();
  iniciarConfiguracion();
  iniciarDashboard();
  iniciarFinanzas();
  iniciarEtiquetas();
  renderizarTablero(); // Asegurar render inicial

  // 2. Configurar la Interfaz Global
  configurarBarraLateral();
});

function configurarBarraLateral() {
  // Referencias al DOM
  const barraLateral = document.getElementById("sidebar");
  const btnAlternar = document.getElementById("btnToggle"); // Botón interno (Escritorio)
  const btnMovil = document.getElementById("btnMobileMenu"); // Botón externo (Móvil)
  const opacidadFondo = document.getElementById("sidebarOverlay"); // Fondo oscuro
  const botonesMenu = document.querySelectorAll(".menu-btn");
  const secciones = document.querySelectorAll(".pagina");

  // Validación básica
  if (!barraLateral) return;

  // --- FUNCIONES AUXILIARES ---

  // Alternar estado del menú según el dispositivo
  const alternarMenu = () => {
    const esMovil = window.innerWidth <= 768;

    if (esMovil) {
      // Lógica Móvil: Abrir/Cerrar slide + Overlay
      barraLateral.classList.toggle("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.toggle("show");

      // Bloquear scroll del fondo si está abierto
      document.body.style.overflow = barraLateral.classList.contains("mobile-open")
        ? "hidden"
        : "";
    } else {
      // Lógica Desktop: Colapsar/Expandir ancho
      barraLateral.classList.toggle("collapsed");
    }
  };

  // Forzar cierre del menú móvil (al hacer clic en enlace u overlay)
  const cerrarMenuMovil = () => {
    if (window.innerWidth <= 768) {
      barraLateral.classList.remove("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.remove("show");
      document.body.style.overflow = "";
    }
  };

  // --- LISTENERS ---

  // 1. Botón Hamburguesa Escritorio (Dentro del sidebar)
  if (btnAlternar) {
    btnAlternar.addEventListener("click", (e) => {
      e.stopPropagation();
      alternarMenu();
    });
  }

  // 2. Botón Hamburguesa Móvil (Header superior)
  if (btnMovil) {
    btnMovil.addEventListener("click", (e) => {
      e.stopPropagation();
      alternarMenu();
    });
  }

  // 3. Clic en el Overlay (Fondo oscuro) -> Cerrar
  if (opacidadFondo) {
    opacidadFondo.addEventListener("click", cerrarMenuMovil);
  }

  // 4. Navegación (Botones del menú)
  botonesMenu.forEach((btn) => {
    btn.addEventListener("click", () => {
      // A. Gestión visual del botón activo
      document.querySelector(".menu-btn.active")?.classList.remove("active");
      btn.classList.add("active");

      // B. Gestión de visibilidad de secciones
      const idObjetivo = btn.getAttribute("data-target");
      secciones.forEach((s) => s.classList.add("hidden")); // Ocultar todas

      const seccionObjetivo = document.getElementById(idObjetivo);
      if (seccionObjetivo) seccionObjetivo.classList.remove("hidden"); // Mostrar target

      // C. Recargas específicas de módulos (Refrescar datos al entrar)
      if (idObjetivo === "seccion-dashboard") {
        // Disparar evento personalizado para recargar widgets
        document.dispatchEvent(new Event("reload-dashboard"));
      } else if (idObjetivo === "seccion-proyectos") {
        iniciarProyectos();
      } else if (idObjetivo === "seccion-tablero") {
        renderizarTablero();
      } else if (idObjetivo === "seccion-finanzas") {
        iniciarFinanzas();
      } else if (idObjetivo === "seccion-notas") {
        iniciarNotas();
      } else if (idObjetivo === "seccion-tags") {
        iniciarEtiquetas();
      } else if (idObjetivo === "seccion-configuracion") {
        iniciarConfiguracion();
      }

      // D. Cerrar menú automáticamente si estamos en móvil
      cerrarMenuMovil();
    });
  });

  // 5. Ajuste al redimensionar ventana (Resize)
  window.addEventListener("resize", () => {
    // Si pasamos a escritorio, limpiar clases móviles para evitar bugs visuales
    if (window.innerWidth > 768) {
      barraLateral.classList.remove("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.remove("show");
      document.body.style.overflow = "";
    }
  });

  // 6. Cerrar con tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarMenuMovil();
  });
}
