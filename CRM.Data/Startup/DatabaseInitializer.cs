using CRM.Data.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Startup;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration, ILogger? logger = null)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

        try
        {
            var canConnect = await context.Database.CanConnectAsync();
            if (!canConnect)
            {
                logger?.LogWarning("No se pudo conectar a la base de datos durante el arranque del CRM. Se continúa con el inicio para no bloquear la app.");
                return;
            }

            var pendingMigrations = (await context.Database.GetPendingMigrationsAsync()).ToList();
            if (pendingMigrations.Count == 0)
            {
                logger?.LogDebug("La base de datos ya está sincronizada. Se omite la migración en el arranque.");
            }
            else
            {
                logger?.LogInformation("Aplicando {PendingMigrations} migraciones al arrancar el CRM.", pendingMigrations.Count);
                await context.Database.MigrateAsync();
            }
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Error al validar o migrar la base de datos durante el arranque del CRM.");
            return;
        }

        var hasUsers = await context.Usuarios.AnyAsync();
        var bootstrapUsername = configuration["Authentication:BootstrapUsername"];
        var bootstrapPassword = configuration["Authentication:BootstrapPassword"];

        if (hasUsers ||
            string.IsNullOrWhiteSpace(bootstrapUsername) ||
            string.IsNullOrWhiteSpace(bootstrapPassword))
        {
            return;
        }

        var admin = new CRM.Data.Models.CrmUsuario
        {
            cUsuario = bootstrapUsername.Trim(),
            cNombre = "Administrador",
            cEstado = 'A',
            cRol = "Administrador"
        };

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<CRM.Data.Models.CrmUsuario>>();
        admin.cPasswordHash = hasher.HashPassword(admin, bootstrapPassword);
        context.Usuarios.Add(admin);
        await context.SaveChangesAsync();
    }
}
