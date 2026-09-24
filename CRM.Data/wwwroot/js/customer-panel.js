// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        function mostrarFichaCliente(conversacion) {
            const cliente = conversacion.cliente || {};
            const avatar = renderClienteAvatar(cliente, "contact-avatar");
            const etiquetaContacto = obtenerEtiquetaContacto(conversacion);
            const canal = (conversacion?.canal || "WHATSAPP").toUpperCase();
            const puedeActualizarMeta = ["FACEBOOK", "INSTAGRAM"].includes(canal);
            if (fichaTabActiva === "bot") {
                fichaTabActiva = "datos";
            }
            const tabs = [
                ["datos", "Datos"],
                ["notas", "Notas"],
                ["tareas", "Tareas"],
                ["ventas", "Ventas"],
                ["actividad", "Actividad"]
            ];

            document.getElementById("details").innerHTML = `
                <div class="details-title">Ficha del cliente</div>
                <div class="crm-card compact-profile">
                    ${avatar}
                    <div class="contact-name">${escapeHtml(cliente.nombre || "Sin nombre")}</div>
                    <div class="contact-phone">
                        <span>${escapeHtml(etiquetaContacto)}</span>
                        <strong>${escapeHtml(cliente.telefono || "Sin dato")}</strong>
                    </div>
                    ${puedeActualizarMeta ? `<button id="refreshMetaProfileButton" class="profile-refresh-button" type="button">Actualizar perfil</button>` : ""}
                    <div id="clientTags" class="tag-list compact-loading">Cargando etiquetas...</div>
                    <div id="client360Summary" class="client-360-summary">
                        <div class="summary-skeleton"></div>
                        <div class="summary-skeleton"></div>
                        <div class="summary-skeleton"></div>
                    </div>
                </div>
                <div class="crm-tabs">
                    ${tabs.map(([id, label]) => `<button type="button" class="crm-tab ${fichaTabActiva === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
                </div>
                <div id="crmPanel" class="crm-panel"><div class="empty-detail">Cargando...</div></div>`;

            document.querySelectorAll(".crm-tab").forEach(tab => {
                tab.addEventListener("click", () => {
                    fichaTabActiva = tab.dataset.tab;
                    mostrarFichaCliente(conversacionSeleccionada);
                });
            });
            document.getElementById("refreshMetaProfileButton")?.addEventListener("click", () => {
                actualizarPerfilMeta(conversacion.id);
            });

            cargarEtiquetasCliente(cliente.id);
            cargarResumen360Cliente(conversacion);
            cargarPanelFicha(fichaTabActiva, conversacion);
        }

        function obtenerIniciales(nombre) {
            return (nombre || "U")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(parte => parte.charAt(0))
                .join("")
                .toUpperCase();
        }

        function renderClienteAvatar(cliente, clase) {
            const foto = cliente?.fotoPerfilUrl;
            const iniciales = obtenerIniciales(cliente?.nombre || "Cliente");
            if (foto) {
                return `<div class="${clase} has-photo" style="background-image:url('${escapeAttribute(foto)}')" title="${escapeAttribute(cliente?.nombre || "Cliente")}"></div>`;
            }

            return `<div class="${clase}">${escapeHtml(iniciales)}</div>`;
        }

        function obtenerEtiquetaContacto(conversacion) {
            const canal = (conversacion?.canal || "WHATSAPP").toUpperCase();
            if (canal === "FACEBOOK") return "ID Messenger";
            if (canal === "INSTAGRAM") return "ID Instagram";
            if (canal === "TIKTOK") return "ID TikTok";
            return "Teléfono";
        }

        async function cargarResumen360Cliente(conversacion) {
            const contenedor = document.getElementById("client360Summary");
            const clienteId = conversacion?.cliente?.id;
            if (!contenedor || !clienteId) return;

            try {
                const [notasResponse, tareasResponse, ventasResponse, actividadResponse] = await Promise.all([
                    api(`/api/clientes/${clienteId}/notas`).catch(() => null),
                    api(`/api/tareas?clienteId=${clienteId}&pageSize=50`).catch(() => null),
                    api(`/api/oportunidades?clienteId=${clienteId}&pageSize=50`).catch(() => null),
                    api(`/api/crm/actividad?entidad=Cliente&entidadId=${clienteId}&pageSize=1`).catch(() => null)
                ]);

                const notas = notasResponse?.ok ? await notasResponse.json() : [];
                const tareasPagina = tareasResponse?.ok ? await tareasResponse.json() : { items: [] };
                const ventasPagina = ventasResponse?.ok ? await ventasResponse.json() : { items: [] };
                const actividadPagina = actividadResponse?.ok ? await actividadResponse.json() : { items: [] };
                const tareas = tareasPagina.items || [];
                const ventas = ventasPagina.items || [];
                const tareasVencidas = tareas.filter(tarea => tarea.estado === "VENCIDA").length;
                const tareasPendientes = tareas.filter(tarea => tarea.estado === "PENDIENTE" || tarea.estado === "VENCIDA").length;
                const ventasAbiertas = ventas.filter(venta => !["GANADA", "PERDIDA"].includes(venta.etapa)).length;
                const ventaAbiertaMonto = ventas
                    .filter(venta => !["GANADA", "PERDIDA"].includes(venta.etapa))
                    .reduce((total, venta) => total + Number(venta.monto || 0), 0);
                const ultimaNota = notas[0]?.texto || "Sin notas internas";
                const ultimaActividad = actividadPagina.items?.[0]?.fecha || conversacion.ultimoMensaje;

                contenedor.innerHTML = `
                    <div class="client-360-grid">
                        <article class="${tareasVencidas ? "danger" : ""}">
                            <span>Tareas</span>
                            <strong>${formatearNumero(tareasPendientes)}</strong>
                            <small>${tareasVencidas ? `${tareasVencidas} vencida(s)` : "Al día"}</small>
                        </article>
                        <article>
                            <span>Ventas</span>
                            <strong>${formatearNumero(ventasAbiertas)}</strong>
                            <small>${formatearMoneda(ventaAbiertaMonto)} abiertas</small>
                        </article>
                        <article>
                            <span>Notas</span>
                            <strong>${formatearNumero(notas.length)}</strong>
                            <small>${escapeHtml(ultimaNota).slice(0, 48)}</small>
                        </article>
                    </div>
                    <div class="client-360-last">
                        <span>Última actividad</span>
                        <strong>${formatearFecha(ultimaActividad)}</strong>
                    </div>`;
            } catch (error) {
                console.error(error);
                contenedor.innerHTML = '<div class="empty-detail">Resumen 360 no disponible.</div>';
            }
        }

        async function cargarPanelFicha(tab, conversacion) {
            const panel = document.getElementById("crmPanel");
            if (!panel || !conversacion) return;

            try {
                if (tab === "datos") return renderDatosCliente(panel, conversacion);
                if (tab === "notas") return await renderNotasCliente(panel, conversacion);
                if (tab === "tareas") return await renderTareasCliente(panel, conversacion);
                if (tab === "ventas") return await renderOportunidadesCliente(panel, conversacion);
                if (tab === "actividad") return await renderActividadCliente(panel, conversacion);
            } catch (error) {
                console.error(error);
                panel.innerHTML = '<div class="error compact-error">No se pudo cargar esta sección.</div>';
            }
        }

        function renderDatosCliente(panel, conversacion) {
            const cliente = conversacion.cliente || {};
            const etapasPermitidas = estadosConversacionPorRol();
            const etapaActual = estadosConversacion().find(etapa => etapa.id === conversacion.estado);
            const etapas = etapaActual && !etapasPermitidas.some(etapa => etapa.id === etapaActual.id)
                ? [...etapasPermitidas, etapaActual]
                : etapasPermitidas;
            const indiceEtapa = Math.max(etapas.findIndex(etapa => etapa.id === conversacion.estado), 0);
            const pasos = Math.min(indiceEtapa + 1, 4);
            panel.innerHTML = `
                <form id="clientForm" class="crm-form">
                    <label>Nombre<input name="nombre" value="${escapeAttribute(cliente.nombre || "")}" maxlength="150"></label>
                    <label>Telefono<input name="telefono" value="${escapeAttribute(cliente.telefono || "")}" maxlength="30"></label>
                    <label>Email<input name="email" type="email" value="${escapeAttribute(cliente.email || "")}" maxlength="150"></label>
                    <label>Documento<input name="documento" value="${escapeAttribute(cliente.documento || "")}" maxlength="20"></label>
                    <button type="submit">Guardar datos</button>
                </form>
                <div class="detail-section compact-section">
                    <div class="detail-label">Etapa de atención</div>
                    <select id="conversationStateSelect" class="mini-select">
                        ${etapas.map(etapa => `<option value="${etapa.id}" ${etapa.id === conversacion.estado ? "selected" : ""}>${escapeHtml(etapa.label)}</option>`).join("")}
                    </select>
                    <div class="pipeline">
                        <span class="pipeline-step active"></span>
                        <span class="pipeline-step ${pasos >= 2 ? "active" : ""}"></span>
                        <span class="pipeline-step ${pasos >= 3 ? "active" : ""}"></span>
                        <span class="pipeline-step ${pasos >= 4 ? "active" : ""}"></span>
                    </div>
                </div>
                <div class="crm-facts">
                    <span>Conversación #${conversacion.id}</span>
                    <span>${conversacion.usuarioAsignado ? `Asesor: ${escapeHtml(conversacion.usuarioAsignado.nombre || conversacion.usuarioAsignado.usuario)}` : "Sin asesor asignado"}</span>
                    <span>Ultima actividad ${formatearFecha(conversacion.ultimoMensaje)}</span>
                </div>`;

            document.getElementById("clientForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.email = datos.email?.trim() || null;
                datos.documento = datos.documento?.trim() || null;
                datos.nombre = datos.nombre?.trim() || null;
                datos.telefono = datos.telefono?.trim() || null;
                const response = await api(`/api/crm/contactos/${cliente.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!response.ok) {
                    notificar(await response.text(), "error");
                    return;
                }
                await seleccionarConversacion(conversacion.id);
                notificar("Datos del cliente guardados.", "success");
            });

            document.getElementById("conversationStateSelect").addEventListener("change", async event => {
                const response = await api(`/api/crm/conversaciones/${conversacion.id}/estado`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estado: event.currentTarget.value })
                });
                if (!response.ok) {
                    notificar(await obtenerMensajeError(response, "No se pudo cambiar la etapa."), "error");
                    return;
                }
                await cargarConversaciones();
                await seleccionarConversacion(conversacion.id);
                notificar("Etapa de atención actualizada.", "success");
            });
        }

        function renderBotConversacion(panel, conversacion) {
            const bot = conversacion.bot || {};
            const estado = (bot.estado || "ACTIVO").toUpperCase();
            const activo = estado === "ACTIVO";
            panel.innerHTML = `
                <div class="conversation-bot-card ${activo ? "active" : "paused"}">
                    <div>
                        <span class="panel-kicker">Bot de derivación</span>
                        <h3>${activo ? "Bot activo" : "Bot pausado"}</h3>
                        <p>${activo
                            ? "El bot puede enviar el menú inicial y responder opciones simples hasta el límite configurado."
                            : "El asesor tomó control. El bot no responderá automáticamente en esta conversación."}</p>
                    </div>
                    <button id="conversationBotToggle" class="connection-action" type="button">
                        ${activo ? "Pausar bot" : "Activar bot"}
                    </button>
                </div>
                <div class="crm-list">
                    <article class="crm-list-item">
                        <strong>Regla de ahorro</strong>
                        <p>El bot solo debe ayudar a derivar o clasificar. Cuando el asesor responde, se pausa automáticamente para evitar mensajes innecesarios.</p>
                    </article>
                    <article class="crm-list-item">
                        <strong>Estado actual</strong>
                        <p>${escapeHtml(estado)}${bot.pausadoDesde ? ` desde ${formatearFecha(bot.pausadoDesde)}` : ""}</p>
                    </article>
                </div>`;

            document.getElementById("conversationBotToggle").addEventListener("click", () => {
                cambiarBotConversacion(conversacion.id, activo ? "PAUSADO" : "ACTIVO", "bot");
            });
        }

        async function cambiarBotConversacion(conversacionId, estado, tabRetorno = fichaTabActiva) {
            const response = await api(`/api/whatsapp/conversaciones/${conversacionId}/bot`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado })
            });
            if (!response.ok) {
                notificar(await obtenerMensajeError(response, "No se pudo cambiar el estado del bot."), "error");
                return;
            }
            await seleccionarConversacion(conversacionId);
            notificar(estado === "ACTIVO" ? "Bot activado para este chat." : "Bot pausado para este chat.", "success");
            fichaTabActiva = tabRetorno;
            if (tabRetorno === "bot") {
                mostrarFichaCliente(conversacionSeleccionada);
            }
        }

        async function renderNotasCliente(panel, conversacion) {
            const clienteId = conversacion.cliente.id;
            const response = await api(`/api/clientes/${clienteId}/notas`);
            if (!response.ok) throw new Error("Notas no disponibles");
            const notas = await response.json();
            panel.innerHTML = `
                <form id="noteForm" class="crm-form">
                    <textarea name="texto" rows="3" maxlength="4000" placeholder="Nota interna para el equipo" required></textarea>
                    <button type="submit">Agregar nota</button>
                </form>
                <div class="crm-list">
                    ${notas.map(nota => `<article class="crm-list-item">
                        <strong>${escapeHtml(nota.autor || "Equipo")}</strong>
                        <p>${escapeHtml(nota.texto)}</p>
                        <small>${formatearFecha(nota.fecha)}</small>
                    </article>`).join("") || '<div class="empty-detail">Sin notas internas.</div>'}
                </div>`;

            document.getElementById("noteForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.conversacionId = conversacion.id;
                const crear = await api(`/api/clientes/${clienteId}/notas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                await renderNotasCliente(panel, conversacion);
                await cargarResumen360Cliente(conversacion);
                notificar("Nota agregada.", "success");
            });
        }

        async function renderTareasCliente(panel, conversacion) {
            const clienteId = conversacion.cliente.id;
            const [tareasResponse, usuarios] = await Promise.all([
                api(`/api/tareas?clienteId=${clienteId}&pageSize=20`),
                cargarUsuarios()
            ]);
            if (!tareasResponse.ok) throw new Error("Tareas no disponibles");
            const pagina = await tareasResponse.json();
            const tareas = pagina.items || [];
            panel.innerHTML = `
                <form id="taskForm" class="crm-form">
                    <input name="titulo" maxlength="200" placeholder="Seguimiento pendiente" required>
                    <input name="fechaVencimiento" type="datetime-local" required>
                    <select name="asignadoAId"><option value="">Sin asignar</option>${usuarios.map(u => `<option value="${u.id}" ${Number(u.id) === Number(sesionActual?.id) ? "selected" : ""}>${escapeHtml(u.nombre)}</option>`).join("")}</select>
                    <textarea name="descripcion" rows="2" maxlength="2000" placeholder="Detalle opcional"></textarea>
                    <button type="submit">Crear tarea</button>
                </form>
                <div class="crm-list">
                    ${tareas.map(tarea => `<article class="crm-list-item ${tarea.estado === "VENCIDA" ? "danger" : ""}">
                        <strong>${escapeHtml(tarea.titulo)}</strong>
                        <p>${escapeHtml(tarea.descripcion || "")}</p>
                        <small>${escapeHtml(tarea.estado)} · ${formatearFecha(tarea.vence)}${tarea.asignadoA ? ` · ${escapeHtml(tarea.asignadoA)}` : ""}</small>
                        ${tarea.estado !== "COMPLETADA" && tarea.estado !== "CANCELADA" ? `<button type="button" class="mini-action" data-complete-task="${tarea.id}">Completar</button>` : ""}
                    </article>`).join("") || '<div class="empty-detail">Sin tareas.</div>'}
                </div>`;

            document.getElementById("taskForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.clienteId = clienteId;
                datos.conversacionId = conversacion.id;
                datos.asignadoAId = datos.asignadoAId ? Number(datos.asignadoAId) : null;
                if (!puedeGestionarEquipoCRM() && sesionActual?.id) {
                    datos.asignadoAId = Number(sesionActual.id);
                }
                const crear = await api("/api/tareas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                await renderTareasCliente(panel, conversacion);
                await cargarResumen360Cliente(conversacion);
                notificar("Tarea creada.", "success");
            });

            panel.querySelectorAll("[data-complete-task]").forEach(button => {
                button.addEventListener("click", async () => {
                    const response = await api(`/api/tareas/${button.dataset.completeTask}/completar`, { method: "PUT" });
                    if (!response.ok) notificar(await response.text(), "error");
                    await renderTareasCliente(panel, conversacion);
                    await cargarResumen360Cliente(conversacion);
                    if (response.ok) notificar("Tarea completada.", "success");
                });
            });
        }

        async function renderOportunidadesCliente(panel, conversacion) {
            const clienteId = conversacion.cliente.id;
            const response = await api(`/api/oportunidades?clienteId=${clienteId}&pageSize=20`);
            if (!response.ok) throw new Error("Oportunidades no disponibles");
            const pagina = await response.json();
            const oportunidades = pagina.items || [];
            const etapas = ["NUEVA", "CALIFICADA", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];
            panel.innerHTML = `
                <form id="dealForm" class="crm-form two-cols">
                    <input name="titulo" maxlength="200" placeholder="Nueva oportunidad" required>
                    <input name="monto" type="number" min="0" step="0.01" placeholder="Monto">
                    <select name="moneda"><option value="PEN">PEN</option><option value="USD">USD</option></select>
                    <input name="probabilidad" type="number" min="0" max="100" value="10" placeholder="Probabilidad">
                    <button type="submit">Crear oportunidad</button>
                </form>
                <div class="crm-list">
                    ${oportunidades.map(op => `<article class="crm-list-item">
                        <strong>${escapeHtml(op.titulo)}</strong>
                        <p>${escapeHtml(op.moneda)} ${Number(op.monto || 0).toFixed(2)} · ${op.probabilidad}%</p>
                        <select class="mini-select" data-deal-stage="${op.id}">
                            ${etapas.map(etapa => `<option value="${etapa}" ${etapa === op.etapa ? "selected" : ""}>${etapa}</option>`).join("")}
                        </select>
                    </article>`).join("") || '<div class="empty-detail">Sin oportunidades.</div>'}
                </div>`;

            document.getElementById("dealForm").addEventListener("submit", async event => {
                event.preventDefault();
                const datos = Object.fromEntries(new FormData(event.currentTarget));
                datos.clienteId = clienteId;
                datos.conversacionId = conversacion.id;
                datos.monto = Number(datos.monto || 0);
                datos.probabilidad = Number(datos.probabilidad || 10);
                const crear = await api("/api/oportunidades", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                if (!crear.ok) {
                    notificar(await crear.text(), "error");
                    return;
                }
                await renderOportunidadesCliente(panel, conversacion);
                await cargarResumen360Cliente(conversacion);
                notificar("Oportunidad creada.", "success");
            });

            panel.querySelectorAll("[data-deal-stage]").forEach(select => {
                select.addEventListener("change", async () => {
                    const body = { etapa: select.value };
                    if (select.value === "PERDIDA") {
                        const motivo = await solicitarTextoModal("Motivo de pérdida", "Indica por qué se perdió esta oportunidad");
                        if (!motivo) {
                            await renderOportunidadesCliente(panel, conversacion);
                            return;
                        }
                        body.motivoPerdida = motivo;
                    }
                    const response = await api(`/api/oportunidades/${select.dataset.dealStage}/etapa`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) notificar(await response.text(), "error");
                    await renderOportunidadesCliente(panel, conversacion);
                    await cargarResumen360Cliente(conversacion);
                    if (response.ok) notificar("Etapa de oportunidad actualizada.", "success");
                });
            });
        }

        async function renderActividadCliente(panel, conversacion) {
            const clienteId = conversacion.cliente.id;
            const [actividadCliente, actividadConversacion] = await Promise.all([
                api(`/api/crm/actividad?entidad=Cliente&entidadId=${clienteId}&pageSize=10`),
                api(`/api/crm/actividad?entidad=Conversacion&entidadId=${conversacion.id}&pageSize=10`)
            ]);
            const registros = [];
            if (actividadCliente.ok) registros.push(...((await actividadCliente.json()).items || []));
            if (actividadConversacion.ok) registros.push(...((await actividadConversacion.json()).items || []));
            registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            panel.innerHTML = `<div class="crm-list">
                ${registros.map(item => `<article class="crm-list-item">
                    <strong>${escapeHtml(item.accion)}</strong>
                    <p>${escapeHtml(item.anterior || "")} ${item.nuevo ? `→ ${escapeHtml(item.nuevo)}` : ""}</p>
                    <small>${escapeHtml(item.usuario)} · ${formatearFecha(item.fecha)}</small>
                </article>`).join("") || '<div class="empty-detail">Sin actividad registrada.</div>'}
            </div>`;
        }

        async function cargarEtiquetasCliente(clienteId) {
            const contenedor = document.getElementById("clientTags");
            if (!contenedor || !clienteId) return;
            const puedeGestionarEtiquetas = puedeGestionarEquipoCRM();
            const [clienteTagsResponse, todasResponse] = await Promise.all([
                api(`/api/etiquetas/clientes/${clienteId}`),
                api("/api/etiquetas")
            ]);
            const asignadas = clienteTagsResponse.ok ? await clienteTagsResponse.json() : [];
            const todas = todasResponse.ok ? await todasResponse.json() : [];
            const disponibles = todas.filter(tag => !asignadas.some(actual => actual.id === tag.id));

            contenedor.innerHTML = `
                ${asignadas.map(tag => `<span class="client-tag" style="--tag:${escapeAttribute(tag.color)}">${escapeHtml(tag.nombre)}<button type="button" class="tag-remove" data-remove-tag="${tag.id}" title="Quitar etiqueta">x</button></span>`).join("") || '<span class="muted-small">Sin etiquetas</span>'}
                ${disponibles.length ? `<select id="tagPicker" class="tag-picker"><option value="">+ etiqueta</option>${disponibles.map(tag => `<option value="${tag.id}">${escapeHtml(tag.nombre)}</option>`).join("")}</select>` : ""}
                ${puedeGestionarEtiquetas ? `<form id="tagCreateForm" class="tag-create-form"><input name="nombre" maxlength="60" placeholder="Nueva etiqueta" required><input name="color" type="color" value="#0f766e" title="Color"><button type="submit">Crear</button></form>` : ""}`;

            contenedor.querySelectorAll("[data-remove-tag]").forEach(button => {
                button.addEventListener("click", async () => {
                    const response = await api(`/api/etiquetas/clientes/${clienteId}/${button.dataset.removeTag}`, { method: "DELETE" });
                    if (!response.ok) notificar(await response.text(), "error");
                    await cargarEtiquetasCliente(clienteId);
                    if (response.ok) notificar("Etiqueta retirada.", "success");
                });
            });

            const picker = document.getElementById("tagPicker");
            if (picker) {
                picker.addEventListener("change", async () => {
                    if (!picker.value) return;
                    const response = await api(`/api/etiquetas/clientes/${clienteId}/${picker.value}`, { method: "POST" });
                    if (!response.ok) notificar(await response.text(), "error");
                    await cargarEtiquetasCliente(clienteId);
                    if (response.ok) notificar("Etiqueta asignada.", "success");
                });
            }

            const form = document.getElementById("tagCreateForm");
            if (form) {
                form.addEventListener("submit", async event => {
                    event.preventDefault();
                    const datos = Object.fromEntries(new FormData(form));
                    const crear = await api("/api/etiquetas", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(datos)
                    });

                    if (!crear.ok) {
                        notificar(await crear.text(), "error");
                        return;
                    }

                    const etiqueta = await crear.json();
                    await api(`/api/etiquetas/clientes/${clienteId}/${etiqueta.id}`, { method: "POST" });
                    await cargarEtiquetasCliente(clienteId);
                    notificar("Etiqueta creada.", "success");
                });
            }
        }

        async function cargarUsuarios() {
            if (usuariosCache) return usuariosCache;
            const response = await api("/api/crm/usuarios");
            usuariosCache = response.ok ? await response.json() : [];
            return usuariosCache;
        }
