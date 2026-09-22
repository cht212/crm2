// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Gestiona campañas de prospección y activación comercial del CRM.

        async function cargarModuloCampanas(vista) {
            const puedeGestionarEquipo = rolActual === "Administrador" || rolActual === "Supervisor";
            const [campanasResponse, contactosResponse, usuarios] = await Promise.all([
                api("/api/campanas?pageSize=200"),
                api("/api/crm/contactos"),
                puedeGestionarEquipo ? cargarUsuarios() : Promise.resolve([])
            ]);

            if (!campanasResponse.ok) throw new Error("Campañas no disponibles");
            if (!contactosResponse.ok) throw new Error("Contactos no disponibles");

            const pagina = await campanasResponse.json();
            const campanas = pagina.items || [];
            const contactos = await contactosResponse.json();
            const resumen = {
                total: campanas.length,
                activas: campanas.filter(item => item.estado === "ACTIVA").length,
                clientes: campanas.reduce((total, item) => total + Number(item.clientesAsignados || 0), 0),
                respondieron: campanas.reduce((total, item) => total + Number(item.respondieron || 0), 0)
            };

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Campañas</h1>
                        <p>Gestiona campañas comerciales, asignación de clientes y seguimiento por asesor.</p>
                    </div>
                </div>
                <section class="task-summary">
                    <article class="metric-card"><span class="metric-label">Total</span><strong class="metric-value">${resumen.total}</strong></article>
                    <article class="metric-card"><span class="metric-label">Activas</span><strong class="metric-value">${resumen.activas}</strong></article>
                    <article class="metric-card"><span class="metric-label">Clientes asignados</span><strong class="metric-value">${resumen.clientes}</strong></article>
                    <article class="metric-card"><span class="metric-label">Respondieron</span><strong class="metric-value">${resumen.respondieron}</strong></article>
                </section>
                <section class="sales-workspace">
                    <form id="quickCampaignForm" class="user-form sales-form">
                        <input name="nombre" maxlength="200" placeholder="Nombre de la campaña" required>
                        <textarea name="descripcion" rows="2" maxlength="1000" placeholder="Descripción"></textarea>
                        <select name="tipo">
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="FACEBOOK">Facebook</option>
                            <option value="TIKTOK">TikTok</option>
                            <option value="EMAIL">Email</option>
                        </select>
                        <select name="estado">
                            <option value="ACTIVA">Activa</option>
                            <option value="PAUSADA">Pausada</option>
                            <option value="FINALIZADA">Finalizada</option>
                        </select>
                        ${puedeGestionarEquipo ? `<select name="asignadoAId">
                            <option value="">Asignar a asesor...</option>
                            ${usuarios.map(usuario => `<option value="${usuario.id}" ${Number(usuario.id) === Number(sesionActual?.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}
                        </select>` : ""}
                        <input name="fechaInicio" type="date" value="${new Date().toISOString().slice(0, 10)}">
                        <input name="fechaFin" type="date" placeholder="Fecha fin">
                        <button type="submit">Crear campaña</button>
                    </form>
                </section>
                <section class="task-workspace">
                    <div class="task-list">
                        ${campanas.map(campana => `
                            <article class="task-item">
                                <div>
                                    <strong>${escapeHtml(campana.nombre)}</strong>
                                    <p>${escapeHtml(campana.descripcion || "Sin descripción")}</p>
                                    <small>
                                        ${escapeHtml(campana.tipo || "WHATSAPP")} · ${escapeHtml(campana.estado || "ACTIVA")} ·
                                        ${campana.asignadoA ? `Asignado a ${escapeHtml(campana.asignadoA.nombre)}` : "Sin asignar"} ·
                                        ${formatearFecha(campana.fechaInicio)}
                                    </small>
                                </div>
                                <div class="task-actions">
                                    <button type="button" class="mini-action" data-campaign-show-clients="${campana.id}">Ver clientes</button>
                                </div>
                                <div class="campaign-client-pool">
                                    <form class="campaign-client-form" data-campaign-client-form="${campana.id}">
                                        <label>
                                            <span>Asignar clientes</span>
                                            <select name="clienteIds" multiple size="5">
                                                ${contactos.map(contacto => `<option value="${contacto.id}">${escapeHtml(contacto.nombre)} · ${escapeHtml(contacto.telefono || "Sin teléfono")}</option>`).join("")}
                                            </select>
                                        </label>
                                        <button type="submit" class="mini-action">Guardar</button>
                                    </form>
                                </div>
                            </article>
                        `).join("") || '<div class="empty">Sin campañas creadas todavía.</div>'}
                    </div>
                </section>`;

            vista.querySelector("#quickCampaignForm")?.addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                const body = {
                    nombre: datos.nombre,
                    descripcion: datos.descripcion || null,
                    tipo: datos.tipo || "WHATSAPP",
                    estado: datos.estado || "ACTIVA",
                    fechaInicio: datos.fechaInicio || new Date().toISOString().slice(0, 10),
                    fechaFin: datos.fechaFin || null,
                    asignadoAId: datos.asignadoAId ? Number(datos.asignadoAId) : null
                };

                const respuesta = await api("/api/campanas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                if (!respuesta.ok) {
                    notificar(await respuesta.text(), "error");
                    return;
                }

                notificar("Campaña creada correctamente.", "success");
                await cargarModuloCampanas(vista);
            });

            vista.querySelectorAll("[data-campaign-show-clients]").forEach(button => {
                button.addEventListener("click", async () => {
                    const id = button.dataset.campaignShowClients;
                    const response = await api(`/api/campanas/${id}/clientes`);
                    if (!response.ok) {
                        notificar("No se pudieron cargar los clientes asignados.", "error");
                        return;
                    }

                    const clientesAsignados = await response.json();
                    const lista = clientesAsignados.length
                        ? clientesAsignados.map(item => `<li>${escapeHtml(item.nombre || "Cliente")}${item.telefono ? ` · ${escapeHtml(item.telefono)}` : ""} · ${escapeHtml(item.estado || "PENDIENTE")}</li>`).join("")
                        : "<li>Sin clientes asignados.</li>";

                    notificar(`<ul class="campaign-list-inline">${lista}</ul>`, "info");
                });
            });

            vista.querySelectorAll(".campaign-client-form").forEach(form => {
                form.addEventListener("submit", async event => {
                    event.preventDefault();
                    const id = form.dataset.campaignClientForm;
                    const select = form.querySelector("select[name='clienteIds']");
                    const clienteIds = Array.from(select.selectedOptions).map(option => Number(option.value)).filter(Boolean);

                    if (!clienteIds.length) {
                        notificar("Selecciona al menos un cliente para la campaña.", "error");
                        return;
                    }

                    const response = await api(`/api/campanas/${id}/clientes`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(clienteIds)
                    });

                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }

                    notificar("Clientes asignados a la campaña.", "success");
                    await cargarModuloCampanas(vista);
                });
            });
        }
