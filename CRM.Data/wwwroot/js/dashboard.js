// Dashboard operativo del CRM.
// Mantiene funciones globales porque otros módulos reutilizan iconos y helpers.

let dashboardCargaVersion = 0;

async function cargarModuloDashboard(vista) {
    const carga = ++dashboardCargaVersion;
    const params = new URLSearchParams();

    if (asesorFiltroActivo && asesorFiltroActivo !== "unassigned") {
        params.set("usuarioId", asesorFiltroActivo);
    }

    const [response, hoyResponse] = await Promise.all([
        api(`/api/crm/reportes/resumen${params.size ? `?${params.toString()}` : ""}`),
        api(`/api/dashboard/hoy${params.size ? `?${params.toString()}` : ""}`)
    ]);

    if (!response.ok) {
        throw new Error("Dashboard no disponible");
    }

    const reporte = await response.json();
    if (hoyResponse.ok) {
        reporte.hoy = await hoyResponse.json();
    }

    if (carga !== dashboardCargaVersion || moduloActual !== "dashboard") {
        return;
    }

    renderDashboard(vista, reporte);
}

function obtenerCanalesDashboard(reporte) {
    const canalesBase = reporte.canales && reporte.canales.length ? reporte.canales : [
        {
            canal: "WHATSAPP",
            nombre: "WhatsApp",
            conectado: true,
            clientes: reporte.clientes || 0,
            conversaciones: reporte.conversaciones || 0,
            interacciones: reporte.mensajes || 0,
            entrantes: reporte.entrantes || 0,
            salientes: reporte.salientes || 0,
            oportunidades: (reporte.oportunidades?.abiertas || 0) + (reporte.oportunidades?.ganadas || 0) + (reporte.oportunidades?.perdidas || 0),
            montoAbierto: reporte.oportunidades?.montoAbierto || 0,
            montoGanado: reporte.oportunidades?.montoGanado || 0,
            tareasPendientes: reporte.tareas?.pendientes || 0,
            tareasVencidas: reporte.tareas?.vencidas || 0
        }
    ];
    const canalesNecesarios = [
        { canal: "WHATSAPP", nombre: "WhatsApp", clase: "whatsapp" },
        { canal: "INSTAGRAM", nombre: "Instagram", clase: "instagram" },
        { canal: "FACEBOOK", nombre: "Facebook", clase: "facebook" },
        { canal: "TIKTOK", nombre: "TikTok", clase: "tiktok" }
    ];

    return canalesNecesarios.map(canal => {
        const datos = canalesBase.find(item => item.canal === canal.canal) || {};
        return {
            ...canal,
            conectado: Boolean(datos.conectado),
            clientes: Number(datos.clientes || 0),
            conversaciones: Number(datos.conversaciones || 0),
            interacciones: Number(datos.interacciones || 0),
            entrantes: Number(datos.entrantes || 0),
            salientes: Number(datos.salientes || 0),
            oportunidades: Number(datos.oportunidades || 0),
            montoAbierto: Number(datos.montoAbierto || 0),
            montoGanado: Number(datos.montoGanado || 0),
            tareasPendientes: Number(datos.tareasPendientes || 0),
            tareasVencidas: Number(datos.tareasVencidas || 0)
        };
    });
}

function sumarCanalesDashboard(canales) {
    return canales.reduce((total, canal) => ({
        clientes: total.clientes + canal.clientes,
        conversaciones: total.conversaciones + canal.conversaciones,
        interacciones: total.interacciones + canal.interacciones,
        entrantes: total.entrantes + canal.entrantes,
        salientes: total.salientes + canal.salientes,
        oportunidades: total.oportunidades + canal.oportunidades,
        montoAbierto: total.montoAbierto + canal.montoAbierto,
        montoGanado: total.montoGanado + canal.montoGanado,
        tareasPendientes: total.tareasPendientes + canal.tareasPendientes,
        tareasVencidas: total.tareasVencidas + canal.tareasVencidas
    }), {
        clientes: 0,
        conversaciones: 0,
        interacciones: 0,
        entrantes: 0,
        salientes: 0,
        oportunidades: 0,
        montoAbierto: 0,
        montoGanado: 0,
        tareasPendientes: 0,
        tareasVencidas: 0
    });
}

function calcularPorcentaje(parte, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((Number(parte || 0) / Number(total || 0)) * 100));
}

function crearLogoRed(clase) {
    const logos = {
        all: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="3.1"></circle><circle cx="17" cy="7" r="3.1"></circle><circle cx="7" cy="17" r="3.1"></circle><circle cx="17" cy="17" r="3.1"></circle></svg>',
        whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.7 22l5.2-1.4A9.7 9.7 0 1 0 12 2.2Zm0 17.6a7.8 7.8 0 0 1-4-1.1l-.3-.2-3.1.8.8-3-.2-.3A7.8 7.8 0 1 1 12 19.8Zm4.5-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.9 1-.2.2-.3.2-.6.1-.2-.1-1-.4-1.9-1.1-.7-.6-1.2-1.3-1.3-1.5-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.2-.3-.2-.5-.3Z"></path></svg>',
        instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.3A4.7 4.7 0 1 1 12 16.7a4.7 4.7 0 0 1 0-9.4Zm0 2A2.7 2.7 0 1 0 12 14.7a2.7 2.7 0 0 0 0-5.4Zm5-2.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"></path></svg>',
        facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.1 22v-8.6h2.9l.5-3.4h-3.4V7.8c0-1 .3-1.7 1.8-1.7h1.8v-3c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V10H7.6v3.4h2.9V22h3.6Z"></path></svg>',
        tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.2 2c.4 2.4 1.7 3.9 4.1 4.1v3.4a7.2 7.2 0 0 1-4.1-1.3v6.3c0 4.1-2.6 7.2-6.8 7.2A6.1 6.1 0 0 1 3.3 16c0-3.4 2.6-6 6.4-6 .4 0 .8 0 1.1.1v3.6a3.3 3.3 0 0 0-1.2-.2 2.5 2.5 0 1 0 2.6 2.5V2h4Z"></path></svg>'
    };

    return `<span class="brand-logo ${clase}">${logos[clase] || logos.all}</span>`;
}

function obtenerTrabajoHoyDashboard(reporte) {
    const hoy = reporte.hoy?.hoy || {};
    const futuro = reporte.hoy?.futuro || {};
    return {
        clientes: hoy.clientesNuevos || [],
        mensajes: hoy.mensajesPendientes || [],
        tareas: hoy.tareas || [],
        oportunidades: hoy.oportunidades || [],
        tareasFuturas: futuro.tareas || [],
        total: Number(hoy.total || 0)
    };
}

function renderAccionOperativa(item) {
    return `
        <button type="button" class="ops-action ${item.urgente ? "danger" : ""}" ${item.conversacionId ? `data-today-conversation="${item.conversacionId}"` : ""}>
            <span>
                <strong>${escapeHtml(item.titulo)}</strong>
                <small>${escapeHtml(item.detalle)}</small>
            </span>
            <em>${escapeHtml(item.meta)}</em>
        </button>`;
}

function renderDashboard(vista, reporte) {
    const vistaAsesor = esRol("asesor");
    const vistaAdmin = esRol("administrador");
    const canales = obtenerCanalesDashboard(reporte);
    const resumen = sumarCanalesDashboard(canales);
    const trabajo = obtenerTrabajoHoyDashboard(reporte);
    const tasaRespuesta = calcularPorcentaje(resumen.salientes, resumen.entrantes);
    const conversionLeads = calcularPorcentaje(resumen.oportunidades, resumen.clientes);
    const oportunidades = reporte.oportunidades || {};
    const abiertas = Number(oportunidades.abiertas || resumen.oportunidades || 0);
    const ganadas = Number(oportunidades.ganadas || 0);
    const perdidas = Number(oportunidades.perdidas || 0);
    const winRate = calcularPorcentaje(ganadas, ganadas + perdidas);
    const carga = reporte.cargaAsesores || [];
    const asesorSobrecargado = carga[0];
    const acciones = [
        ...trabajo.mensajes.map(item => ({
            titulo: item.nombre || "Cliente pendiente",
            detalle: `${item.canal || "Canal"} · ${item.estado || "Sin estado"}`,
            meta: item.fecha ? formatearFecha(item.fecha) : "Responder",
            conversacionId: item.id,
            urgente: true
        })),
        ...trabajo.tareas.map(item => ({
            titulo: item.titulo || "Tarea pendiente",
            detalle: item.cliente || "Sin cliente",
            meta: `${item.vencida ? "Vencida · " : ""}${item.vence ? formatearFecha(item.vence) : "Hoy"}`,
            conversacionId: item.conversacionId,
            urgente: Boolean(item.vencida)
        })),
        ...trabajo.oportunidades.map(item => ({
            titulo: item.titulo || "Oportunidad por mover",
            detalle: `${item.cliente || "Cliente"} · ${item.etapa || "Etapa"}`,
            meta: formatearMoneda(item.monto || 0, item.moneda || "PEN"),
            conversacionId: item.conversacionId,
            urgente: item.etapa === "NEGOCIACION" || item.etapa === "PROPUESTA"
        })),
        ...trabajo.clientes.map(item => ({
            titulo: item.nombre || "Cliente nuevo",
            detalle: item.canal || "Sin canal",
            meta: item.fecha ? formatearFecha(item.fecha) : "Nuevo",
            conversacionId: item.conversacionId,
            urgente: false
        }))
    ].slice(0, 10);
    const etapaRows = (oportunidades.porEtapa || [])
        .filter(item => item.etapa !== "GANADA" && item.etapa !== "PERDIDA")
        .sort((a, b) => Number(b.montoTotal || 0) - Number(a.montoTotal || 0));
    const maxEtapaMonto = Math.max(...etapaRows.map(item => Number(item.montoTotal || 0)), 1);
    const estadosAbiertos = (reporte.porEstado || [])
        .filter(item => !["CERRADO", "PERDIDO", "NO_RESPONDIO"].includes(item.estado));
    const maxEstado = Math.max(...estadosAbiertos.map(item => Number(item.cantidad || 0)), 1);

    vista.innerHTML = `
        <div class="ops-dashboard">
            <div class="module-heading ops-heading">
                <div>
                    <h1>${vistaAsesor ? "Mi trabajo de hoy" : vistaAdmin ? "Operación CRM" : "Supervisión comercial"}</h1>
                    <p>${vistaAsesor
                        ? "Prioriza respuestas, seguimientos y oportunidades abiertas. Lo que no mueve una conversación o una venta no entra aquí."
                        : "Control diario de atención, cartera, tareas vencidas y carga del equipo."}</p>
                </div>
                <div class="ops-heading-actions">
                    <button type="button" class="secondary-btn" data-dashboard-module="inbox">Bandeja</button>
                    <button type="button" class="secondary-btn" data-dashboard-module="tareas">Tareas</button>
                    <button type="button" class="secondary-btn" data-dashboard-module="ventas">Ventas</button>
                </div>
            </div>

            <section class="ops-kpi-grid">
                <article class="metric-card ${trabajo.mensajes.length ? "danger-card" : ""}">
                    <span class="metric-label">Mensajes por responder</span>
                    <strong class="metric-value">${formatearNumero(trabajo.mensajes.length)}</strong>
                    <small>Entradas sin respuesta humana</small>
                </article>
                <article class="metric-card ${resumen.tareasVencidas ? "danger-card" : ""}">
                    <span class="metric-label">Tareas vencidas</span>
                    <strong class="metric-value">${formatearNumero(resumen.tareasVencidas)}</strong>
                    <small>${formatearNumero(resumen.tareasPendientes)} pendientes abiertas</small>
                </article>
                <article class="metric-card">
                    <span class="metric-label">Cartera abierta</span>
                    <strong class="metric-value">${formatearMoneda(resumen.montoAbierto || 0)}</strong>
                    <small>${formatearNumero(abiertas)} oportunidades activas</small>
                </article>
                <article class="metric-card">
                    <span class="metric-label">${vistaAsesor ? "Mi conversión" : "Win rate"}</span>
                    <strong class="metric-value">${winRate || conversionLeads}%</strong>
                    <small>${formatearMoneda(resumen.montoGanado || 0)} ganado</small>
                </article>
            </section>

            <section class="ops-grid">
                <article class="meta-panel ops-panel ops-priority-panel">
                    <div class="panel-heading-with-action">
                        <div>
                            <span class="panel-kicker">Prioridad</span>
                            <h2>${vistaAsesor ? "Siguiente acción" : "Trabajo que bloquea avance"}</h2>
                        </div>
                        <span class="alert-chip">${formatearNumero(trabajo.total)} acciones</span>
                    </div>
                    <div class="ops-action-list">
                        ${acciones.map(renderAccionOperativa).join("") || '<div class="empty">No hay acciones urgentes. Revisa pipeline y prepara próximos seguimientos.</div>'}
                    </div>
                </article>

                <article class="meta-panel ops-panel">
                    <div class="panel-heading-with-action">
                        <div>
                            <span class="panel-kicker">Pipeline</span>
                            <h2>Valor por etapa abierta</h2>
                        </div>
                        <button type="button" class="mini-action" data-dashboard-module="pipeline">Abrir pipeline</button>
                    </div>
                    <div class="ops-bar-list">
                        ${etapaRows.map(item => `
                            <div class="ops-bar-row">
                                <div><strong>${escapeHtml(item.etapa)}</strong><span>${formatearNumero(item.cantidad)} oportunidades</span></div>
                                <span class="chart-track"><span class="chart-bar whatsapp" style="width:${Math.max(calcularPorcentaje(item.montoTotal, maxEtapaMonto), item.montoTotal > 0 ? 8 : 0)}%"></span></span>
                                <em>${formatearMoneda(item.montoTotal || 0)}</em>
                            </div>`).join("") || '<div class="empty">Sin oportunidades abiertas.</div>'}
                    </div>
                </article>

                <article class="meta-panel ops-panel">
                    <div class="panel-heading-with-action">
                        <div>
                            <span class="panel-kicker">Atención</span>
                            <h2>Conversaciones activas</h2>
                        </div>
                        <span class="alert-chip">${tasaRespuesta}% respuesta</span>
                    </div>
                    <div class="ops-bar-list">
                        ${estadosAbiertos.map(item => `
                            <div class="ops-bar-row">
                                <div><strong>${escapeHtml(item.estado)}</strong><span>Estado del lead</span></div>
                                <span class="chart-track"><span class="chart-bar facebook" style="width:${Math.max(calcularPorcentaje(item.cantidad, maxEstado), item.cantidad > 0 ? 8 : 0)}%"></span></span>
                                <em>${formatearNumero(item.cantidad)}</em>
                            </div>`).join("") || '<div class="empty">Sin conversaciones activas.</div>'}
                    </div>
                </article>

                ${vistaAsesor ? `
                    <article class="meta-panel ops-panel">
                        <div class="panel-heading-with-action">
                            <div>
                                <span class="panel-kicker">Agenda</span>
                                <h2>Después de hoy</h2>
                            </div>
                            <button type="button" class="mini-action" data-dashboard-module="tareas">Ver tareas</button>
                        </div>
                        <div class="ops-action-list compact">
                            ${trabajo.tareasFuturas.slice(0, 6).map(item => renderAccionOperativa({
                                titulo: item.titulo || "Seguimiento",
                                detalle: item.cliente || "Sin cliente",
                                meta: item.vence ? formatearFecha(item.vence) : "Sin fecha",
                                conversacionId: item.conversacionId,
                                urgente: false
                            })).join("") || '<div class="empty">No hay tareas futuras programadas.</div>'}
                        </div>
                    </article>`
                    : `<article class="meta-panel ops-panel">
                        <div class="panel-heading-with-action">
                            <div>
                                <span class="panel-kicker">Equipo</span>
                                <h2>Carga por asesor</h2>
                            </div>
                            ${puedeGestionarEquipoCRM() ? '<button type="button" id="dashboardRebalanceButton" class="mini-action">Repartir pendientes</button>' : ""}
                        </div>
                        <div class="ops-team-list">
                            ${carga.slice(0, 8).map(item => `
                                <div class="ops-team-row ${item.tareasVencidas ? "danger" : ""}">
                                    <div>
                                        <strong>${escapeHtml(item.nombre || "Usuario")}</strong>
                                        <span>${escapeHtml(item.rol || "Asesor")}</span>
                                    </div>
                                    <small>${formatearNumero(item.conversacionesActivas || 0)} chats</small>
                                    <small>${formatearNumero(item.tareasPendientes || 0)} tareas</small>
                                    <small>${formatearNumero(item.oportunidadesAbiertas || 0)} ventas</small>
                                    <b>${formatearNumero(item.cargaTotal || 0)}</b>
                                </div>`).join("") || '<div class="empty">Sin asesores activos.</div>'}
                        </div>
                        ${asesorSobrecargado ? `<p class="ops-footnote">Mayor carga: ${escapeHtml(asesorSobrecargado.nombre || "Sin asignación")} con ${formatearNumero(asesorSobrecargado.cargaTotal || 0)} elementos abiertos.</p>` : ""}
                    </article>`}
            </section>
        </div>`;

    vista.querySelectorAll("[data-dashboard-module]").forEach(button => {
        button.addEventListener("click", () => abrirModulo(button.dataset.dashboardModule));
    });

    vista.querySelectorAll("[data-today-conversation]").forEach(elemento => {
        elemento.addEventListener("click", async () => {
            const conversacionId = Number(elemento.dataset.todayConversation);
            if (!conversacionId) return;
            if (typeof abrirDetalleConversacion === "function") {
                await abrirDetalleConversacion(conversacionId, "dashboard");
                return;
            }
            if (typeof abrirConversacionDesdeNotificacion === "function") {
                await abrirConversacionDesdeNotificacion(conversacionId);
            }
        });
    });

    const rebalanceButton = vista.querySelector("#dashboardRebalanceButton");
    rebalanceButton?.addEventListener("click", async () => {
        rebalanceButton.disabled = true;
        rebalanceButton.textContent = "Repartiendo...";
        try {
            const response = await api("/api/crm/conversaciones/asignar-pendientes", { method: "POST" });
            if (!response.ok) throw new Error("No se pudo repartir");
            const resultado = await response.json();
            await cargarModuloDashboard(vista);
            notificar(resultado.asignadas > 0
                ? `Se reasignaron ${resultado.asignadas} conversaciones pendientes.`
                : "No había conversaciones pendientes por repartir.", "success");
        } catch (error) {
            console.error(error);
            notificar("No se pudo repartir la carga de pendientes.", "error");
            rebalanceButton.disabled = false;
            rebalanceButton.textContent = "Repartir pendientes";
        }
    });
}
