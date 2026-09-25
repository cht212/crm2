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

let instagramGradientSeed = 0;

function crearLogoRed(clase) {
    const logos = {
        all: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="3.1"></circle><circle cx="17" cy="7" r="3.1"></circle><circle cx="7" cy="17" r="3.1"></circle><circle cx="17" cy="17" r="3.1"></circle></svg>',
        whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#25D366"></circle><path fill="#fff" d="M12.05 4.15a7.72 7.72 0 0 0-6.7 11.55l-.84 3.15 3.24-.85a7.72 7.72 0 1 0 4.3-13.85Zm0 14.1a6.35 6.35 0 0 1-3.22-.88l-.23-.14-1.92.5.51-1.86-.15-.24a6.35 6.35 0 1 1 5.01 2.62Zm3.48-4.76c-.19-.1-1.13-.56-1.3-.62-.18-.07-.31-.1-.44.1-.13.18-.5.61-.62.74-.11.13-.23.14-.42.05-.19-.1-.8-.3-1.53-.94-.56-.5-.94-1.12-1.05-1.31-.11-.19-.01-.3.08-.39.08-.08.19-.22.28-.33.1-.11.13-.19.19-.32.06-.13.03-.24-.02-.33-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.34h-.38c-.13 0-.34.05-.52.24-.18.19-.68.67-.68 1.64s.7 1.9.8 2.03c.1.13 1.38 2.11 3.35 2.96.47.2.83.32 1.12.41.47.15.9.13 1.24.08.38-.06 1.13-.46 1.29-.9.16-.44.16-.82.11-.9-.05-.08-.18-.13-.37-.22Z"></path></svg>',
        instagram: (() => {
            // Glifo oficial de Instagram (el mismo trazado que usa Meta en su
            // press kit), no una aproximacion dibujada a mano con rect/circle.
            const gradientId = `igGradient-${++instagramGradientSeed}`;
            return `<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="64" y1="448" x2="448" y2="64"><stop offset="0" stop-color="#FEDA75"></stop><stop offset=".25" stop-color="#FA7E1E"></stop><stop offset=".5" stop-color="#D62976"></stop><stop offset=".75" stop-color="#962FBF"></stop><stop offset="1" stop-color="#4F5BD5"></stop></linearGradient></defs><rect width="512" height="512" rx="150" fill="url(#${gradientId})"></rect><path fill="#fff" d="M256,49.471c67.266,0,75.233.257,101.8,1.469,24.562,1.121,37.9,5.224,46.778,8.674a78.052,78.052,0,0,1,28.966,18.845,78.052,78.052,0,0,1,18.845,28.966c3.45,8.877,7.554,22.216,8.674,46.778,1.212,26.565,1.469,34.532,1.469,101.8s-0.257,75.233-1.469,101.8c-1.121,24.562-5.225,37.9-8.674,46.778a83.427,83.427,0,0,1-47.811,47.811c-8.877,3.45-22.216,7.554-46.778,8.674-26.56,1.212-34.527,1.469-101.8,1.469s-75.237-.257-101.8-1.469c-24.562-1.121-37.9-5.225-46.778-8.674a78.051,78.051,0,0,1-28.966-18.845,78.053,78.053,0,0,1-18.845-28.966c-3.45-8.877-7.554-22.216-8.674-46.778-1.212-26.564-1.469-34.532-1.469-101.8s0.257-75.233,1.469-101.8c1.121-24.562,5.224-37.9,8.674-46.778A78.052,78.052,0,0,1,78.458,78.458a78.053,78.053,0,0,1,28.966-18.845c8.877-3.45,22.216-7.554,46.778-8.674,26.565-1.212,34.532-1.469,101.8-1.469m0-45.391c-68.418,0-77,.29-103.866,1.516-26.815,1.224-45.127,5.482-61.151,11.71a123.488,123.488,0,0,0-44.62,29.057A123.488,123.488,0,0,0,17.3,90.982C11.077,107.007,6.819,125.319,5.6,152.134,4.369,179,4.079,187.582,4.079,256S4.369,333,5.6,359.866c1.224,26.815,5.482,45.127,11.71,61.151a123.489,123.489,0,0,0,29.057,44.62,123.486,123.486,0,0,0,44.62,29.057c16.025,6.228,34.337,10.486,61.151,11.71,26.87,1.226,35.449,1.516,103.866,1.516s77-.29,103.866-1.516c26.815-1.224,45.127-5.482,61.151-11.71a128.817,128.817,0,0,0,73.677-73.677c6.228-16.025,10.486-34.337,11.71-61.151,1.226-26.87,1.516-35.449,1.516-103.866s-0.29-77-1.516-103.866c-1.224-26.815-5.482-45.127-11.71-61.151a123.486,123.486,0,0,0-29.057-44.62A123.487,123.487,0,0,0,421.018,17.3C404.993,11.077,386.681,6.819,359.866,5.6,333,4.369,324.418,4.079,256,4.079h0Z"></path><path fill="#fff" d="M256,126.635A129.365,129.365,0,1,0,385.365,256,129.365,129.365,0,0,0,256,126.635Zm0,213.338A83.973,83.973,0,1,1,339.974,256,83.974,83.974,0,0,1,256,339.973Z"></path><circle cx="390.476" cy="121.524" r="30.23" fill="#fff"></circle></svg>`;
        })(),
        facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"></circle><path fill="#fff" d="M15.45 12.72l.36-2.34h-2.25V8.86c0-.64.31-1.26 1.31-1.26h1.02v-2s-.93-.16-1.82-.16c-1.86 0-3.07 1.13-3.07 3.16v1.78H8.94v2.34H11v5.66h2.56v-5.66h1.89Z"></path></svg>',
        tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#000"></circle><path fill="#25F4EE" d="M16.25 8.15a5.43 5.43 0 0 0 3.15 1.01V6.83a3.1 3.1 0 0 1-.67-.07v1.84a5.43 5.43 0 0 1-3.15-1.01v6.58a4.78 4.78 0 0 1-7.46 3.96 4.77 4.77 0 0 0 8.13-3.39V8.15Zm.82-2.3a3.08 3.08 0 0 1-.82-1.8v-.3h-.64a3.1 3.1 0 0 0 1.46 2.1ZM9.38 15.56a2.18 2.18 0 0 1 2.55-3.4V9.77a4.8 4.8 0 0 0-.67-.04v1.86a2.18 2.18 0 0 0-1.88 3.97Z"></path><path fill="#FE2C55" d="M15.58 7.59a5.43 5.43 0 0 0 3.15 1.01V6.76a3.1 3.1 0 0 1-1.66-.91 3.1 3.1 0 0 1-1.46-2.1h-1.69v10.99a2.18 2.18 0 0 1-4.54.82 2.18 2.18 0 0 1 1.88-3.97V9.73a4.77 4.77 0 0 0-3.14 8.4 4.78 4.78 0 0 0 7.46-3.96V7.59Z"></path><path fill="#fff" d="M14.92 7.02a5.43 5.43 0 0 0 3.15 1.01V6.2a3.1 3.1 0 0 1-1.66-.91 3.08 3.08 0 0 1-.82-1.8h-2.33v10.99a2.18 2.18 0 1 1-2-2.15V9.16a4.78 4.78 0 1 0 3.66 4.64V7.02Z"></path></svg>'
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
                        ${acciones.map(renderAccionOperativa).join("") || '<div class="empty">No hay acciones urgentes. Revisa leads y prepara próximos seguimientos.</div>'}
                    </div>
                </article>

                <article class="meta-panel ops-panel">
                    <div class="panel-heading-with-action">
                        <div>
                            <span class="panel-kicker">Ventas</span>
                            <h2>Oportunidades por etapa</h2>
                        </div>
                        <button type="button" class="mini-action" data-dashboard-module="ventas">Abrir ventas</button>
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