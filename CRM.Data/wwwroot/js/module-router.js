// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        async function abrirModulo(modulo) {
            if (typeof puedeVerModulo === "function" && !puedeVerModulo(modulo)) {
                modulo = typeof moduloInicialPorRol === "function" ? moduloInicialPorRol() : "inbox";
            }

            moduloActual = modulo;
            document.querySelectorAll(".nav-item").forEach(item => {
                item.classList.toggle("active", item.dataset.module === modulo);
            });
            document.querySelector('[data-nav-group="comunicaciones"]')?.classList.toggle("active", modulo === "inbox");
            sincronizarSubmenuComunicaciones();

            // Cualquier navegación por el menú principal cierra la vista de
            // "conversación individual" abierta desde el Pipeline u otro listado.
            modoDetalleConversacion = false;
            document.getElementById("leadDetailBar").classList.add("hidden");

            const vista = document.getElementById("moduleView");
            const sidebar = document.querySelector(".sidebar");
            const chat = document.querySelector(".chat");
            const details = document.getElementById("details");

            if (modulo === "inbox") {
                vista.classList.add("hidden");
                sidebar.classList.remove("hidden");
                chat.classList.remove("hidden");
                details.classList.remove("hidden");
                return;
            }

            /*
             * Los módulos NO se superponen a la bandeja:
             * ocultamos el conjunto Inbox mientras se consulta Contactos,
             * Pipeline o Reportes.
             */
            sidebar.classList.add("hidden");
            chat.classList.add("hidden");
            details.classList.add("hidden");
            vista.classList.remove("hidden");
            vista.innerHTML = '<div class="empty">Cargando modulo...</div>';

            try {
                if (modulo === "dashboard") await cargarModuloDashboard(vista);
                if (modulo === "contactos") await cargarModuloContactos(vista);
                if (modulo === "tareas") await cargarModuloTareas(vista);
                if (modulo === "pipeline") await cargarModuloPipeline(vista);
                if (modulo === "ventas") await cargarModuloVentas(vista);
                if (modulo === "campanas") await cargarModuloCampanas(vista);
                if (modulo === "automatizacion") await cargarModuloAutomatizacion(vista);
                if (modulo === "agenda") await cargarModuloAgenda(vista);
                if (modulo === "alertas") await cargarModuloAlertas(vista);
                if (modulo === "reportes") await cargarModuloReportes(vista);
                if (modulo === "actividad") await cargarModuloActividad(vista);
                if (modulo === "comentarios") await cargarModuloComentarios(vista);
                if (modulo === "fallos") await cargarModuloFallos(vista);
                if (modulo === "bot") await cargarModuloBot(vista);
                if (modulo === "conexiones") await cargarModuloConexiones(vista);
                if (modulo === "usuarios") await cargarModuloUsuarios(vista);
            } catch (error) {
                console.error(error);
                vista.innerHTML = `<div class="error">No se pudo cargar el modulo. ${escapeHtml(error.message || "")}</div>`;
            }
        }
