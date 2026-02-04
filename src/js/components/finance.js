import { Storage } from "../services/storage.js";

const DEFAULT_CONFIG = {
  ingreso: 0,
  diaInicio: new Date().toISOString().split("T")[0],
  ahorroPct: 10,
  periodo: "mensual",
};

let config = {};
let fixedExpenses = [];
let dailyMovements = [];

export function initFinance() {
  config = Storage.get("finance_config") || DEFAULT_CONFIG;
  fixedExpenses = Storage.get("finance_fixed") || [];
  dailyMovements = Storage.get("finance_movements") || [];

  renderDashboard();
  renderExpensesList();
  renderMovementsList();
  setupListeners();
}

function renderDashboard() {
  const ingreso = Number(config.ingreso) || 0;
  const totalFijos = fixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalVariables = dailyMovements.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const ahorro = ingreso * (config.ahorroPct / 100);
  const libreTotal = ingreso - totalFijos - ahorro;

  // Lo que realmente queda en el bolsillo
  const disponibleReal = libreTotal - totalVariables;

  // Calcular días restantes según periodo
  const hoy = new Date();

  const ultimoDiaMes = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  const diasRestantes = Math.max(1, ultimoDiaMes - hoy.getDate());

  const diario = disponibleReal / diasRestantes;

  safeText("lblIngreso", formatMoney(ingreso));
  safeText("lblGastosFijos", formatMoney(totalFijos));
  safeText("lblAhorro", formatMoney(ahorro));
  safeText("lblAhorroPct", config.ahorroPct);
  safeText("lblDisponible", formatMoney(disponibleReal));

  safeText("lblDiario", formatMoney(diario));
  safeText("lblDiasRestantes", `${diasRestantes} días restantes`);

  // Semáforo
  const heroCard = document.querySelector(".f-diario-hero");
  if (heroCard) {
    heroCard.className = "f-card f-diario-hero";
    if (diario < 0) heroCard.classList.add("status-danger");
    else if (diario < 100) heroCard.classList.add("status-warning");
    else heroCard.classList.add("status-ok");
  }
}

function renderMovementsList() {
  const list = document.getElementById("listaMovimientos");
  if (!list) return;
  list.innerHTML = "";

  const recent = dailyMovements.slice().reverse();

  if (recent.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">No hay movimientos aún.</div>`;
    return;
  }

  recent.forEach((mov) => {
    const div = document.createElement("div");
    div.className = "mov-item";
    div.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center;">
                <span style="font-size:1.2rem;">🛒</span>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; font-size:0.9rem; color:var(--text-main)">${mov.desc}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted)">${new Date(mov.date).toLocaleDateString()}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:700; color:var(--danger)">-$${mov.amount}</span>
                <button class="btn-delete-mini" onclick="window.deleteMovement(${mov.id})">×</button>
            </div>
        `;
    list.appendChild(div);
  });
}

function renderExpensesList() {
  const list = document.getElementById("listaGastosFijos");
  if (!list) return;
  list.innerHTML = "";

  if (fixedExpenses.length === 0) {
    list.innerHTML = `<li style="padding:20px; text-align:center; color:var(--text-muted)">Sin gastos fijos</li>`;
    return;
  }

  fixedExpenses.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="fijo-icon-wrapper">${item.icon || "💸"}</div>
                <div class="fijo-info-clean">
                    <span class="fijo-name-clean">${item.name}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="fijo-amount-clean">-$${item.amount}</span>
                <button class="btn-delete-mini" onclick="window.deleteExpense(${item.id})">×</button>
            </div>
        `;
    list.appendChild(li);
  });
}

function setupListeners() {
  // 1. CONFIGURACIÓN
  const btnConfig = document.getElementById("btnAbrirConfigFinanzas");
  const modalConfig = document.getElementById("modalConfigFinanzas");
  const btnCloseConfig = document.getElementById("btnCerrarConfigFinanzas");
  const formConfig = document.getElementById("formFinanzasConfig");

  if (btnConfig) {
    btnConfig.onclick = () => {
      updateInputValue("inSalario", config.ingreso);
      updateInputValue("inFechaInicio", config.diaInicio);
      updateInputValue("inAhorroRange", config.ahorroPct);
      safeText("valAhorroRange", config.ahorroPct + "%");
      updateInputValue("selPeriodo", config.periodo || "mensual");
      modalConfig.classList.remove("hidden");
    };
  }

  if (btnCloseConfig)
    btnCloseConfig.onclick = () => modalConfig.classList.add("hidden");

  if (formConfig) {
    formConfig.onsubmit = (e) => {
      e.preventDefault(); // EVITAR RECARGA
      config = {
        ingreso: document.getElementById("inSalario").value,
        diaInicio: document.getElementById("inFechaInicio").value,
        ahorroPct: document.getElementById("inAhorroRange").value,
        periodo: document.getElementById("selPeriodo").value,
      };
      Storage.set("finance_config", config);
      modalConfig.classList.add("hidden");
      renderDashboard();
    };
  }

  const range = document.getElementById("inAhorroRange");
  if (range)
    range.oninput = (e) => safeText("valAhorroRange", e.target.value + "%");

  // 2. GASTOS VARIABLES
  const btnAddMov = document.getElementById("btn-add-movement");
  if (btnAddMov) {
    btnAddMov.onclick = () => {
      const descInput = document.getElementById("in-mov-desc");
      const amountInput = document.getElementById("in-mov-amount");
      const desc = descInput.value.trim();
      const amount = parseFloat(amountInput.value);

      if (desc && amount) {
        dailyMovements.push({
          id: Date.now(),
          desc: desc,
          amount: amount,
          date: new Date().toISOString(),
        });
        Storage.set("finance_movements", dailyMovements);

        descInput.value = "";
        amountInput.value = "";
        renderDashboard();
        renderMovementsList();
      }
    };
  }

  // 3. GASTOS FIJOS
  const btnAddFijo = document.getElementById("btnAgregarFijo");
  const formFijo = document.getElementById("formNuevoFijo");
  if (btnAddFijo)
    btnAddFijo.onclick = () => formFijo.classList.toggle("hidden");

  if (formFijo) {
    formFijo.onsubmit = (e) => {
      e.preventDefault(); // EVITAR RECARGA
      fixedExpenses.push({
        id: Date.now(),
        icon: document.getElementById("selCategoriaFijo").value,
        name: document.getElementById("txtNombreFijo").value,
        amount: document.getElementById("txtMontoFijo").value,
        freq: 30,
      });
      Storage.set("finance_fixed", fixedExpenses);
      formFijo.reset();
      formFijo.classList.add("hidden");
      renderDashboard();
      renderExpensesList();
    };
  }

  // EXPORTS GLOBALES
  window.deleteExpense = (id) => {
    if (confirm("¿Borrar?")) {
      fixedExpenses = fixedExpenses.filter((e) => e.id !== id);
      Storage.set("finance_fixed", fixedExpenses);
      renderDashboard();
      renderExpensesList();
    }
  };

  window.deleteMovement = (id) => {
    if (confirm("¿Borrar movimiento?")) {
      dailyMovements = dailyMovements.filter((e) => e.id !== id);
      Storage.set("finance_movements", dailyMovements);
      renderDashboard();
      renderMovementsList();
    }
  };
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}
function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function updateInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}
