// Administración de usuarios y permisos personalizados.

async function cargarModuloUsuarios(vista) {
    if (!puedeVerModulo("usuarios")) {
        vista.innerHTML = '<div class="error">No tienes permiso para ver usuarios.</div>';
        return;
    }

    const puedeAdministrar = esRol("administrador");
    const response = await api("/api/crm/usuarios");
    if (!response.ok) throw new Error("Usuarios no disponibles");
    const usuarios = await response.json();

    vista.innerHTML = `
        <div class="module-heading"><div><h1>Usuarios</h1><p>Administra cuentas, roles y permisos adicionales.</p></div></div>
        ${puedeAdministrar ? '<div class="user-permission-help"><strong>Roles y permisos</strong><span>Selecciona Auditor, Supervisor o Asesor en cada cuenta. Usa <b>Administrar permisos</b> para conceder accesos adicionales al rol.</span></div>' : ""}
        ${puedeAdministrar ? `<form id="newUserForm" class="user-form">
            <label><span>Usuario</span><input name="usuario" placeholder="Usuario de acceso" required></label>
            <label><span>Nombre</span><input name="nombre" placeholder="Nombre completo" required></label>
            <label><span>Contraseña inicial</span><input name="password" type="password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>
            <label><span>Rol</span><select name="rol"><option value="Asesor">Asesor</option><option value="Supervisor">Supervisor</option><option value="Auditor">Auditor</option></select></label>
            <button type="submit">Crear usuario</button>
        </form>` : '<div class="connection-note"><strong>Solo lectura:</strong> puedes revisar usuarios y roles, pero no cambiar sus accesos.</div>'}
        <div class="table-wrap"><table class="module-table users-table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Cambiar contraseña</th><th>Permisos</th></tr></thead>
            <tbody>${usuarios.map(usuario => `<tr>
                <td>${escapeHtml(usuario.usuario)}</td>
                <td>${escapeHtml(usuario.nombre)}</td>
                <td>${puedeAdministrar && normalizarRol(usuario.rol) !== "administrador"
                    ? `<div class="user-role-action"><select data-user-role="${usuario.id}" aria-label="Rol de ${escapeAttribute(usuario.nombre)}">
                        ${["Asesor", "Supervisor", "Auditor"].map(rol => `<option value="${rol}" ${normalizarRol(usuario.rol) === normalizarRol(rol) ? "selected" : ""}>${rol}</option>`).join("")}
                    </select><button type="button" data-save-role="${usuario.id}">Guardar rol</button></div>`
                    : `<span class="role-badge administrator">${escapeHtml(usuario.rol)}</span>`}</td>
                <td>${puedeAdministrar ? `<div class="user-password-action">
                    <input type="password" data-user-password="${usuario.id}" placeholder="Nueva contraseña" minlength="8" autocomplete="new-password">
                    <button type="button" data-change-password="${usuario.id}">Cambiar</button>
                </div>` : '<span>Solo lectura</span>'}</td>
                <td>${puedeAdministrar && normalizarRol(usuario.rol) !== "administrador"
                    ? `<button type="button" class="mini-action user-permissions-button" data-user-permissions="${usuario.id}">Administrar permisos</button>`
                    : '<span>Permisos del rol</span>'}</td>
            </tr>`).join("") || '<tr><td colspan="5">No hay usuarios.</td></tr>'}</tbody>
        </table></div>
        <section id="userPermissionsPanel" class="connection-note hidden"></section>`;

    vista.querySelector("#newUserForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const datos = Object.fromEntries(new FormData(event.currentTarget));
        const crearResponse = await api("/api/crm/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (!crearResponse.ok) {
            notificar(await crearResponse.text(), "error");
            return;
        }
        usuariosCache = null;
        await cargarModuloUsuarios(vista);
        notificar("Usuario creado.", "success");
    });

    vista.querySelectorAll("[data-change-password]").forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.dataset.changePassword;
            const input = vista.querySelector(`[data-user-password="${id}"]`);
            const password = input?.value || "";
            if (password.length < 8) {
                notificar("La contraseña debe tener al menos 8 caracteres.", "error");
                input?.focus();
                return;
            }

            button.disabled = true;
            try {
                const changeResponse = await api(`/api/crm/usuarios/${id}/password`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password })
                });
                if (!changeResponse.ok) {
                    notificar(await changeResponse.text(), "error");
                    return;
                }
                input.value = "";
                notificar("Contraseña actualizada.", "success");
            } finally {
                button.disabled = false;
            }
        });
    });

    vista.querySelectorAll("[data-save-role]").forEach(button => {
        button.addEventListener("click", async () => {
            const id = button.dataset.saveRole;
            const select = vista.querySelector(`[data-user-role="${id}"]`);
            button.disabled = true;
            try {
                const roleResponse = await api(`/api/crm/usuarios/${id}/rol`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rol: select?.value || "" })
                });
                if (!roleResponse.ok) {
                    notificar(await roleResponse.text(), "error");
                    return;
                }
                usuariosCache = null;
                notificar("Rol actualizado. Se aplicará en el próximo inicio de sesión del usuario.", "success");
            } finally {
                button.disabled = false;
            }
        });
    });

    vista.querySelectorAll("[data-user-permissions]").forEach(button => {
        button.addEventListener("click", () => abrirPermisosUsuario(vista, button.dataset.userPermissions));
    });
}

async function abrirPermisosUsuario(vista, usuarioId) {
    const panel = vista.querySelector("#userPermissionsPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.innerHTML = '<div class="empty">Cargando permisos...</div>';

    const response = await api(`/api/crm/usuarios/${usuarioId}/permisos`);
    if (!response.ok) {
        panel.innerHTML = '<div class="error">No se pudieron cargar los permisos.</div>';
        return;
    }

    const data = await response.json();
    const permisos = data.permisos || [];
    panel.innerHTML = `
        <div class="panel-heading-with-action">
            <div><span class="panel-kicker">Permisos adicionales</span><h2>${escapeHtml(data.usuario?.nombre || "Usuario")}</h2><p>Rol base: ${escapeHtml(data.usuario?.rol || "")}. Los permisos heredados no se pueden quitar.</p></div>
            <button type="button" class="ghost-button" data-close-permissions>Cerrar</button>
        </div>
        <form id="userPermissionsForm" class="permissions-form">
            <div class="permissions-grid">
                ${permisos.map(item => `<label class="permission-option ${item.heredado ? "inherited" : ""}">
                    <input type="checkbox" name="permiso" value="${escapeAttribute(item.codigo)}" ${item.efectivo ? "checked" : ""} ${item.heredado ? "disabled" : ""}>
                    <span><strong>${escapeHtml(item.nombre)}</strong><small>${escapeHtml(item.descripcion)}</small>${item.heredado ? '<em>Incluido por el rol</em>' : ""}</span>
                </label>`).join("")}
            </div>
            <div class="report-filter-actions"><button type="submit" class="primary">Guardar permisos</button></div>
        </form>`;

    panel.querySelector("[data-close-permissions]")?.addEventListener("click", () => panel.classList.add("hidden"));
    panel.querySelector("#userPermissionsForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const permisosSeleccionados = Array.from(event.currentTarget.querySelectorAll('input[name="permiso"]:checked:not(:disabled)'))
            .map(input => input.value);
        const saveResponse = await api(`/api/crm/usuarios/${usuarioId}/permisos`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permisos: permisosSeleccionados })
        });
        if (!saveResponse.ok) {
            notificar(await saveResponse.text(), "error");
            return;
        }
        notificar("Permisos actualizados. Se aplicarán en el próximo inicio de sesión del usuario.", "success");
        await abrirPermisosUsuario(vista, usuarioId);
    });
}
