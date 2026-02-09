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

  // 1. Inicializar Módulos
  iniciarNotas();
  iniciarProyectos();
  // iniciarTareas();  <-- ELIMINADO PORQUE BORRASTE task.js
  iniciarCalendario();
  iniciarConfiguracion();
  iniciarFinanzas();
  iniciarEtiquetas();
  
  // Renderizar Tablero y Dashboard al final
  renderizarTablero(); 
  iniciarDashboard();

  // 2. Configurar la Interfaz Global
  configurarBarraLateral();
});

function configurarBarraLateral() {
  // Referencias al DOM
  const barraLateral = document.getElementById("sidebar");
  const btnAlternar = document.getElementById("btnToggle");
  const btnMovil = document.getElementById("btnMobileMenu");
  const opacidadFondo = document.getElementById("sidebarOverlay");
  const botonesMenu = document.querySelectorAll(".menu-btn");
  const secciones = document.querySelectorAll(".pagina");

  if (!barraLateral) return;

  const alternarMenu = () => {
    const esMovil = window.innerWidth <= 768;
    if (esMovil) {
      barraLateral.classList.toggle("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.toggle("show");
      document.body.style.overflow = barraLateral.classList.contains("mobile-open") ? "hidden" : "";
    } else {
      barraLateral.classList.toggle("collapsed");
    }
  };

  const cerrarMenuMovil = () => {
    if (window.innerWidth <= 768) {
      barraLateral.classList.remove("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.remove("show");
      document.body.style.overflow = "";
    }
  };

  if (btnAlternar) btnAlternar.addEventListener("click", (e) => { e.stopPropagation(); alternarMenu(); });
  if (btnMovil) btnMovil.addEventListener("click", (e) => { e.stopPropagation(); alternarMenu(); });
  if (opacidadFondo) opacidadFondo.addEventListener("click", cerrarMenuMovil);

  botonesMenu.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".menu-btn.active")?.classList.remove("active");
      btn.classList.add("active");

      const idObjetivo = btn.getAttribute("data-target");
      secciones.forEach((s) => s.classList.add("hidden")); 

      const seccionObjetivo = document.getElementById(idObjetivo);
      if (seccionObjetivo) seccionObjetivo.classList.remove("hidden");

      // Recargas específicas
      if (idObjetivo === "seccion-dashboard") document.dispatchEvent(new Event("reload-dashboard"));
      else if (idObjetivo === "seccion-proyectos") iniciarProyectos();
      else if (idObjetivo === "seccion-tablero") renderizarTablero();
      else if (idObjetivo === "seccion-finanzas") iniciarFinanzas();
      else if (idObjetivo === "seccion-notas") iniciarNotas();
      else if (idObjetivo === "seccion-tags") iniciarEtiquetas();
      else if (idObjetivo === "seccion-configuracion") iniciarConfiguracion();

      cerrarMenuMovil();
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      barraLateral.classList.remove("mobile-open");
      if (opacidadFondo) opacidadFondo.classList.remove("show");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarMenuMovil();
  });
}