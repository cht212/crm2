// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

        async function cargarModuloUsuarios(vista) {
            if (rolActual !== "Administrador") {
                vista.innerHTML = '<div class="error">Solo un administrador puede gestionar usuarios.</div>';
                return;
            }

            const response = await api("/api/crm/usuarios");
            if (!response.ok) throw new Error("Usuarios no disponibles");
            const usuarios = await response.json();
            vista.innerHTML = `
                <div class="module-heading"><div><h1>Usuarios</h1><p>Crea asesores y supervisores para repartir la atención.</p></div></div>
                <form id="newUserForm" class="user-form">
                    <input name="usuario" placeholder="Usuario de acceso" required>
                    <input name="nombre" placeholder="Nombre completo" required>
                    <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" minlength="8" required>
                    <select name="rol"><option value="Asesor">Asesor</option><option value="Supervisor">Supervisor</option></select>
                    <button type="submit">Agregar usuario</button>

                    </form>
                <table class="module-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th></tr></thead>
                <tbody>${usuarios.map(usuario => `<tr><td>${escapeHtml(usuario.usuario)}</td><td>${escapeHtml(usuario.nombre)}</td><td>${escapeHtml(usuario.rol)}</td></tr>`).join("") || '<tr><td colspan="3">No hay usuarios.</td></tr>'}</tbody></table>`;

            vista.querySelector("#newUserForm").addEventListener("submit", async event => {
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
                await cargarModuloUsuarios(vista);
                notificar("Usuario creado.", "success");
            });
        }
