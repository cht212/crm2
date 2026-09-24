// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Módulo de agenda para ver fechas clave, tareas y cierres del equipo.

        async function cargarModuloAgenda(vista) {
            const puedeGestionarEquipo = puedeGestionarEquipoCRM();
            const [tareasResponse, ventasResponse, usuarios] = await Promise.all([
                api("/api/tareas?pageSize=200"),
                api("/api/oportunidades?pageSize=200"),
                puedeGestionarEquipo ? cargarUsuarios() : Promise.resolve([])
            ]);

            if (!tareasResponse.ok) throw new Error("Agenda no disponible");
            if (!ventasResponse.ok) throw new Error("Ventas no disponibles");

            const tareasPagina = await tareasResponse.json();
            const ventasPagina = await ventasResponse.json();
            const tareas = (tareasPagina.items || []).filter(item => item.estado !== "COMPLETADA" && item.estado !== "CANCELADA");
            const oportunidades = ventasPagina.items || [];
            const eventos = [
                ...tareas.map(item => ({
                    tipo: "Tarea",
                    titulo: item.titulo || "Seguimiento",
                    fecha: item.vence || item.fechaVencimiento || new Date().toISOString(),
                    asesor: item.asignadoA || "Sin asignar",
                    estado: item.estado,
                    detalle: item.descripcion || "Sin detalle",
                    id: item.id,
                    conversacionId: item.conversacionId,
                    modulo: "tareas"
                })),
                ...oportunidades.map(item => ({
                    tipo: "Venta",
                    titulo: item.titulo || "Oportunidad",
                    fecha: item.fechaCierre || new Date().toISOString(),
                    asesor: item.asesor || "Sin asignar",
                    estado: item.etapa || "NUEVA",
                    detalle: `${item.moneda || "PEN"} ${Number(item.monto || 0).toFixed(2)} · ${item.cliente?.nombre || "Sin cliente"}`,
                    id: item.id,
                    conversacionId: item.conversacionId,
                    modulo: "ventas"
                }))
            ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            const resumen = {
                total: eventos.length,
                tareas: tareas.length,
                ventas: oportunidades.filter(item => !["GANADA", "PERDIDA"].includes(item.etapa)).length,
                hoy: eventos.filter(item => esMismaFecha(item.fecha, new Date())).length
            };

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Agenda</h1>
                        <p>Calendario operativo con tareas, seguimientos y cierres del equipo.</p>
                    </div>
                </div>
                <section class="task-summary">
                    <article class="metric-card"><span class="metric-label">Eventos</span><strong class="metric-value">${resumen.total}</strong></article>
                    <article class="metric-card"><span class="metric-label">Tareas pendientes</span><strong class="metric-value">${resumen.tareas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Ventas abiertas</span><strong class="metric-value">${resumen.ventas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Para hoy</span><strong class="metric-value">${resumen.hoy}</strong></article>
                </section>
                <section class="task-workspace">
                    <div class="task-list">
                        ${eventos.map(evento => `
                            <article class="task-item ${evento.tipo === "Tarea" ? "" : "success"}">
                                <div>
                                    <strong>${escapeHtml(evento.tipo)} · ${escapeHtml(evento.titulo)}</strong>
                                    <p>${escapeHtml(evento.detalle)}</p>
                                    <small>
                                        ${escapeHtml(evento.estado || "Pendiente")} ·
                                        ${escapeHtml(formatearFecha(evento.fecha))} ·
                                        ${escapeHtml(evento.asesor || "Sin asignar")}
                                    </small>
                                </div>
                                <div class="task-actions">
                                    <button type="button" class="mini-action" data-agenda-open="${evento.modulo}|${evento.id}">Abrir</button>
                                </div>
                            </article>`).join("") || '<div class="empty">No hay eventos programados.</div>'}
                    </div>
                </section>`;

            vista.querySelectorAll("[data-agenda-open]").forEach(button => {
                button.addEventListener("click", () => {
                    const [modulo, id] = String(button.dataset.agendaOpen || "").split("|");
                    if (!modulo || !id) return;
                    if (modulo === "tareas") {
                        const evento = eventos.find(item => item.modulo === modulo && String(item.id) === String(id));
                        if (evento?.conversacionId) {
                            abrirDetalleConversacion(evento.conversacionId, "agenda");
                        } else {
                            tareasFiltroActivo = "todas";
                            abrirModulo("tareas");
                            notificar("La tarea no tiene conversacion asociada para abrir directamente.", "info");
                        }
                        return;
                    }
                    if (modulo === "ventas") {
                        abrirModulo("ventas");
                    }
                });
            });
        }
