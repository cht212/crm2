// Módulo frontend del CRM.

        async function cargarModuloActividad(vista, entidad = "") {
            if (!puedeGestionarEquipoCRM()) {
                vista.innerHTML = '<div class="error">Solo administradores y supervisores pueden ver la actividad.</div>';
                return;
            }

            const query = entidad ? `?entidad=${encodeURIComponent(entidad)}&pageSize=100` : "?pageSize=100";
            const response = await api(`/api/crm/actividad${query}`);
            if (!response.ok) throw new Error("Actividad no disponible");
            const pagina = await response.json();
            const items = pagina.items || [];
            const entidades = ["", "Cliente", "Conversacion", "Oportunidad", "Tarea"];

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Actividad</h1>
                        <p>Historial de cambios importantes realizados por el equipo.</p>
                    </div>
                </div>
                <section class="activity-workspace">
                    <div class="task-filters">
                        ${entidades.map(item => `
                            <button type="button" class="filter-button ${entidad === item ? "active" : ""}" data-activity-filter="${item}">
                                ${item || "Todo"}
                            </button>`).join("")}
                    </div>
                    <div class="activity-timeline">
                        ${items.map(item => `
                            <article class="activity-item">
                                <div class="activity-dot"></div>
                                <div class="activity-card">
                                    <div class="activity-head">
                                        <strong>${escapeHtml(formatearAccionActividad(item.accion))}</strong>
                                        <span>${formatearFecha(item.fecha)}</span>
                                    </div>
                                    <p>${escapeHtml(item.entidad)} #${escapeHtml(String(item.entidadId || ""))}</p>
                                    <div class="activity-values">
                                        ${item.anterior ? `<span><b>Antes:</b> ${escapeHtml(item.anterior)}</span>` : ""}
                                        ${item.nuevo ? `<span><b>Ahora:</b> ${escapeHtml(item.nuevo)}</span>` : ""}
                                    </div>
                                    <small>${escapeHtml(item.usuario || "sistema")}</small>
                                </div>
                            </article>`).join("") || '<div class="empty">Sin actividad registrada.</div>'}
                    </div>
                </section>`;

            vista.querySelectorAll("[data-activity-filter]").forEach(button => {
                button.addEventListener("click", () => cargarModuloActividad(vista, button.dataset.activityFilter));
            });
        }

        function formatearAccionActividad(accion) {
            const valor = (accion || "").toString().trim().toUpperCase();
            const etiquetas = {
                ACTUALIZACION_PERFIL_META: "Perfil Meta actualizado",
                EDICION: "Edición",
                CREACION: "Creación",
                CAMBIO_ESTADO: "Cambio de estado",
                ASIGNACION: "Asignación",
                REASIGNACION: "Reasignación",
                NOTA: "Nota interna",
                TAREA: "Tarea",
                VENTA: "Venta"
            };

            if (etiquetas[valor]) return etiquetas[valor];
            return valor
                ? valor.toLowerCase().replaceAll("_", " ").replace(/^\w/, letra => letra.toUpperCase())
                : "Actividad";
        }

        async function cargarModuloReportes(vista) {
            if (esRol("asesor") && sesionActual?.id && !reportesFiltros.usuarioId) {
                reportesFiltros.usuarioId = String(sesionActual.id);
            }

            const params = new URLSearchParams();
            if (reportesFiltros.desde) params.set("desde", reportesFiltros.desde);
            if (reportesFiltros.hasta) params.set("hasta", reportesFiltros.hasta);
            if (reportesFiltros.usuarioId) params.set("usuarioId", reportesFiltros.usuarioId);
            const query = params.toString();
            const [response, usuarios] = await Promise.all([
                api(`/api/crm/reportes/resumen${query ? `?${query}` : ""}`),
                cargarUsuarios()
            ]);
            if (!response.ok) throw new Error("Reportes no disponibles");
            const reporte = await response.json();
            const tareas = reporte.tareas || {};
            const oportunidades = reporte.oportunidades || {};
            const estados = reporte.porEstado || [];
            const etapas = oportunidades.porEtapa || [];
            const cargaAsesores = reporte.cargaAsesores || [];

            vista.innerHTML = `
                        <div class="module-heading"><div><h1>Reportes</h1><p>Resumen operativo del CRM.</p></div><button id="reportsExportButton" class="secondary-btn" type="button">Exportar CSV</button></div>
                        <form id="reportsFilterForm" class="report-filter-form">
                            <label>
                                <span>Desde</span>
                                <input type="date" name="desde" value="${escapeAttribute(reportesFiltros.desde)}">
                            </label>
                            <label>
                                <span>Hasta</span>
                                <input type="date" name="hasta" value="${escapeAttribute(reportesFiltros.hasta)}">
                            </label>
                            <label>
                                <span>Asesor</span>
                                <select name="usuarioId">
                                    <option value="">Todos los asesores</option>
                                    ${usuarios.map(usuario => `
                                        <option value="${usuario.id}" ${String(reportesFiltros.usuarioId) === String(usuario.id) ? "selected" : ""}>
                                            ${escapeHtml(usuario.nombre || usuario.usuario || "Usuario")}
                                        </option>`).join("")}
                                </select>
                            </label>
                            <div class="report-filter-actions">
                                <button type="submit" class="primary">Aplicar</button>
                                <button type="button" id="clearReportsFilter" class="ghost-button">Limpiar</button>
                            </div>
                        </form>
                        <div class="module-grid">
                            <div class="metric-card"><span class="metric-label">Clientes</span><strong class="metric-value">${reporte.clientes}</strong></div>
                            <div class="metric-card"><span class="metric-label">Conversaciones</span><strong class="metric-value">${reporte.conversaciones}</strong></div>
                            <div class="metric-card"><span class="metric-label">Mensajes recibidos</span><strong class="metric-value">${reporte.entrantes}</strong></div>
                            <div class="metric-card"><span class="metric-label">Mensajes enviados</span><strong class="metric-value">${reporte.salientes}</strong></div>
                            <div class="metric-card"><span class="metric-label">Tareas pendientes</span><strong class="metric-value">${tareas.pendientes || 0}</strong></div>
                            <div class="metric-card"><span class="metric-label">Tareas vencidas</span><strong class="metric-value">${tareas.vencidas || 0}</strong></div>
                            <div class="metric-card"><span class="metric-label">Ventas abiertas</span><strong class="metric-value">${formatearMoneda(oportunidades.montoAbierto || 0)}</strong></div>
                            <div class="metric-card"><span class="metric-label">Ventas ganadas</span><strong class="metric-value">${formatearMoneda(oportunidades.montoGanado || 0)}</strong></div>
                        </div>
                        <div class="report-sections">
                            <section class="report-section">
                                <h2>Conversaciones por estado</h2>
                                <table class="module-table"><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
                                <tbody>${estados.map(item => `<tr><td>${escapeHtml(item.estado)}</td><td>${item.cantidad}</td></tr>`).join("") || '<tr><td colspan="2">Sin conversaciones.</td></tr>'}</tbody></table>
                            </section>
                            <section class="report-section">
                                <h2>Oportunidades por etapa</h2>
                                <table class="module-table"><thead><tr><th>Etapa</th><th>Cantidad</th><th>Monto</th></tr></thead>
                                <tbody>${etapas.map(item => `<tr><td>${escapeHtml(item.etapa)}</td><td>${item.cantidad}</td><td>${formatearMoneda(item.montoTotal || 0)}</td></tr>`).join("") || '<tr><td colspan="3">Sin oportunidades.</td></tr>'}</tbody></table>
                            </section>
                            <section class="report-section">
                                <h2>Seguimiento</h2>
                                <div class="module-grid compact">
                                    <div class="metric-card"><span class="metric-label">Completadas</span><strong class="metric-value">${tareas.completadas || 0}</strong></div>
                                    <div class="metric-card"><span class="metric-label">Abiertas</span><strong class="metric-value">${oportunidades.abiertas || 0}</strong></div>
                                    <div class="metric-card"><span class="metric-label">Ganadas</span><strong class="metric-value">${oportunidades.ganadas || 0}</strong></div>
                                    <div class="metric-card"><span class="metric-label">Perdidas</span><strong class="metric-value">${oportunidades.perdidas || 0}</strong></div>
                                </div>
                            </section>
                            <section class="report-section">
                                <h2>Carga por asesor</h2>
                                <table class="module-table">
                                    <thead>
                                        <tr>
                                            <th>Asesor</th>
                                            <th>Chats activos</th>
                                            <th>Tareas pendientes</th>
                                            <th>Vencidas</th>
                                            <th>Ventas abiertas</th>
                                            <th>Monto abierto</th>
                                        </tr>
                                    </thead>
                                    <tbody>${cargaAsesores.map(item => `
                                        <tr>
                                            <td><strong>${escapeHtml(item.nombre || "Usuario")}</strong><br><small>${escapeHtml(item.rol || "")}</small></td>
                                            <td>${item.conversacionesActivas || 0}</td>
                                            <td>${item.tareasPendientes || 0}</td>
                                            <td>${item.tareasVencidas || 0}</td>
                                            <td>${item.oportunidadesAbiertas || 0}</td>
                                            <td>${formatearMoneda(item.montoAbierto || 0)}</td>
                                        </tr>`).join("") || '<tr><td colspan="6">Sin asesores activos.</td></tr>'}</tbody>
                                </table>
                            </section>
                        </div>
                        `;

            vista.querySelector("#reportsExportButton")?.addEventListener("click", () => descargarArchivo(`/api/crm/reportes/exportar${query ? `?${query}` : ""}`));

            const form = vista.querySelector("#reportsFilterForm");
            form?.addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(form));
                reportesFiltros = {
                    desde: datos.desde || "",
                    hasta: datos.hasta || "",
                    usuarioId: datos.usuarioId || ""
                };
                await cargarModuloReportes(vista);
            });

            vista.querySelector("#clearReportsFilter")?.addEventListener("click", async () => {
                reportesFiltros = { desde: "", hasta: "", usuarioId: "" };
                await cargarModuloReportes(vista);
            });
        }

        async function cargarEstadisticasPublicaciones(vista, desde, hasta) {
            const panel = vista.querySelector("#socialPublicationReport");
            if (!panel) return;
            const params = new URLSearchParams();
            if (desde) params.set("desde", desde);
            if (hasta) params.set("hasta", hasta);
            const response = await api(`/api/integraciones/publicaciones/estadisticas?${params}`);
            if (!panel.isConnected) return;
            if (!response.ok) {
                panel.innerHTML = "<h2>Publicaciones de redes</h2><p>No se pudieron cargar las estadísticas.</p>";
                return;
            }
            const data = await response.json();
            const canales = data.canales || [];
            const serie = data.serie || [];
            const publicaciones = canales.flatMap(canal => canal.posts || [])
                .sort((a, b) => String(b.publicadoEn).localeCompare(String(a.publicadoEn)));
            const max = Math.max(1, ...serie.map(item => Number(item.publicaciones || 0)));
            const urlSegura = url => {
                try { return new URL(url).protocol === "https:" ? url : ""; }
                catch { return ""; }
            };
            panel.innerHTML = `
                <h2>Publicaciones de Facebook, Instagram y TikTok</h2>
                <p>Filtrado por fecha de publicación (UTC). Las interacciones son los totales actuales de cada publicación.</p>
                <div class="module-grid compact">
                    ${canales.map(canal => `<div class="metric-card"><span class="metric-label">${escapeHtml(canal.canal)}</span>
                        <strong class="metric-value">${canal.posts?.length || 0}</strong><small>publicaciones</small>
                        ${canal.error ? `<small>${escapeHtml(canal.error)}</small>` : ""}
                        ${canal.partial ? "<small>Hay más publicaciones fuera de este resultado.</small>" : ""}</div>`).join("")}
                </div>
                <h3>Publicaciones por día</h3>
                <div class="social-report-chart">
                    ${serie.map(item => `<div class="social-report-row"><span>${escapeHtml(item.fecha)} · ${escapeHtml(item.canal)}</span>
                        <span class="chart-track"><span class="chart-bar ${escapeAttribute(item.canal.toLowerCase())}" style="width:${Math.round(100 * Number(item.publicaciones || 0) / max)}%"></span></span>
                        <strong>${Number(item.publicaciones || 0)}</strong></div>`).join("") || "<p>No hay publicaciones en el rango.</p>"}
                </div>
                <h3>Detalle de publicaciones</h3>
                <table class="module-table"><thead><tr><th>Fecha</th><th>Red</th><th>Publicación</th><th>Me gusta</th><th>Comentarios</th><th>Compartidos</th><th>Vistas</th></tr></thead>
                    <tbody>${publicaciones.map(item => `<tr><td>${escapeHtml(String(item.publicadoEn || "").slice(0, 10))}</td>
                        <td>${escapeHtml(item.canal)}</td><td>${urlSegura(item.url)
                            ? `<a href="${escapeAttribute(urlSegura(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml((item.texto || "Ver publicación").slice(0, 90))}</a>`
                            : escapeHtml((item.texto || item.id || "").slice(0, 90))}</td>
                        <td>${Number(item.meGusta || 0)}</td><td>${Number(item.comentarios || 0)}</td>
                        <td>${Number(item.compartidos || 0)}</td><td>${Number(item.visualizaciones || 0)}</td></tr>`).join("")
                        || '<tr><td colspan="7">Sin publicaciones.</td></tr>'}</tbody></table>`;
        }

        function rangoMarketingPredeterminado(dias = 30) {
            const hasta = new Date();
            const desde = new Date(hasta);
            desde.setDate(desde.getDate() - (dias - 1));
            const iso = fecha => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, "0");
                const day = String(fecha.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            };
            return { desde: iso(desde), hasta: iso(hasta) };
        }

        async function cargarModuloMarketing(vista) {
            if (!puedeGestionarEquipoCRM()) {
                vista.innerHTML = '<div class="error">Solo administradores y supervisores pueden consultar Marketing.</div>';
                return;
            }

            if (!marketingFiltros.desde || !marketingFiltros.hasta) {
                marketingFiltros = { ...rangoMarketingPredeterminado(30), canal: marketingFiltros.canal || "TODOS" };
            }

            const canalActivo = String(marketingFiltros.canal || "TODOS").toUpperCase();
            const params = new URLSearchParams({ desde: marketingFiltros.desde, hasta: marketingFiltros.hasta });
            const comentariosUrl = canalActivo === "TODOS"
                ? "/api/crm/comentarios?pageSize=12"
                : `/api/crm/comentarios?pageSize=12&canal=${encodeURIComponent(canalActivo)}`;
            vista.innerHTML = `
                <div class="module-heading marketing-heading"><div><h1>Marketing</h1><p>Preparando publicaciones, comentarios e indicadores de las redes conectadas.</p></div></div>
                <div class="marketing-loading"><i data-lucide="loader-circle"></i><span>Cargando analítica social…</span></div>`;
            if (window.lucide) window.lucide.createIcons();

            const consultarConLimite = (url, limiteMs = 15000) => Promise.race([
                api(url).catch(() => null),
                new Promise(resolve => setTimeout(() => resolve(null), limiteMs))
            ]);
            const [publicacionesResponse, metaResponse, comentariosResponse] = await Promise.all([
                consultarConLimite(`/api/integraciones/publicaciones/estadisticas?${params}`),
                consultarConLimite(`/api/integraciones/meta/estadisticas?${params}`),
                consultarConLimite(comentariosUrl, 8000)
            ]);

            const publicacionesData = publicacionesResponse?.ok ? await publicacionesResponse.json() : { canales: [], serie: [] };
            const metaData = metaResponse?.ok ? await metaResponse.json() : { canales: [], success: false };
            const comentariosData = comentariosResponse?.ok ? await comentariosResponse.json() : { items: [], total: 0 };
            const perteneceAlCanal = canal => canalActivo === "TODOS" || String(canal || "").toUpperCase() === canalActivo;
            const canalesPublicacion = (publicacionesData.canales || []).filter(canal => perteneceAlCanal(canal.canal));
            const publicaciones = canalesPublicacion.flatMap(canal => (canal.posts || []).map(item => ({
                ...item,
                canal: item.canal || canal.canal
            })))
                .sort((a, b) => String(b.publicadoEn || "").localeCompare(String(a.publicadoEn || "")));
            const serie = (publicacionesData.serie || []).filter(item => perteneceAlCanal(item.canal));
            const comentarios = (comentariosData.items || []).filter(item => perteneceAlCanal(item.canal));
            const insights = (metaData.canales || []).filter(item => perteneceAlCanal(item.canal));
            const redesMarketing = [
                { valor: "TODOS", etiqueta: "Todas", logo: "all" },
                { valor: "FACEBOOK", etiqueta: "Facebook", logo: "facebook" },
                { valor: "INSTAGRAM", etiqueta: "Instagram", logo: "instagram" },
                { valor: "TIKTOK", etiqueta: "TikTok", logo: "tiktok" }
            ];
            const diasSeleccionados = Math.round((new Date(`${marketingFiltros.hasta}T00:00:00`) - new Date(`${marketingFiltros.desde}T00:00:00`)) / 86400000) + 1;
            const total = publicaciones.reduce((acumulado, item) => ({
                publicaciones: acumulado.publicaciones + 1,
                meGusta: acumulado.meGusta + Number(item.meGusta || 0),
                comentarios: acumulado.comentarios + Number(item.comentarios || 0),
                compartidos: acumulado.compartidos + Number(item.compartidos || 0),
                visualizaciones: acumulado.visualizaciones + Number(item.visualizaciones || 0)
            }), { publicaciones: 0, meGusta: 0, comentarios: 0, compartidos: 0, visualizaciones: 0 });
            const serieInteracciones = serie.map(item => ({
                ...item,
                interacciones: Number(item.meGusta || 0) + Number(item.comentarios || 0) + Number(item.compartidos || 0)
            }));
            const maxInteracciones = Math.max(1, ...serieInteracciones.map(item => item.interacciones));
            const urlSegura = url => {
                try { return new URL(url).protocol === "https:" ? url : ""; }
                catch { return ""; }
            };

            vista.innerHTML = `
                <div class="module-heading marketing-heading">
                    <div><h1>Marketing</h1><p>Rendimiento de redes, publicaciones y conversaciones generadas por la audiencia.</p></div>
                    ${puedeVerModulo("conexiones") ? '<button type="button" class="secondary-btn" data-marketing-connections><i data-lucide="plug-zap"></i><span>Revisar conexiones</span></button>' : ""}
                </div>

                <section class="marketing-network-picker" aria-labelledby="marketingNetworkTitle">
                    <div><span class="panel-kicker">Canal</span><h2 id="marketingNetworkTitle">Red social a evaluar</h2></div>
                    <div class="marketing-network-options" role="group" aria-label="Seleccionar red social">
                        ${redesMarketing.map(red => `<button type="button" data-marketing-channel="${red.valor}" class="${canalActivo === red.valor ? "active" : ""}" aria-pressed="${canalActivo === red.valor}">${crearLogoRed(red.logo)}<span>${red.etiqueta}</span></button>`).join("")}
                    </div>
                </section>

                <form id="marketingFilterForm" class="marketing-filter-bar">
                    <div class="marketing-period-presets" aria-label="Periodos rápidos">
                        <button type="button" data-marketing-days="7" class="${diasSeleccionados === 7 ? "active" : ""}">7 días</button>
                        <button type="button" data-marketing-days="30" class="${diasSeleccionados === 30 ? "active" : ""}">30 días</button>
                        <button type="button" data-marketing-days="90" class="${diasSeleccionados === 90 ? "active" : ""}">90 días</button>
                    </div>
                    <label><span>Desde</span><input type="date" name="desde" value="${escapeAttribute(marketingFiltros.desde)}" required></label>
                    <label><span>Hasta</span><input type="date" name="hasta" value="${escapeAttribute(marketingFiltros.hasta)}" required></label>
                    <button type="submit" class="marketing-apply-button"><i data-lucide="refresh-cw"></i><span>Actualizar datos</span></button>
                </form>

                <section class="marketing-kpis" aria-label="Resumen de publicaciones">
                    <article><i data-lucide="panels-top-left"></i><span>Publicaciones</span><strong>${formatearNumero(total.publicaciones)}</strong></article>
                    <article><i data-lucide="heart"></i><span>Me gusta</span><strong>${formatearNumero(total.meGusta)}</strong></article>
                    <article><i data-lucide="message-circle"></i><span>Comentarios</span><strong>${formatearNumero(total.comentarios)}</strong></article>
                    <article><i data-lucide="share-2"></i><span>Compartidos</span><strong>${formatearNumero(total.compartidos)}</strong></article>
                    <article><i data-lucide="eye"></i><span>Vistas / impresiones</span><strong>${formatearNumero(total.visualizaciones)}</strong></article>
                </section>

                <section class="marketing-channel-grid">
                    ${insights.map(canal => `
                        <article class="marketing-channel-card ${canal.estado === "ERROR" ? "danger" : canal.configurado ? "ready" : "warning"}">
                            <div class="marketing-channel-head">${crearLogoRed(String(canal.canal || "").toLowerCase())}<div><h2>${escapeHtml(canal.nombre || canal.canal)}</h2><span>${escapeHtml(canal.estado || "Sin datos")}</span></div></div>
                            <div class="marketing-channel-metrics">
                                <span><small>Alcance</small><strong>${formatearNumero(canal.alcance || 0)}</strong></span>
                                <span><small>Impresiones</small><strong>${formatearNumero(canal.impresiones || 0)}</strong></span>
                                <span><small>Interacciones</small><strong>${formatearNumero(canal.interacciones || 0)}</strong></span>
                                ${String(canal.canal).toUpperCase() === "INSTAGRAM"
                                    ? `<span><small>Visitas al perfil</small><strong>${formatearNumero(canal.visitasPerfil || 0)}</strong></span><span><small>Clics al sitio</small><strong>${formatearNumero(canal.clicks || 0)}</strong></span>`
                                    : `<span><small>Seguidores</small><strong>${formatearNumero(canal.seguidores || 0)}</strong></span>`}
                            </div>
                            <p>${escapeHtml(canal.mensaje || "")}</p>
                        </article>`).join("") || '<article class="marketing-channel-card warning"><h2>Insights de Meta</h2><p>No hay métricas disponibles. Revisa las conexiones y permisos.</p></article>'}
                </section>

                <section class="marketing-layout">
                    <article class="meta-panel marketing-chart-panel">
                        <div class="panel-heading-with-action"><div><span class="panel-kicker">Tendencia</span><h2>Interacciones por día</h2></div><small>Me gusta + comentarios + compartidos</small></div>
                        <div class="marketing-chart">
                            ${serieInteracciones.map(item => `<div class="marketing-chart-row"><span>${escapeHtml(String(item.fecha))}</span><b>${escapeHtml(item.canal)}</b><span class="marketing-chart-track"><i style="width:${Math.max(3, Math.round(item.interacciones * 100 / maxInteracciones))}%"></i></span><strong>${formatearNumero(item.interacciones)}</strong></div>`).join("") || '<div class="empty">No hay interacciones para graficar en este periodo.</div>'}
                        </div>
                    </article>
                    <article class="meta-panel marketing-status-panel">
                        <div class="panel-heading-with-action"><div><span class="panel-kicker">Disponibilidad</span><h2>Estado de datos</h2></div></div>
                        <div class="marketing-source-list">
                            ${canalesPublicacion.map(canal => `<div class="${canal.error ? "danger" : "ready"}">${crearLogoRed(String(canal.canal || "").toLowerCase())}<span><strong>${escapeHtml(canal.canal)}</strong><small>${canal.error ? escapeHtml(canal.error) : `${formatearNumero(canal.posts?.length || 0)} publicaciones leídas`}</small></span></div>`).join("") || '<div class="empty">Sin fuentes configuradas.</div>'}
                        </div>
                    </article>
                </section>

                <section class="meta-panel marketing-publications-panel">
                    <div class="panel-heading-with-action"><div><span class="panel-kicker">Contenido</span><h2>Publicaciones y rendimiento</h2><p>Revisa la pieza publicada junto con sus resultados.</p></div><span class="alert-chip">${formatearNumero(publicaciones.length)} resultados</span></div>
                    <div class="marketing-publication-grid">${publicaciones.map(item => {
                        const imagen = urlSegura(item.imagenUrl);
                        const enlace = urlSegura(item.url);
                        const canal = String(item.canal || "").toLowerCase();
                        const contenido = escapeHtml((item.texto || item.id || "Publicación sin texto").slice(0, 280));
                        return `<article class="marketing-publication-card">
                            <div class="marketing-publication-media">${imagen ? `<img src="${escapeAttribute(imagen)}" alt="Vista de la publicación" loading="lazy">` : `<span>${crearLogoRed(canal)}<small>Vista previa no disponible</small></span>`}<div class="marketing-publication-badge">${crearLogoRed(canal)}<span>${escapeHtml(item.canal || "Red social")}</span></div></div>
                            <div class="marketing-publication-body"><time>${escapeHtml(String(item.publicadoEn || "").slice(0, 10) || "Sin fecha")}</time><p>${contenido}</p>
                                <div class="marketing-publication-metrics"><span><i data-lucide="heart"></i><b>${formatearNumero(item.meGusta || 0)}</b><small>Me gusta</small></span><span><i data-lucide="message-circle"></i><b>${formatearNumero(item.comentarios || 0)}</b><small>Comentarios</small></span><span><i data-lucide="share-2"></i><b>${formatearNumero(item.compartidos || 0)}</b><small>Compartidos</small></span><span><i data-lucide="eye"></i><b>${formatearNumero(item.visualizaciones || 0)}</b><small>Vistas</small></span></div>
                                ${enlace ? `<a class="marketing-publication-link" href="${escapeAttribute(enlace)}" target="_blank" rel="noopener noreferrer"><span>Ver publicación original</span><i data-lucide="external-link"></i></a>` : '<span class="marketing-publication-unavailable">Enlace original no disponible</span>'}
                            </div>
                        </article>`;
                    }).join("") || '<div class="empty marketing-publications-empty">No hay publicaciones de esta red en el periodo seleccionado.</div>'}</div>
                </section>

                <section class="meta-panel marketing-comments-panel">
                    <div class="panel-heading-with-action"><div><span class="panel-kicker">Comunidad</span><h2>Comentarios recientes</h2></div><span class="alert-chip">${formatearNumero(comentarios.length)} visibles</span></div>
                    <div class="marketing-comments-list">${comentarios.map(item => `<button type="button" data-marketing-comment-chat="${item.conversacionId || ""}">${crearLogoRed(String(item.canal || "").toLowerCase())}<span><strong>${escapeHtml(item.cliente?.nombre || "Usuario de red")}</strong><small>${escapeHtml(item.texto || "")}</small></span><time>${escapeHtml(formatearFecha(item.fecha))}</time></button>`).join("") || '<div class="empty">No hay comentarios sociales registrados.</div>'}</div>
                </section>

                <p class="marketing-data-note">Las cifras dependen de los permisos aprobados por cada red. TikTok entrega vistas, me gusta, comentarios y compartidos por video; los clics y ciertos insights solo aparecerán cuando la API de la cuenta los autorice.</p>`;

            if (window.lucide) window.lucide.createIcons();
            vista.querySelector("[data-marketing-connections]")?.addEventListener("click", () => abrirModulo("conexiones"));
            vista.querySelector("#marketingFilterForm")?.addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                if (datos.desde > datos.hasta) {
                    notificar("La fecha desde no puede ser posterior a la fecha hasta.", "warning");
                    return;
                }
                marketingFiltros = { ...marketingFiltros, desde: datos.desde, hasta: datos.hasta };
                await cargarModuloMarketing(vista);
            });
            vista.querySelectorAll("[data-marketing-days]").forEach(button => button.addEventListener("click", async () => {
                marketingFiltros = { ...rangoMarketingPredeterminado(Number(button.dataset.marketingDays || 30)), canal: canalActivo };
                await cargarModuloMarketing(vista);
            }));
            vista.querySelectorAll("[data-marketing-channel]").forEach(button => button.addEventListener("click", async () => {
                marketingFiltros = { ...marketingFiltros, canal: button.dataset.marketingChannel || "TODOS" };
                await cargarModuloMarketing(vista);
            }));
            vista.querySelectorAll("[data-marketing-comment-chat]").forEach(button => button.addEventListener("click", async () => {
                const conversacionId = Number(button.dataset.marketingCommentChat);
                if (conversacionId) await abrirDetalleConversacion(conversacionId, "marketing");
            }));
        }
