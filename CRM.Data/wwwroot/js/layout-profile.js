// Módulo frontend del CRM.

        function limpiarIconosDePanelExtra() {
            document.querySelectorAll('.workspace-nav [data-lucide^="panel-left-"]').forEach(icon => {
                if (!navToggle.contains(icon)) icon.remove();
            });
        }

        function actualizarEstadoNavegacion(colapsada) {
            nav.classList.toggle("collapsed", colapsada);
            navToggle.title = colapsada ? "Expandir menú" : "Contraer menú";
            navToggle.setAttribute("aria-label", navToggle.title);
            if (window.lucide) {
                navToggle.innerHTML = `<i data-lucide="${colapsada ? "panel-left-open" : "panel-left-close"}"></i>`;
                window.lucide.createIcons();
            }
            limpiarIconosDePanelExtra();
        }

        actualizarEstadoNavegacion(false);
        navToggle.addEventListener("click", () => {
            actualizarEstadoNavegacion(!nav.classList.contains("collapsed"));
        });
        navBrandMark.addEventListener("click", () => {
            if (nav.classList.contains("collapsed")) actualizarEstadoNavegacion(false);
        });
        if (window.lucide) window.lucide.createIcons();
        limpiarIconosDePanelExtra();

        // obtenerIniciales() vive en utils.js (única fuente; antes estaba
        // duplicada aquí y en customer-panel.js con el mismo código).

        function claveFotoPerfil() {
            return `crm.profile.photo.${sesionActual?.usuario || "local"}`;
        }

        function pintarAvatarPerfil(url = null) {
            const iniciales = obtenerIniciales(sesionActual?.usuario);
            document.querySelectorAll("#profileAvatar, #profileAvatarMenu").forEach(avatar => {
                avatar.innerHTML = "";
                avatar.style.backgroundImage = "";
                if (url) {
                    avatar.style.backgroundImage = `url("${url}")`;
                    avatar.classList.add("has-photo");
                } else {
                    avatar.textContent = iniciales;
                    avatar.classList.remove("has-photo");
                }
            });
        }

        function renderPerfilUsuario(sesion) {
            sesionActual = sesion;
            document.getElementById("profileName").textContent = sesion.usuario || "Usuario";
            document.getElementById("profileRole").textContent = sesion.rol || "Sin rol";
            pintarAvatarPerfil(localStorage.getItem(claveFotoPerfil()));
        }

        function aplicarTemaCRM(oscuro) {
            document.documentElement.classList.toggle("theme-dark", oscuro);
            try {
                localStorage.setItem("crm.theme", oscuro ? "dark" : "light");
            } catch {
                // El tema sigue aplicado aunque el navegador bloquee localStorage.
            }

            const botonTema = document.getElementById("themeToggleButton");
            if (!botonTema) return;
            botonTema.innerHTML = `<i data-lucide="${oscuro ? "sun" : "moon"}"></i><span>${oscuro ? "Modo claro" : "Modo oscuro"}</span>`;
            if (window.lucide) window.lucide.createIcons();
        }

        aplicarTemaCRM(document.documentElement.classList.contains("theme-dark"));

        function alternarMenuPerfil(abierto = null) {
            const debeAbrir = abierto == null ? profileDropdown.classList.contains("hidden") : abierto;
            profileDropdown.classList.toggle("hidden", !debeAbrir);
            profileButton.setAttribute("aria-expanded", String(debeAbrir));
            if (debeAbrir && window.lucide) window.lucide.createIcons();
        }

        profileButton.addEventListener("click", event => {
            event.stopPropagation();
            alternarMenuPerfil();
        });

        document.addEventListener("click", event => {
            if (!event.target.closest(".profile-menu")) alternarMenuPerfil(false);
            if (!event.target.closest(".notification-menu") && typeof alternarCentroNotificaciones === "function") {
                alternarCentroNotificaciones(false);
            }
        });

        notificationButton?.addEventListener("click", event => {
            event.stopPropagation();
            if (typeof alternarCentroNotificaciones === "function") alternarCentroNotificaciones();
        });

        clearNotificationsButton?.addEventListener("click", event => {
            event.stopPropagation();
            if (typeof limpiarCentroNotificaciones === "function") limpiarCentroNotificaciones();
        });

        markNotificationsReadButton?.addEventListener("click", event => {
            event.stopPropagation();
            if (typeof marcarTodasNotificacionesLeidas === "function") marcarTodasNotificacionesLeidas();
        });

        changePhotoButton.addEventListener("click", () => profilePhotoInput.click());
        profilePhotoInput.addEventListener("change", () => {
            const archivo = profilePhotoInput.files && profilePhotoInput.files[0];
            if (!archivo) return;
            const reader = new FileReader();
            reader.onload = () => {
                localStorage.setItem(claveFotoPerfil(), reader.result);
                pintarAvatarPerfil(reader.result);
            };
            reader.readAsDataURL(archivo);
        });

        viewProfileButton.addEventListener("click", () => {
            alternarMenuPerfil(false);
            mostrarModalInfo("Perfil", `
                <div class="modal-profile">
                    <span class="profile-avatar large">${escapeHtml(obtenerIniciales(sesionActual?.usuario))}</span>
                    <div>
                        <strong>${escapeHtml(sesionActual?.usuario || "-")}</strong>
                        <span>${escapeHtml(sesionActual?.rol || "-")}</span>
                    </div>
                </div>`);
        });

        document.getElementById("themeToggleButton")?.addEventListener("click", event => {
            event.stopPropagation();
            aplicarTemaCRM(!document.documentElement.classList.contains("theme-dark"));
        });

        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Cerrando...";
            try {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Cache-Control": "no-cache" }
                });
            } finally {
                window.location.href = "/login.html";
            }
        });