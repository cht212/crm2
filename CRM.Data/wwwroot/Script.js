const POLLING_MS = 3000;
        let conversaciones = [];
        let conversacionSeleccionada = null;
        let actualizacionEnCurso = false;
        let filtroActivo = "all";
        let rolActual = "";

        const lista = document.getElementById("conversationList");
        const mensajes = document.getElementById("messages");
        const estado = document.getElementById("status");
        const input = document.getElementById("messageInput");
        const boton = document.getElementById("sendButton");
        const fileInput = document.getElementById("fileInput");
        const attachButton = document.getElementById("attachButton");
        const fileName = document.getElementById("fileName");
        const attachmentPreview = document.getElementById("attachmentPreview");
        const attachmentThumb = document.getElementById("attachmentThumb");
        const attachmentName = document.getElementById("attachmentName");
        const attachmentSize = document.getElementById("attachmentSize");
        const removeAttachment = document.getElementById("removeAttachment");
        const logoutButton = document.getElementById("logoutButton");
        const nav = document.querySelector(".workspace-nav");
        const navBrandMark = document.getElementById("navBrandMark");
        const navToggle = document.getElementById("navToggle");

        function limpiarIconosDePanelExtra() {
            document.querySelectorAll('.workspace-nav [data-lucide^="panel-left-"]').forEach(icon => {
                if (!navToggle.contains(icon)) icon.remove();
            });
        }

        function actualizarEstadoNavegacion(colapsada) {
            nav.classList.toggle("collapsed", colapsada);
            navToggle.title = colapsada ? "Expandir menú" : "Contraer menú";
            navToggle.setAttribute("aria-label", navToggle.title);
            if (window.lucide) {
                navToggle.innerHTML = `<i data-lucide="${colapsada ? "panel-left-open" : "panel-left-close"}"></i>`;
                window.lucide.createIcons();
            }
            limpiarIconosDePanelExtra();
        }

        actualizarEstadoNavegacion(false);
        navToggle.addEventListener("click", () => {
            actualizarEstadoNavegacion(!nav.classList.contains("collapsed"));
        });
        navBrandMark.addEventListener("click", () => {
            if (nav.classList.contains("collapsed")) actualizarEstadoNavegacion(false);
        });
        if (window.lucide) window.lucide.createIcons();
        limpiarIconosDePanelExtra();

        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Cerrando...";
            try {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Cache-Control": "no-cache" }
                });
            } finally {
                window.location.href = "/login.html";
            }
        });

        async function api(url, options = {}) {
            const separador = url.includes("?") ? "&" : "?";
            const response = await fetch(`${url}${separador}_=${Date.now()}`, {
                cache: "no-store",
                credentials: "same-origin",
                ...options,
                headers: {
                    "Cache-Control": "no-cache",
                    ...(options.headers || {})
                }
            });
            if (response.status === 401) {
                window.location.href = "/login.html";
            }
            return response;
        }

        async function iniciarAplicacion() {
            const response = await fetch("/api/auth/me", {
                cache: "no-store",
                credentials: "same-origin"
            });
            if (!response.ok) {
                window.location.href = "/login.html";
                return;
            }

            const sesion = await response.json();
            rolActual = sesion.rol || "";
            estado.textContent = `${sesion.usuario} · ${sesion.rol}`;
            if (rolActual === "Administrador") {
                document.getElementById("usersNav").classList.remove("hidden");
            }
            abrirModulo("inbox");
            actualizarCRM();
            setInterval(actualizarCRM, POLLING_MS);
        }

        async function cargarConversaciones() {
            const response = await api("/api/whatsapp/test/todas");
            if (!response.ok) throw new Error("No se pudieron cargar las conversaciones");
            conversaciones = await response.json();
            document.getElementById("conversationCount").textContent =
                `${conversaciones.length} ${conversaciones.length === 1 ? "chat" : "chats"}`;
            mostrarConversaciones();
        }

        function mostrarConversaciones() {
            const filtro = document.getElementById("searchInput").value.toLowerCase().trim();
            const resultado = conversaciones.filter(c => {
                const coincideEstado = filtroActivo === "all" ||
                    (filtroActivo === "new" && (c.estado || "").toUpperCase() === "NUEVO") ||
                    (filtroActivo === "open" && (c.estado || "").toUpperCase() === "ABIERTO");
                const coincideBusqueda =
                    (c.nombre || "").toLowerCase().includes(filtro) ||
                    (c.telefono || "").includes(filtro);
                return coincideEstado && coincideBusqueda;
            });

            lista.innerHTML = "";
            if (!resultado.length) {
                lista.innerHTML = '<div class="empty">No hay conversaciones.</div>';
                return;
            }

            resultado.forEach(conversacion => {
                const elemento = document.createElement("div");
                elemento.className = "conversation" +
                    (conversacionSeleccionada && conversacionSeleccionada.id === conversacion.id ? " active" : "");
                elemento.innerHTML = `
                            <div class="conversation-top">
                                <div class="conversation-name">${escapeHtml(conversacion.nombre || "Sin nombre")}</div>
                                <div class="conversation-time">${formatearFecha(conversacion.ultimoMensaje)}</div>
                            </div>
                            <div class="conversation-phone">${escapeHtml(conversacion.telefono || "")}</div>
                            <div class="conversation-preview">Ultima actividad del cliente</div>
                            <div class="conversation-status">${escapeHtml(conversacion.estado || "")}</div>`;
                elemento.addEventListener("click", () => seleccionarConversacion(conversacion.id));
                lista.appendChild(elemento);
            });
        }

        async function seleccionarConversacion(id) {
            const response = await api(`/api/whatsapp/test/conversacion/${id}`);
            if (!response.ok) throw new Error("No se pudo cargar la conversacion");
            conversacionSeleccionada = await response.json();
            mostrarConversaciones();
            mostrarConversacion();
        }

        function mostrarConversacion() {
            const conversacion = conversacionSeleccionada;
            const cliente = conversacion.cliente;
            document.getElementById("chatHeader").innerHTML = `
                        <div class="chat-name">${escapeHtml(cliente.nombre || "Sin nombre")}</div>
                        <div class="chat-phone">${escapeHtml(cliente.telefono || "")}</div>`;

            mensajes.innerHTML = "";
            conversacion.mensajes.forEach(mensaje => {
                const elemento = document.createElement("div");
                const entrante = mensaje.direccion === "E";
                const esImagen = mensaje.tipo === "image";
                elemento.className = `message ${entrante ? "incoming" : "outgoing"}${esImagen ? " has-image" : ""}`;
                elemento.innerHTML = crearContenidoMensaje(mensaje) +
                    `<div class="message-info">${entrante ? "Cliente" : "CRM"} · ${formatearFecha(mensaje.fecha)}</div>`;
                mensajes.appendChild(elemento);
            });
            mensajes.scrollTop = mensajes.scrollHeight;
            input.disabled = false;
            boton.disabled = false;
            attachButton.disabled = false;
            mostrarFichaCliente(conversacion);
        }

        function crearContenidoMensaje(mensaje) {
            const esAdjunto = mensaje.tipo === "image" || mensaje.tipo === "document" || mensaje.tipo === "application/pdf";
            if (!esAdjunto) {
                return `<div>${escapeHtml(mensaje.mensaje || "")}</div>`;
            }

            let archivo;
            try {
                archivo = JSON.parse(mensaje.mensaje);
            } catch {
                // Mensajes antiguos guardados antes de tener el JSON estructurado
                return `<a href="${escapeAttribute(mensaje.mensaje)}" target="_blank" rel="noopener">Abrir documento</a>`;
            }

            const esImagen = mensaje.tipo === "image" || /\.(jpe?g|png|webp)$/i.test(archivo.nombre || archivo.url || "");

            if (esImagen) {
                return `<a href="${escapeAttribute(archivo.url)}" target="_blank" rel="noopener" class="image-card">
                            <img src="${escapeAttribute(archivo.url)}" alt="${escapeAttribute(archivo.nombre || "Imagen")}" loading="lazy">
                        </a>`;
            }

            return `<a href="${escapeAttribute(archivo.url)}" target="_blank" rel="noopener" class="file-card">
                        <span class="file-icon">&#128196;</span>
                        <span><strong>${escapeHtml(archivo.nombre)}</strong><small>Abrir documento</small></span>
                    </a>`;
        }

        function mostrarFichaCliente(conversacion) {
            const cliente = conversacion.cliente || {};
            const iniciales = (cliente.nombre || "C")
                .split(" ")
                .slice(0, 2)
                .map(nombre => nombre.charAt(0))
                .join("")
                .toUpperCase();
            const pasos = conversacion.estado === "CERRADO" ? 3 : conversacion.estado === "ABIERTO" ? 2 : 1;

            document.getElementById("details").innerHTML = `
                        <div class="details-title">Ficha del cliente</div>
                        <div class="contact-avatar">${escapeHtml(iniciales)}</div>
                        <div class="contact-name">${escapeHtml(cliente.nombre || "Sin nombre")}</div>
                        <div class="contact-phone">${escapeHtml(cliente.telefono || "Sin telefono")}</div>
                        <div class="detail-section">
                            <div class="detail-label">Etapa</div>
                            <div class="detail-value">${escapeHtml(conversacion.estado || "NUEVO")}</div>
                            <div class="pipeline">
                                <span class="pipeline-step active"></span>
                                <span class="pipeline-step ${pasos >= 2 ? "active" : ""}"></span>
                                <span class="pipeline-step ${pasos >= 3 ? "active" : ""}"></span>
                            </div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Conversacion</div>
                            <div class="detail-value">#${conversacion.id}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Ultima actividad</div>
                            <div class="detail-value">${formatearFecha(conversacion.ultimoMensaje)}</div>
                        </div>`;
        }

        async function actualizarCRM() {
            if (actualizacionEnCurso) return;
            actualizacionEnCurso = true;
            try {
                const id = conversacionSeleccionada ? conversacionSeleccionada.id : null;
                await cargarConversaciones();
                if (id) await seleccionarConversacion(id);
                estado.textContent = "API conectada";
            } catch (error) {
                console.error(error);
                estado.textContent = "Error de conexion";
            } finally {
                actualizacionEnCurso = false;
            }
        }

        async function enviarMensaje() {
            if (!conversacionSeleccionada) return;

            if (fileInput.files.length) {
                await enviarArchivo();
                return;
            }

            const texto = input.value.trim();
            if (!texto) return;
            boton.disabled = true;
            try {
                const response = await api("/api/whatsapp/test/enviar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        conversacionId: conversacionSeleccionada.id,
                        mensaje: texto,
                        usuarioId: null,
                        tipo: "text",
                        whatsappId: `TEST-${Date.now()}`
                    })
                });
                if (!response.ok) throw new Error("No se pudo enviar el mensaje");
                input.value = "";
                await seleccionarConversacion(conversacionSeleccionada.id);
            } catch (error) {
                console.error(error);
                alert("No se pudo enviar el mensaje.");
            } finally {
                boton.disabled = false;
            }
        }

        function actualizarPreviewArchivo() {
            const archivo = fileInput.files[0];
            if (!archivo) {
                attachmentPreview.classList.remove("visible");
                attachmentThumb.innerHTML = "&#128206;";
                attachmentName.textContent = "Sin archivo";
                attachmentSize.textContent = "0 KB";
                fileName.textContent = "";
                return;
            }

            const esImagen = archivo.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(archivo.name);
            const tamaño = archivo.size > 1024 * 1024 ? `${(archivo.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(archivo.size / 1024))} KB`;

            attachmentName.textContent = archivo.name;
            attachmentSize.textContent = tamaño;
            fileName.textContent = archivo.name;
            attachmentPreview.classList.add("visible");

            if (esImagen) {
                const lector = new FileReader();
                lector.onload = () => {
                    attachmentThumb.innerHTML = `<img src="${lector.result}" alt="${escapeHtml(archivo.name)}">`;
                };
                lector.readAsDataURL(archivo);
            } else {
                attachmentThumb.innerHTML = "&#128206;";
            }
        }

        function limpiarPreviewArchivo() {
            fileInput.value = "";
            attachmentPreview.classList.remove("visible");
            attachmentThumb.innerHTML = "&#128206;";
            attachmentName.textContent = "Sin archivo";
            attachmentSize.textContent = "0 KB";
            fileName.textContent = "";
        }

        async function enviarArchivo() {
            if (!conversacionSeleccionada) {
                alert("Selecciona una conversación antes de enviar un archivo.");
                return;
            }

            if (!fileInput.files.length) {
                alert("No has seleccionado ningún archivo.");
                return;
            }

            const archivo = fileInput.files[0];
            const datos = new FormData();
            datos.append("conversacionId", conversacionSeleccionada.id);
            datos.append("archivo", archivo);
            datos.append("usuarioId", "");

            attachButton.disabled = true;
            fileName.textContent = `Subiendo: ${archivo.name}...`;
            attachmentName.textContent = `Subiendo: ${archivo.name}...`;
            try {
                const response = await api("/api/whatsapp/test/enviar-archivo", {
                    method: "POST",
                    body: datos
                });
                if (!response.ok) {
                    const detalle = await response.text();
                    throw new Error(detalle || `Error HTTP ${response.status}`);
                }
                limpiarPreviewArchivo();
                await seleccionarConversacion(conversacionSeleccionada.id);
            } catch (error) {
                console.error(error);
                fileName.textContent = "Error al enviar archivo";
                attachmentName.textContent = "Error al enviar archivo";
                alert(`No se pudo enviar el archivo: ${error.message}`);
            } finally {
                attachButton.disabled = false;
            }
        }

        function formatearFecha(fecha) {
            if (!fecha) return "";
            return new Date(fecha).toLocaleString("es-PE", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
            });
        }

        function escapeHtml(text) {
            const div = document.createElement("div");
            div.textContent = text == null ? "" : text;
            return div.innerHTML;
        }

        function escapeAttribute(text) {
            return escapeHtml(text).replace(/"/g, "&quot;");
        }

        async function abrirModulo(modulo) {
            document.querySelectorAll(".nav-item").forEach(item => {
                item.classList.toggle("active", item.dataset.module === modulo);
            });

            const vista = document.getElementById("moduleView");
            const sidebar = document.querySelector(".sidebar");
            const chat = document.querySelector(".chat");
            const details = document.getElementById("details");

            if (modulo === "inbox") {
                vista.classList.add("hidden");
                sidebar.classList.remove("hidden");
                chat.classList.remove("hidden");
                details.classList.remove("hidden");
                return;
            }

            /*
             * Los módulos NO se superponen a la bandeja:
             * ocultamos el conjunto Inbox mientras se consulta Contactos,
             * Pipeline o Reportes.
             */
            sidebar.classList.add("hidden");
            chat.classList.add("hidden");
            details.classList.add("hidden");
            vista.classList.remove("hidden");
            vista.innerHTML = '<div class="empty">Cargando modulo...</div>';

            try {
                if (modulo === "contactos") await cargarModuloContactos(vista);
                if (modulo === "pipeline") await cargarModuloPipeline(vista);
                if (modulo === "reportes") await cargarModuloReportes(vista);
                if (modulo === "usuarios") await cargarModuloUsuarios(vista);
            } catch (error) {
                console.error(error);
                vista.innerHTML = '<div class="error">No se pudo cargar el modulo.</div>';
            }
        }

        async function cargarModuloContactos(vista) {
            const response = await api("/api/crm/contactos");
            if (!response.ok) throw new Error("Contactos no disponibles");
            const contactos = await response.json();
            vista.innerHTML = `
                        <div class="module-heading"><div><h1>Contactos</h1><p>Clientes registrados desde WhatsApp.</p></div></div>
                        <table class="module-table"><thead><tr><th>Nombre</th><th>Telefono</th><th>Email</th><th>Conversaciones</th></tr></thead>
                        <tbody>${contactos.map(contacto => `<tr>
                            <td><strong>${escapeHtml(contacto.nombre)}</strong></td>
                            <td>${escapeHtml(contacto.telefono)}</td>
                            <td>${escapeHtml(contacto.email || "-")}</td>
                            <td>${contacto.conversaciones}</td>
                        </tr>`).join("") || '<tr><td colspan="4">No hay contactos.</td></tr>'}</tbody></table>`;
        }

        async function cargarModuloPipeline(vista) {
            const response = await api("/api/crm/pipeline");
            if (!response.ok) throw new Error("Pipeline no disponible");
            const conversacionesPipeline = await response.json();
            const usuariosResponse = await api("/api/crm/usuarios");
            if (!usuariosResponse.ok) throw new Error("Usuarios no disponibles");
            const usuarios = await usuariosResponse.json();
            const etapas = ["NUEVO", "ABIERTO", "CERRADO", "PERDIDO"];

            const iniciales = nombre => (nombre || "C")
                .split(" ")
                .slice(0, 2)
                .map(parte => parte.charAt(0))
                .join("")
                .toUpperCase();

            vista.innerHTML = `
                        <div class="module-heading">
                            <div><h1>Pipeline</h1><p>Gestiona la etapa de cada conversación.</p></div>
                            ${(rolActual === "Administrador" || rolActual === "Supervisor")
                                ? '<button type="button" id="btnAsignarPendientes" class="secondary-btn">Asignar pendientes automáticamente</button>'
                                : ""}
                        </div>
                        <div class="stage-columns">${etapas.map(etapa => {
                            const items = conversacionesPipeline.filter(item => item.estado === etapa);
                            return `
                            <div class="stage-column" data-stage="${etapa}">
                                <div class="stage-header">
                                    <div class="stage-title"><span>${etapa}</span><span>${items.length}</span></div>
                                    <div class="stage-meta">${items.length} ${items.length === 1 ? "cliente potencial" : "clientes potenciales"}</div>
                                    <div class="stage-bar"></div>
                                </div>
                                ${items.map(item => `<div class="deal-card" data-conversation-id="${item.id}">
                                <div class="deal-card-top">
                                    <div class="deal-avatar">${escapeHtml(iniciales(item.cliente.nombre))}</div>
                                    <div class="deal-info">
                                        <strong>${escapeHtml(item.cliente.nombre)}</strong>
                                        <span class="deal-id">Conversación #${item.id}</span>
                                    </div>
                                </div>
                                <small>${escapeHtml(item.cliente.telefono)}</small>
                                ${(rolActual === "Administrador" || rolActual === "Supervisor") ? `<select class="assignee-select" data-id="${item.id}">
                                    <option value="">Sin asignar</option>
                                    ${usuarios.map(usuario => `<option value="${usuario.id}" ${usuario.nombre === item.asesor ? "selected" : ""}>${escapeHtml(usuario.nombre)} · ${escapeHtml(usuario.rol)}</option>`).join("")}
                                </select>` : `<small>Asesor: ${escapeHtml(item.asesor || "Sin asignar")}</small>`}
                                <select class="stage-select" data-id="${item.id}">
                                    ${etapas.map(opcion => `<option value="${opcion}" ${opcion === item.estado ? "selected" : ""}>${opcion}</option>`).join("")}
                                </select>
                            </div>`).join("") || '<div class="empty">Sin conversaciones</div>'}
                            </div>`;
                        }).join("")}</div>`;

            vista.querySelectorAll(".stage-select").forEach(select => {
                select.addEventListener("change", () => cambiarEstado(select.dataset.id, select.value));
            });
            vista.querySelectorAll(".assignee-select").forEach(select => {
                select.addEventListener("change", () => asignarConversacion(select.dataset.id, select.value));
            });

            /*
             * Al hacer click en la tarjeta (fuera de los <select>)
             * abrimos la conversación en la bandeja, igual que en
             * Kommo al hacer click sobre un lead del pipeline.
             */
            vista.querySelectorAll(".deal-card").forEach(card => {
                card.addEventListener("click", event => {
                    if (event.target.closest("select")) return;
                    abrirConversacionDesdePipeline(card.dataset.conversationId);
                });
            });

            const btnAsignarPendientes = document.getElementById("btnAsignarPendientes");
            if (btnAsignarPendientes) {
                btnAsignarPendientes.addEventListener("click", async () => {
                    btnAsignarPendientes.disabled = true;
                    btnAsignarPendientes.textContent = "Asignando...";
                    try {
                        const response = await api("/api/crm/conversaciones/asignar-pendientes", { method: "POST" });
                        if (!response.ok) throw new Error("No se pudo asignar");
                        const resultado = await response.json();
                        await cargarModuloPipeline(vista);
                        alert(resultado.asignadas > 0
                            ? `Se asignaron ${resultado.asignadas} conversación(es) sin asesor.`
                            : "No había conversaciones pendientes por asignar.");
                    } catch (error) {
                        console.error(error);
                        alert("No se pudieron asignar las conversaciones pendientes.");
                        btnAsignarPendientes.disabled = false;
                        btnAsignarPendientes.textContent = "Asignar pendientes automáticamente";
                    }
                });
            }
        }

        async function abrirConversacionDesdePipeline(id) {
            await abrirModulo("inbox");
            await cargarConversaciones();
            await seleccionarConversacion(id);
        }

        async function asignarConversacion(id, usuarioId) {
            const response = await api(`/api/crm/conversaciones/${id}/asignar`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioId: usuarioId ? Number(usuarioId) : null })
            });
            if (!response.ok) throw new Error("No se pudo asignar la conversación");
            await cargarModuloPipeline(document.getElementById("moduleView"));
        }

        async function cambiarEstado(id, estadoNuevo) {
            const response = await api(`/api/crm/conversaciones/${id}/estado`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: estadoNuevo })
            });
            if (!response.ok) throw new Error("No se pudo cambiar el estado");
            await cargarModuloPipeline(document.getElementById("moduleView"));
        }

        async function cargarModuloReportes(vista) {
            const response = await api("/api/crm/reportes/resumen");
            if (!response.ok) throw new Error("Reportes no disponibles");
            const reporte = await response.json();
            vista.innerHTML = `
                        <div class="module-heading"><div><h1>Reportes</h1><p>Resumen operativo del CRM.</p></div></div>
                        <div class="module-grid">
                            <div class="metric-card"><span class="metric-label">Clientes</span><strong class="metric-value">${reporte.clientes}</strong></div>
                            <div class="metric-card"><span class="metric-label">Conversaciones</span><strong class="metric-value">${reporte.conversaciones}</strong></div>
                            <div class="metric-card"><span class="metric-label">Mensajes recibidos</span><strong class="metric-value">${reporte.entrantes}</strong></div>
                            <div class="metric-card"><span class="metric-label">Mensajes enviados</span><strong class="metric-value">${reporte.salientes}</strong></div>
                        </div>`;
        }

        async function cargarModuloUsuarios(vista) {
            if (rolActual !== "Administrador") {
                vista.innerHTML = '<div class="error">Solo un administrador puede gestionar usuarios.</div>';
                return;
            }

            const response = await api("/api/crm/usuarios");
            if (!response.ok) throw new Error("Usuarios no disponibles");
            const usuarios = await response.json();
            vista.innerHTML = `
                <div class="module-heading"><div><h1>Usuarios</h1><p>Crea asesores y supervisores para repartir la atención.</p></div></div>
                <form id="newUserForm" class="user-form">
                    <input name="usuario" placeholder="Usuario de acceso" required>
                    <input name="nombre" placeholder="Nombre completo" required>
                    <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" minlength="8" required>
                    <select name="rol"><option value="Asesor">Asesor</option><option value="Supervisor">Supervisor</option></select>
                    <button type="submit">Agregar usuario</button>
                </form>
                <table class="module-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th></tr></thead>
                <tbody>${usuarios.map(usuario => `<tr><td>${escapeHtml(usuario.usuario)}</td><td>${escapeHtml(usuario.nombre)}</td><td>${escapeHtml(usuario.rol)}</td></tr>`).join("") || '<tr><td colspan="3">No hay usuarios.</td></tr>'}</tbody></table>`;

            vista.querySelector("#newUserForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                const crearResponse = await api("/api/crm/usuarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crearResponse.ok) {
                    alert(await crearResponse.text());
                    return;
                }
                await cargarModuloUsuarios(vista);
            });
        }

        document.getElementById("searchInput").addEventListener("input", mostrarConversaciones);
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", () => abrirModulo(item.dataset.module));
        });
        document.querySelectorAll(".filter-button").forEach(button => {
            button.addEventListener("click", () => {
                filtroActivo = button.dataset.filter;
                document.querySelectorAll(".filter-button").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                mostrarConversaciones();
            });
        });
        document.getElementById("sendButton").addEventListener("click", enviarMensaje);
        attachButton.addEventListener("click", () => fileInput.click());
        removeAttachment.addEventListener("click", () => {
            limpiarPreviewArchivo();
        });
        fileInput.addEventListener("change", () => {
            actualizarPreviewArchivo();
        });
        document.getElementById("messageInput").addEventListener("keydown", event => {
            if (event.key === "Enter") enviarMensaje();
        });

        iniciarAplicacion();