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
        <div class="module-heading"><div><h1>Usuarios</h1><p>Administra cuentas y accesos por módulo.</p></div></div>
        ${puedeAdministrar ? '<div class="user-permission-help"><strong>Edición y seguridad</strong><span>El rol de cada cuenta permanece fijo. Usa el lápiz para editar el nombre o la contraseña y el escudo para mostrar u ocultar módulos y sus permisos.</span></div>' : ""}
        ${puedeAdministrar ? `<form id="newUserForm" class="user-form">
            <label><span>Usuario</span><input name="usuario" placeholder="Usuario de acceso" required></label>
            <label><span>Nombre</span><input name="nombre" placeholder="Nombre completo" required></label>
            <label><span>Contraseña inicial</span><input name="password" type="password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>
            <label><span>Rol</span><select name="rol"><option value="Asesor">Asesor</option><option value="Marketing">Marketing</option><option value="Supervisor">Supervisor</option><option value="Auditor">Auditor</option></select></label>
            <button type="submit">Crear usuario</button>
        </form>` : '<div class="connection-note"><strong>Solo lectura:</strong> puedes revisar usuarios y roles, pero no cambiar sus accesos.</div>'}
        <div class="table-wrap"><table class="module-table users-table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>${usuarios.map(usuario => `<tr>
                <td>${escapeHtml(usuario.usuario)}</td>
                <td>${escapeHtml(usuario.nombre)}</td>
                <td><span class="role-badge">${escapeHtml(usuario.rol)}</span></td>
                <td>${puedeAdministrar && normalizarRol(usuario.rol) !== "administrador"
                    ? `<div class="user-row-actions">
                        <button type="button" class="mini-action user-edit-button" data-user-edit="${usuario.id}" title="Editar cuenta de ${escapeAttribute(usuario.nombre)}" aria-label="Editar cuenta de ${escapeAttribute(usuario.nombre)}" aria-controls="userEditPanel"><i data-lucide="pencil" aria-hidden="true"></i></button>
                        <button type="button" class="mini-action user-permissions-button" data-user-permissions="${usuario.id}" title="Configurar seguridad de ${escapeAttribute(usuario.nombre)}" aria-label="Configurar seguridad de ${escapeAttribute(usuario.nombre)}" aria-controls="userPermissionsPanel"><i data-lucide="shield-check" aria-hidden="true"></i></button>
                    </div>`
                    : '<span>Cuenta principal</span>'}</td>
            </tr>`).join("") || '<tr><td colspan="4">No hay usuarios.</td></tr>'}</tbody>
        </table></div>
        <section id="userEditPanel" class="connection-note hidden"></section>
        <section id="userPermissionsPanel" class="connection-note hidden"></section>`;
    window.lucide?.createIcons();

    vista.querySelector("#newUserForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const crearResponse = await api("/api/crm/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
        });
        if (!crearResponse.ok) {
            notificar(await crearResponse.text(), "error");
            return;
        }
        usuariosCache = null;
        await cargarModuloUsuarios(vista);
        notificar("Usuario creado.", "success");
    });

    vista.querySelectorAll("[data-user-edit]").forEach(button => {
        const usuario = usuarios.find(item => String(item.id) === button.dataset.userEdit);
        button.addEventListener("click", () => abrirEdicionUsuario(vista, usuario));
    });
    vista.querySelectorAll("[data-user-permissions]").forEach(button => {
        button.addEventListener("click", () => abrirPermisosUsuario(vista, button.dataset.userPermissions));
    });
}

function abrirEdicionUsuario(vista, usuario) {
    if (!usuario) return;
    const panel = vista.querySelector("#userEditPanel");
    vista.querySelector("#userPermissionsPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    panel.innerHTML = `
        <div class="panel-heading-with-action">
            <div><span class="panel-kicker">Editar cuenta</span><h2>${escapeHtml(usuario.usuario)}</h2><p>El rol ${escapeHtml(usuario.rol)} permanece fijo. La contraseña sólo cambia si escribes una nueva.</p></div>
            <button type="button" class="ghost-button" data-close-user-edit>Cerrar</button>
        </div>
        <form id="userEditForm" class="user-edit-form">
            <label><span>Nombre</span><input name="nombre" value="${escapeAttribute(usuario.nombre)}" required maxlength="150"></label>
            <label><span>Nueva contraseña</span><input name="password" type="password" placeholder="Dejar en blanco para conservarla" minlength="8" autocomplete="new-password"></label>
            <label><span>Rol fijo</span><span class="role-badge">${escapeHtml(usuario.rol)}</span></label>
            <div class="report-filter-actions"><button type="submit" class="primary">Guardar cambios</button></div>
        </form>`;
    panel.querySelector("[data-close-user-edit]")?.addEventListener("click", () => panel.classList.add("hidden"));
    panel.querySelector("#userEditForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
            const editResponse = await api(`/api/crm/usuarios/${usuario.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            if (!editResponse.ok) {
                notificar(await editResponse.text(), "error");
                return;
            }
            usuariosCache = null;
            await cargarModuloUsuarios(vista);
            notificar("Cuenta actualizada.", "success");
        } finally {
            submit.disabled = false;
        }
    });
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function abrirPermisosUsuario(vista, usuarioId) {
    const panel = vista.querySelector("#userPermissionsPanel");
    if (!panel) return;
    vista.querySelector("#userEditPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    panel.dataset.userId = String(usuarioId);
    panel.innerHTML = '<div class="empty">Cargando seguridad...</div>';

    const response = await api(`/api/crm/usuarios/${usuarioId}/permisos`);
    if (!response.ok) {
        panel.innerHTML = '<div class="error">No se pudo cargar la seguridad del usuario.</div>';
        return;
    }

    const data = await response.json();
    if (panel.dataset.userId !== String(usuarioId)) return;
    const permisos = data.permisos || [];
    const grupos = new Map();
    permisos.forEach(item => {
        const grupo = item.grupo || "Otros";
        if (!grupos.has(grupo)) grupos.set(grupo, []);
        grupos.get(grupo).push(item);
    });

    panel.innerHTML = `
        <div class="panel-heading-with-action">
            <div><span class="panel-kicker">Seguridad y accesos</span><h2>${escapeHtml(data.usuario?.nombre || "Usuario")}</h2><p>Activa los módulos que podrá ver y luego elige sus permisos internos.</p></div>
            <button type="button" class="ghost-button" data-close-permissions>Cerrar</button>
        </div>
        <form id="userPermissionsForm" class="permissions-form">
            <div class="permission-sections">
                ${Array.from(grupos, ([grupo, items]) => `<fieldset class="permission-section" data-permission-section>
                    <legend>${escapeHtml(grupo)}</legend>
                    <div class="permissions-grid">${items.map(item => {
                        const esModulo = String(item.codigo).startsWith("modulo.");
                        return `<label class="permission-option ${esModulo ? "permission-visibility" : "permission-child"}">
                            <input type="checkbox" name="permiso" value="${escapeAttribute(item.codigo)}" ${esModulo ? "data-module-permission" : "data-child-permission"} ${item.efectivo ? "checked" : ""}>
                            <span><strong>${esModulo ? "Mostrar módulo" : escapeHtml(item.nombre)}</strong><small>${escapeHtml(item.descripcion)}</small>${item.heredado ? '<em>Predeterminado del rol</em>' : ""}</span>
                        </label>`;
                    }).join("")}</div>
                    ${grupo === "Usuarios" ? '<p class="permission-section-note">Crear cuentas, editarlas y configurar seguridad continúa reservado al Administrador.</p>' : ""}
                </fieldset>`).join("")}
            </div>
            <div class="report-filter-actions"><button type="button" class="ghost-button" data-reset-permissions>Restablecer permisos del rol</button><button type="submit" class="primary">Guardar seguridad</button></div>
        </form>`;

    const sincronizarSeccion = (seccion, activarTodos = false) => {
        const modulo = seccion.querySelector("[data-module-permission]");
        const hijos = seccion.querySelectorAll("[data-child-permission]");
        if (!modulo) return;
        if (activarTodos && modulo.checked) hijos.forEach(input => { input.checked = true; });
        hijos.forEach(input => {
            input.disabled = !modulo.checked;
            if (!modulo.checked) input.checked = false;
        });
        seccion.classList.toggle("module-disabled", !modulo.checked);
    };
    panel.querySelectorAll("[data-permission-section]").forEach(seccion => {
        sincronizarSeccion(seccion);
        seccion.querySelector("[data-module-permission]")?.addEventListener("change", () => sincronizarSeccion(seccion, true));
    });
    panel.querySelector("[data-close-permissions]")?.addEventListener("click", () => panel.classList.add("hidden"));
    panel.querySelector("[data-reset-permissions]")?.addEventListener("click", () => {
        const predeterminados = new Set(permisos.filter(item => item.heredado).map(item => item.codigo));
        panel.querySelectorAll('input[name="permiso"]').forEach(input => { input.checked = predeterminados.has(input.value); });
        panel.querySelectorAll("[data-permission-section]").forEach(seccion => sincronizarSeccion(seccion));
    });
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.querySelector("#userPermissionsForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const permisosSeleccionados = Array.from(form.querySelectorAll('input[name="permiso"]:checked')).map(input => input.value);
        submit.disabled = true;
        try {
            const saveResponse = await api(`/api/crm/usuarios/${usuarioId}/permisos`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permisos: permisosSeleccionados, personalizar: true })
            });
            if (!saveResponse.ok) {
                notificar(await saveResponse.text(), "error");
                return;
            }
            notificar("Seguridad actualizada. Se aplicará cuando el usuario recargue o vuelva a iniciar sesión.", "success");
            await abrirPermisosUsuario(vista, usuarioId);
        } catch (error) {
            if (error.name !== "AbortError") notificar("No se pudo guardar la seguridad. Intenta nuevamente.", "error");
        } finally {
            submit.disabled = false;
        }
    });
}
