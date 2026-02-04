// src/js/landing.js

document.addEventListener("DOMContentLoaded", () => {
  // --- LÓGICA LANDING PAGE ---
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }

  // --- LÓGICA AUTH PAGE ---
  window.initAuthPage = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");

    let isLogin = mode !== "register";
    const form = document.getElementById("authForm");
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const nameField = document.getElementById("nameField");
    const btnText = document.getElementById("btnText");
    const toggleModeBtn = document.getElementById("toggleModeBtn");
    const switchText = document.getElementById("switchText");
    const forgotPass = document.getElementById("forgotPass");

    // Función para actualizar UI según estado
    const updateUI = () => {
      if (isLogin) {
        pageTitle.textContent = "Bienvenido de vuelta";
        pageSubtitle.textContent = "Ingresa tus credenciales para acceder";
        nameField.classList.add("hidden");
        document.getElementById("inputName").required = false;
        btnText.textContent = "Iniciar Sesión";
        switchText.textContent = "¿No tienes cuenta?";
        toggleModeBtn.textContent = "Regístrate";
        forgotPass.style.display = "block";
      } else {
        pageTitle.textContent = "Crea tu cuenta";
        pageSubtitle.textContent = "Empieza a organizar tu vida en minutos";
        nameField.classList.remove("hidden");
        document.getElementById("inputName").required = true;
        btnText.textContent = "Crear Cuenta";
        switchText.textContent = "¿Ya tienes cuenta?";
        toggleModeBtn.textContent = "Inicia sesión";
        forgotPass.style.display = "none";
      }
    };

    // Inicializar UI
    updateUI();

    // Toggle Login/Registro
    toggleModeBtn.addEventListener("click", () => {
      isLogin = !isLogin;
      updateUI();
    });

    // Toggle Password Visibility
    const togglePassBtn = document.getElementById("togglePass");
    const passInput = document.getElementById("inputPassword");

    togglePassBtn.addEventListener("click", () => {
      const type =
        passInput.getAttribute("type") === "password" ? "text" : "password";
      passInput.setAttribute("type", type);
      // Cambiar icono (requiere re-renderizar lucide si se hace dinámico, o toggle de clases)
      // Por simplicidad, dejamos el icono de ojo fijo o cambiamos la opacidad
      togglePassBtn.style.opacity = type === "text" ? "1" : "0.5";
    });

    // Submit Handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Loading state
      btn.disabled = true;
      btn.innerHTML = `<span class="loader"></span> Cargando...`; // CSS loader simple o texto

      setTimeout(() => {
        // Simular éxito y redirigir
        window.location.href = "index.html"; // Redirige al Dashboard principal
      }, 1500);
    });
  };
});
