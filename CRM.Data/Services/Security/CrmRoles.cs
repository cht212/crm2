namespace CRM.Data.Services;

public static class CrmRoles
{
    public const string Administrador = "Administrador";
    public const string Supervisor = "Supervisor";
    public const string Asesor = "Asesor";

    public static readonly string[] All =
    [
        Administrador,
        Supervisor,
        Asesor
    ];

    public static string Normalize(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return string.Empty;
        }

        var trimmed = role.Trim();
        return trimmed switch
        {
            "admin" => Administrador,
            "administrador" => Administrador,
            "supervisor" => Supervisor,
            "asesor" => Asesor,
            _ => trimmed
        };
    }

    public static bool IsKnown(string? role)
    {
        var normalized = Normalize(role);
        return All.Contains(normalized, StringComparer.OrdinalIgnoreCase);
    }
}

public static class CrmRolePermissions
{
    private static readonly HashSet<string> ModuloAdministrador =
    [
        "dashboard", "inbox", "contactos", "tareas", "pipeline", "ventas",
        "alertas", "reportes", "actividad", "fallos", "bot", "conexiones", "usuarios"
    ];

    private static readonly HashSet<string> ModuloSupervisor =
    [
        "dashboard", "inbox", "contactos", "tareas", "pipeline", "ventas",
        "alertas", "reportes", "actividad"
    ];

    private static readonly HashSet<string> ModuloAsesor =
    [
        "dashboard", "inbox", "contactos", "tareas", "pipeline", "ventas"
    ];

    public static bool CanAccessModule(string? role, string modulo)
    {
        var normalizedRole = CrmRoles.Normalize(role);
        var module = (modulo ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(normalizedRole) || string.IsNullOrWhiteSpace(module))
        {
            return false;
        }

        if (normalizedRole.Equals(CrmRoles.Administrador, StringComparison.OrdinalIgnoreCase))
        {
            return ModuloAdministrador.Contains(module, StringComparer.OrdinalIgnoreCase);
        }

        if (normalizedRole.Equals(CrmRoles.Supervisor, StringComparison.OrdinalIgnoreCase))
        {
            return ModuloSupervisor.Contains(module, StringComparer.OrdinalIgnoreCase);
        }

        if (normalizedRole.Equals(CrmRoles.Asesor, StringComparison.OrdinalIgnoreCase))
        {
            return ModuloAsesor.Contains(module, StringComparer.OrdinalIgnoreCase);
        }

        return false;
    }

    public static bool CanAccessAction(string? role, string action)
    {
        var normalizedRole = CrmRoles.Normalize(role);
        var normalizedAction = (action ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(normalizedRole) || string.IsNullOrWhiteSpace(normalizedAction))
        {
            return false;
        }

        if (normalizedRole.Equals(CrmRoles.Administrador, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (normalizedRole.Equals(CrmRoles.Supervisor, StringComparison.OrdinalIgnoreCase))
        {
            return normalizedAction is "ver" or "crear" or "editar" or "asignar" or "exportar";
        }

        if (normalizedRole.Equals(CrmRoles.Asesor, StringComparison.OrdinalIgnoreCase))
        {
            return normalizedAction is "ver" or "crear" or "editar";
        }

        return false;
    }
}
