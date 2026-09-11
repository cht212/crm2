using CRM.Data.Data;
using CRM.Data.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// BASE DE DATOS
// ======================================================

builder.Services.AddDbContext<CrmDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));


// ======================================================
// SERVICIOS DEL CRM
// ======================================================

builder.Services.AddScoped<WhatsAppService>();
builder.Services.AddHttpClient<CloudinaryStorageService>();
builder.Services.AddHttpClient<WhatsAppCloudApiService>();
builder.Services.AddScoped<IPasswordHasher<CRM.Data.Models.CrmUsuario>, PasswordHasher<CRM.Data.Models.CrmUsuario>>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
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
builder.Services.AddAuthorization();


// ======================================================
// CORS
// ======================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("CRM", policy =>
    {
        var allowedOrigins =
            builder.Configuration
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


// ======================================================
// CONTROLADORES
// ======================================================

builder.Services.AddControllers();


// ======================================================
// SWAGGER
// ======================================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
    var hasUsers = await context.Usuarios.AnyAsync();
    var bootstrapUsername = builder.Configuration["Authentication:BootstrapUsername"];
    var bootstrapPassword = builder.Configuration["Authentication:BootstrapPassword"];
    if (!hasUsers && !string.IsNullOrWhiteSpace(bootstrapUsername) && !string.IsNullOrWhiteSpace(bootstrapPassword))
    {
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

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = exception?.Message ?? "Error interno del servidor."
        });
    });
});


// ======================================================
// ARCHIVOS DEL CRM
// ======================================================

app.UseDefaultFiles();
app.UseStaticFiles();


// ======================================================
// SWAGGER
// ======================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// ======================================================
// CORS
// ======================================================

app.UseCors("CRM");


// ======================================================
// HTTPS
// ======================================================
//
// En Development NO hacemos redirección HTTPS,
// porque ngrok se conectará mediante HTTPS desde Internet
// y enviará la petición a nuestro HTTP local:
// http://localhost:49988
//
// En producción sí obligamos HTTPS.
//

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}


// ======================================================
// AUTORIZACIÓN
// ======================================================

app.UseAuthentication();
app.UseAuthorization();


// ======================================================
// CONTROLADORES
// ======================================================

app.MapControllers();


// ======================================================
// PRUEBA DE LA API
// ======================================================

app.MapGet("/api", () =>
{
    return Results.Ok(new
    {
        sistema = "CRM HPD",
        estado = "OK",
        version = "1.0",
        mensaje = "API funcionando correctamente"
    });
});

app.MapGet("/api/integraciones/estado", (IConfiguration configuration) =>
{
    bool TieneValor(string key) =>
        !string.IsNullOrWhiteSpace(configuration[key]);

    return Results.Ok(new
    {
        api = "OK",
        cloudinary = new
        {
            cloudName = TieneValor("Cloudinary:CloudName"),
            apiKey = TieneValor("Cloudinary:ApiKey"),
            apiSecret = TieneValor("Cloudinary:ApiSecret"),
            uploadPreset = TieneValor("Cloudinary:UploadPreset")
        },
        whatsapp = new
        {
            verifyToken = TieneValor("WhatsApp:WebhookVerifyToken"),
            accessToken = TieneValor("WhatsApp:AccessToken"),
            phoneNumberId = TieneValor("WhatsApp:PhoneNumberId"),
            businessAccountId = TieneValor("WhatsApp:BusinessAccountId"),
            apiVersion = configuration["WhatsApp:ApiVersion"] ?? "v25.0",
            sendMessagesToMeta =
                bool.TryParse(configuration["WhatsApp:SendMessagesToMeta"], out var enabled) &&
                enabled
        }
    });
}).RequireAuthorization();


// ======================================================
// INICIAR APLICACIÓN
// ======================================================

app.Run();
