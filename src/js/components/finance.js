import { Utils } from "../utils.js";
import { Storage } from "../services/storage.js";

const CONFIG_POR_DEFECTO = {
  ingreso: 0,
  diaInicio: new Date().toISOString().split("T")[0],
  ahorroPct: 10,
  periodo: "mensual",
};

let configuracion = {};
let gastosFijos = [];
let movimientosDiarios = [];

export function iniciarFinanzas() {
  configuracion = Storage.get("finance_config") || CONFIG_POR_DEFECTO;
  gastosFijos = Storage.get("finance_fixed") || [];
  movimientosDiarios = Storage.get("finance_movements") || [];

  renderizarDashboard();
  renderizarGastosFijos();
  renderizarMovimientos();
  configurarListeners();
}

function renderizarDashboard() {
  const ingreso = Number(configuracion.ingreso) || 0;
  const totalFijos = gastosFijos.reduce(
    (suma, item) => suma + Number(item.amount),
    0,
  );
  const totalVariables = movimientosDiarios.reduce(
    (suma, item) => suma + Number(item.amount),
    0,
  );

  const ahorro = ingreso * (configuracion.ahorroPct / 100);
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

  textoSeguro("val-ingreso", Utils.formatearMoneda(ingreso));
  textoSeguro("val-gastos-fijos", Utils.formatearMoneda(totalFijos));
  textoSeguro("val-ahorro", Utils.formatearMoneda(ahorro));
  textoSeguro("val-ahorro-pct", configuracion.ahorroPct);
  textoSeguro("val-disponible", Utils.formatearMoneda(disponibleReal));

  textoSeguro("val-diario", Utils.formatearMoneda(diario));
  textoSeguro("lbl-dias-restantes", `${diasRestantes} días restantes`);

  // Semáforo
  const tarjetaHero = document.querySelector(".f-diario-hero");
  if (tarjetaHero) {
    tarjetaHero.className = "f-card f-diario-hero";
    if (diario < 0) tarjetaHero.classList.add("status-danger");
    else if (diario < 100) tarjetaHero.classList.add("status-warning");
    else tarjetaHero.classList.add("status-ok");
  }
}

function renderizarMovimientos() {
  const lista = document.getElementById("lista-movimientos");
  if (!lista) return;
  lista.innerHTML = "";

  const recientes = movimientosDiarios.slice().reverse();

  if (recientes.length === 0) {
    lista.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">No hay movimientos aún.</div>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  recientes.forEach((mov) => {
    const div = document.createElement("div");
    div.className = "mov-item";
    div.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center;">
                <span style="font-size:1.2rem;">🛒</span>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; font-size:0.9rem; color:var(--text-main)">${Utils.escaparHTML(mov.desc)}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted)">${Utils.formatearFecha(mov.date)}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:700; color:var(--danger)">-${mov.amount}</span>
                <button class="btn-delete-mini" data-accion="eliminar-mov" data-id="${mov.id}">×</button>
            </div>
        `;
    fragmento.appendChild(div);
  });
  lista.appendChild(fragmento);
  adjuntarListenersMovimientos();
}

function renderizarGastosFijos() {
  const lista = document.getElementById("lista-gastos-fijos");
  if (!lista) return;
  lista.innerHTML = "";

  if (gastosFijos.length === 0) {
    lista.innerHTML = `<li style="padding:20px; text-align:center; color:var(--text-muted)">Sin gastos fijos</li>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  gastosFijos.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="fijo-icon-wrapper">${item.icon || "💸"}</div>
                <div class="fijo-info-clean">
                    <span class="fijo-name-clean">${Utils.escaparHTML(item.name)}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="fijo-amount-clean">-${item.amount}</span>
                <button class="btn-delete-mini" data-accion="eliminar-fijo" data-id="${item.id}">×</button>
            </div>
        `;
    fragmento.appendChild(li);
  });
  lista.appendChild(fragmento);
  adjuntarListenersFijos();
}

function configurarListeners() {
  // 1. CONFIGURACIÓN
  const btnConfig = document.getElementById("btn-config-finanzas");
  const modalConfig = document.getElementById("modal-config-finanzas");
  const btnCerrarConfig = document.getElementById("btn-cerrar-config-finanzas");
  const formConfig = document.getElementById("form-config-finanzas");

  if (btnConfig) {
    btnConfig.onclick = () => {
      actualizarValorInput("input-salario", configuracion.ingreso);
      actualizarValorInput("input-fecha-inicio", configuracion.diaInicio);
      actualizarValorInput("input-rango-ahorro", configuracion.ahorroPct);
      textoSeguro("val-rango-ahorro", configuracion.ahorroPct + "%");
      actualizarValorInput("select-periodo", configuracion.periodo || "mensual");
      modalConfig.classList.remove("hidden");
    };
  }

  if (btnCerrarConfig)
    btnCerrarConfig.onclick = () => modalConfig.classList.add("hidden");

  if (formConfig) {
    formConfig.onsubmit = (e) => {
      e.preventDefault(); // EVITAR RECARGA
      configuracion = {
        ingreso: document.getElementById("input-salario").value,
        diaInicio: document.getElementById("input-fecha-inicio").value,
        ahorroPct: document.getElementById("input-rango-ahorro").value,
        periodo: document.getElementById("select-periodo").value,
      };
      Storage.set("finance_config", configuracion);
      modalConfig.classList.add("hidden");
      renderizarDashboard();
    };
  }

  const rango = document.getElementById("input-rango-ahorro");
  if (rango)
    rango.oninput = (e) => textoSeguro("val-rango-ahorro", e.target.value + "%");

  // 2. GASTOS VARIABLES
  const btnAgregarMov = document.getElementById("btn-agregar-movimiento");
  if (btnAgregarMov) {
    btnAgregarMov.onclick = () => {
      const inputDesc = document.getElementById("input-mov-desc");
      const inputMonto = document.getElementById("input-mov-monto");
      const descripcion = inputDesc.value.trim();
      const monto = parseFloat(inputMonto.value);

      if (descripcion && monto) {
        movimientosDiarios.push({
          id: Utils.generarId(),
          desc: descripcion,
          amount: monto,
          date: new Date().toISOString(),
        });
        Storage.set("finance_movements", movimientosDiarios);

        inputDesc.value = "";
        inputMonto.value = "";
        renderizarDashboard();
        renderizarMovimientos();
      }
    };
  }

  // 3. GASTOS FIJOS
  const btnAgregarFijo = document.getElementById("btn-agregar-fijo");
  const formFijo = document.getElementById("form-nuevo-fijo");
  if (btnAgregarFijo)
    btnAgregarFijo.onclick = () => formFijo.classList.toggle("hidden");

  if (formFijo) {
    formFijo.onsubmit = (e) => {
      e.preventDefault(); // EVITAR RECARGA
      gastosFijos.push({
        id: Utils.generarId(),
        icon: document.getElementById("select-categoria-fijo").value,
        name: document.getElementById("input-nombre-fijo").value,
        amount: document.getElementById("input-monto-fijo").value,
        freq: 30,
      });
      Storage.set("finance_fixed", gastosFijos);
      formFijo.reset();
      formFijo.classList.add("hidden");
      renderizarDashboard();
      renderizarGastosFijos();
    };
  }

  // --- FUNCIONES GLOBALES PARA LISTENERS ---
  window.eliminarGastoFijo = (id) => {
    if (confirm("¿Borrar gasto fijo?")) {
      gastosFijos = gastosFijos.filter((e) => e.id != id);
      Storage.set("finance_fixed", gastosFijos);
      renderizarDashboard();
      renderizarGastosFijos();
    }
  }

  window.eliminarMovimiento = (id) => {
    if (confirm("¿Borrar movimiento?")) {
      movimientosDiarios = movimientosDiarios.filter((e) => e.id != id);
      Storage.set("finance_movements", movimientosDiarios);
      renderizarDashboard();
      renderizarMovimientos();
    }
  }
}

function adjuntarListenersMovimientos() {
  const lista = document.getElementById("lista-movimientos");
  if (!lista.dataset.listening) {
    lista.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.accion === 'eliminar-mov') {
        window.eliminarMovimiento(btn.dataset.id);
      }
    });
    lista.dataset.listening = "true";
  }
}

function adjuntarListenersFijos() {
  const lista = document.getElementById("lista-gastos-fijos");
  if (!lista.dataset.listening) {
    lista.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.accion === 'eliminar-fijo') {
        window.eliminarGastoFijo(btn.dataset.id);
      }
    });
    lista.dataset.listening = "true";
  }
}

function textoSeguro(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function actualizarValorInput(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}
