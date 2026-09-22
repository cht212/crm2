// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Gestiona reglas automáticas del CRM para tareas y derivaciones.

        async function cargarModuloAutomatizacion(vista) {
            const [reglasResponse, usuarios] = await Promise.all([
                api("/api/automatizacion/reglas"),
                cargarUsuarios()
            ]);

            if (!reglasResponse.ok) throw new Error("Automatización no disponible");

            const reglas = await reglasResponse.json();
            const resumen = {
                total: reglas.length,
                activas: reglas.filter(regla => regla.activa).length,
                tareas: reglas.filter(regla => (regla.accion || "").includes("TAREA")).length
            };

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Automatización</h1>
                        <p>Define reglas que generen tareas o acciones automáticas cuando ocurra un evento del CRM.</p>
                    </div>
                </div>
                <section class="task-summary">
                    <article class="metric-card"><span class="metric-label">Reglas</span><strong class="metric-value">${resumen.total}</strong></article>
                    <article class="metric-card"><span class="metric-label">Activas</span><strong class="metric-value">${resumen.activas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Acciones con tarea</span><strong class="metric-value">${resumen.tareas}</strong></article>
                </section>
                <section class="sales-workspace">
                    <form id="automationRuleForm" class="user-form sales-form">
                        <input name="nombre" maxlength="200" placeholder="Nombre de la regla" required>
                        <select name="entidad">
                            <option value="Oportunidad">Oportunidad</option>
                            <option value="Tarea">Tarea</option>
                            <option value="Conversacion">Conversación</option>
                        </select>
                        <select name="evento">
                            <option value="CAMBIO_ETAPA">Cambio de etapa</option>
                            <option value="CREACION">Creación</option>
                            <option value="ASIGNACION">Asignación</option>
                            <option value="VENCIMIENTO">Vencimiento</option>
                        </select>
                        <input name="condicion" maxlength="200" placeholder="Condición (ej: ETAPA=PROPUESTA)">
                        <select name="accion">
                            <option value="CREAR_TAREA">Crear tarea</option>
                            <option value="NOTIFICAR">Notificar</option>
                            <option value="ASIGNAR_ASESOR">Asignar asesor</option>
                        </select>
                        <input name="valorAccion" maxlength="200" placeholder="Valor de la acción">
                        <select name="asignadoAId">
                            <option value="">Sin asignar</option>
                            ${usuarios.map(usuario => `<option value="${usuario.id}" ${Number(usuario.id) === Number(sesionActual?.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}
                        </select>
                        <label class="switch-row">
                            <span>Activa</span>
                            <input type="checkbox" name="activa" checked>
                        </label>
                        <button type="submit">Guardar regla</button>
                    </form>
                </section>
                <section class="task-workspace">
                    <div class="task-list">
                        ${reglas.map(regla => `
                            <article class="task-item ${regla.activa ? "" : "danger"}">
                                <div>
                                    <strong>${escapeHtml(regla.nombre)}</strong>
                                    <p>${escapeHtml(regla.entidad || "Oportunidad")} · ${escapeHtml(regla.evento || "CAMBIO_ETAPA")} · ${escapeHtml(regla.accion || "CREAR_TAREA")}</p>
                                    <small>
                                        ${escapeHtml(regla.condicion || "Sin condición")} ·
                                        ${regla.asignadoA ? `Asignado a ${escapeHtml(regla.asignadoA.nombre)}` : "Sin asignar"} ·
                                        ${regla.activa ? "Activa" : "Inactiva"}
                                    </small>
                                </div>
                                <div class="task-actions">
                                    <button type="button" class="mini-action" data-automation-run="${regla.id}">Ejecutar</button>
                                </div>
                            </article>`).join("") || '<div class="empty">Sin reglas automáticas definidas.</div>'}
                    </div>
                </section>`;

            vista.querySelector("#automationRuleForm")?.addEventListener("submit", async event => {
                event.preventDefault();
                const form = event.currentTarget;
                const payload = {
                    nombre: form.elements.nombre.value.trim(),
                    entidad: form.elements.entidad.value,
                    evento: form.elements.evento.value,
                    condicion: form.elements.condicion.value.trim() || "ETAPA=PROPUESTA",
                    accion: form.elements.accion.value,
                    valorAccion: form.elements.valorAccion.value.trim() || "Seguimiento automático",
                    asignadoAId: form.elements.asignadoAId.value ? Number(form.elements.asignadoAId.value) : null,
                    activa: form.elements.activa.checked
                };

                const response = await api("/api/automatizacion/reglas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    notificar(await response.text(), "error");
                    return;
                }

                notificar("Regla guardada correctamente.", "success");
                await cargarModuloAutomatizacion(vista);
            });

            vista.querySelectorAll("[data-automation-run]").forEach(button => {
                button.addEventListener("click", async () => {
                    const response = await api(`/api/automatizacion/ejecutar/${button.dataset.automationRun}`, { method: "POST" });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    const data = await response.json();
                    notificar(data.tareaId ? `Se creó la tarea #${data.tareaId}.` : "Regla ejecutada.", "success");
                    await cargarModuloAutomatizacion(vista);
                });
            });
        }
