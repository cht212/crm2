// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

async function actualizarCRM() {
    if (actualizacionEnCurso) return;
    if (document.activeElement?.closest("#details")) return;

    const requiereInbox = moduloActual === "inbox" || moduloActual === "dashboard";
    if (!requiereInbox) {
        estado.textContent = "API conectada";
        return;
    }

    actualizacionEnCurso = true;
    try {
        const id = conversacionSeleccionada ? conversacionSeleccionada.id : null;
        await cargarConversaciones();
        if (id) await seleccionarConversacion(id, { refrescarFicha: false });
        estado.textContent = "API conectada";
    } catch (error) {
        console.error(error);
        estado.textContent = "Error de conexion";
    } finally {
        actualizacionEnCurso = false;
    }
}

async function enviarMensaje() {
    if (!conversacionSeleccionada) return;

    if (fileInput.files.length) {
        await enviarArchivo();
        return;
    }

    const texto = input.value.trim();
    if (!texto) return;
    boton.disabled = true;
    input.value = "";
    const conversacionId = conversacionSeleccionada.id;
    const temporalId = agregarMensajeOptimista(texto);
    try {
        const response = await api(`/api/whatsapp/conversaciones/${conversacionId}/mensajes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mensaje: texto,
                usuarioId: sesionActual?.id ? Number(sesionActual.id) : null,
                tipo: "text"
            })
        });
        if (!response.ok) throw new Error("No se pudo enviar el mensaje");
        await seleccionarConversacion(conversacionId, { refrescarFicha: false });
        cargarConversaciones().catch(error => console.error("No se pudo refrescar la bandeja", error));
    } catch (error) {
        console.error(error);
        if (temporalId && conversacionSeleccionada?.id === conversacionId) {
            conversacionSeleccionada.mensajes = (conversacionSeleccionada.mensajes || []).map(mensaje =>
                mensaje.id === temporalId
                    ? { ...mensaje, estado: "ERROR" }
                    : mensaje);
            renderizarMensajesConversacion(conversacionSeleccionada.mensajes);
        }
        input.value = texto;
        notificar("No se pudo enviar el mensaje.", "error");
    } finally {
        boton.disabled = false;
        input.focus();
    }
}

function actualizarPreviewArchivo() {
    const archivo = fileInput.files[0];
    if (!archivo) {
        attachmentPreview.classList.remove("visible");
        attachmentThumb.innerHTML = "&#128206;";
        attachmentName.textContent = "Sin archivo";
        attachmentSize.textContent = "0 KB";
        fileName.textContent = "";
        return;
    }

    const esImagen = archivo.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(archivo.name);
    const tamano = archivo.size > 1024 * 1024
        ? `${(archivo.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(archivo.size / 1024))} KB`;

    attachmentName.textContent = archivo.name;
    attachmentSize.textContent = tamano;
    fileName.textContent = archivo.name;
    attachmentPreview.classList.add("visible");

    if (esImagen) {
        const lector = new FileReader();
        lector.onload = () => {
            attachmentThumb.innerHTML = `<img src="${lector.result}" alt="${escapeHtml(archivo.name)}">`;
        };
        lector.readAsDataURL(archivo);
    } else {
        attachmentThumb.innerHTML = "&#128206;";
    }
}

function limpiarPreviewArchivo() {
    fileInput.value = "";
    attachmentPreview.classList.remove("visible");
    attachmentThumb.innerHTML = "&#128206;";
    attachmentName.textContent = "Sin archivo";
    attachmentSize.textContent = "0 KB";
    fileName.textContent = "";
}

async function enviarArchivo() {
    if (!conversacionSeleccionada) {
        notificar("Selecciona una conversacion antes de enviar un archivo.", "error");
        return;
    }

    if (!fileInput.files.length) {
        notificar("No has seleccionado ningun archivo.", "error");
        return;
    }

    const archivo = fileInput.files[0];
    const datos = new FormData();
    datos.append("archivo", archivo);
    datos.append("usuarioId", sesionActual?.id ? String(sesionActual.id) : "");

    attachButton.disabled = true;
    fileName.textContent = `Subiendo: ${archivo.name}...`;
    attachmentName.textContent = `Subiendo: ${archivo.name}...`;
    try {
        const response = await api(`/api/whatsapp/conversaciones/${conversacionSeleccionada.id}/archivos`, {
            method: "POST",
            body: datos
        });
        if (!response.ok) {
            const detalle = await response.text();
            throw new Error(detalle || `Error HTTP ${response.status}`);
        }
        limpiarPreviewArchivo();
        await cargarConversaciones();
        await seleccionarConversacion(conversacionSeleccionada.id);
    } catch (error) {
        console.error(error);
        notificar(error.message || "No se pudo enviar el archivo.", "error");
    } finally {
        attachButton.disabled = !conversacionSeleccionada;
        if (fileInput.files.length) {
            fileName.textContent = fileInput.files[0].name;
            attachmentName.textContent = fileInput.files[0].name;
        }
    }
}
