// Módulo frontend del CRM.

        function actualizarLabelFiltroAsesor(valorSeleccionado) {
            const valor = valorSeleccionado || "";
            const toggle = document.getElementById("inboxAdvisorToggle");
            const label = document.getElementById("inboxAdvisorLabel");
            const avatar = document.getElementById("inboxAdvisorAvatar");
            const menu = document.getElementById("inboxAdvisorMenu");

            if (!toggle || !label || !avatar || !menu) return;

            const itemActual = [...menu.querySelectorAll(".inbox-advisor-item")]
                .find(item => item.dataset.userId === valor) ||
                [...menu.querySelectorAll(".inbox-advisor-item")]
                    .find(item => item.dataset.userId === "");

            const texto = itemActual?.dataset.userLabel || "Sin filtro";
            const inicial = texto.trim().charAt(0)?.toUpperCase() || "A";

            label.textContent = texto;
            avatar.textContent = inicial;
            menu.querySelectorAll(".inbox-advisor-item").forEach(item => {
                const activo = item.dataset.userId === valor;
                item.classList.toggle("active", activo);
            });
            toggle.setAttribute("aria-expanded", "false");
            menu.classList.add("hidden");
        }

        function alternarMenuAsesor() {
            const toggle = document.getElementById("inboxAdvisorToggle");
            const menu = document.getElementById("inboxAdvisorMenu");
            if (!toggle || !menu) return;

            const abierto = menu.classList.contains("hidden");
            menu.classList.toggle("hidden", !abierto);
            toggle.setAttribute("aria-expanded", String(abierto));
        }

        async function cargarUsuariosInbox() {
            try {
                const response = await api("/api/crm/usuarios");
                if (!response.ok) return;
                const usuarios = await response.json();
                const menu = document.getElementById("inboxAdvisorMenu");
                if (normalizarRol(rolActual) === "asesor" && sesionActual?.id && !asesorFiltroActivo) {
                    asesorFiltroActivo = String(sesionActual.id);
                }
                const valorActual = asesorFiltroActivo || "";
                if (!menu) return;

                const esAsesor = esRol("asesor");
                const opciones = esAsesor
                    ? []
                    : [
                        { id: "", label: "Sin filtro", avatar: "A", neutral: false },
                        { id: "unassigned", label: "Sin asesor", avatar: "U", neutral: true }
                    ];

                usuarios
                    .filter(usuario => !esAsesor || Number(usuario.id) === Number(sesionActual?.id || 0))
                    .forEach(usuario => {
                        opciones.push({
                            id: String(usuario.id),
                            label: usuario.nombre || usuario.usuario || `Usuario ${usuario.id}`,
                            avatar: (usuario.nombre || usuario.usuario || `Usuario ${usuario.id}`).trim().charAt(0).toUpperCase() || "U",
                            neutral: false
                        });
                    });

                menu.innerHTML = opciones.map(opcion => `
                    <button class="inbox-advisor-item ${opcion.id === valorActual ? "active" : ""}" type="button" data-user-id="${opcion.id}" data-user-label="${escapeHtml(opcion.label)}">
                        <span class="inbox-advisor-avatar mini ${opcion.neutral ? "neutral" : ""}">${escapeHtml(opcion.avatar)}</span>
                        <span>${escapeHtml(opcion.label)}</span>
                    </button>
                `).join("");

                menu.querySelectorAll(".inbox-advisor-item").forEach(item => {
                    item.addEventListener("click", () => {
                        const nuevoValor = item.dataset.userId || "";
                        if (esRol("asesor")) {
                            asesorFiltroActivo = String(sesionActual?.id || "");
                        } else {
                            asesorFiltroActivo = nuevoValor === "unassigned" ? "unassigned" : nuevoValor;
                        }
                        actualizarLabelFiltroAsesor(asesorFiltroActivo);
                        mostrarConversaciones();
                        if (typeof cargarModuloDashboard === "function" && moduloActual === "dashboard") {
                            const vista = document.querySelector("#moduleView .module-content") || document.getElementById("moduleView");
                            if (vista) cargarModuloDashboard(vista);
                        }
                        if (moduloActual === "reportes") {
                            const vista = document.querySelector("#moduleView .module-content") || document.getElementById("moduleView");
                            if (vista && typeof cargarModuloReportes === "function") {
                                // Antes reportesFiltros.usuarioId nunca se actualizaba
                                // aquí: al cambiar de asesor en el inbox, el módulo de
                                // Reportes se recargaba pero seguía mostrando el filtro
                                // anterior. sincronizarFiltroReportesDesdeAsesor() existía
                                // en el archivo pero no la llamaba nadie.
                                if (typeof sincronizarFiltroReportesDesdeAsesor === "function") {
                                    sincronizarFiltroReportesDesdeAsesor();
                                }
                                cargarModuloReportes(vista);
                            }
                        }
                    });
                });

                actualizarLabelFiltroAsesor(valorActual);
            } catch (error) {
                console.error("No se pudieron cargar los usuarios para el filtro del inbox", error);
            }
        }

        document.addEventListener("click", event => {
            const toggle = document.getElementById("inboxAdvisorToggle");
            const menu = document.getElementById("inboxAdvisorMenu");

            if (!toggle || !menu) return;
            const clicFuera = !toggle.contains(event.target) && !menu.contains(event.target);
            if (clicFuera) {
                menu.classList.add("hidden");
                toggle.setAttribute("aria-expanded", "false");
            }
        });

        document.getElementById("inboxAdvisorToggle")?.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            alternarMenuAsesor();
        });

        async function cargarConversaciones() {
            const response = await api("/api/whatsapp/conversaciones");
            if (!response.ok) throw new Error("No se pudieron cargar las conversaciones");
            const nuevasConversaciones = await response.json();
            procesarNotificacionesMensajesCliente(nuevasConversaciones);
            conversaciones = nuevasConversaciones;
            document.getElementById("conversationCount").textContent =
                `${conversaciones.length} ${conversaciones.length === 1 ? "chat" : "chats"}`;
            actualizarNotificacionesComunicaciones();
            await cargarUsuariosInbox();
            mostrarConversaciones();
        }

        function obtenerTiempo(fecha) {
            if (!fecha) return 0;
            const tiempo = new Date(fecha).getTime();
            return Number.isNaN(tiempo) ? 0 : tiempo;
        }

        function procesarNotificacionesMensajesCliente(nuevasConversaciones) {
            const miId = Number(sesionActual?.id || 0);
            nuevasConversaciones.forEach(conversacion => {
                const tiempoActual = obtenerTiempo(conversacion.ultimoMensajeCliente);
                const tiempoAnterior = ultimosMensajesCliente.get(conversacion.id) || 0;
                const asignadoAMi = !conversacion.usuarioAsignadoId || miId <= 0 || Number(conversacion.usuarioAsignadoId) === miId;

                if (
                    notificacionesConversacionesInicializadas &&
                    asignadoAMi &&
                    conversacion.requiereAtencion &&
                    tiempoActual > tiempoAnterior
                ) {
                    mostrarNotificacionMensajeCliente(conversacion, true);
                }

                ultimosMensajesCliente.set(conversacion.id, tiempoActual);
            });
            notificacionesConversacionesInicializadas = true;
        }

        function mostrarNotificacionMensajeCliente(conversacion, mostrarToast = true) {
            const nombre = conversacion.nombre || "Cliente";
            const telefono = conversacion.telefono || "";
            const red = obtenerRedPorCanal(obtenerCanalConversacion(conversacion));
            const abrir = () => abrirConversacionDesdeNotificacion(conversacion.id);
            registrarNotificacionMensaje(conversacion);
            if (!mostrarToast) return;

            notificar(`
                <span class="toast-avatar">${escapeHtml(obtenerIniciales(nombre))}</span>
                <span class="toast-content">
                    <strong>Nuevo mensaje</strong>
                    <span>${escapeHtml(nombre)}</span>
                    <small>${escapeHtml(red.nombre)} · ${escapeHtml(telefono || "Click para abrir la conversación")}</small>
                </span>
            `, "message rich", abrir, true);
        }

        async function abrirConversacionDesdeNotificacion(id) {
            const sidebarVisible = !document.querySelector(".sidebar")?.classList.contains("hidden");
            if (sidebarVisible) {
                await seleccionarConversacion(id);
                return;
            }

            await abrirDetalleConversacion(id, moduloActual || "dashboard");
        }

        // normalizarCanal(), obtenerCanalConversacion() y obtenerRedPorCanal()
        // viven ahora en utils.js (catálogo REDES_DISPONIBLES) para no tener
        // dos implementaciones del mismo nombre compitiendo entre archivos.

        function renderFiltrosRedBandeja() {
            const contenedor = document.getElementById("inboxNetworkFilters");
            if (!contenedor) return;
            const red = obtenerRedPorCanal(inboxCanalActivo === "TODOS" ? "TODOS" : inboxCanalActivo);
            contenedor.innerHTML = `
                <div class="inbox-channel-context">
                    ${crearLogoRed(red.clase)}
                    <span>${escapeHtml(red.nombre)}</span>
                </div>`;
        }

        function sincronizarSubmenuComunicaciones() {
            const grupo = document.querySelector('[data-nav-group="comunicaciones"]');
            grupo?.classList.toggle("expanded", comunicacionesMenuAbierto);
            document.querySelectorAll(".nav-subitem[data-channel]").forEach(item => {
                item.classList.toggle("active", normalizarCanal(item.dataset.channel) === inboxCanalActivo);
            });
        }

        function cambiarCanalBandeja(canal, opciones = {}) {
            const nuevoCanal = normalizarCanal(canal || "TODOS");
            const cambioCanal = inboxCanalActivo !== nuevoCanal;
            inboxCanalActivo = nuevoCanal;
            comunicacionesMenuAbierto = true;
            renderFiltrosRedBandeja();
            sincronizarSubmenuComunicaciones();
            if (
                cambioCanal &&
                nuevoCanal !== "TODOS" &&
                conversacionSeleccionada &&
                obtenerCanalConversacion(conversacionSeleccionada) !== nuevoCanal
            ) {
                limpiarConversacionSeleccionada();
            }
            mostrarConversaciones();

            if (opciones.abrirModulo !== false && (moduloActual !== "inbox" || cambioCanal)) {
                abrirModulo("inbox");
            }
        }

        function limpiarConversacionSeleccionada() {
            conversacionSeleccionada = null;
            ultimoAvisoEscribiendo = 0;
            document.getElementById("chatHeader").innerHTML = `
                <div class="chat-name">Selecciona una conversacion</div>
                <div class="chat-phone">-</div>`;
            mensajes.innerHTML = '<div class="empty">Selecciona una conversacion para ver los mensajes.</div>';
            quickReplies?.classList.add("hidden");
            if (quickReplies) quickReplies.innerHTML = "";
            document.getElementById("details").innerHTML =
                '<div class="details-title">Ficha del cliente</div><div class="empty-detail">Selecciona una conversacion para ver sus datos y actividad.</div>';
            input.value = "";
            input.disabled = true;
            boton.disabled = true;
            attachButton.disabled = true;
        }

        function actualizarNotificacionesComunicaciones() {
            const badge = document.getElementById("communicationsBadge");
            if (!badge) return;
            const pendientes = conversaciones.filter(c => {
                const asignadoAMi = !c.usuarioAsignadoId || !sesionActual?.id || Number(c.usuarioAsignadoId) === Number(sesionActual.id);
                return c.requiereAtencion && asignadoAMi;
            }).length;
            badge.textContent = pendientes > 99 ? "99+" : String(pendientes);
            badge.classList.toggle("hidden", pendientes === 0);
        }

        // Refleja en el filtro de Reportes el asesor elegido en el selector
        // de la bandeja. Antes exigía esRol("asesor") para actuar, pero ese
        // selector está oculto para el rol asesor y "reportes" ni siquiera
        // está en su menú (ver MODULOS_POR_ROL en api-session.js), así que
        // la condición nunca se cumplía: quien realmente cambia de asesor
        // desde el inbox mientras ve Reportes es un administrador o
        // supervisor.
        function sincronizarFiltroReportesDesdeAsesor() {
            if (!asesorFiltroActivo || asesorFiltroActivo === "unassigned") {
                reportesFiltros.usuarioId = "";
                return;
            }
            reportesFiltros.usuarioId = String(asesorFiltroActivo);
        }

        function mostrarConversaciones() {
            const filtro = document.getElementById("searchInput").value.toLowerCase().trim();
            const resultado = conversaciones.filter(c => {
                const canal = obtenerCanalConversacion(c);
                const coincideCanal = inboxCanalActivo === "TODOS" || canal === inboxCanalActivo;
                const coincideEstado = filtroActivo === "all" ||
                    (filtroActivo === "new" && (c.estado || "").toUpperCase() === "NUEVO") ||
                    (filtroActivo === "open" && ["ABIERTO", "EN_ATENCION"].includes((c.estado || "").toUpperCase())) ||
                    (filtroActivo === "mine" && sesionActual?.id && Number(c.usuarioAsignadoId) === Number(sesionActual.id)) ||
                    (filtroActivo === "unassigned" && !c.usuarioAsignadoId) ||
                    (filtroActivo === "pending" && c.requiereAtencion);
                const coincideAsesor = asesorFiltroActivo === "" ||
                    (asesorFiltroActivo === "unassigned" && !c.usuarioAsignadoId) ||
                    (asesorFiltroActivo && Number(c.usuarioAsignadoId) === Number(asesorFiltroActivo));
                const coincideBusqueda =
                    (c.nombre || "").toLowerCase().includes(filtro) ||
                    (c.telefono || "").includes(filtro);
                return coincideCanal && coincideEstado && coincideAsesor && coincideBusqueda;
            }).sort((a, b) => {
                const atencionA = a.requiereAtencion ? 1 : 0;
                const atencionB = b.requiereAtencion ? 1 : 0;
                if (atencionA !== atencionB) return atencionB - atencionA;

                if (a.requiereAtencion && b.requiereAtencion) {
                    return obtenerTiempo(a.ultimoMensajeCliente || a.ultimoMensaje) -
                        obtenerTiempo(b.ultimoMensajeCliente || b.ultimoMensaje);
                }

                return obtenerTiempo(b.ultimoMensaje) - obtenerTiempo(a.ultimoMensaje);
            });

            lista.innerHTML = "";
            if (!resultado.length) {
                lista.innerHTML = '<div class="empty">No hay conversaciones para este filtro.</div>';
                return;
            }

            resultado.forEach(conversacion => {
                const red = obtenerRedPorCanal(obtenerCanalConversacion(conversacion));
                const textoAtencion = conversacion.requiereAsignacion || !conversacion.usuarioAsignadoId
                    ? "Sin asesor"
                    : "Respuesta pendiente";
                const textoAsignado = conversacion.usuarioAsignado
                    ? `Asesor: ${conversacion.usuarioAsignado}`
                    : "";
                const elemento = document.createElement("div");
                elemento.className = "conversation" +
                    (conversacionSeleccionada && conversacionSeleccionada.id === conversacion.id ? " active" : "") +
                    (conversacion.requiereAtencion ? " needs-attention" : "");
                elemento.innerHTML = `
                            <div class="conversation-top">
                                <div class="conversation-name">${escapeHtml(conversacion.nombre || "Sin nombre")}</div>
                                <div class="conversation-time">${formatearFecha(conversacion.ultimoMensaje)}</div>
                            </div>
                            <div class="conversation-channel">
                                ${crearLogoRed(red.clase)}
                                <span>${escapeHtml(red.nombre)}</span>
                            </div>
                            <div class="conversation-phone">${escapeHtml(conversacion.telefono || "")}</div>
                            <div class="conversation-preview">${escapeHtml(textoAsignado || "Ultima actividad del cliente")}</div>
                            ${conversacion.requiereAtencion ? `<div class="conversation-alert">${textoAtencion}</div>` : ""}
                            <div class="conversation-status">${escapeHtml(conversacion.estado || "")}</div>`;
                elemento.addEventListener("click", () => seleccionarConversacion(conversacion.id));
                lista.appendChild(elemento);
            });
        }

        async function seleccionarConversacion(id, opciones = {}) {
            const refrescarFicha = opciones.refrescarFicha !== false;
            const response = await api(`/api/whatsapp/conversaciones/${id}`);
            if (!response.ok) throw new Error("No se pudo cargar la conversacion");
            conversacionSeleccionada = await response.json();
            ultimoAvisoEscribiendo = 0;
            mostrarConversaciones();
            mostrarConversacion({ refrescarFicha });
        }

        function mostrarConversacion(opciones = {}) {
            const refrescarFicha = opciones.refrescarFicha !== false;
            const conversacion = conversacionSeleccionada;
            const cliente = conversacion.cliente;
            const red = obtenerRedPorCanal(obtenerCanalConversacion(conversacion));
            const botActivo = (conversacion.bot?.estado || "ACTIVO").toUpperCase() === "ACTIVO";
            const asignadoId = conversacion.usuarioAsignado?.id;
            const asignadoAMi = asignadoId && sesionActual?.id && Number(asignadoId) === Number(sesionActual.id);
            const puedeTomar = !asignadoId || !asignadoAMi;
            document.getElementById("chatHeader").innerHTML = `
                        <div class="chat-title-row">
                            <div>
                                <div class="chat-name">${escapeHtml(cliente.nombre || "Sin nombre")}</div>
                                <div class="chat-phone">${escapeHtml(cliente.telefono || "")}${conversacion.usuarioAsignado ? ` · ${escapeHtml(conversacion.usuarioAsignado.nombre || conversacion.usuarioAsignado.usuario || "Asesor")}` : " · Sin asesor"}</div>
                            </div>
                            <div class="chat-channel-actions">
                                ${puedeTomar ? `<button id="takeConversationButton" class="chat-action-button" type="button">${asignadoId ? "Tomar" : "Tomar chat"}</button>` : ""}
                                <span class="chat-channel-badge">${crearLogoRed(red.clase)}${escapeHtml(red.nombre)}</span>
                                <button id="chatBotToggle" class="chat-bot-toggle ${botActivo ? "active" : "paused"}" type="button" title="${botActivo ? "Bot activo" : "Bot pausado"}">
                                    <span class="bot-toggle-dot"></span>
                                    <span>${botActivo ? "Bot activo" : "Bot pausado"}</span>
                                </button>
                            </div>
                        </div>`;
            document.getElementById("leadDetailId").textContent =
                `Conversación #${conversacion.id} · ${cliente.nombre || "Sin nombre"}`;
            document.getElementById("chatBotToggle")?.addEventListener("click", () => {
                cambiarBotConversacion(conversacion.id, botActivo ? "PAUSADO" : "ACTIVO");
            });
            document.getElementById("takeConversationButton")?.addEventListener("click", () => {
                tomarConversacion(conversacion.id);
            });

            renderizarMensajesConversacion(conversacion.mensajes || []);
            renderizarPlantillasRapidas();
            input.disabled = false;
            boton.disabled = false;
            attachButton.disabled = false;
            if (refrescarFicha) {
                mostrarFichaCliente(conversacion);
            }
        }

        async function obtenerPlantillasRapidas() {
            if (plantillasRapidasCache) return plantillasRapidasCache;

            try {
                const response = await api("/api/plantillas-rapidas");
                if (!response.ok) throw new Error("No se pudieron cargar las plantillas.");
                const data = await response.json();
                plantillasRapidasCache = Array.isArray(data.templates)
                    ? data.templates.filter(template => template.message)
                    : [];
            } catch (error) {
                console.error(error);
                plantillasRapidasCache = [];
            }

            return plantillasRapidasCache;
        }

        async function renderizarPlantillasRapidas() {
            if (!quickReplies) return;
            if (!conversacionSeleccionada) {
                quickReplies.classList.add("hidden");
                quickReplies.innerHTML = "";
                return;
            }

            const plantillas = await obtenerPlantillasRapidas();
            if (!plantillas.length) {
                quickReplies.classList.add("hidden");
                quickReplies.innerHTML = "";
                return;
            }

            quickReplies.innerHTML = `
                <div class="quick-replies-list">
                    ${plantillas.slice(0, 10).map(template => `
                        <button type="button" class="quick-reply" data-quick-reply="${escapeAttribute(template.message)}" title="${escapeAttribute(template.message)}">
                            ${escapeHtml(template.title || "Respuesta")}
                        </button>
                    `).join("")}
                </div>`;
            quickReplies.classList.remove("hidden");
            quickReplies.querySelectorAll("[data-quick-reply]").forEach(button => {
                button.addEventListener("click", () => {
                    input.value = button.dataset.quickReply || "";
                    input.focus();
                });
            });
        }

        async function actualizarPerfilMeta(id) {
            try {
                const response = await api(`/api/crm/conversaciones/${id}/actualizar-perfil-meta`, {
                    method: "POST"
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    notificar(data.error || "Meta no devolvió el nombre del contacto.", "error");
                    return;
                }

                notificar(`Nombre actualizado: ${escapeHtml(data.nombre || "contacto")}`, "success");
                await cargarConversaciones();
                await seleccionarConversacion(id);
            } catch (error) {
                console.error(error);
                notificar("No se pudo actualizar el nombre desde Meta.", "error");
            }
        }

        function renderizarMensajesConversacion(listaMensajes) {
            mensajes.innerHTML = "";
            listaMensajes.forEach(mensaje => {
                const elemento = document.createElement("div");
                const entrante = mensaje.direccion === "E";
                const esImagen = mensaje.tipo === "image";
                elemento.className = `message ${entrante ? "incoming" : "outgoing"}${esImagen ? " has-image" : ""}`;
                const ticks = entrante ? "" : crearTicksMensaje(mensaje);
                const autor = entrante ? "Cliente" : (mensaje.tipo === "bot" ? "Bot" : "CRM");
                elemento.innerHTML = crearContenidoMensaje(mensaje) +
                    `<div class="message-info"><span>${autor} · ${formatearFecha(mensaje.fecha)}</span>${ticks}</div>`;
                mensajes.appendChild(elemento);
            });
            mensajes.scrollTop = mensajes.scrollHeight;
        }

        function agregarMensajeOptimista(texto) {
            if (!conversacionSeleccionada) return null;

            const mensajeTemporal = {
                id: `tmp-${Date.now()}`,
                direccion: "S",
                tipo: "text",
                estado: "ENVIANDO",
                mensaje: texto,
                fecha: new Date().toISOString()
            };

            conversacionSeleccionada.mensajes = [
                ...(conversacionSeleccionada.mensajes || []),
                mensajeTemporal
            ];
            conversacionSeleccionada.ultimoMensaje = mensajeTemporal.fecha;
            renderizarMensajesConversacion(conversacionSeleccionada.mensajes);
            return mensajeTemporal.id;
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

        // =========================================================
        // CHECKS DE ESTADO DEL MENSAJE (estilo WhatsApp)
        // =========================================================
        //
        // ✓ gris       -> ENVIADO (salió de Meta, aún no llega al cliente)
        // ✓✓ gris      -> ENTREGADO (llegó al teléfono del cliente)
        // ✓✓ azul      -> LEIDO (el cliente abrió el mensaje)
        // ✗ rojo       -> FALLIDO (Meta no pudo entregarlo)
        //
        // Estos estados los actualiza el backend cuando Meta envía
        // los acuses "statuses" al webhook.
        //
        // =========================================================

        function crearTicksMensaje(mensaje) {
            const estado = (mensaje.estado || "").toUpperCase();

            if (estado === "ENVIANDO") {
                return `<span class="message-ticks tick-pendiente" title="Enviando...">...</span>`;
            }
            if (estado === "ERROR") {
                return `<span class="message-ticks tick-fallido" title="No se pudo enviar">&#10007;</span>`;
            }
            if (estado.startsWith("FALLIDO")) {
                const detalle = estado.includes(":") ? estado.split(":").slice(1).join(":") : "";
                const titulo = detalle ? `No se pudo entregar: ${detalle}` : "No se pudo entregar";
                return `<span class="message-ticks tick-fallido" title="${escapeAttribute(titulo)}">&#10007;</span>`;
            }
            if (estado === "LEIDO") {
                return `<span class="message-ticks tick-leido" title="Leído">&#10003;&#10003;</span>`;
            }
            if (estado === "ENTREGADO") {
                return `<span class="message-ticks tick-entregado" title="Entregado">&#10003;&#10003;</span>`;
            }
            if (estado === "ENVIADO") {
                return `<span class="message-ticks tick-enviado" title="Enviado, aún no entregado">&#10003;</span>`;
            }
            if (estado === "LOCAL") {
                return `<span class="message-ticks tick-pendiente" title="Guardado en CRM. No enviado por WhatsApp porque el archivo no tiene URL pública HTTPS.">&#128206;</span>`;
            }

            // Mensajes de prueba (sin Meta conectada) u otros estados
            // que no vienen de un acuse todavía.
            return `<span class="message-ticks tick-pendiente" title="Enviado">&#10003;</span>`;
        }