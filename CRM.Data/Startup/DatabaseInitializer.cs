using CRM.Data.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Startup;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

        await context.Database.MigrateAsync();

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
