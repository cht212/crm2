// Módulo frontend del CRM.

        let moduloNavegacionVersion = 0;

        async function abrirModulo(modulo) {
            if (typeof puedeVerModulo === "function" && !puedeVerModulo(modulo)) {
                modulo = typeof moduloInicialPorRol === "function" ? moduloInicialPorRol() : "inbox";
            }

            const version = ++moduloNavegacionVersion;

            // Cancela peticiones pendientes del módulo anterior para impedir
            // que una respuesta tardía reemplace el contenido de la navegación actual.
            window.__crmNavigationController?.abort();
            window.__crmNavigationController = new AbortController();

            moduloActual = modulo;
            document.querySelectorAll(".nav-item").forEach(item => {
                item.classList.toggle("active", item.dataset.module === modulo);
            });
            document.querySelector('[data-nav-group="comunicaciones"]')?.classList.toggle("active", modulo === "inbox");
            sincronizarSubmenuComunicaciones();

            modoDetalleConversacion = false;
            document.getElementById("leadDetailBar")?.classList.add("hidden");

            const vista = document.getElementById("moduleView");
            const sidebar = document.querySelector(".sidebar");
            const chat = document.querySelector(".chat");
            const details = document.getElementById("details");

            if (!vista || !sidebar || !chat || !details) {
                throw new Error("La estructura principal del CRM está incompleta.");
            }

            vista.dataset.module = modulo;

            if (modulo === "inbox") {
                vista.classList.add("hidden");
                sidebar.classList.remove("hidden");
                chat.classList.remove("hidden");
                details.classList.remove("hidden");
                return;
            }

            sidebar.classList.add("hidden");
            chat.classList.add("hidden");
            details.classList.add("hidden");
            vista.classList.remove("hidden");
            vista.innerHTML = '<div class="empty">Cargando módulo...</div>';

            try {
                switch (modulo) {
                    case "dashboard":
                        await cargarModuloDashboard(vista);
                        break;
                    case "contactos":
                        await cargarModuloContactos(vista);
                        break;
                    case "tareas":
                        await cargarModuloTareas(vista);
                        break;
                    case "leads":
                        await cargarModuloLeads(vista);
                        break;
                    case "ventas":
                        await cargarModuloVentas(vista);
                        break;
                    case "reportes":
                        await cargarModuloReportes(vista);
                        break;
                    case "bot":
                        await cargarModuloBot(vista);
                        break;
                    case "conexiones":
                        await cargarModuloConexiones(vista);
                        break;
                    case "actividad":
                        await cargarModuloActividad(vista);
                        break;
                    case "fallos":
                        await cargarModuloFallos(vista);
                        break;
                    case "usuarios":
                        await cargarModuloUsuarios(vista);
                        break;
                    default:
                        throw new Error(`Módulo no implementado: ${modulo}`);
                }

                if (version !== moduloNavegacionVersion || moduloActual !== modulo) {
                    return;
                }
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }

                console.error(`No se pudo cargar el módulo ${modulo}:`, error);

                if (version !== moduloNavegacionVersion || moduloActual !== modulo) {
                    return;
                }

                vista.classList.remove("hidden");
                vista.innerHTML = `
                    <div class="error">
                        <strong>No se pudo cargar el módulo.</strong>
                        <p>${escapeHtml(error.message || "")}</p>
                    </div>`;
            }
        }