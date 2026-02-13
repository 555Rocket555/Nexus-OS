import { Utils } from "../utils.js";
import { ServicioFinanzas, Almacenamiento } from "../services/storage.js";

const CONFIG_POR_DEFECTO = {
    ingreso: 0,
    diaInicio: new Date().toISOString().split("T")[0],
    ahorroPct: 10,
    periodo: "mensual",
};

let configuracion = ServicioFinanzas.obtenerConfiguracion() || CONFIG_POR_DEFECTO;
let gastosFijos = ServicioFinanzas.obtenerGastosFijos();
let movimientosDiarios = ServicioFinanzas.obtenerMovimientos();
let vistaActiva = 'movimientos';

export function iniciarFinanzas() {
    configuracion = ServicioFinanzas.obtenerConfiguracion() || CONFIG_POR_DEFECTO;
    gastosFijos = ServicioFinanzas.obtenerGastosFijos();
    movimientosDiarios = ServicioFinanzas.obtenerMovimientos();

    renderizarLayout();
    actualizarDashboard();
    renderizarListaActiva();
    configurarEventos();
}

function renderizarLayout() {
    // Si necesitas inyectar HTML dinámico, va aquí.
}

function actualizarDashboard() {
    const ingreso = Number(configuracion.ingreso) || 0;
    const totalFijos = gastosFijos.reduce((s, i) => s + Number(i.amount), 0);
    const totalMovimientos = movimientosDiarios.reduce((s, i) => s + Number(i.amount), 0);
    
    const ahorroMeta = ingreso * (configuracion.ahorroPct / 100);
    const libreTeorico = ingreso - totalFijos - ahorroMeta;
    const disponibleReal = libreTeorico - totalMovimientos;

    const diasRestantes = obtenerDiasRestantes(configuracion.periodo);
    const diario = diasRestantes > 0 ? (disponibleReal / diasRestantes) : 0;

    setText("val-ingreso", Utils.formatearMoneda(ingreso));
    setText("val-gastos", Utils.formatearMoneda(totalFijos + totalMovimientos)); 
    setText("val-ahorro", Utils.formatearMoneda(ahorroMeta));
    setText("val-libre", Utils.formatearMoneda(disponibleReal));

    setText("hero-amount", Utils.formatearMoneda(diario));
    setText("hero-days", `${diasRestantes} días restantes`);
    
    const heroCard = document.getElementById("hero-card-bg");
    const heroStatus = document.getElementById("hero-status-pill");
    
    if (heroStatus) {
        if (diario < 0) {
            heroStatus.textContent = "Sobregirado";
            heroStatus.className = "hero-status status-bad";
        } else if (diario < 100) { 
            heroStatus.textContent = "Apretado";
            heroStatus.className = "hero-status status-warn";
        } else {
            heroStatus.textContent = "Saludable";
            heroStatus.className = "hero-status status-good";
        }
    }
}

function obtenerDiasRestantes(periodo) {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

    if (periodo === 'quincenal') {
        if (diaActual < 15) {
            return 15 - diaActual;
        } else {
            return ultimoDiaMes - diaActual;
        }
    } else {
        return ultimoDiaMes - diaActual;
    }
}

function renderizarListaActiva() {
    const contenedor = document.getElementById("lista-unificada");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    let items = [];
    if (vistaActiva === 'movimientos') {
        items = movimientosDiarios.map(m => ({ ...m, type: 'variable' }));
        items.reverse();
    } else {
        items = gastosFijos.map(f => ({ ...f, type: 'fijo' }));
    }

    if (items.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No hay registros.</div>`;
        return;
    }

    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "transaction-row";
        
        const icono = item.icon || (item.type === 'fijo' ? "📅" : "🛒");
        const fecha = item.date ? Utils.formatearFecha(item.date) : "Mensual";
        const claseMonto = item.type === 'fijo' ? 'fixed' : 'expense';

        row.innerHTML = `
            <div class="t-left">
                <div class="t-icon">${icono}</div>
                <div class="t-info">
                    <span class="t-name">${Utils.escaparHTML(item.name || item.desc)}</span>
                    <span class="t-date">${fecha}</span>
                </div>
            </div>
            <div class="t-right">
                <span class="t-amount ${claseMonto}">-${Utils.formatearMoneda(item.amount)}</span>
                <button class="btn-del-trans" title="Eliminar">×</button>
            </div>
        `;

        row.querySelector(".btn-del-trans").onclick = () => eliminarItem(item);
        contenedor.appendChild(row);
    });
}

function eliminarItem(item) {
    if (confirm("¿Eliminar registro?")) {
        if (item.type === 'variable') {
            movimientosDiarios = movimientosDiarios.filter(m => m.id !== item.id);
            Almacenamiento.guardar("finanzasMovimientos", movimientosDiarios);
        } else {
            gastosFijos = gastosFijos.filter(f => f.id !== item.id);
            ServicioFinanzas.guardarGastosFijos(gastosFijos);
        }
        actualizarDashboard();
        renderizarListaActiva();
    }
}

// --- AQUÍ ESTABA EL ERROR ---
// He unificado todo dentro de configurarEventos y eliminado la función anidada 'configurarListeners'
function configurarEventos() {
    
    // 1. TABS (Pestañas)
    const tabMov = document.getElementById("tab-movimientos");
    const tabFijo = document.getElementById("tab-fijos");
    if(tabMov) tabMov.onclick = () => cambiarTab('movimientos');
    if(tabFijo) tabFijo.onclick = () => cambiarTab('fijos');

    // 2. GASTO RÁPIDO (Variable)
    const btnQuick = document.getElementById("btn-quick-add");
    if (btnQuick) {
        btnQuick.onclick = () => {
            const desc = document.getElementById("q-desc").value.trim();
            const amount = document.getElementById("q-amount").value;
            if (desc && amount) {
                movimientosDiarios.push({
                    id: Utils.generarId(),
                    desc,
                    amount: parseFloat(amount),
                    date: new Date().toISOString()
                });
                Almacenamiento.guardar("finanzasMovimientos", movimientosDiarios);
                document.getElementById("q-desc").value = "";
                document.getElementById("q-amount").value = "";
                actualizarDashboard();
                if (vistaActiva === 'movimientos') renderizarListaActiva();
            }
        };
    }

    // 3. GASTOS FIJOS (Formulario Toggle)
    const boxFijo = document.getElementById("box-nuevo-fijo");
    const btnToggle = document.getElementById("btn-toggle-fijo");
    if (btnToggle) {
        btnToggle.onclick = () => boxFijo.classList.toggle("hidden");
    }

    const btnSaveFijo = document.getElementById("btn-save-fijo");
    if (btnSaveFijo) {
        btnSaveFijo.onclick = () => {
            const name = document.getElementById("f-name").value.trim();
            const amount = document.getElementById("f-amount").value;
            const icon = document.getElementById("f-icon").value;
            
            if (name && amount) {
                gastosFijos.push({
                    id: Utils.generarId(),
                    name,
                    amount: parseFloat(amount),
                    icon
                });
                ServicioFinanzas.guardarGastosFijos(gastosFijos);
                document.getElementById("f-name").value = "";
                document.getElementById("f-amount").value = "";
                boxFijo.classList.add("hidden");
                actualizarDashboard();
                if (vistaActiva === 'fijos') renderizarListaActiva();
            }
        };
    }

    // 4. MODAL DE CONFIGURACIÓN (Corregido)
    const btnConfig = document.getElementById("btn-config-finanzas");
    const modal = document.getElementById("modal-config-finanzas");
    const btnCerrarConfig = document.getElementById("btn-cerrar-config-finanzas");
    const formConfig = document.getElementById("form-config-finanzas");

    if (btnConfig && modal) {
        btnConfig.onclick = () => {
            // Cargar datos en el modal
            actualizarValorInput("input-salario", configuracion.ingreso);
            actualizarValorInput("select-periodo", configuracion.periodo);
            actualizarValorInput("input-fecha-inicio", configuracion.diaInicio);
            
            // Cargar Slider y Texto
            const ahorroInput = document.getElementById("input-rango-ahorro");
            if (ahorroInput) {
                ahorroInput.value = configuracion.ahorroPct || 10;
                setText("val-rango-ahorro", ahorroInput.value + "%");
            }
            
            modal.classList.remove("hidden");
        };
        
        if (formConfig) {
            formConfig.onsubmit = (e) => {
                e.preventDefault();
                configuracion.ingreso = document.getElementById("input-salario").value;
                configuracion.periodo = document.getElementById("select-periodo").value;
                configuracion.diaInicio = document.getElementById("input-fecha-inicio").value;
                configuracion.ahorroPct = document.getElementById("input-rango-ahorro").value;
                
                ServicioFinanzas.guardarConfiguracion(configuracion);
                modal.classList.add("hidden");
                actualizarDashboard();
            };
        }
    }

    if (btnCerrarConfig) {
        btnCerrarConfig.onclick = () => modal.classList.add("hidden");
    }

    // Slider en tiempo real
    const rango = document.getElementById("input-rango-ahorro");
    if (rango) {
        rango.addEventListener("input", (e) => {
            setText("val-rango-ahorro", e.target.value + "%");
        });
    }
}

function cambiarTab(tab) {
    vistaActiva = tab;
    document.querySelectorAll(".f-tab").forEach(t => t.classList.remove("active"));
    document.getElementById(`tab-${tab}`).classList.add("active");
    
    const btnFijo = document.getElementById("btn-toggle-fijo");
    if(btnFijo) btnFijo.style.display = tab === 'fijos' ? 'flex' : 'none';
    
    document.getElementById("box-nuevo-fijo")?.classList.add("hidden");
    renderizarListaActiva();
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function actualizarValorInput(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor;
}