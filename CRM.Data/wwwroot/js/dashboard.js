// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        async function cargarModuloDashboard(vista) {
            const [response, metaResponse, fallosResponse] = await Promise.all([
                api("/api/crm/reportes/resumen"),
                api("/api/integraciones/meta/estadisticas").catch(() => null),
                api("/api/crm/fallos?pageSize=5").catch(() => null)
            ]);
            if (!response.ok) throw new Error("Dashboard no disponible");
            const reporte = await response.json();
            if (metaResponse?.ok) {
                reporte.meta = await metaResponse.json();
            }
            if (fallosResponse?.ok) {
                reporte.fallos = await fallosResponse.json();
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
                const meta = (reporte.meta?.canales || reporte.meta?.Canales || [])
                    .find(item => (item.canal || item.Canal) === canal.canal) || {};
                const metaConfigurado = Boolean(meta.configurado ?? meta.Configurado);
                const metaAlcance = Number(meta.alcance ?? meta.Alcance ?? 0);
                const metaImpresiones = Number(meta.impresiones ?? meta.Impresiones ?? 0);
                const metaInteracciones = Number(meta.interacciones ?? meta.Interacciones ?? 0);
                return {
                    ...canal,
                    conectado: Boolean(datos.conectado || metaConfigurado),
                    clientes: Math.max(Number(datos.clientes || 0), metaAlcance),
                    conversaciones: Number(datos.conversaciones || 0),
                    interacciones: Number(datos.interacciones || 0) + metaInteracciones,
                    entrantes: Number(datos.entrantes || 0),
                    salientes: Number(datos.salientes || 0),
                    oportunidades: Number(datos.oportunidades || 0),
                    montoAbierto: Number(datos.montoAbierto || 0),
                    montoGanado: Number(datos.montoGanado || 0),
                    tareasPendientes: Number(datos.tareasPendientes || 0),
                    tareasVencidas: Number(datos.tareasVencidas || 0),
                    alcance: metaAlcance,
                    impresiones: metaImpresiones,
                    metaInteracciones
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
                tareasVencidas: total.tareasVencidas + canal.tareasVencidas,
                alcance: total.alcance + Number(canal.alcance || 0),
                impresiones: total.impresiones + Number(canal.impresiones || 0),
                metaInteracciones: total.metaInteracciones + Number(canal.metaInteracciones || 0)
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
                tareasVencidas: 0,
                alcance: 0,
                impresiones: 0,
                metaInteracciones: 0
            });
        }

        function calcularPorcentaje(parte, total) {
            if (!total) return 0;
            return Math.round((Number(parte || 0) / Number(total || 0)) * 100);
        }

        function crearAvisosDashboard(reporte, resumen, canales) {
            if (typeof registrarNotificacionSistema !== "function") return;
            if (Number(resumen.tareasVencidas || 0) > 0) {
                registrarNotificacionSistema({
                    id: "dashboard-tareas-vencidas",
                    titulo: "Tareas vencidas",
                    detalle: `${resumen.tareasVencidas} seguimiento(s) requieren atención`,
                    tipo: "TAREAS"
                });
            }

            const totalFallos = Number(reporte.fallos?.total || 0);
            if (totalFallos > 0) {
                registrarNotificacionSistema({
                    id: "dashboard-fallos-integracion",
                    titulo: "Fallos de integración",
                    detalle: `${totalFallos} evento(s) para revisar`,
                    tipo: "FALLOS"
                });
            }

            const pendientes = canales.reduce((total, canal) => total + Number(canal.entrantes || 0), 0) -
                canales.reduce((total, canal) => total + Number(canal.salientes || 0), 0);
            if (pendientes > 0) {
                registrarNotificacionSistema({
                    id: "dashboard-mensajes-pendientes",
                    titulo: "Mensajes por responder",
                    detalle: `${pendientes} conversación(es) con más entradas que salidas`,
                    tipo: "ATENCION"
                });
            }
        }

        function crearLogoRed(clase) {
            const logos = {
                all: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="7" cy="7" r="3.1"></circle>
                        <circle cx="17" cy="7" r="3.1"></circle>
                        <circle cx="7" cy="17" r="3.1"></circle>
                        <circle cx="17" cy="17" r="3.1"></circle>
                    </svg>`,
                whatsapp: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.7 22l5.2-1.4A9.7 9.7 0 1 0 12 2.2Zm0 17.6a7.8 7.8 0 0 1-4-1.1l-.3-.2-3.1.8.8-3-.2-.3A7.8 7.8 0 1 1 12 19.8Zm4.5-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.9 1-.2.2-.3.2-.6.1-.2-.1-1-.4-1.9-1.1-.7-.6-1.2-1.3-1.3-1.5-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.2-.3-.2-.5-.3Z"></path>
                    </svg>`,
                instagram: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.3A4.7 4.7 0 1 1 12 16.7a4.7 4.7 0 0 1 0-9.4Zm0 2A2.7 2.7 0 1 0 12 14.7a2.7 2.7 0 0 0 0-5.4Zm5-2.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"></path>
                    </svg>`,
                facebook: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14.1 22v-8.6h2.9l.5-3.4h-3.4V7.8c0-1 .3-1.7 1.8-1.7h1.8v-3c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V10H7.6v3.4h2.9V22h3.6Z"></path>
                    </svg>`,
                tiktok: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16.2 2c.4 2.4 1.7 3.9 4.1 4.1v3.4a7.2 7.2 0 0 1-4.1-1.3v6.3c0 4.1-2.6 7.2-6.8 7.2A6.1 6.1 0 0 1 3.3 16c0-3.4 2.6-6 6.4-6 .4 0 .8 0 1.1.1v3.6a3.3 3.3 0 0 0-1.2-.2 2.5 2.5 0 1 0 2.6 2.5V2h4Z"></path>
                    </svg>`
            };

            return `<span class="brand-logo ${clase}">${logos[clase] || logos.all}</span>`;
        }

        function renderDashboard(vista, reporte) {
            const canales = obtenerCanalesDashboard(reporte);
            const canalesFiltrados = dashboardCanalActivo === "TODOS"
                ? canales
                : canales.filter(canal => canal.canal === dashboardCanalActivo);
            const resumen = sumarCanalesDashboard(canalesFiltrados);
            const maxInteracciones = Math.max(...canales.map(canal => canal.interacciones), 1);
            const tasaRespuesta = calcularPorcentaje(resumen.salientes, resumen.entrantes);
            const conversionLeads = calcularPorcentaje(resumen.oportunidades, resumen.clientes);
            const interaccionesPorCliente = resumen.clientes
                ? (resumen.interacciones / resumen.clientes).toFixed(1)
                : "0.0";
            const redesConDatos = canales.filter(canal => canal.interacciones > 0).length;
            const fallosTotal = Number(reporte.fallos?.total || 0);
            const asesorConMayorCarga = (reporte.cargaAsesores || [])[0];
            const canalMasFuerte = canales
                .slice()
                .sort((a, b) => Number(b.montoGanado || 0) - Number(a.montoGanado || 0) || Number(b.interacciones || 0) - Number(a.interacciones || 0))[0];
            const saludOperativa = resumen.tareasVencidas || fallosTotal
                ? "Requiere atención"
                : resumen.entrantes > resumen.salientes
                    ? "Con cola activa"
                    : "Estable";
            crearAvisosDashboard(reporte, resumen, canales);
            const estados = dashboardCanalActivo === "TODOS" || dashboardCanalActivo === "WHATSAPP"
                ? (reporte.porEstado || [])
                : [];
            const canalActual = canales.find(canal => canal.canal === dashboardCanalActivo);
            const tituloFiltro = dashboardCanalActivo === "TODOS" ? "Todas las redes" : canalActual?.nombre || "Red";
            const textoFiltro = dashboardCanalActivo === "TODOS"
                ? "Vista consolidada de las redes conectadas al CRM."
                : resumen.interacciones > 0
                    ? `Rendimiento de ${tituloFiltro} dentro del CRM.`
                    : `${tituloFiltro} aparecerá con métricas cuando se conecte su API y empiece a recibir interacciones.`;
            const funnel = [
                { nombre: "Contactos", valor: resumen.clientes },
                { nombre: "Conversaciones", valor: resumen.conversaciones },
                { nombre: "Interacciones", valor: resumen.interacciones },
                { nombre: "Leads / oportunidades", valor: resumen.oportunidades }
            ];
            const maxFunnel = Math.max(...funnel.map(item => item.valor), 1);

            vista.innerHTML = `
                <div class="meta-dashboard">
                    <div class="dashboard-toolbar">
                        <div>
                            <h1>Panel de estadísticas</h1>
                            <p>${escapeHtml(textoFiltro)}</p>
                        </div>
                        <div class="network-tabs" role="tablist" aria-label="Filtrar por red">
                            ${[{ canal: "TODOS", nombre: "Todas", clase: "all" }, ...canales].map(canal => `
                                <button type="button" class="network-tab ${dashboardCanalActivo === canal.canal ? "active" : ""}" data-dashboard-channel="${canal.canal}" title="${escapeAttribute(canal.nombre)}" aria-label="${escapeAttribute(canal.nombre)}">
                                    ${crearLogoRed(canal.clase)}
                                    <span class="network-tab-label">${escapeHtml(canal.nombre)}</span>
                                </button>`).join("")}
                        </div>
                    </div>

                    <section class="executive-strip">
                        <article class="${resumen.tareasVencidas || fallosTotal ? "attention" : "ok"}">
                            <span>Salud operativa</span>
                            <strong>${escapeHtml(saludOperativa)}</strong>
                            <small>${formatearNumero(resumen.tareasVencidas)} tareas vencidas · ${formatearNumero(fallosTotal)} fallos</small>
                        </article>
                        <article>
                            <span>Canal más fuerte</span>
                            <strong>${escapeHtml(canalMasFuerte?.nombre || "Sin data")}</strong>
                            <small>${formatearMoneda(canalMasFuerte?.montoGanado || 0)} ganado · ${formatearNumero(canalMasFuerte?.interacciones || 0)} interacciones</small>
                        </article>
                        <article>
                            <span>Asesor con más carga</span>
                            <strong>${escapeHtml(asesorConMayorCarga?.nombre || "Sin asignación")}</strong>
                            <small>${formatearNumero(asesorConMayorCarga?.conversacionesActivas || 0)} chats · ${formatearNumero(asesorConMayorCarga?.tareasPendientes || 0)} tareas · ${formatearNumero(asesorConMayorCarga?.oportunidadesAbiertas || 0)} ventas</small>
                        </article>
                        <article>
                            <span>Tasa de respuesta</span>
                            <strong>${tasaRespuesta}%</strong>
                            <small>${formatearNumero(resumen.salientes)} salientes / ${formatearNumero(resumen.entrantes)} entrantes</small>
                        </article>
                    </section>

                    <section class="insight-grid">
                        <article class="insight-card primary">
                            <span>Contactos alcanzados</span>
                            <strong>${formatearNumero(resumen.clientes)}</strong>
                            <small>${formatearNumero(resumen.alcance || resumen.clientes)} alcance Meta/CRM</small>
                        </article>
                        <article class="insight-card">
                            <span>Interacciones</span>
                            <strong>${formatearNumero(resumen.interacciones)}</strong>
                            <small>${formatearNumero(resumen.impresiones)} impresiones Meta</small>
                        </article>
                        <article class="insight-card">
                            <span>Mensajes recibidos</span>
                            <strong>${formatearNumero(resumen.entrantes)}</strong>
                            <small>${tasaRespuesta}% de respuesta registrada</small>
                        </article>
                        <article class="insight-card">
                            <span>Leads generados</span>
                            <strong>${formatearNumero(resumen.oportunidades)}</strong>
                            <small>${conversionLeads}% sobre contactos</small>
                        </article>
                        <article class="insight-card">
                            <span>Ventas ganadas</span>
                            <strong>${formatearMoneda(resumen.montoGanado)}</strong>
                            <small>${formatearMoneda(resumen.montoAbierto)} en venta abierta</small>
                        </article>
                    </section>

                    <section class="dashboard-layout">
                        <article class="meta-panel performance-panel">
                            <div>
                                <span class="panel-kicker">Rendimiento</span>
                                <h2>Interacciones por red</h2>
                            </div>
                            <div class="performance-chart">
                                ${canales.map(canal => `
                                    <button type="button" class="chart-row ${dashboardCanalActivo === canal.canal ? "active" : ""}" data-dashboard-channel="${canal.canal}">
                                        <span class="chart-label">
                                            ${crearLogoRed(canal.clase)}
                                            ${escapeHtml(canal.nombre)}
                                        </span>
                                        <span class="chart-track">
                                            <span class="chart-bar ${canal.clase}" style="width:${Math.max(calcularPorcentaje(canal.interacciones, maxInteracciones), canal.interacciones > 0 ? 8 : 0)}%"></span>
                                        </span>
                                        <strong>${formatearNumero(canal.interacciones)}</strong>
                                    </button>`).join("")}
                            </div>
                        </article>

                        <article class="meta-panel">
                            <span class="panel-kicker">Embudo</span>
                            <h2>Del mensaje al lead</h2>
                            <div class="funnel-list">
                                ${funnel.map(item => `
                                    <div class="funnel-item">
                                        <div>
                                            <strong>${escapeHtml(item.nombre)}</strong>
                                            <span>${formatearNumero(item.valor)}</span>
                                        </div>
                                        <div class="funnel-track">
                                            <span style="width:${Math.max(calcularPorcentaje(item.valor, maxFunnel), item.valor > 0 ? 8 : 0)}%"></span>
                                        </div>
                                    </div>`).join("")}
                            </div>
                        </article>

                        <article class="meta-panel">
                            <span class="panel-kicker">Atención</span>
                            <h2>Estado de conversaciones</h2>
                            <div class="status-list">
                                ${estados.map(item => `
                                    <div class="status-item">
                                        <span>${escapeHtml(item.estado)}</span>
                                        <strong>${formatearNumero(item.cantidad)}</strong>
                                    </div>`).join("") || '<div class="empty">Sin conversaciones registradas.</div>'}
                            </div>
                        </article>

                        <article class="meta-panel">
                            <span class="panel-kicker">Seguimiento</span>
                            <h2>Acciones comerciales</h2>
                            <div class="action-summary">
                                <div><span>Tareas pendientes</span><strong>${formatearNumero(resumen.tareasPendientes)}</strong></div>
                                <div><span>Tareas vencidas</span><strong>${formatearNumero(resumen.tareasVencidas)}</strong></div>
                                <div><span>Venta abierta</span><strong>${formatearMoneda(resumen.montoAbierto)}</strong></div>
                                <div><span>Redes con data</span><strong>${formatearNumero(redesConDatos)}</strong></div>
                            </div>
                        </article>
                    </section>

                    <section class="meta-panel content-panel">
                        <div>
                            <span class="panel-kicker">Desglose</span>
                            <h2>Resumen por plataforma</h2>
                        </div>
                        <div class="platform-grid">
                            ${canales.map(canal => `
                                <button type="button" class="platform-card ${dashboardCanalActivo === canal.canal ? "active" : ""}" data-dashboard-channel="${canal.canal}">
                                    ${crearLogoRed(canal.clase)}
                                    <strong>${escapeHtml(canal.nombre)}</strong>
                                    <span>${formatearNumero(canal.clientes)} contactos</span>
                                    <span>${formatearNumero(canal.entrantes)} recibidos · ${formatearNumero(canal.salientes)} enviados</span>
                                    ${canal.alcance || canal.impresiones ? `<span>${formatearNumero(canal.alcance)} alcance · ${formatearNumero(canal.impresiones)} impresiones</span>` : ""}
                                </button>`).join("")}
                        </div>
                    </section>

                    <section class="dashboard-note">
                        <strong>${escapeHtml(tituloFiltro)}</strong>
                        <span>Facebook e Instagram pueden sumar datos de Graph API cuando sus tokens, páginas e Instagram Business ID estén configurados en Conexiones.</span>
                    </section>
                </div>`;

            vista.querySelectorAll("[data-dashboard-channel]").forEach(elemento => {
                elemento.addEventListener("click", () => {
                    dashboardCanalActivo = elemento.dataset.dashboardChannel;
                    renderDashboard(vista, reporte);
                });
            });
        }
