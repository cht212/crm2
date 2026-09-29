// Módulo frontend del CRM.

        async function cargarModuloConexiones(vista) {
            const [response, resumenResponse] = await Promise.all([
                api("/api/integraciones/estado"),
                api("/api/crm/reportes/resumen")
            ]);
            if (!response.ok) throw new Error("Conexiones no disponibles");
            const estadoIntegraciones = await response.json();
            const resumenCrm = resumenResponse.ok ? await resumenResponse.json() : {};
            const whatsapp = estadoIntegraciones.whatsapp || {};
            const r2 = estadoIntegraciones.r2 || {};
            const bot = estadoIntegraciones.bot || {};
            const canalesIntegracion = estadoIntegraciones.canales || [];
            const metricasPorCanal = resumenCrm.canales || [];
            const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
            const puedeConfigurar = esRol("administrador") || tienePermiso("integraciones.gestionar");
            const whatsappListo = Boolean(
                whatsapp.verifyToken &&
                whatsapp.accessToken &&
                whatsapp.phoneNumberId &&
                whatsapp.businessAccountId
            );
            const r2Listo = Boolean(
                r2.accountId &&
                r2.accessKeyId &&
                r2.secretAccessKey &&
                r2.bucketName
            );

            const canalesBase = [
                {
                    clase: "whatsapp",
                    nombre: "WhatsApp",
                    descripcion: "Canal activo para mensajes, archivos y webhooks de Meta.",
                    estado: whatsappListo ? "Conectado" : "Incompleto",
                    detalle: whatsappListo
                        ? `API ${escapeHtml(whatsapp.apiVersion || "")} · ${Number(whatsapp.numbers?.length || 0)} número(s) · Envío a Meta ${whatsapp.sendMessagesToMeta ? "activo" : "desactivado"}`
                        : "Faltan token, phone number id, business account id o verify token.",
                    accion: "Copiar webhook",
                    webhook: true,
                    activo: whatsappListo
                },
                {
                    clase: "instagram",
                    nombre: "Instagram",
                    descripcion: "Mensajes, comentarios y publicaciones de la cuenta profesional.",
                    estado: "Sin configurar",
                    detalle: "La conexión necesita las credenciales indicadas en Configurar.",
                    activo: false
                },
                {
                    clase: "facebook",
                    nombre: "Facebook",
                    descripcion: "Messenger, comentarios y publicaciones de la página.",
                    estado: "Sin configurar",
                    detalle: "La conexión necesita las credenciales indicadas en Configurar.",
                    activo: false
                },
                {
                    clase: "tiktok",
                    nombre: "TikTok",
                    descripcion: "Publicaciones e indicadores disponibles mediante la API de TikTok.",
                    estado: "Sin configurar",
                    detalle: "Esta conexión no incluye mensajes directos.",
                    activo: false
                }
            ];
            const canales = canalesBase.map(canal => {
                const estadoCanal = canalesIntegracion.find(item =>
                    String(item.canal || "").toUpperCase() === canal.clase.toUpperCase());
                const metricas = metricasPorCanal.find(item =>
                    String(item.canal || "").toUpperCase() === canal.clase.toUpperCase()) || {};
                const canalConMetricas = {
                    ...canal,
                    metricas: {
                        contactos: Number(metricas.clientes || 0),
                        conversaciones: Number(metricas.conversaciones || 0),
                        entrantes: Number(metricas.entrantes || 0),
                        salientes: Number(metricas.salientes || 0),
                        interacciones: Number(metricas.interacciones || 0),
                        oportunidades: Number(metricas.oportunidades || 0)
                    }
                };
                if (!estadoCanal) return canalConMetricas;
                const faltantes = (estadoCanal.requiredConfig || [])
                    .filter(item => !item.configured)
                    .map(item => item.key);
                return {
                    ...canalConMetricas,
                    estado: estadoCanal.connected ? "Conectado" : "Sin configurar",
                    detalle: estadoCanal.connected
                        ? `${estadoCanal.provider} configurado`
                        : `Falta: ${faltantes.join(", ") || "credenciales"}`,
                    webhook: Boolean(estadoCanal.webhookUrl),
                    webhookUrl: estadoCanal.webhookUrl,
                    activo: Boolean(estadoCanal.connected),
                    allowList: estadoCanal.networkAllowList || []
                };
            });

            vista.innerHTML = `
                <div class="module-heading">
                    <div>
                        <h1>Conexiones</h1>
                        <p>Estado y configuración esencial de los canales utilizados por el CRM.</p>
                    </div>
                </div>
                <div class="connections-summary">
                    <article class="connection-status-card ${r2Listo ? "ready" : "warning"}">
                        <span>Cloudflare R2</span>
                        <strong>${r2Listo ? "Configurado" : "Incompleto"}</strong>
                        <small>Almacenamiento privado de documentos, imágenes y stickers.</small>
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
                            <div class="connection-channel-metrics">
                                <span><strong>${formatearNumero(canal.metricas.contactos)}</strong> contactos</span>
                                <span><strong>${formatearNumero(canal.metricas.conversaciones)}</strong> conversaciones</span>
                                <span><strong>${formatearNumero(canal.metricas.interacciones)}</strong> interacciones</span>
                                <span><strong>${formatearNumero(canal.metricas.oportunidades)}</strong> oportunidades</span>
                            </div>
                            <div class="connection-actions">
                                ${puedeConfigurar ? `<button type="button" class="connection-action" data-config-channel="${canal.clase}">Configurar</button>` : ""}
                                ${canal.webhook && ["whatsapp", "facebook"].includes(canal.clase) ? `<button type="button" class="connection-action secondary" data-copy-webhook="${escapeAttribute(canal.webhookUrl || webhookUrl)}">Copiar webhook</button>` : ""}
                                ${canal.clase === "instagram" && canal.activo ? `<button type="button" class="connection-action secondary" data-sync-instagram>Sincronizar</button>` : ""}
                            </div>
                        </article>
                    `).join("")}
                </div>
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
                                                ${field.key === "WhatsApp:Numbers" ? `<textarea
                                                    name="${escapeAttribute(field.key)}"
                                                    rows="5"
                                                    placeholder='[{"phoneNumberId":"123456789","displayNumber":"+51..."}]'>${escapeHtml(field.value || "")}</textarea>` : `<input
                                                    name="${escapeAttribute(field.key)}"
                                                    type="${field.secret && !mostrarClaves ? "password" : "text"}"
                                                    value="${escapeAttribute(field.value || "")}"
                                                    placeholder="${field.configured ? "Configurado, deja igual para conservar" : ""}">`}
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
                            const error = await guardar.json().catch(() => ({}));
                            notificar(error.message || "No se pudo guardar la configuración.", "error");
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

