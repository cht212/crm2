// Archivo generado desde Script.js para separar responsabilidades del CRM.
// Mantiene variables y funciones globales para compatibilidad con la vista actual.

const POLLING_MS = 15000;
        let conversaciones = [];
        let conversacionSeleccionada = null;
        let actualizacionEnCurso = false;
        let filtroActivo = "all";
        let asesorFiltroActivo = "";
        let rolActual = "";
        let sesionActual = null;
        let fichaTabActiva = "datos";
        let usuariosCache = null;
        let dashboardCanalActivo = "TODOS";
        let inboxCanalActivo = "TODOS";
        let tareasFiltroActivo = "mias";
        let ventasEtapaFiltro = "TODAS";
        let reportesFiltros = { desde: "", hasta: "", usuarioId: "" };
        let botCanalActivo = "whatsapp";
        let comunicacionesMenuAbierto = false;
        let moduloActual = "dashboard";
        let notificacionesConversacionesInicializadas = false;
        let notificacionesCentro = [];
        let notificacionesNoLeidas = 0;
        let plantillasRapidasCache = null;
        let tareasVencidasNotificadas = false;
        const ultimosMensajesCliente = new Map();
        // Módulo al que debe volver el botón "<" cuando se abre
        // una conversación individual desde el Pipeline (o cualquier
        // otro listado que no sea el Inbox general).
        let moduloRetornoDetalle = "pipeline";
        let modoDetalleConversacion = false;

        const lista = document.getElementById("conversationList");
        const mensajes = document.getElementById("messages");
        const estado = document.getElementById("status");
        const input = document.getElementById("messageInput");
        const boton = document.getElementById("sendButton");
        const quickReplies = document.getElementById("quickReplies");
        const fileInput = document.getElementById("fileInput");
        const attachButton = document.getElementById("attachButton");
        const fileName = document.getElementById("fileName");
        const attachmentPreview = document.getElementById("attachmentPreview");
        const attachmentThumb = document.getElementById("attachmentThumb");
        const attachmentName = document.getElementById("attachmentName");
        const attachmentSize = document.getElementById("attachmentSize");
        const removeAttachment = document.getElementById("removeAttachment");
        const logoutButton = document.getElementById("logoutButton");
        const profileButton = document.getElementById("profileButton");
        const profileDropdown = document.getElementById("profileDropdown");
        const profilePhotoInput = document.getElementById("profilePhotoInput");
        const changePhotoButton = document.getElementById("changePhotoButton");
        const viewProfileButton = document.getElementById("viewProfileButton");
        const notificationButton = document.getElementById("notificationButton");
        const notificationDropdown = document.getElementById("notificationDropdown");
        const notificationBadge = document.getElementById("notificationBadge");
        const notificationList = document.getElementById("notificationList");
        const clearNotificationsButton = document.getElementById("clearNotificationsButton");
        const markNotificationsReadButton = document.getElementById("markNotificationsReadButton");
        const modalHost = document.getElementById("modalHost");
        const nav = document.querySelector(".workspace-nav");
        const navBrandMark = document.getElementById("navBrandMark");
        const navToggle = document.getElementById("navToggle");
