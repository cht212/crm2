// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

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
            estado.textContent = `${sesion.usuario} · ${sesion.rol}`;
            aplicarNavegacionPorRol();
            abrirModulo(moduloInicialPorRol());
            actualizarCRM();
            setInterval(actualizarCRM, POLLING_MS);
        }

        function normalizarRol(rol) {
            return String(rol || "").trim().toLowerCase();
        }

        const MODULOS_POR_ROL = {
            administrador: new Set([
                "dashboard",
                "inbox",
                "contactos",
                "tareas",
                "pipeline",
                "ventas",
                "campanas",
                "automatizacion",
                "agenda",
                "alertas",
                "reportes",
                "comentarios",
                "actividad",
                "fallos",
                "bot",
                "conexiones",
                "usuarios"
            ]),
            supervisor: new Set([
                "dashboard",
                "inbox",
                "contactos",
                "tareas",
                "pipeline",
                "ventas",
                "campanas",
                "automatizacion",
                "agenda",
                "alertas",
                "reportes",
                "comentarios",
                "actividad",
                "fallos"
            ]),
            asesor: new Set([
                "inbox",
                "contactos",
                "tareas",
                "pipeline",
                "comentarios"
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
            return normalizarRol(rolActual) === "asesor" ? "inbox" : "dashboard";
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

            document.getElementById("usersNav")?.classList.toggle("hidden", !permitidos.has("usuarios"));
            document.getElementById("usersNav") && (document.getElementById("usersNav").hidden = !permitidos.has("usuarios"));
            document.getElementById("activityNav")?.classList.toggle("hidden", !permitidos.has("actividad"));
            document.getElementById("activityNav") && (document.getElementById("activityNav").hidden = !permitidos.has("actividad"));
            document.getElementById("failuresNav")?.classList.toggle("hidden", !permitidos.has("fallos"));
            document.getElementById("failuresNav") && (document.getElementById("failuresNav").hidden = !permitidos.has("fallos"));
        }
