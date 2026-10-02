// Módulo frontend del CRM.

        async function cargarModuloContactos(vista, filtros = {}) {
            const puedeCrear = tienePermiso("contactos.crear");
            const puedeEditar = tienePermiso("contactos.editar");
            const puedeExportar = tienePermiso("datos.exportar");
            const puedeCrearConversacion = tienePermiso("conversaciones.atender");
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
                    ${puedeCrear ? `<form id="contactCreateForm" class="user-form contact-form">
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
                    </form>` : ""}
                    <div class="module-search-row">
                        <input id="contactsSearch" class="search" type="text" value="${escapeAttribute(filtros.search || "")}" placeholder="Nombre, teléfono, email, canal, asesor o etiqueta">
                        <select id="contactsChannelFilter" class="table-input"><option value="TODOS">Todos los canales</option>${["WHATSAPP", "FACEBOOK", "INSTAGRAM", "TIKTOK"].map(canal => `<option value="${canal}" ${filtros.canal === canal ? "selected" : ""}>${canal}</option>`).join("")}</select>
                        <select id="contactsAdvisorFilter" class="table-input"><option value="">Todos los asesores</option>${usuarios.map(usuario => `<option value="${usuario.id}" ${String(filtros.usuarioId || "") === String(usuario.id) ? "selected" : ""}>${escapeHtml(usuario.nombre)}</option>`).join("")}</select>
                        <select id="contactsTagFilter" class="table-input"><option value="">Todas las etiquetas</option>${etiquetas.map(etiqueta => `<option value="${etiqueta.id}" ${String(filtros.etiquetaId || "") === String(etiqueta.id) ? "selected" : ""}>${escapeHtml(etiqueta.nombre)}</option>`).join("")}</select>
                        <button id="contactsSearchButton" class="secondary-btn" type="button">Buscar</button>
                        ${puedeExportar ? '<button id="contactsExportButton" class="secondary-btn" type="button">Exportar CSV</button>' : ""}
                    </div>
                    <table class="module-table contacts-table">
                        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Canal</th><th>Etiquetas</th><th>Última actividad</th><th>Acciones</th></tr></thead>
                        <tbody>${contactos.map(contacto => `<tr data-contact-id="${contacto.id}">
                            <td><div class="table-field-with-icon contact-readonly-value"><i data-lucide="user-round" aria-hidden="true"></i><span>${escapeHtml(contacto.nombre || "Contacto sin nombre")}</span></div></td>
                            <td><div class="table-field-with-icon contact-readonly-value"><i data-lucide="phone" aria-hidden="true"></i><span>${escapeHtml(contacto.telefono || "-")}</span></div></td>
                            <td><div class="table-field-with-icon contact-readonly-value"><i data-lucide="mail" aria-hidden="true"></i><span>${escapeHtml(contacto.email || "-")}</span></div></td>
                            <td><span class="contact-channel-icon" role="img" aria-label="${escapeAttribute(obtenerRedPorCanal(contacto.canalOrigen).nombre)}" title="${escapeAttribute(obtenerRedPorCanal(contacto.canalOrigen).nombre)}">${crearLogoRed(obtenerRedPorCanal(contacto.canalOrigen).clase)}</span></td>
                            <td>${(contacto.etiquetas || []).map(etiqueta => `<span class="tag-pill" style="--tag-color:${escapeAttribute(etiqueta.color || "#0ea5e9")}">${escapeHtml(etiqueta.nombre)}</span>`).join("") || "-"}</td>
                            <td>${formatearFecha(contacto.ultimoMensaje)}</td>
                            <td>
                                <div class="table-actions">
                                    ${puedeEditar ? `<button type="button" class="table-icon-action" data-edit-contact="${contacto.id}" title="Editar contacto" aria-label="Editar contacto"><i data-lucide="pencil"></i></button>` : ""}
                                    ${contacto.ultimaConversacionId || puedeCrearConversacion ? `<button type="button" class="table-icon-action is-primary" data-message-contact="${contacto.id}" title="${contacto.ultimaConversacionId ? "Abrir conversación" : "Crear conversación"}" aria-label="${contacto.ultimaConversacionId ? "Abrir conversación" : "Crear conversación"}"><i data-lucide="message-circle"></i></button>` : ""}
                                </div>
                            </td>
                        </tr>`).join("") || '<tr><td colspan="7">No hay contactos.</td></tr>'}</tbody>
                    </table>
                    <div class="contacts-mobile-list" aria-label="Lista de contactos">
                        ${contactos.map(contacto => `
                            <article class="contact-mobile-card">
                                <span class="contact-mobile-avatar" aria-hidden="true"><i data-lucide="user-round"></i></span>
                                <span class="contact-mobile-summary">
                                    <strong>${escapeHtml(contacto.nombre || "Contacto sin nombre")}</strong>
                                    <small>${escapeHtml(obtenerRedPorCanal(contacto.canalOrigen).nombre)}</small>
                                </span>
                                <span class="contact-mobile-actions" aria-label="Acciones del contacto">
                                    <button type="button" class="table-icon-action" data-view-mobile-contact="${contacto.id}" title="Ver datos" aria-label="Ver datos"><i data-lucide="eye"></i></button>
                                    ${puedeEditar ? `<button type="button" class="table-icon-action" data-edit-contact="${contacto.id}" title="Editar contacto" aria-label="Editar contacto"><i data-lucide="pencil"></i></button>` : ""}
                                    ${contacto.ultimaConversacionId || puedeCrearConversacion ? `<button type="button" class="table-icon-action is-primary" data-message-contact="${contacto.id}" title="${contacto.ultimaConversacionId ? "Abrir conversación" : "Crear conversación"}" aria-label="${contacto.ultimaConversacionId ? "Abrir conversación" : "Crear conversación"}"><i data-lucide="message-circle"></i></button>` : ""}
                                </span>
                            </article>`).join("") || '<div class="contact-mobile-empty">No hay contactos.</div>'}
                    </div>
                </section>`;

            const renderDatosContacto = contacto => {
                const red = obtenerRedPorCanal(contacto.canalOrigen);
                const etiquetasContacto = (contacto.etiquetas || [])
                    .map(etiqueta => `<span class="tag-pill" style="--tag-color:${escapeAttribute(etiqueta.color || "#0ea5e9")}">${escapeHtml(etiqueta.nombre)}</span>`)
                    .join("") || '<span class="contact-detail-empty">Sin etiquetas</span>';

                return `
                    <div><span>Nombre</span><strong>${escapeHtml(contacto.nombre || "Contacto sin nombre")}</strong></div>
                    <div><span>Teléfono</span><strong>${escapeHtml(contacto.telefono || "-")}</strong></div>
                    <div><span>Email</span><strong>${escapeHtml(contacto.email || "-")}</strong></div>
                    <div><span>Documento</span><strong>${escapeHtml(contacto.documento || "-")}</strong></div>
                    <div><span>Canal</span><strong class="contact-detail-channel">${crearLogoRed(red.clase)} ${escapeHtml(red.nombre)}</strong></div>
                    <div><span>Última actividad</span><strong>${escapeHtml(formatearFecha(contacto.ultimoMensaje) || "Sin actividad")}</strong></div>
                    <div class="contact-detail-wide"><span>Estado</span><strong>${escapeHtml(contacto.estado || "Sin descripción")}</strong></div>
                    <div class="contact-detail-wide"><span>Etiquetas</span><div class="contact-detail-tags">${etiquetasContacto}</div></div>`;
            };

            const abrirContactoMovil = contacto => {

                modalHost.innerHTML = `
                    <div class="modal-backdrop" data-contact-modal-close></div>
                    <section class="crm-modal contact-detail-modal" role="dialog" aria-modal="true" aria-labelledby="contactDetailTitle">
                        <div class="crm-modal-head">
                            <div>
                                <span class="contact-detail-eyebrow">Contacto</span>
                                <h2 id="contactDetailTitle">${escapeHtml(contacto.nombre || "Contacto sin nombre")}</h2>
                            </div>
                            <button type="button" class="modal-close" data-contact-modal-close aria-label="Cerrar">×</button>
                        </div>
                        <div class="contact-detail-facts">
                            ${renderDatosContacto(contacto)}
                        </div>
                        <div class="contact-detail-actions">
                            <button type="button" class="secondary-btn" data-contact-modal-close>Cerrar</button>
                        </div>
                    </section>`;
                modalHost.classList.remove("hidden");
                modalHost.setAttribute("aria-hidden", "false");
                modalHost.querySelectorAll("[data-contact-modal-close]").forEach(elemento => elemento.addEventListener("click", cerrarModal));
                if (window.lucide) window.lucide.createIcons();
                modalHost.querySelector("[data-contact-modal-close]")?.focus();
            };

            const abrirEditorContacto = contacto => {
                modalHost.innerHTML = `
                    <div class="modal-backdrop" data-contact-modal-close></div>
                    <section class="crm-modal contact-detail-modal" role="dialog" aria-modal="true" aria-labelledby="contactEditTitle">
                        <div class="crm-modal-head">
                            <div>
                                <span class="contact-detail-eyebrow">Editar contacto</span>
                                <h2 id="contactEditTitle">${escapeHtml(contacto.nombre || "Contacto sin nombre")}</h2>
                            </div>
                            <button type="button" class="modal-close" data-contact-modal-close aria-label="Cerrar">×</button>
                        </div>
                        <form id="contactEditForm" class="crm-form contact-detail-form">
                            <label>Nombre
                                <input name="nombre" maxlength="150" required value="${escapeAttribute(contacto.nombre || "")}">
                            </label>
                            <label>Teléfono
                                <input name="telefono" maxlength="30" required value="${escapeAttribute(contacto.telefono || "")}">
                            </label>
                            <label>Email
                                <input name="email" type="email" maxlength="150" value="${escapeAttribute(contacto.email || "")}" placeholder="Sin email">
                            </label>
                            <label>Documento
                                <input name="documento" maxlength="20" value="${escapeAttribute(contacto.documento || "")}" placeholder="Sin documento">
                            </label>
                            <div class="contact-detail-actions">
                                <button type="button" class="secondary-btn" data-contact-modal-close>Cancelar</button>
                                <button type="submit">Guardar cambios</button>
                            </div>
                        </form>
                    </section>`;
                modalHost.classList.remove("hidden");
                modalHost.setAttribute("aria-hidden", "false");
                modalHost.querySelectorAll("[data-contact-modal-close]").forEach(elemento => elemento.addEventListener("click", cerrarModal));

                modalHost.querySelector("#contactEditForm").addEventListener("submit", async event => {
                    event.preventDefault();
                    const datos = Object.fromEntries(new FormData(event.currentTarget));
                    datos.email = datos.email?.trim() || null;
                    datos.documento = datos.documento?.trim() || null;
                    const response = await api(`/api/crm/contactos/${contacto.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(datos)
                    });
                    if (!response.ok) {
                        notificar(await response.text(), "error");
                        return;
                    }
                    cerrarModal();
                    notificar("Contacto actualizado.", "success");
                    await cargarModuloContactos(vista, filtros);
                });

                if (window.lucide) window.lucide.createIcons();
                modalHost.querySelector("[name='nombre']")?.focus();
            };

            const abrirChatContacto = async contacto => {
                if (contacto.ultimaConversacionId) {
                    await abrirDetalleConversacion(contacto.ultimaConversacionId, "contactos");
                    return;
                }
                const response = await api(`/api/crm/contactos/${contacto.id}/conversaciones`, { method: "POST" });
                if (!response.ok) {
                    notificar(await response.text(), "error");
                    return;
                }
                const resultado = await response.json();
                notificar(resultado.existente ? "Ya existía una conversación abierta." : "Chat creado.", "success");
                await abrirDetalleConversacion(resultado.id, "contactos");
            };

            vista.querySelector("#contactCreateForm")?.addEventListener("submit", async event => {
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

            vista.querySelectorAll("[data-edit-contact]").forEach(button => {
                button.addEventListener("click", () => {
                    const contacto = contactos.find(item => String(item.id) === button.dataset.editContact);
                    if (contacto) abrirEditorContacto(contacto);
                });
            });

            vista.querySelectorAll("[data-message-contact]").forEach(button => {
                button.addEventListener("click", () => {
                    const contacto = contactos.find(item => String(item.id) === button.dataset.messageContact);
                    if (contacto) abrirChatContacto(contacto);
                });
            });

            vista.querySelectorAll("[data-view-mobile-contact]").forEach(button => {
                button.addEventListener("click", () => {
                    const contacto = contactos.find(item => String(item.id) === button.dataset.viewMobileContact);
                    if (contacto) abrirContactoMovil(contacto);
                });
            });
        }

        // La exportación de contactos ahora se resuelve en el servidor vía
        // descargarArchivo("/api/crm/contactos/exportar..."), enlazada más
        // arriba en #contactsExportButton. Esta función generaba el CSV en
        // el cliente con datos parciales (sin filtros ni etiquetas) y ya no
        // tenía ningún llamador.
