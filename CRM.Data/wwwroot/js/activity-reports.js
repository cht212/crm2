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
                        </div>`;

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