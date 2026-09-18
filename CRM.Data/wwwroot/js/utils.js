// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        function formatearFecha(fecha) {
            if (!fecha) return "";
            return new Date(fecha).toLocaleString("es-PE", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
            });
        }

        function formatearMoneda(valor, moneda = "PEN") {
            return new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: moneda
            }).format(Number(valor || 0));
        }

        function formatearNumero(valor) {
            return new Intl.NumberFormat("es-PE").format(Number(valor || 0));
        }

        function escapeHtml(text) {
            const div = document.createElement("div");
            div.textContent = text == null ? "" : text;
            return div.innerHTML;
        }

        function escapeAttribute(text) {
            return escapeHtml(text).replace(/"/g, "&quot;");
        }

        async function obtenerMensajeError(response, fallback) {
            const texto = await response.text();
            return texto?.trim() || `${fallback} HTTP ${response.status}`;
        }

        function notificar(mensaje, tipo = "info", accion = null, permitirHtml = false) {
            const host = document.getElementById("toastHost");
            if (!host) {
                console.log(mensaje);
                return;
            }
            const toast = document.createElement("div");
            toast.className = `toast ${tipo}`;
            if (accion) toast.classList.add("clickable");
            if (permitirHtml) {
                toast.innerHTML = mensaje;
            } else {
                toast.textContent = mensaje;
            }
            if (accion) {
                toast.addEventListener("click", () => {
                    accion();
                    toast.remove();
                });
            }
            host.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add("visible"));
            setTimeout(() => {
                toast.classList.remove("visible");
                setTimeout(() => toast.remove(), 220);
            }, 3600);
        }

        function claveNotificaciones() {
            return `crm.notifications.${sesionActual?.usuario || "local"}`;
        }

        function cargarNotificacionesPersistidas() {
            try {
                const data = JSON.parse(localStorage.getItem(claveNotificaciones()) || "{}");
                notificacionesCentro = Array.isArray(data.items) ? data.items.slice(0, 20) : [];
                notificacionesNoLeidas = notificacionesCentro.filter(item => !item.leida).length;
            } catch {
                notificacionesCentro = [];
                notificacionesNoLeidas = 0;
            }
            renderizarCentroNotificaciones();
        }

        function guardarNotificacionesPersistidas() {
            try {
                localStorage.setItem(claveNotificaciones(), JSON.stringify({
                    items: notificacionesCentro.slice(0, 20)
                }));
            } catch {
                // localStorage puede estar bloqueado; la campana sigue funcionando en memoria.
            }
        }

        function registrarNotificacionMensaje(conversacion) {
            if (!conversacion) return;
            const canal = typeof obtenerCanalConversacion === "function"
                ? obtenerCanalConversacion(conversacion)
                : String(conversacion.canal || "WHATSAPP").toUpperCase();
            const red = typeof obtenerRedPorCanal === "function"
                ? obtenerRedPorCanal(canal)
                : { nombre: canal, clase: canal.toLowerCase() };
            const nombre = conversacion.nombre || "Cliente";
            const telefono = conversacion.telefono || "";
            const fecha = conversacion.ultimoMensajeCliente || conversacion.ultimoMensaje || new Date().toISOString();
            const existente = notificacionesCentro.findIndex(item => item.conversacionId === conversacion.id);
            const notificacion = {
                id: `${conversacion.id}-${Date.now()}`,
                conversacionId: conversacion.id,
                canal,
                redNombre: red.nombre,
                redClase: red.clase,
                nombre,
                detalle: telefono || "Nuevo mensaje",
                fecha,
                leida: false
            };

            if (existente >= 0) {
                notificacionesCentro.splice(existente, 1);
            }
            notificacionesCentro.unshift(notificacion);
            notificacionesCentro = notificacionesCentro.slice(0, 20);
            notificacionesNoLeidas = notificacionesCentro.filter(item => !item.leida).length;
            guardarNotificacionesPersistidas();
            renderizarCentroNotificaciones();
        }

        function registrarNotificacionSistema({ id, titulo, detalle, tipo = "SISTEMA", fecha = new Date().toISOString(), conversacionId = null, reemplazar = true }) {
            if (!id || !titulo) return;
            const existente = notificacionesCentro.findIndex(item => item.id === id);
            const notificacion = {
                id,
                conversacionId,
                canal: tipo,
                redNombre: tipo,
                redClase: tipo.toLowerCase(),
                nombre: titulo,
                detalle: detalle || "Revisar pendiente",
                fecha,
                leida: false,
                sistema: true
            };

            if (existente >= 0) {
                if (!reemplazar) return;
                notificacion.leida = notificacionesCentro[existente].leida;
                notificacionesCentro.splice(existente, 1);
            }

            notificacionesCentro.unshift(notificacion);
            notificacionesCentro = notificacionesCentro.slice(0, 20);
            notificacionesNoLeidas = notificacionesCentro.filter(item => !item.leida).length;
            guardarNotificacionesPersistidas();
            renderizarCentroNotificaciones();
        }

        function renderizarCentroNotificaciones() {
            if (!notificationBadge || !notificationList) return;
            notificationBadge.textContent = notificacionesNoLeidas > 99 ? "99+" : String(notificacionesNoLeidas);
            notificationBadge.classList.toggle("hidden", notificacionesNoLeidas === 0);

            if (!notificacionesCentro.length) {
                notificationList.innerHTML = '<div class="notification-empty">Sin notificaciones nuevas.</div>';
                return;
            }

            notificationList.innerHTML = notificacionesCentro.map(item => `
                <button type="button" class="notification-item ${item.leida ? "read" : "unread"}" data-notification-id="${escapeAttribute(item.id)}" ${item.conversacionId ? `data-notification-conversation="${item.conversacionId}"` : ""}>
                    ${item.sistema ? '<span class="notification-system-dot"></span>' : typeof crearLogoRed === "function" ? crearLogoRed(item.redClase) : ""}
                    <span class="notification-copy">
                        <strong>${escapeHtml(item.nombre)}</strong>
                        <span>${escapeHtml(item.redNombre)} · ${escapeHtml(item.detalle)}</span>
                    </span>
                    <small>${escapeHtml(formatearFecha(item.fecha))}</small>
                </button>
            `).join("");

            notificationList.querySelectorAll("[data-notification-id]").forEach(button => {
                button.addEventListener("click", async () => {
                    marcarNotificacionLeida(button.dataset.notificationId);
                    renderizarCentroNotificaciones();
                    if (button.dataset.notificationConversation) {
                        alternarCentroNotificaciones(false);
                        await abrirConversacionDesdeNotificacion(Number(button.dataset.notificationConversation));
                    }
                });
            });
        }

        function marcarNotificacionLeida(id) {
            const item = notificacionesCentro.find(notificacion => notificacion.id === id);
            if (item) item.leida = true;
            notificacionesNoLeidas = notificacionesCentro.filter(notificacion => !notificacion.leida).length;
            guardarNotificacionesPersistidas();
        }

        function marcarTodasNotificacionesLeidas() {
            notificacionesCentro.forEach(item => item.leida = true);
            notificacionesNoLeidas = 0;
            guardarNotificacionesPersistidas();
            renderizarCentroNotificaciones();
        }

        function limpiarCentroNotificaciones() {
            notificacionesCentro = [];
            notificacionesNoLeidas = 0;
            guardarNotificacionesPersistidas();
            renderizarCentroNotificaciones();
        }

        function alternarCentroNotificaciones(abierto = null) {
            if (!notificationDropdown || !notificationButton) return;
            const debeAbrir = abierto == null ? notificationDropdown.classList.contains("hidden") : abierto;
            notificationDropdown.classList.toggle("hidden", !debeAbrir);
            notificationButton.setAttribute("aria-expanded", String(debeAbrir));
        }

        function cerrarModal() {
            modalHost.classList.add("hidden");
            modalHost.setAttribute("aria-hidden", "true");
            modalHost.innerHTML = "";
        }

        function mostrarModalInfo(titulo, contenidoHtml) {
            modalHost.innerHTML = `
                <div class="modal-backdrop"></div>
                <section class="crm-modal">
                    <div class="crm-modal-head">
                        <h2>${escapeHtml(titulo)}</h2>
                        <button type="button" class="modal-close" data-modal-close aria-label="Cerrar">x</button>
                    </div>
                    <div class="crm-modal-body">${contenidoHtml}</div>
                    <div class="crm-modal-actions">
                        <button type="button" class="secondary-btn" data-modal-close>Cerrar</button>
                    </div>
                </section>`;
            modalHost.classList.remove("hidden");
            modalHost.setAttribute("aria-hidden", "false");
            modalHost.querySelectorAll("[data-modal-close], .modal-backdrop").forEach(elemento => {
                elemento.addEventListener("click", cerrarModal);
            });
        }

        function solicitarTextoModal(titulo, etiqueta, valorInicial = "") {
            return new Promise(resolve => {
                modalHost.innerHTML = `
                    <div class="modal-backdrop"></div>
                    <section class="crm-modal">
                        <form id="textPromptForm" class="crm-form">
                            <div class="crm-modal-head">
                                <h2>${escapeHtml(titulo)}</h2>
                                <button type="button" class="modal-close" data-modal-cancel aria-label="Cerrar">x</button>
                            </div>
                            <label>${escapeHtml(etiqueta)}
                                <textarea name="valor" rows="4" maxlength="1000" required>${escapeHtml(valorInicial)}</textarea>
                            </label>
                            <div class="crm-modal-actions">
                                <button type="button" class="secondary-btn" data-modal-cancel>Cancelar</button>
                                <button type="submit">Guardar</button>
                            </div>
                        </form>
                    </section>`;
                modalHost.classList.remove("hidden");
                modalHost.setAttribute("aria-hidden", "false");

                const resolver = valor => {
                    cerrarModal();
                    resolve(valor);
                };
                modalHost.querySelector("#textPromptForm").addEventListener("submit", event => {
                    event.preventDefault();
                    const valor = new FormData(event.currentTarget).get("valor")?.toString().trim();
                    resolver(valor || null);
                });
                modalHost.querySelectorAll("[data-modal-cancel], .modal-backdrop").forEach(elemento => {
                    elemento.addEventListener("click", () => resolver(null));
                });
                modalHost.querySelector("textarea")?.focus();
            });
        }

        function estadosConversacion() {
            return [
                { id: "NUEVO", label: "Nuevo" },
                { id: "ABIERTO", label: "Abierto" },
                { id: "EN_ATENCION", label: "En atencion" },
                { id: "ESPERANDO_CLIENTE", label: "Esperando cliente" },
                { id: "COTIZACION_ENVIADA", label: "Cotizacion enviada" },
                { id: "CERRADO", label: "Cerrado" },
                { id: "PERDIDO", label: "Perdido" },
                { id: "NO_RESPONDIO", label: "No respondio" }
            ];
        }
