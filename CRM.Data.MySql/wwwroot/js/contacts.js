// Módulo frontend del CRM.

        async function cargarModuloContactos(vista, filtros = {}) {
            const params = new URLSearchParams();
            if (filtros.search) params.set("search", filtros.search);
            if (filtros.canal && filtros.canal !== "TODOS") params.set("canal", filtros.canal);
            if (filtros.usuarioId) params.set("usuarioId", filtros.usuarioId);
            if (filtros.etiquetaId) params.set("etiquetaId", filtros.etiquetaId);
            const query = params.toString();
            const [response, usuarios, etiquetas] = await Promise.all([
                api(`/api/crm/contactos${query ? `?${query}` : ""}`),
                cargarUsuarios(),
                api("/api/etiquetas").then(r => r.ok ? r.json() : [])
            ]);
            if (!response.ok) throw new Error("Contactos no disponibles");
            const contactos = await response.json();
            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Contactos</h1>
                        <p>Clientes reales del CRM, con canal de origen, etiquetas, historial y última conversación.</p>
                    </div>
                </div>
                <section class="contacts-workspace">
                    <form id="contactCreateForm" class="user-form contact-form">
                        <input name="nombre" maxlength="150" placeholder="Nombre del cliente" required>
                        <input name="telefono" maxlength="30" placeholder="Teléfono" required>
                        <input name="email" type="email" maxlength="150" placeholder="Email opcional">
                        <input name="documento" maxlength="20" placeholder="Documento opcional">
                        <select name="canalOrigen">
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="FACEBOOK">Facebook</option>
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="TIKTOK">TikTok</option>
                        </select>
                        <button type="submit">Crear contacto</button>
                    </form>
                    <div class="module-search-row">
                        <input id="contactsSearch" class="search" type="text" value="${escapeAttribute(filtros.search || "")}" placeholder="Nombre, teléfono, email, canal, asesor o etiqueta">
                        <select id="contactsChannelFilter" class="table-input"><option value="TODOS">Todos los canales</option>${["WHATSAPP", "FACEBOOK", "INSTAGRAM", "TIKTOK"].map(canal => `<option value="${canal}" ${filtros.canal === canal ? "selected" : ""}>${canal}</option>`).join("")}</select>
                        <select id="contactsAdvisorFilter" class="table-input"><option value="">Todos los asesores</option>${usuarios.map(usuario => `<option value="${usuario.id}" ${String(filtros.usuarioId || "") === String(usuario.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}</select>
                        <select id="contactsTagFilter" class="table-input"><option value="">Todas las etiquetas</option>${etiquetas.map(etiqueta => `<option value="${etiqueta.id}" ${String(filtros.etiquetaId || "") === String(etiqueta.id) ? "selected" : ""}>${escapeHtml(etiqueta.nombre)}</option>`).join("")}</select>
                        <button id="contactsSearchButton" class="secondary-btn" type="button">Buscar</button>
                        <button id="contactsExportButton" class="secondary-btn" type="button">Exportar CSV</button>
                    </div>
                    <table class="module-table contacts-table">
                        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Canal</th><th>Etiquetas</th><th>Chats</th><th>Última actividad</th><th>Acciones</th></tr></thead>
                        <tbody>${contactos.map(contacto => `<tr data-contact-id="${contacto.id}">
                            <td><input class="table-input" data-contact-field="nombre" value="${escapeAttribute(contacto.nombre || "")}" maxlength="150"></td>
                            <td><input class="table-input" data-contact-field="telefono" value="${escapeAttribute(contacto.telefono || "")}" maxlength="30"></td>
                            <td><input class="table-input" data-contact-field="email" type="email" value="${escapeAttribute(contacto.email || "")}" maxlength="150"></td>
                            <td>${escapeHtml(contacto.canalOrigen || "-")}</td>
                            <td>${(contacto.etiquetas || []).map(etiqueta => `<span class="tag-pill" style="--tag-color:${escapeAttribute(etiqueta.color || "#0ea5e9")}">${escapeHtml(etiqueta.nombre)}</span>`).join("") || "-"}</td>
                            <td>${contacto.conversaciones}</td>
                            <td>${formatearFecha(contacto.ultimoMensaje)}</td>
                            <td>
                                <div class="table-actions">
                                    <button type="button" class="mini-action" data-save-contact="${contacto.id}">Guardar</button>
                                    ${contacto.ultimaConversacionId ? `<button type="button" class="mini-action" data-open-contact-chat="${contacto.ultimaConversacionId}">Abrir chat</button>` : ""}
                                    ${!contacto.ultimaConversacionId ? `<button type="button" class="mini-action" data-create-contact-chat="${contacto.id}">Crear chat</button>` : ""}
                                </div>
                            </td>
                        </tr>`).join("") || '<tr><td colspan="8">No hay contactos.</td></tr>'}</tbody>
                    </table>
                </section>`;

            vista.querySelector("#contactCreateForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.email = datos.email?.trim() || null;
                datos.documento = datos.documento?.trim() || null;
                const crear = await api("/api/crm/contactos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                notificar("Contacto creado.", "success");
                await cargarModuloContactos(vista);
            });

            const leerFiltrosContactos = () => ({
                search: vista.querySelector("#contactsSearch").value.trim(),
                canal: vista.querySelector("#contactsChannelFilter").value,
                usuarioId: vista.querySelector("#contactsAdvisorFilter").value,
                etiquetaId: vista.querySelector("#contactsTagFilter").value
            });
            const ejecutarBusqueda = () => cargarModuloContactos(vista, leerFiltrosContactos());
            vista.querySelector("#contactsSearchButton").addEventListener("click", ejecutarBusqueda);
            vista.querySelector("#contactsExportButton").addEventListener("click", () => descargarArchivo(`/api/crm/contactos/exportar${query ? `?${query}` : ""}`));
            vista.querySelector("#contactsSearch").addEventListener("keydown", event => {
                if (event.key === "Enter") ejecutarBusqueda();
            });

            vista.querySelectorAll("[data-save-contact]").forEach(button => {
                button.addEventListener("click", async () => {
                    const row = button.closest("tr");
                    const datos = {};
                    row.querySelectorAll("[data-contact-field]").forEach(input => {
                        datos[input.dataset.contactField] = input.value.trim() || null;
                    });
                    const response = await api(`/api/crm/contactos/${button.dataset.saveContact}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(datos)
                    });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    notificar("Contacto actualizado.", "success");
                    await cargarModuloContactos(vista, filtros);
                });
            });

            vista.querySelectorAll("[data-open-contact-chat]").forEach(button => {
                button.addEventListener("click", () => abrirDetalleConversacion(button.dataset.openContactChat, "contactos"));
            });

            vista.querySelectorAll("[data-create-contact-chat]").forEach(button => {
                button.addEventListener("click", async () => {
                    const response = await api(`/api/crm/contactos/${button.dataset.createContactChat}/conversaciones`, { method: "POST" });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    const resultado = await response.json();
                    notificar(resultado.existente ? "Ya existía una conversación abierta." : "Chat creado.", "success");
                    await abrirDetalleConversacion(resultado.id, "contactos");
                });
            });
        }

        // La exportación de contactos ahora se resuelve en el servidor vía
        // descargarArchivo("/api/crm/contactos/exportar..."), enlazada más
        // arriba en #contactsExportButton. Esta función generaba el CSV en
        // el cliente con datos parciales (sin filtros ni etiquetas) y ya no
        // tenía ningún llamador.