// Archivo generado desde Script.js para separar responsabilidades del CRM.
// MÃ³dulo de alertas operativas para tareas urgentes y vencidas del equipo.

        async function cargarModuloAlertas(vista) {
            const puedeGestionarEquipo = puedeGestionarEquipoCRM();
            const [response, usuarios] = await Promise.all([
                api("/api/tareas/alertas?dias=7"),
                puedeGestionarEquipo ? cargarUsuarios() : Promise.resolve([])
            ]);
            if (!response.ok) throw new Error("Alertas no disponibles");
            const datos = await response.json();
            const items = datos.items || [];
            const urgentes = items.filter(item => item.vencida).length;

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Centro de alertas</h1>
                        <p>Riesgos operativos: tareas vencidas, seguimientos por vencer y pendientes que necesitan intervención.</p>
                    </div>
                    <button id="alertasRefreshButton" class="secondary-btn" type="button">Actualizar</button>
                </div>
                <section class="task-summary">
                    <article class="metric-card ${urgentes ? "danger-card" : ""}"><span class="metric-label">Urgentes</span><strong class="metric-value">${urgentes}</strong></article>
                    <article class="metric-card"><span class="metric-label">Por revisar</span><strong class="metric-value">${items.length}</strong></article>
                    <article class="metric-card"><span class="metric-label">Rango</span><strong class="metric-value">7 dÃ­as</strong></article>
                    <article class="metric-card"><span class="metric-label">Estado</span><strong class="metric-value">${urgentes ? "AtenciÃ³n" : "Normal"}</strong></article>
                </section>
                <section class="task-workspace">
                    ${puedeGestionarEquipo ? `<div class="task-actions-row"><button id="alertasReviewButton" class="secondary-btn" type="button">Marcar vencidas como revisadas</button></div>` : ""}
                    <div class="task-list">
                        ${items.map(item => `
                            <article class="task-item ${item.vencida ? "danger" : ""}">
                                <div>
                                    <strong>${escapeHtml(item.titulo)}</strong>
                                    <p>${escapeHtml(item.descripcion || "Sin detalle")}</p>
                                    <small>
                                        ${escapeHtml(item.prioridad)} Â· ${formatearFecha(item.vence)}
                                        ${item.asignadoA ? ` Â· ${escapeHtml(item.asignadoA)}` : ""}
                                        ${item.cliente ? ` Â· ${escapeHtml(item.cliente.nombre)}` : ""}
                                    </small>
                                </div>
                                <div class="task-actions">
                                    ${item.id ? `<button type="button" class="mini-action" data-alert-open-task="${item.id}">Abrir tarea</button>` : ""}
                                </div>
                            </article>`).join("") || '<div class="empty">No hay alertas operativas en los prÃ³ximos 7 dÃ­as.</div>'}
                    </div>
                </section>`;

            vista.querySelector("#alertasRefreshButton")?.addEventListener("click", () => cargarModuloAlertas(vista));

            vista.querySelector("#alertasReviewButton")?.addEventListener("click", async () => {
                const response = await api("/api/tareas/revisar-vencidas", { method: "POST" });
                if (!response.ok) {
                    notificar(await response.text(), "error");
                    return;
                }
                const resultado = await response.json();
                notificar(resultado.actualizadas > 0 ? `Se marcaron ${resultado.actualizadas} tareas como revisadas.` : "No habÃ­a tareas pendientes por revisar.", "success");
                await cargarModuloAlertas(vista);
            });

            vista.querySelectorAll("[data-alert-open-task]").forEach(button => {
                button.addEventListener("click", async () => {
                    const id = Number(button.dataset.alertOpenTask);
                    if (!id) return;
                    const directa = items.find(item => Number(item.id) === id);
                    if (directa?.conversacionId) {
                        abrirDetalleConversacion(directa.conversacionId, "alertas");
                        return;
                    }

                    const tareasResponse = await api(`/api/tareas?pageSize=200`);
                    const tareas = tareasResponse.ok ? (await tareasResponse.json()).items || [] : [];
                    const exista = tareas.find(item => Number(item.id) === id);
                    if (exista?.conversacionId) {
                        abrirDetalleConversacion(exista.conversacionId, "alertas");
                    } else {
                        tareasFiltroActivo = "todas";
                        abrirModulo("tareas");
                        notificar("La tarea no tiene conversacion asociada para abrir directamente.", "info");
                    }
                });
            });
        }
