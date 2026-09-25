// Módulos de control operativo: comentarios sociales y fallos de integración.

async function cargarModuloComentarios(vista, canal = "TODOS") {
    const response = await api(`/api/crm/comentarios?canal=${encodeURIComponent(canal)}&pageSize=150`);
    if (!response.ok) throw new Error("Comentarios no disponibles");
    const pagina = await response.json();
    const comentarios = pagina.items || [];
    const canales = ["TODOS", "FACEBOOK", "INSTAGRAM"];

    vista.innerHTML = `
        <div class="module-heading">
            <div>
                <h1>Comentarios</h1>
                <p>Bandeja separada para comentarios de Facebook e Instagram.</p>
            </div>
        </div>
        <section class="activity-workspace">
            <div class="task-filters">
                ${canales.map(item => `
                    <button type="button" class="filter-button ${canal === item ? "active" : ""}" data-comments-channel="${item}">
                        ${item === "TODOS" ? "Todos" : item}
                    </button>`).join("")}
            </div>
            <table class="module-table">
                <thead><tr><th>Canal</th><th>Cliente</th><th>Comentario</th><th>Fecha</th><th>Acciones</th></tr></thead>
                <tbody>${comentarios.map(item => `
                    <tr>
                        <td>${escapeHtml(item.canal || "")}</td>
                        <td><strong>${escapeHtml(item.cliente?.nombre || "Cliente")}</strong><br><small>${escapeHtml(item.cliente?.telefono || "")}</small></td>
                        <td>${escapeHtml(item.texto || "")}</td>
                        <td>${formatearFecha(item.fecha)}</td>
                        <td>${item.conversacionId ? `<button type="button" class="mini-action" data-open-comment-chat="${item.conversacionId}">Abrir chat</button>` : ""}</td>
                    </tr>`).join("") || '<tr><td colspan="5">Sin comentarios registrados.</td></tr>'}</tbody>
            </table>
        </section>`;

    vista.querySelectorAll("[data-comments-channel]").forEach(button => {
        button.addEventListener("click", () => cargarModuloComentarios(vista, button.dataset.commentsChannel));
    });

    vista.querySelectorAll("[data-open-comment-chat]").forEach(button => {
        button.addEventListener("click", () => abrirDetalleConversacion(button.dataset.openCommentChat, "comentarios"));
    });
}

async function cargarModuloFallos(vista) {
    if (!esRol("administrador")) {
        vista.innerHTML = '<div class="error">Solo un administrador puede ver fallos.</div>';
        return;
    }

    const response = await api("/api/crm/fallos?pageSize=150");
    if (!response.ok) throw new Error("Fallos no disponibles");
    const pagina = await response.json();
    const fallos = pagina.items || [];

    vista.innerHTML = `
        <div class="module-heading">
            <div>
                <h1>Fallos</h1>
                <p>Historial operativo de errores de envio, webhooks y eventos de integracion.</p>
            </div>
        </div>
        <section class="activity-workspace">
            <table class="module-table">
                <thead><tr><th>Tipo</th><th>Canal/Accion</th><th>Detalle</th><th>Texto/Payload</th><th>Fecha</th><th>Acciones</th></tr></thead>
                <tbody>${fallos.map(item => `
                    <tr>
                        <td>${escapeHtml(item.tipo || "")}</td>
                        <td>${escapeHtml(item.canal || "")}</td>
                        <td>${escapeHtml(item.detalle || "")}</td>
                        <td>${escapeHtml(item.texto || "").slice(0, 220)}</td>
                        <td>${formatearFecha(item.fecha)}</td>
                        <td>${item.conversacionId ? `<button type="button" class="mini-action" data-open-failure-chat="${item.conversacionId}">Abrir chat</button>` : ""}</td>
                    </tr>`).join("") || '<tr><td colspan="6">Sin fallos registrados.</td></tr>'}</tbody>
            </table>
        </section>`;

    vista.querySelectorAll("[data-open-failure-chat]").forEach(button => {
        button.addEventListener("click", () => abrirDetalleConversacion(button.dataset.openFailureChat, "fallos"));
    });
}

function descargarArchivo(url) {
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
}