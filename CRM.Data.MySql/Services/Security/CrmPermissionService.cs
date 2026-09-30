using CRM.Data.Data;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Services;

public sealed record CrmPermissionDefinition(
    string Code,
    string Group,
    string Label,
    string Description);

public sealed class CrmPermissionService
{
    public const string ModuleReports = "modulo.reportes";
    public const string ModuleMarketing = "modulo.marketing";
    public const string ModuleBot = "modulo.bot";
    public const string ModuleConnections = "modulo.conexiones";
    public const string ModuleActivity = "modulo.actividad";
    public const string ModuleFailures = "modulo.fallos";
    public const string ModuleUsers = "modulo.usuarios";
    public const string EditContacts = "contactos.editar";
    public const string SendMessages = "mensajes.enviar";
    public const string AssignConversations = "conversaciones.asignar";
    public const string ManageTasks = "tareas.gestionar";
    public const string ManageSales = "ventas.gestionar";
    public const string ManageMarketing = "marketing.gestionar";
    public const string ManageBot = "bot.gestionar";
    public const string ManageIntegrations = "integraciones.gestionar";
    public const string ExportData = "datos.exportar";
    public const string CreateContacts = "contactos.crear";
    public const string AttendConversations = "conversaciones.atender";
    public const string ManageNotes = "clientes.detalles";

    public static readonly IReadOnlyList<CrmPermissionDefinition> Catalog =
    [
        new(ModuleReports, "Módulos", "Ver reportes", "Consulta indicadores y reportes del CRM."),
        new(ModuleMarketing, "Módulos", "Ver marketing", "Consulta campañas, publicaciones y estadísticas."),
        new(ModuleBot, "Módulos", "Ver bot", "Consulta la configuración operativa del bot."),
        new(ModuleConnections, "Módulos", "Ver conexiones", "Consulta el estado de integraciones sin revelar secretos."),
        new(ModuleActivity, "Módulos", "Ver actividad", "Consulta el historial de auditoría."),
        new(ModuleFailures, "Módulos", "Ver fallos", "Consulta errores de mensajes, webhooks e integraciones."),
        new(ModuleUsers, "Módulos", "Ver usuarios", "Consulta nombres y roles, sin cambiar claves ni permisos."),
        new(CreateContacts, "Operación", "Crear contactos", "Registra nuevos clientes en el CRM."),
        new(EditContacts, "Operación", "Editar contactos", "Modifica los datos principales de clientes."),
        new(SendMessages, "Operación", "Enviar mensajes y archivos", "Responde conversaciones y adjunta archivos."),
        new(AttendConversations, "Operación", "Atender conversaciones", "Toma conversaciones y cambia su estado operativo."),
        new(AssignConversations, "Operación", "Asignar conversaciones", "Asigna o reasigna conversaciones al equipo."),
        new(ManageNotes, "Operación", "Gestionar notas y etiquetas", "Añade notas internas y clasifica clientes con etiquetas."),
        new(ManageTasks, "Operación", "Gestionar tareas", "Crea, completa y elimina tareas."),
        new(ManageSales, "Operación", "Gestionar ventas", "Crea y actualiza oportunidades comerciales."),
        new(ManageMarketing, "Operación", "Gestionar marketing", "Crea campañas y ejecuta automatizaciones."),
        new(ManageBot, "Operación", "Configurar bot", "Modifica respuestas y plantillas del bot."),
        new(ManageIntegrations, "Operación", "Configurar integraciones", "Modifica conexiones externas sin mostrar secretos guardados."),
        new(ExportData, "Datos", "Exportar información", "Descarga reportes y archivos de datos."),
    ];

    private static readonly HashSet<string> ConfigurableCodes =
        Catalog.Select(item => item.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);

    private readonly CrmDbContext _context;

    public CrmPermissionService(CrmDbContext context)
    {
        _context = context;
    }

    public static bool IsConfigurable(string permission) =>
        ConfigurableCodes.Contains(permission);

    public async Task<HashSet<string>> GetGrantedAsync(int userId) =>
        (await _context.UsuarioPermisos
            .AsNoTracking()
            .Where(item => item.nUsuario == userId)
            .Select(item => item.cPermiso)
            .ToListAsync())
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public async Task<HashSet<string>> GetEffectiveAsync(int userId, string? role)
    {
        var result = GetBasePermissions(role);
        result.UnionWith(await GetGrantedAsync(userId));
        return result;
    }

    public async Task<bool> HasAsync(int userId, string? role, string permission)
    {
        if (CrmRoles.Normalize(role).Equals(CrmRoles.Administrador, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (GetBasePermissions(role).Contains(permission))
        {
            return true;
        }

        return await _context.UsuarioPermisos.AsNoTracking().AnyAsync(item =>
            item.nUsuario == userId && item.cPermiso == permission);
    }

    public static HashSet<string> GetBasePermissions(string? role)
    {
        var normalized = CrmRoles.Normalize(role);
        if (normalized.Equals(CrmRoles.Administrador, StringComparison.OrdinalIgnoreCase))
        {
            return Catalog.Select(item => item.Code)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        if (normalized.Equals(CrmRoles.Supervisor, StringComparison.OrdinalIgnoreCase))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ModuleReports, ModuleMarketing, ModuleBot, ModuleActivity,
                EditContacts, SendMessages, AssignConversations, ManageTasks,
                ManageSales, ManageMarketing, ManageBot, ManageIntegrations,
                ExportData, CreateContacts, AttendConversations, ManageNotes
            };
        }

        if (normalized.Equals(CrmRoles.Asesor, StringComparison.OrdinalIgnoreCase))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                EditContacts, SendMessages, ManageTasks, ManageSales, CreateContacts,
                AttendConversations, ManageNotes
            };
        }

        if (normalized.Equals(CrmRoles.Auditor, StringComparison.OrdinalIgnoreCase))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ModuleReports, ModuleMarketing, ModuleBot, ModuleConnections,
                ModuleActivity, ModuleFailures, ModuleUsers, ExportData
            };
        }

        if (normalized.Equals(CrmRoles.Marketing, StringComparison.OrdinalIgnoreCase))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ModuleMarketing,
                ManageMarketing
            };
        }

        return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    public static string? ResolveMutationPermission(PathString path)
    {
        var value = path.Value?.ToLowerInvariant() ?? string.Empty;
        // Los endpoints de autenticación no son operaciones del CRM. En
        // particular, login debe funcionar aunque el navegador conserve una
        // cookie de una sesión anterior con permisos limitados.
        if (value.StartsWith("/api/auth") || value.Contains("/webhook")) return null;
        if (value.StartsWith("/api/crm/usuarios")) return "administracion.usuarios";
        if (value.Contains("/asignar") || value.Contains("/asignar-pendientes")) return AssignConversations;
        if (value.StartsWith("/api/whatsapp"))
            return value.EndsWith("/bot") ? AttendConversations : SendMessages;
        if (value.StartsWith("/api/tareas")) return ManageTasks;
        if (value.StartsWith("/api/oportunidades")) return ManageSales;
        if (value.StartsWith("/api/crm/comentarios")) return ManageMarketing;
        if (value.StartsWith("/api/campanas") || value.StartsWith("/api/automatizacion")) return ManageMarketing;
        if (value.StartsWith("/api/bot") || value.StartsWith("/api/plantillas")) return ManageBot;
        if (value.StartsWith("/api/integraciones")) return ManageIntegrations;
        if (value.StartsWith("/api/exportaciones")) return ExportData;
        if (value.StartsWith("/api/notas") || value.StartsWith("/api/clientes") || value.StartsWith("/api/etiquetas")) return ManageNotes;
        if (value.StartsWith("/api/crm/contactos"))
        {
            if (value.Contains("/conversaciones")) return AttendConversations;
            return value.Count(character => character == '/') <= 3 ? CreateContacts : EditContacts;
        }
        if (value.StartsWith("/api/crm/conversaciones")) return AttendConversations;
        return "operacion.no_asignada";
    }
}
