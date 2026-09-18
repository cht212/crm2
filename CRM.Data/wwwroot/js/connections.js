// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        async function cargarModuloConexiones(vista) {
            const response = await api("/api/integraciones/estado");
            if (!response.ok) throw new Error("Conexiones no disponibles");
            const estadoIntegraciones = await response.json();
            const whatsapp = estadoIntegraciones.whatsapp || {};
            const cloudinary = estadoIntegraciones.cloudinary || {};
            const bot = estadoIntegraciones.bot || {};
            const canalesIntegracion = estadoIntegraciones.canales || [];
            const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
            const whatsappListo = Boolean(
                whatsapp.verifyToken &&
                whatsapp.accessToken &&
                whatsapp.phoneNumberId &&
                whatsapp.businessAccountId
            );
            const cloudinaryListo = Boolean(
                cloudinary.cloudName &&
                cloudinary.apiKey &&
                cloudinary.apiSecret
            );

            const canalesBase = [
                {
                    clase: "whatsapp",
                    nombre: "WhatsApp",
                    descripcion: "Canal activo para mensajes, archivos y webhooks de Meta.",
                    estado: whatsappListo ? "Conectado" : "Incompleto",
                    detalle: whatsappListo
                        ? `API ${escapeHtml(whatsapp.apiVersion || "")} · Envio a Meta ${whatsapp.sendMessagesToMeta ? "activo" : "desactivado"}`
                        : "Faltan token, phone number id, business account id o verify token.",
                    accion: "Copiar webhook",
                    webhook: true,
                    activo: whatsappListo
                },
                {
                    clase: "instagram",
                    nombre: "Instagram",
                    descripcion: "Instagram Login para DMs y comentarios de la cuenta profesional.",
                    estado: "Próximo",
                    detalle: "Configura Instagram Login User ID y Access Token; luego sincroniza conversaciones.",
                    accion: "Sincronizar",
                    activo: false
                },
                {
                    clase: "facebook",
                    nombre: "Facebook",
                    descripcion: "Preparado para Messenger, páginas, comentarios y campañas.",
                    estado: "Próximo",
                    detalle: "Requiere Meta Login, página conectada, permisos y webhooks.",
                    accion: "Planificado",
                    activo: false
                },
                {
                    clase: "tiktok",
                    nombre: "TikTok",
                    descripcion: "Preparado para leads, campañas e indicadores de TikTok.",
                    estado: "Próximo",
                    detalle: "No incluye DMs normales sin TikTok Business Messaging aprobado o partner oficial.",
                    accion: "Planificado",
                    activo: false
                }
            ];
            const canales = canalesBase.map(canal => {
                const estadoCanal = canalesIntegracion.find(item =>
                    String(item.canal || "").toUpperCase() === canal.clase.toUpperCase());
                if (!estadoCanal) return canal;
                const faltantes = (estadoCanal.requiredConfig || [])
                    .filter(item => !item.configured)
                    .map(item => item.key);
                return {
                    ...canal,
                    estado: estadoCanal.connected ? "Conectado" : "Pendiente",
                    detalle: estadoCanal.connected
                        ? `${estadoCanal.provider} configurado`
                        : `Falta: ${faltantes.join(", ") || "credenciales"}`,
                    accion: estadoCanal.oauthStartUrl ? "Conectar" : "Copiar webhook",
                    webhook: Boolean(estadoCanal.webhookUrl),
                    webhookUrl: estadoCanal.webhookUrl,
                    oauthStartUrl: estadoCanal.oauthStartUrl,
                    activo: Boolean(estadoCanal.connected),
                    allowList: estadoCanal.networkAllowList || []
                };
            });

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Conexiones</h1>
                        <p>Canales externos que alimentan el CRM y sus estadísticas.</p>
                    </div>
                </div>
                <div class="connections-summary">
                    <article class="connection-status-card ${cloudinaryListo ? "ready" : "warning"}">
                        <span>Cloudinary</span>
                        <strong>${cloudinaryListo ? "Configurado" : "Incompleto"}</strong>
                        <small>Necesario para enviar imágenes y documentos por WhatsApp con URL HTTPS.</small>
                    </article>
                    <article class="connection-status-card ready">
                        <span>Webhook local</span>
                        <strong>ngrok / Cloudflare Tunnel</strong>
                        <small>${escapeHtml(webhookUrl)}</small>
                    </article>
                    <article class="connection-status-card ${bot.whatsappAutoReply ? "ready" : "warning"}">
                        <span>Bot WhatsApp</span>
                        <strong>${bot.whatsappAutoReply ? "Respuesta automática activa" : "Respuesta automática apagada"}</strong>
                        <small>${escapeHtml(bot.whatsappMessage || "Sin mensaje configurado.")}</small>
                    </article>
                </div>
                <div class="connections-grid">
                    ${canales.map(canal => `
                        <article class="connection-card ${canal.activo ? "connected" : "planned"}">
                            <div class="connection-top">
                                <div class="connection-icon ${canal.clase}">${crearLogoRed(canal.clase)}</div>
                                <span class="connection-badge ${canal.activo ? "ok" : "pending"}">${canal.estado}</span>
                            </div>
                            <h2>${canal.nombre}</h2>
                            <p>${canal.descripcion}</p>
                            <small>${canal.detalle}</small>
                            ${canal.allowList?.length ? `<small>Permitir red: ${canal.allowList.map(escapeHtml).join(", ")}</small>` : ""}
                            <div class="connection-actions">
                                <button type="button" class="connection-action secondary" data-config-channel="${canal.clase}">Configurar</button>
                                ${canal.oauthStartUrl ? `<button type="button" class="connection-action" data-oauth-channel="${canal.clase}">Conectar</button>` : ""}
                                ${canal.webhook ? `<button type="button" class="connection-action secondary" data-copy-webhook="${escapeAttribute(canal.webhookUrl || webhookUrl)}">Copiar webhook</button>` : ""}
                                ${canal.clase === "instagram" ? `<button type="button" class="connection-action" data-sync-instagram>Sincronizar</button>` : ""}
                                ${!canal.oauthStartUrl && !canal.webhook ? `<button type="button" class="connection-action" disabled>${canal.accion}</button>` : ""}
                            </div>
                        </article>
                    `).join("")}
                </div>
                <section class="connection-note">
                    <h2>Recomendación</h2>
                    <p>Este módulo controla la configuración y el estado de cada canal. WhatsApp opera con token y webhook; Instagram usa el flujo nuevo de Instagram Login con graph.instagram.com; Facebook usa Meta Graph API y webhooks de página; TikTok debe tratarse como leads/campañas o integración partner.</p>
                </section>
                <section class="connection-note hidden" id="instagramSyncDebug"></section>`;

            vista.querySelectorAll("[data-copy-webhook]").forEach(button => {
                button.addEventListener("click", async () => {
                    await navigator.clipboard.writeText(button.dataset.copyWebhook || webhookUrl);
                    notificar("URL del webhook copiada.", "success");
                });
            });

            vista.querySelector("[data-sync-instagram]")?.addEventListener("click", async event => {
                const button = event.currentTarget;
                button.disabled = true;
                button.textContent = "Sincronizando...";
                try {
                    const sync = await api("/api/integraciones/instagram/sincronizar", { method: "POST" });
                    const data = await sync.json().catch(() => ({}));
                    if (!sync.ok || data.success === false) {
                        notificar(data.error || "No se pudo sincronizar Instagram.", "error");
                        mostrarDiagnosticoInstagram(vista, data);
                        return;
                    }
                    notificar(`Instagram sincronizado: ${data.mensajesImportados || 0} mensaje(s) importado(s).`, "success");
                    mostrarDiagnosticoInstagram(vista, data);
                    if (moduloActual === "inbox") await actualizarCRM();
                } finally {
                    button.disabled = false;
                    button.textContent = "Sincronizar";
                }
            });

            vista.querySelectorAll("[data-config-channel]").forEach(button => {
                button.addEventListener("click", async () => {
                    const canal = button.dataset.configChannel;
                    let mostrarClaves = false;
                    const abrirConfiguracion = async () => {
                    const responseConfig = await api(`/api/integraciones/${canal}/configuracion${mostrarClaves ? "?revealSecrets=true" : ""}`);
                    if (!responseConfig.ok) {
                        notificar("No se pudo abrir la configuración.", "error");
                        return;
                    }
                    const config = await responseConfig.json();
                    modalHost.innerHTML = `
                        <div class="modal-backdrop" data-modal-cancel></div>
                        <section class="crm-modal integration-config-modal">
                            <form id="integrationConfigForm">
                                <div class="crm-modal-head">
                                    <h2>Configurar ${escapeHtml(canal.toUpperCase())}</h2>
                                    <button type="button" data-modal-cancel aria-label="Cerrar">×</button>
                                </div>
                                <div class="connection-actions" style="justify-content:flex-end;margin-bottom:12px;">
                                    <button type="button" class="connection-action secondary" id="toggleSecretsVisibility">
                                        ${mostrarClaves ? "Ocultar claves" : "Mostrar claves"}
                                    </button>
                                </div>
                                <div class="crm-modal-body">
                                    <div class="integration-config-form">
                                        ${(config.fields || []).map(field => `
                                            <label>
                                                <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
                                                <input
                                                    name="${escapeAttribute(field.key)}"
                                                    type="${field.secret && !mostrarClaves ? "password" : "text"}"
                                                    value="${escapeAttribute(field.value || "")}"
                                                    placeholder="${field.configured ? "Configurado, deja igual para conservar" : ""}">
                                                <small>${escapeHtml(field.key)}</small>
                                            </label>`).join("")}
                                    </div>
                                </div>
                                <div class="crm-modal-actions">
                                    <button type="button" data-modal-cancel>Cancelar</button>
                                    <button type="submit">Guardar</button>
                                </div>
                            </form>
                        </section>`;
                    modalHost.classList.remove("hidden");
                    modalHost.setAttribute("aria-hidden", "false");

                    modalHost.querySelectorAll("[data-modal-cancel], .modal-backdrop").forEach(elemento => {
                        elemento.addEventListener("click", cerrarModal);
                    });

                    modalHost.querySelector("#toggleSecretsVisibility").addEventListener("click", async () => {
                        mostrarClaves = !mostrarClaves;
                        await abrirConfiguracion();
                    });

                    modalHost.querySelector("#integrationConfigForm").addEventListener("submit", async event => {
                        event.preventDefault();
                        const values = Object.fromEntries(new FormData(event.currentTarget));
                        const guardar = await api(`/api/integraciones/${canal}/configuracion`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ values })
                        });
                        if (!guardar.ok) {
                            notificar("No se pudo guardar la configuración.", "error");
                            return;
                        }
                        cerrarModal();
                        notificar("Configuración guardada.", "success");
                        await cargarModuloConexiones(vista);
                    });
                    };
                    await abrirConfiguracion();
                });
            });

            vista.querySelectorAll("[data-oauth-channel]").forEach(button => {
                button.addEventListener("click", async () => {
                    const responseOauth = await api(`/api/integraciones/${button.dataset.oauthChannel}/oauth/start`);
                    if (!responseOauth.ok) {
                        notificar("No se pudo preparar la conexión.", "error");
                        return;
                    }
                    const data = await responseOauth.json();
                    if (!data.ready) {
                        notificar(data.message || "Faltan credenciales para conectar.", "error");
                        return;
                    }
                    if (data.authorizationUrl) {
                        window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
                    }
                });
            });
        }

        function mostrarDiagnosticoInstagram(vista, data) {
            const panel = vista.querySelector("#instagramSyncDebug");
            if (!panel) return;

            panel.classList.remove("hidden");
            panel.innerHTML = `
                <h2>Diagnóstico de Instagram</h2>
                <p>Conversaciones detectadas: <strong>${Number(data.conversaciones || 0)}</strong> · Mensajes leídos: <strong>${Number(data.mensajesLeidos || 0)}</strong> · Importados: <strong>${Number(data.mensajesImportados || 0)}</strong></p>
                ${data.error ? `<p class="text-danger">${escapeHtml(data.error)}</p>` : ""}
                ${data.diagnostic ? `<pre class="integration-debug-output">${escapeHtml(data.diagnostic)}</pre>` : ""}
            `;
        }
