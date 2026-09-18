using CRM.Data.Data;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCrmDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<CrmDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        return services;
    }

    public static IServiceCollection AddCrmApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<WhatsAppService>();
        services.AddScoped<AuditoriaService>();
        services.AddScoped<SocialInboundService>();
        services.AddScoped<MetaWebhookService>();
        services.AddSingleton<BotSettingsService>();
        services.AddSingleton<SocialIntegrationService>();
        services.AddScoped<IPasswordHasher<CRM.Data.Models.CrmUsuario>, PasswordHasher<CRM.Data.Models.CrmUsuario>>();

        services.AddHttpClient<CloudinaryStorageService>()
            .ConfigurePrimaryHttpMessageHandler(CreateExternalHttpHandler);

        services.AddHttpClient<WhatsAppCloudApiService>()
            .ConfigurePrimaryHttpMessageHandler(CreateExternalHttpHandler);

        services.AddHttpClient<MetaGraphApiService>()
            .ConfigurePrimaryHttpMessageHandler(CreateExternalHttpHandler);

        services.AddHttpClient<MetaMessagingService>()
            .ConfigurePrimaryHttpMessageHandler(CreateExternalHttpHandler);

        return services;
    }

    public static IServiceCollection AddCrmCookieAuthentication(this IServiceCollection services)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = "crm_hpd_session";
                options.Cookie.SameSite = SameSiteMode.None;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.LoginPath = "/login.html";
                options.AccessDeniedPath = "/login.html?error=acceso";
                options.ExpireTimeSpan = TimeSpan.FromHours(8);
                options.SlidingExpiration = true;

                options.Events.OnRedirectToLogin = context =>
                {
                    if (context.Request.Path.StartsWithSegments("/api"))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    }

                    context.Response.Redirect(context.RedirectUri);
                    return Task.CompletedTask;
                };

                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });

        services.AddAuthorization();
        return services;
    }

    public static IServiceCollection AddCrmCors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("CRM", policy =>
            {
                var allowedOrigins =
                    configuration
                        .GetSection("Cors:AllowedOrigins")
                        .Get<string[]>() ?? [];

                if (allowedOrigins.Length > 0)
                {
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                }
                else
                {
                    policy
                        .WithOrigins("https://crm-78n3.onrender.com")
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                }
            });
        });

        return services;
    }

    private static HttpMessageHandler CreateExternalHttpHandler() =>
        OperatingSystem.IsWindows()
            ? new System.Net.Http.WinHttpHandler()
            : new HttpClientHandler();
}
