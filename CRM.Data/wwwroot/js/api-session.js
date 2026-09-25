// Módulo frontend del CRM.

        async function api(url, options = {}) {
            const separador = url.includes("?") ? "&" : "?";
            const requestOptions = {
                cache: "no-store",
                credentials: "same-origin",
                ...options,
                headers: {
                    "Cache-Control": "no-cache",
                    ...(options.headers || {})
                }
            };

            // Cada navegación crea un AbortController. Así una consulta lenta
            // del módulo anterior no puede terminar pintando encima del módulo actual.
            if (!requestOptions.signal && window.__crmNavigationController?.signal) {
                requestOptions.signal = window.__crmNavigationController.signal;
            }

            const response = await fetch(`${url}${separador}_=${Date.now()}`, requestOptions);
            if (response.status === 401) {
                window.location.href = "/login.html";
            }
            return response;
        }

        function ocultarTodoElMenu() {
            document.querySelectorAll(".nav-item[data-module]").forEach(item => {
                item.classList.add("hidden");
                item.hidden = true;
            });
            document.getElementById("usersNav") && (document.getElementById("usersNav").hidden = true);
            document.getElementById("activityNav") && (document.getElementById("activityNav").hidden = true);
            document.getElementById("failuresNav") && (document.getElementById("failuresNav").hidden = true);
        }

        async function iniciarAplicacion() {
            ocultarTodoElMenu();

            try {
                const response = await fetch("/api/auth/me", {
                    cache: "no-store",
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    window.location.href = "/login.html";
                    return;
                }

                const sesion = await response.json();
                renderPerfilUsuario(sesion);
                cargarNotificacionesPersistidas();
                renderFiltrosRedBandeja();

                rolActual = sesion.rol || "";
                sesionActual = sesion;

                if (normalizarRol(rolActual) === "asesor" && sesion.id) {
                    asesorFiltroActivo = String(sesion.id);
                } else {
                    asesorFiltroActivo = "";
                }

                if (estado) {
                    estado.textContent = `${sesion.usuario} · ${sesion.rol}`;
                }

                aplicarNavegacionPorRol();

                // Espera a que el primer módulo se monte. Antes se lanzaba sin
                // await y el polling podía competir con el primer render.
                await abrirModulo(moduloInicialPorRol());

                if (typeof actualizarCRM === "function") {
                    await Promise.resolve(actualizarCRM()).catch(error =>
                        console.warn("No se pudo actualizar el CRM al iniciar:", error)
                    );

                    setInterval(() => {
                        if (typeof actualizarCRM === "function") {
                            Promise.resolve(actualizarCRM()).catch(error =>
                                console.warn("No se pudo actualizar el CRM:", error)
                            );
                        }
                    }, POLLING_MS);
                }
            } catch (error) {
                console.error("No se pudo iniciar el CRM:", error);
                const vista = document.getElementById("moduleView");
                if (vista) {
                    vista.classList.remove("hidden");
                    vista.innerHTML = `
                        <div class="error">
                            <strong>No se pudo iniciar el CRM.</strong>
                            <p>${escapeHtml(error?.message || "Error inesperado al cargar la aplicación.")}</p>
                        </div>`;
                }
            }
        }

        function normalizarRol(rol) {
            return String(rol || "").trim().toLowerCase();
        }

        function esRol(...roles) {
            const rol = normalizarRol(rolActual);
            return roles.some(item => normalizarRol(item) === rol);
        }

        function puedeGestionarEquipoCRM() {
            return esRol("administrador", "supervisor");
        }

        const MODULOS_POR_ROL = {
            administrador: new Set([
                "dashboard",
                "inbox",
                "contactos",
                "tareas",
                "leads",
                "ventas",
                "reportes",
                "bot",
                "conexiones",
                "actividad",
                "usuarios",
                "fallos"
            ]),
            supervisor: new Set([
                "dashboard",
                "inbox",
                "contactos",
                "tareas",
                "leads",
                "ventas",
                "reportes",
                "bot",
                "actividad"
            ]),
            asesor: new Set([
                "dashboard",
                "inbox",
                "contactos",
                "tareas",
                "leads",
                "ventas"
            ])
        };

        function modulosPermitidosPorRol() {
            const rol = normalizarRol(rolActual);

            if (rol === "administrador") {
                return MODULOS_POR_ROL.administrador;
            }

            if (rol === "supervisor") {
                return MODULOS_POR_ROL.supervisor;
            }

            if (rol === "asesor") {
                return MODULOS_POR_ROL.asesor;
            }

            return new Set(["inbox"]);
        }

        function moduloInicialPorRol() {
            if (esRol("asesor")) {
                return "dashboard";
            }
            return "dashboard";
        }

        function puedeVerModulo(modulo) {
            return modulosPermitidosPorRol().has(modulo);
        }

        function aplicarNavegacionPorRol() {
            const permitidos = modulosPermitidosPorRol();
            document.querySelectorAll(".nav-item[data-module]").forEach(item => {
                const permitido = permitidos.has(item.dataset.module);
                item.classList.toggle("hidden", !permitido);
                item.hidden = !permitido;
            });

            const dashboardLabel = document.querySelector('.nav-item[data-module="dashboard"] .nav-label');
            if (dashboardLabel) {
                dashboardLabel.textContent = esRol("asesor") ? "Mi trabajo" : "Dashboard";
            }

            document.getElementById("usersNav")?.classList.toggle("hidden", !permitidos.has("usuarios"));
            document.getElementById("usersNav") && (document.getElementById("usersNav").hidden = !permitidos.has("usuarios"));
            document.getElementById("botNav")?.classList.toggle("hidden", !permitidos.has("bot"));
            document.getElementById("botNav") && (document.getElementById("botNav").hidden = !permitidos.has("bot"));
            document.getElementById("connectionsNav")?.classList.toggle("hidden", !permitidos.has("conexiones"));
            document.getElementById("connectionsNav") && (document.getElementById("connectionsNav").hidden = !permitidos.has("conexiones"));
            document.getElementById("activityNav")?.classList.toggle("hidden", !permitidos.has("actividad"));
            document.getElementById("activityNav") && (document.getElementById("activityNav").hidden = !permitidos.has("actividad"));
            document.getElementById("failuresNav")?.classList.toggle("hidden", !permitidos.has("fallos"));
            document.getElementById("failuresNav") && (document.getElementById("failuresNav").hidden = !permitidos.has("fallos"));
        }