// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        //
        // =========================================================

        const INTERVALO_ESCRIBIENDO_MS = 18000;
        let ultimoAvisoEscribiendo = 0;

        function notificarEscribiendo() {
            if (!conversacionSeleccionada) return;
            const ahora = Date.now();
            if (ahora - ultimoAvisoEscribiendo < INTERVALO_ESCRIBIENDO_MS) return;
            ultimoAvisoEscribiendo = ahora;

            api(`/api/whatsapp/conversaciones/${conversacionSeleccionada.id}/escribiendo`, {
                method: "POST"
            }).catch(error => console.error("No se pudo enviar el indicador de escribiendo", error));
        }

        document.getElementById("searchInput").addEventListener("input", mostrarConversaciones);
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", () => {
                if (item.dataset.module === "inbox") {
                    comunicacionesMenuAbierto = !comunicacionesMenuAbierto;
                    if (!inboxCanalActivo) inboxCanalActivo = "TODOS";
                    renderFiltrosRedBandeja();
                    sincronizarSubmenuComunicaciones();
                    abrirModulo("inbox");
                    return;
                }
                comunicacionesMenuAbierto = false;
                sincronizarSubmenuComunicaciones();
                abrirModulo(item.dataset.module);
            });
        });
        document.querySelectorAll(".nav-subitem").forEach(item => {
            item.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                cambiarCanalBandeja(item.dataset.channel || "TODOS");
            });
        });
        document.querySelectorAll(".filter-button").forEach(button => {
            button.addEventListener("click", () => {
                filtroActivo = button.dataset.filter;
                document.querySelectorAll(".filter-button").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                mostrarConversaciones();
            });
        });
        document.getElementById("leadBackButton").addEventListener("click", () => abrirModulo(moduloRetornoDetalle));
        document.getElementById("sendButton").addEventListener("click", enviarMensaje);
        attachButton.addEventListener("click", () => fileInput.click());
        removeAttachment.addEventListener("click", () => {
            limpiarPreviewArchivo();
        });
        fileInput.addEventListener("change", () => {
            actualizarPreviewArchivo();
        });
        document.getElementById("messageInput").addEventListener("keydown", event => {
            if (event.key === "Enter") enviarMensaje();
        });
        document.getElementById("messageInput").addEventListener("input", () => {
            notificarEscribiendo();
        });

        iniciarAplicacion();
