// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        function esMismaFecha(fecha, referencia) {
            if (!fecha) return false;
            const actual = new Date(fecha);
            return actual.getFullYear() === referencia.getFullYear() &&
                actual.getMonth() === referencia.getMonth() &&
                actual.getDate() === referencia.getDate();
        }

        function obtenerResumenTareas(tareas) {
            const hoy = new Date();
            return {
                total: tareas.length,
                pendientes: tareas.filter(t => t.estado === "PENDIENTE").length,
                vencidas: tareas.filter(t => t.estado === "VENCIDA").length,
                hoy: tareas.filter(t => ["PENDIENTE", "VENCIDA"].includes(t.estado) && esMismaFecha(t.vence, hoy)).length,
                completadas: tareas.filter(t => t.estado === "COMPLETADA").length
            };
        }

        function filtrarTareas(tareas) {
            const miId = Number(sesionActual?.id || 0);
            const hoy = new Date();
            if (tareasFiltroActivo === "mias") {
                return tareas.filter(t => miId > 0 && Number(t.asignadoAId) === miId && t.estado !== "COMPLETADA" && t.estado !== "CANCELADA");
            }
            if (tareasFiltroActivo === "hoy") {
                return tareas.filter(t => ["PENDIENTE", "VENCIDA"].includes(t.estado) && esMismaFecha(t.vence, hoy));
            }
            if (tareasFiltroActivo === "vencidas") {
                return tareas.filter(t => t.estado === "VENCIDA");
            }
            if (tareasFiltroActivo === "completadas") {
                return tareas.filter(t => t.estado === "COMPLETADA");
            }
            return tareas.filter(t => t.estado !== "CANCELADA");
        }

        async function cargarModuloTareas(vista) {
            const puedeGestionarEquipo = rolActual === "Administrador" || rolActual === "Supervisor";
            const [tareasResponse, usuarios] = await Promise.all([
                api("/api/tareas?pageSize=200"),
                puedeGestionarEquipo ? cargarUsuarios() : Promise.resolve([])
            ]);
            if (!tareasResponse.ok) throw new Error("Tareas no disponibles");
            const pagina = await tareasResponse.json();
            const tareas = pagina.items || [];
            const resumen = obtenerResumenTareas(tareas);
            if (resumen.vencidas > 0 && !tareasVencidasNotificadas) {
                tareasVencidasNotificadas = true;
                notificar(`Tienes ${resumen.vencidas} tarea(s) vencida(s).`, "warning");
            }
            const misPendientes = tareas.filter(t =>
                Number(t.asignadoAId) === Number(sesionActual?.id || 0) &&
                t.estado !== "COMPLETADA" &&
                t.estado !== "CANCELADA").length;
            const tareasVisibles = filtrarTareas(tareas);
            const filtros = [
                ["mias", "Mis pendientes", misPendientes],
                ["hoy", "Hoy", resumen.hoy],
                ["vencidas", "Vencidas", resumen.vencidas],
                ["todas", "Todas", resumen.total],
                ["completadas", "Completadas", resumen.completadas]
            ];

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Tareas</h1>
                        <p>Seguimientos, recordatorios y pendientes del equipo comercial.</p>
                    </div>
                </div>
                <section class="task-summary">
                    <article class="metric-card"><span class="metric-label">Pendientes</span><strong class="metric-value">${resumen.pendientes}</strong></article>
                    <article class="metric-card ${resumen.vencidas ? "danger-card" : ""}"><span class="metric-label">Vencidas</span><strong class="metric-value">${resumen.vencidas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Para hoy</span><strong class="metric-value">${resumen.hoy}</strong></article>
                    <article class="metric-card"><span class="metric-label">Completadas</span><strong class="metric-value">${resumen.completadas}</strong></article>
                </section>
                <section class="task-workspace">
                    <form id="quickTaskForm" class="user-form task-form">
                        <input name="titulo" maxlength="200" placeholder="Nueva tarea o seguimiento" required>
                        <input name="fechaVencimiento" type="datetime-local" required>
                        ${puedeGestionarEquipo ? `<select name="asignadoAId">
                            <option value="">Asignar a...</option>
                            ${usuarios.map(usuario => `<option value="${usuario.id}" ${Number(usuario.id) === Number(sesionActual?.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}
                        </select>` : ""}
                        <button type="submit">Crear tarea</button>
                    </form>
                    <div class="task-filters">
                        ${filtros.map(([id, label, total]) => `<button type="button" class="filter-button ${tareasFiltroActivo === id ? "active" : ""}" data-task-filter="${id}">${label} <span>${total}</span></button>`).join("")}
                    </div>
                    <div class="task-list">
                        ${tareasVisibles.map(tarea => `
                            <article class="task-item ${tarea.estado === "VENCIDA" ? "danger" : ""}">
                                <div>
                                    <strong>${escapeHtml(tarea.titulo)}</strong>
                                    <p>${escapeHtml(tarea.descripcion || "Sin detalle")}</p>
                                    <small>${escapeHtml(tarea.estado)} · ${formatearFecha(tarea.vence)}${tarea.cliente ? ` · ${escapeHtml(tarea.cliente.nombre)}` : ""}${tarea.asignadoA ? ` · ${escapeHtml(tarea.asignadoA)}` : ""}</small>
                                </div>
                                <div class="task-actions">
                                    ${tarea.conversacionId ? `<button type="button" class="mini-action" data-open-task-chat="${tarea.conversacionId}">Abrir chat</button>` : ""}
                                    ${tarea.estado !== "COMPLETADA" && tarea.estado !== "CANCELADA" ? `<button type="button" class="mini-action" data-complete-task-module="${tarea.id}">Completar</button>` : ""}
                                </div>
                            </article>`).join("") || '<div class="empty">No hay tareas para este filtro.</div>'}
                    </div>
                </section>`;

            vista.querySelector("#quickTaskForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.asignadoAId = datos.asignadoAId ? Number(datos.asignadoAId) : null;
                const crear = await api("/api/tareas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                notificar("Tarea creada.", "success");
                await cargarModuloTareas(vista);
            });

            vista.querySelectorAll("[data-task-filter]").forEach(button => {
                button.addEventListener("click", async () => {
                    tareasFiltroActivo = button.dataset.taskFilter;
                    await cargarModuloTareas(vista);
                });
            });

            vista.querySelectorAll("[data-complete-task-module]").forEach(button => {
                button.addEventListener("click", async () => {
                    const response = await api(`/api/tareas/${button.dataset.completeTaskModule}/completar`, { method: "PUT" });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    notificar("Tarea completada.", "success");
                    await cargarModuloTareas(vista);
                });
            });

            vista.querySelectorAll("[data-open-task-chat]").forEach(button => {
                button.addEventListener("click", () => abrirDetalleConversacion(button.dataset.openTaskChat, "tareas"));
            });
        }

        function etapasOportunidad() {
            return ["NUEVA", "CALIFICADA", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];
        }

        function resumenVentas(oportunidades) {
            const abiertas = oportunidades.filter(op => !["GANADA", "PERDIDA"].includes(op.etapa));
            const ganadas = oportunidades.filter(op => op.etapa === "GANADA");
            const perdidas = oportunidades.filter(op => op.etapa === "PERDIDA");
            return {
                abiertas: abiertas.length,
                ganadas: ganadas.length,
                perdidas: perdidas.length,
                montoAbierto: abiertas.reduce((total, op) => total + Number(op.monto || 0), 0),
                montoGanado: ganadas.reduce((total, op) => total + Number(op.monto || 0), 0)
            };
        }

        async function cargarModuloVentas(vista) {
            const puedeGestionarEquipo = rolActual === "Administrador" || rolActual === "Supervisor";
            const [ventasResponse, contactosResponse, usuarios] = await Promise.all([
                api("/api/oportunidades?pageSize=200"),
                api("/api/crm/contactos"),
                puedeGestionarEquipo ? cargarUsuarios() : Promise.resolve([])
            ]);
            if (!ventasResponse.ok) throw new Error("Ventas no disponibles");
            if (!contactosResponse.ok) throw new Error("Contactos no disponibles");

            const pagina = await ventasResponse.json();
            const oportunidades = pagina.items || [];
            const contactos = await contactosResponse.json();
            const etapas = etapasOportunidad();
            const resumen = resumenVentas(oportunidades);
            const oportunidadesVisibles = ventasEtapaFiltro === "TODAS"
                ? oportunidades
                : oportunidades.filter(op => op.etapa === ventasEtapaFiltro);

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Ventas</h1>
                        <p>Embudo comercial con oportunidades, montos y cierre.</p>
                    </div>
                    <button id="salesExportButton" class="secondary-btn" type="button">Exportar CSV</button>
                </div>
                <section class="task-summary">
                    <article class="metric-card"><span class="metric-label">Abiertas</span><strong class="metric-value">${resumen.abiertas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Monto abierto</span><strong class="metric-value">${formatearMoneda(resumen.montoAbierto)}</strong></article>
                    <article class="metric-card"><span class="metric-label">Ganadas</span><strong class="metric-value">${resumen.ganadas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Monto ganado</span><strong class="metric-value">${formatearMoneda(resumen.montoGanado)}</strong></article>
                </section>
                <section class="sales-workspace">
                    <form id="quickDealForm" class="user-form sales-form">
                        <input name="titulo" maxlength="200" placeholder="Nueva oportunidad" required>
                        <select name="clienteId" required>
                            <option value="">Cliente...</option>
                            ${contactos.map(contacto => `<option value="${contacto.id}">${escapeHtml(contacto.nombre)} · ${escapeHtml(contacto.telefono || "")}</option>`).join("")}
                        </select>
                        <input name="monto" type="number" min="0" step="0.01" placeholder="Monto">
                        <select name="moneda"><option value="PEN">PEN</option><option value="USD">USD</option></select>
                        ${puedeGestionarEquipo ? `<select name="usuarioAsignadoId">
                            <option value="">Asesor...</option>
                            ${usuarios.map(usuario => `<option value="${usuario.id}" ${Number(usuario.id) === Number(sesionActual?.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}
                        </select>` : ""}
                        <button type="submit">Crear venta</button>
                    </form>
                    <div class="task-filters">
                        ${["TODAS", ...etapas].map(etapa => {
                            const total = etapa === "TODAS" ? oportunidades.length : oportunidades.filter(op => op.etapa === etapa).length;
                            return `<button type="button" class="filter-button ${ventasEtapaFiltro === etapa ? "active" : ""}" data-sales-filter="${etapa}">${etapa} <span>${total}</span></button>`;
                        }).join("")}
                    </div>
                    <div class="sales-board">
                        ${etapas.map(etapa => {
                            const items = oportunidadesVisibles.filter(op => op.etapa === etapa);
                            if (ventasEtapaFiltro !== "TODAS" && ventasEtapaFiltro !== etapa) return "";
                            return `<section class="sales-column">
                                <div class="stage-header">
                                    <div class="stage-title"><span>${etapa}</span><span>${items.length}</span></div>
                                    <div class="stage-meta">${formatearMoneda(items.reduce((total, op) => total + Number(op.monto || 0), 0))}</div>
                                    <div class="stage-bar"></div>
                                </div>
                                ${items.map(op => `
                                    <article class="sales-card">
                                        <div>
                                            <strong>${escapeHtml(op.titulo)}</strong>
                                            <p>${escapeHtml(op.cliente?.nombre || "Sin cliente")} · ${escapeHtml(op.moneda)} ${Number(op.monto || 0).toFixed(2)}</p>
                                            <small>${op.probabilidad}% probabilidad${op.asesor ? ` · ${escapeHtml(op.asesor)}` : ""}</small>
                                        </div>
                                        <select class="mini-select" data-sales-stage="${op.id}">
                                            ${etapas.map(opcion => `<option value="${opcion}" ${opcion === op.etapa ? "selected" : ""}>${opcion}</option>`).join("")}
                                        </select>
                                        <div class="task-actions">
                                            ${op.conversacionId ? `<button type="button" class="mini-action" data-open-sales-chat="${op.conversacionId}">Abrir chat</button>` : ""}
                                        </div>
                                    </article>`).join("") || '<div class="empty">Sin oportunidades.</div>'}
                            </section>`;
                        }).join("")}
                    </div>
                </section>`;

            vista.querySelector("#salesExportButton")?.addEventListener("click", () => descargarArchivo(`/api/oportunidades/exportar${ventasEtapaFiltro !== "TODAS" ? `?etapa=${encodeURIComponent(ventasEtapaFiltro)}` : ""}`));

            vista.querySelector("#quickDealForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.clienteId = Number(datos.clienteId);
                datos.usuarioAsignadoId = datos.usuarioAsignadoId ? Number(datos.usuarioAsignadoId) : null;
                datos.monto = Number(datos.monto || 0);
                datos.probabilidad = 10;
                const crear = await api("/api/oportunidades", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                notificar("Oportunidad creada.", "success");
                await cargarModuloVentas(vista);
            });

            vista.querySelectorAll("[data-sales-filter]").forEach(button => {
                button.addEventListener("click", async () => {
                    ventasEtapaFiltro = button.dataset.salesFilter;
                    await cargarModuloVentas(vista);
                });
            });

            vista.querySelectorAll("[data-sales-stage]").forEach(select => {
                select.addEventListener("change", async () => {
                    const body = { etapa: select.value };
                    if (select.value === "PERDIDA") {
                        const motivo = await solicitarTextoModal("Motivo de pérdida", "Indica por qué se perdió esta oportunidad");
                        if (!motivo) {
                            await cargarModuloVentas(vista);
                            return;
                        }
                        body.motivoPerdida = motivo;
                    }
                    const response = await api(`/api/oportunidades/${select.dataset.salesStage}/etapa`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    notificar("Etapa de venta actualizada.", "success");
                    await cargarModuloVentas(vista);
                });
            });

            vista.querySelectorAll("[data-open-sales-chat]").forEach(button => {
                button.addEventListener("click", () => abrirDetalleConversacion(button.dataset.openSalesChat, "ventas"));
            });
        }
