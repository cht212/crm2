// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        async function cargarModuloBot(vista) {
            let bot = {
                enabled: true,
                message: "Hola, gracias por escribirnos. En breves se le derivara con un asesor.\n\nResponde con una opcion:\n1. Hablar con un asesor\n2. Informacion de productos\n3. Cotizacion\n4. Horarios y ubicacion",
                maxAutoReplies: 2,
                options: []
            };
            let aviso = "";

            try {
                const response = await api("/api/bot/whatsapp");
                if (!response.ok) throw new Error("Bot no disponible");
                bot = await response.json();
            } catch (error) {
                console.error(error);
                aviso = '<div class="bot-warning">No se pudo leer la configuración actual del bot. Se muestran valores base.</div>';
            }

            const canalesBot = [
                {
                    id: "whatsapp",
                    clase: "whatsapp",
                    nombre: "WhatsApp",
                    estado: bot.enabled ? "Activo" : "Apagado",
                    descripcion: "Responde al primer mensaje y deriva la conversación al asesor con menos carga.",
                    listo: true
                },
                {
                    id: "instagram",
                    clase: "instagram",
                    nombre: "Instagram",
                    estado: "Preparado",
                    descripcion: "Usará las mismas reglas cuando Meta habilite mensajes reales para la app.",
                    listo: false
                },
                {
                    id: "facebook",
                    clase: "facebook",
                    nombre: "Facebook",
                    estado: "Preparado",
                    descripcion: "Preparado para Messenger y comentarios de página con derivación a asesor.",
                    listo: false
                },
                {
                    id: "tiktok",
                    clase: "tiktok",
                    nombre: "TikTok",
                    estado: "Preparado",
                    descripcion: "Listo para automatizar leads o formularios cuando se conecte TikTok Business API.",
                    listo: false
                }
            ];
            const opcionesBot = bot.options?.length ? bot.options : [
                { key: "1", title: "Hablar con un asesor", response: "Listo, ya derivamos tu conversacion con un asesor. En breves te atenderan.", derivesToAdvisor: true }
            ];
            const canalActivo = canalesBot.find(canal => canal.id === botCanalActivo) || canalesBot[0];
            const crearFilaPlantillaBot = option => `
                <article class="bot-template-row" data-bot-template-row>
                    <label>
                        <span>Opción</span>
                        <input type="text" data-template-key value="${escapeAttribute(option.key || "")}" maxlength="12" placeholder="1">
                    </label>
                    <label>
                        <span>Título</span>
                        <input type="text" data-template-title value="${escapeAttribute(option.title || "")}" maxlength="80" placeholder="Cotización">
                    </label>
                    <label class="bot-template-response">
                        <span>Respuesta que envía el bot</span>
                        <textarea data-template-response rows="3" maxlength="400" placeholder="Mensaje para el cliente">${escapeHtml(option.response || "")}</textarea>
                    </label>
                    <label class="bot-template-check">
                        <input type="checkbox" data-template-derives ${option.derivesToAdvisor === false ? "" : "checked"}>
                        <span>Deriva a asesor</span>
                    </label>
                    <button type="button" class="bot-template-remove" data-remove-template title="Quitar plantilla" aria-label="Quitar plantilla">
                        <i data-lucide="trash-2"></i>
                    </button>
                </article>`;

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Bot y derivaciones</h1>
                        <p>Configura respuestas y derivaciones por canal conectado.</p>
                    </div>
                </div>
                ${aviso}
                <section class="bot-channel-section">
                    <div>
                        <span class="panel-kicker">Canal activo</span>
                        <h2>${escapeHtml(canalActivo.nombre)}</h2>
                        <p>${escapeHtml(canalActivo.descripcion)}</p>
                    </div>
                    <div class="bot-channel-grid compact">
                        ${canalesBot.map(canal => `
                            <button type="button" class="bot-channel-card ${canal.id === botCanalActivo ? "ready active" : canal.listo ? "ready" : "planned"}" data-bot-channel="${canal.id}">
                                ${crearLogoRed(canal.clase)}
                                <div>
                                    <strong>${escapeHtml(canal.nombre)}</strong>
                                    <span>${escapeHtml(canal.estado)}</span>
                                </div>
                            </button>`).join("")}
                    </div>
                </section>
                <section class="bot-layout">
                    <article class="bot-card">
                        <div class="bot-card-header">
                            <div class="bot-icon"><i data-lucide="bot-message-square"></i></div>
                            <div>
                                <h2>Respuesta automática de ${escapeHtml(canalActivo.nombre)}</h2>
                                <p>WhatsApp guarda configuración real. Los demás canales quedan listos para usar estas reglas al aprobarse o conectarse su API.</p>
                            </div>
                        </div>
                        <form id="botSettingsForm" class="bot-form">
                            <label class="switch-row">
                                <span>
                                    <strong>Activar bot</strong>
                                    <small>Activa la respuesta global. Los chats pausados por un asesor se reactivan con el botón de abajo.</small>
                                </span>
                                <input id="botEnabled" type="checkbox" ${bot.enabled ? "checked" : ""}>
                            </label>
                            <label>
                                <span>Mensaje para el cliente</span>
                                <textarea id="botMessage" rows="5" maxlength="500">${escapeHtml(bot.message || "")}</textarea>
                            </label>
                            <label>
                                <span>Límite de respuestas automáticas por conversación</span>
                                <input id="botMaxReplies" type="number" min="1" max="5" value="${Number(bot.maxAutoReplies || 2)}">
                            </label>
                            <button type="submit" class="connection-action">Guardar configuración</button>
                            <button type="button" id="reactivateBotConversations" class="connection-action secondary">Reactivar bot en chats pausados</button>
                        </form>
                    </article>
                    <article class="bot-card">
                        <span class="panel-kicker">Derivación económica</span>
                        <div class="bot-flow">
                            <div><strong>1</strong><span>Cliente escribe por WhatsApp.</span></div>
                            <div><strong>2</strong><span>El CRM crea/actualiza cliente y conversación.</span></div>
                            <div><strong>3</strong><span>Se asigna automáticamente al asesor con menos carga.</span></div>
                            <div><strong>4</strong><span>El bot envía un solo menú corto de opciones.</span></div>
                            <div><strong>5</strong><span>Si el cliente responde 1, 2, 3 o 4, el bot confirma y no sigue conversando.</span></div>
                            <div><strong>6</strong><span>Comunicaciones marca el chat como pendiente de asesor.</span></div>
                        </div>
                    </article>
                </section>
                <section class="bot-channel-section">
                    <div>
                        <span class="panel-kicker">Plantillas del bot</span>
                        <h2>Opciones que puede responder el cliente</h2>
                    </div>
                    <div id="botTemplatesList" class="bot-template-list">
                        ${opcionesBot.map(crearFilaPlantillaBot).join("")}
                    </div>
                    <button id="addBotTemplate" type="button" class="bot-template-add">
                        <i data-lucide="plus"></i>
                        <span>Agregar plantilla</span>
                    </button>
                </section>
                <section class="bot-channel-section">
                    <div>
                        <span class="panel-kicker">Canales preparados</span>
                        <h2>Automatización por red</h2>
                    </div>
                    <div class="bot-channel-grid">
                        ${canalesBot.map(canal => `
                            <article class="bot-channel-card ${canal.listo ? "ready" : "planned"}">
                                ${crearLogoRed(canal.clase)}
                                <div>
                                    <strong>${escapeHtml(canal.nombre)}</strong>
                                    <span>${escapeHtml(canal.estado)}</span>
                                </div>
                                <p>${escapeHtml(canal.descripcion)}</p>
                            </article>`).join("")}
                    </div>
                </section>`;

            if (window.lucide) window.lucide.createIcons();

            vista.querySelectorAll("[data-bot-channel]").forEach(button => {
                button.addEventListener("click", async () => {
                    botCanalActivo = button.dataset.botChannel || "whatsapp";
                    await cargarModuloBot(vista);
                });
            });

            const leerPlantillasBot = () => Array
                .from(vista.querySelectorAll("[data-bot-template-row]"))
                .map(row => ({
                    key: row.querySelector("[data-template-key]").value.trim(),
                    title: row.querySelector("[data-template-title]").value.trim(),
                    response: row.querySelector("[data-template-response]").value.trim(),
                    derivesToAdvisor: row.querySelector("[data-template-derives]").checked
                }))
                .filter(option => option.key && option.title && option.response);

            vista.querySelector("#addBotTemplate").addEventListener("click", () => {
                const lista = vista.querySelector("#botTemplatesList");
                const cantidad = lista.querySelectorAll("[data-bot-template-row]").length + 1;
                lista.insertAdjacentHTML("beforeend", crearFilaPlantillaBot({
                    key: String(cantidad),
                    title: "Nueva opción",
                    response: "Gracias por escribirnos. Un asesor te ayudara con esta solicitud.",
                    derivesToAdvisor: true
                }));
                if (window.lucide) window.lucide.createIcons();
            });

            vista.querySelector("#botTemplatesList").addEventListener("click", event => {
                const botonQuitar = event.target.closest("[data-remove-template]");
                if (!botonQuitar) return;
                const filas = vista.querySelectorAll("[data-bot-template-row]");
                if (filas.length <= 1) {
                    notificar("Debe quedar al menos una plantilla.", "error");
                    return;
                }
                botonQuitar.closest("[data-bot-template-row]")?.remove();
            });

            vista.querySelector("#botSettingsForm").addEventListener("submit", async event => {
                event.preventDefault();
                const options = leerPlantillasBot();
                if (!options.length) {
                    notificar("Agrega al menos una plantilla válida para el bot.", "error");
                    return;
                }

                const guardar = await api("/api/bot/whatsapp", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        enabled: vista.querySelector("#botEnabled").checked,
                        message: vista.querySelector("#botMessage").value,
                        maxAutoReplies: Number(vista.querySelector("#botMaxReplies").value || 2),
                        options
                    })
                });

                if (!guardar.ok) {
                    notificar("No se pudo guardar la configuración del bot.", "error");
                    return;
                }

                notificar("Configuración del bot guardada.", "success");
                await cargarModuloBot(vista);
            });

            vista.querySelector("#reactivateBotConversations").addEventListener("click", async () => {
                const response = await api("/api/bot/whatsapp/reactivar-conversaciones", {
                    method: "POST"
                });
                if (!response.ok) {
                    notificar("No se pudo reactivar el bot en los chats.", "error");
                    return;
                }
                const data = await response.json();
                notificar(`Bot reactivado en ${data.actualizadas || 0} chat(s).`, "success");
                await cargarConversaciones();
                if (conversacionSeleccionada?.id) {
                    await seleccionarConversacion(conversacionSeleccionada.id, { refrescarFicha: false });
                }
            });
        }
