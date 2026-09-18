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
            renderPerfilUsuario(sesion);
            cargarNotificacionesPersistidas();
            renderFiltrosRedBandeja();
            rolActual = sesion.rol || "";
            estado.textContent = `${sesion.usuario} · ${sesion.rol}`;
            aplicarNavegacionPorRol();
            abrirModulo(moduloInicialPorRol());
            actualizarCRM();
            setInterval(actualizarCRM, POLLING_MS);
        }

        function modulosPermitidosPorRol() {
            if (rolActual === "Administrador") {
                return new Set([
                    "dashboard",
                    "inbox",
                    "contactos",
                    "tareas",
                    "pipeline",
                    "ventas",
                    "reportes",
                    "comentarios",
                    "actividad",
                    "fallos",
                    "bot",
                    "conexiones",
                    "usuarios"
                ]);
            }

            if (rolActual === "Supervisor") {
                return new Set([
                    "dashboard",
                    "inbox",
                    "contactos",
                    "tareas",
                    "pipeline",
                    "ventas",
                    "reportes",
                    "comentarios",
                    "actividad",
                    "fallos"
                ]);
            }

            return new Set([
                "inbox",
                "contactos",
                "tareas",
                "ventas"
            ]);
        }

        function moduloInicialPorRol() {
            return rolActual === "Asesor" ? "inbox" : "dashboard";
        }

        function puedeVerModulo(modulo) {
            return modulosPermitidosPorRol().has(modulo);
        }

        function aplicarNavegacionPorRol() {
            const permitidos = modulosPermitidosPorRol();
            document.querySelectorAll(".nav-item[data-module]").forEach(item => {
                item.classList.toggle("hidden", !permitidos.has(item.dataset.module));
            });

            document.getElementById("usersNav")?.classList.toggle("hidden", !permitidos.has("usuarios"));
            document.getElementById("activityNav")?.classList.toggle("hidden", !permitidos.has("actividad"));
            document.getElementById("failuresNav")?.classList.toggle("hidden", !permitidos.has("fallos"));
        }
