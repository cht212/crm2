using CRM.Data.Extensions;
using CRM.Data.Startup;

var builder = WebApplication.CreateBuilder(args);

// El proveedor EventLog que ASP.NET Core agrega por defecto en Windows puede
// impedir el arranque desde Visual Studio cuando la cuenta actual no tiene
// permisos sobre la fuente ".NET Runtime". Consola y Debug cubren tanto la
// ventana de salida de Visual Studio como los logs del proceso desplegado.
builder.Logging.ClearProviders();
builder.Logging.AddConfiguration(builder.Configuration.GetSection("Logging"));
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddCrmDatabase(builder.Configuration);
builder.Services.AddCrmApplicationServices();
builder.Services.AddCrmCookieAuthentication(builder.Environment);
builder.Services.AddCrmCors(builder.Configuration);
builder.Services.AddCrmRateLimiting();
builder.Services.AddCrmForwardedHeaders(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

await DatabaseInitializer.InitializeAsync(app.Services, builder.Configuration, app.Logger);

app.UseForwardedHeaders();
app.UseCrmExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseCrmSecurityHeaders();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/uploads"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (context.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            context.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            context.Context.Response.Headers["Pragma"] = "no-cache";
            context.Context.Response.Headers["Expires"] = "0";
            return;
        }

        var cacheDuration = TimeSpan.FromDays(7);
        context.Context.Response.Headers["Cache-Control"] = $"public, max-age={(int)cacheDuration.TotalSeconds}";
        context.Context.Response.Headers["Vary"] = "Accept-Encoding";
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CRM");
app.UseCrmRequestSecurity();

// En local/ngrok no redirigimos a HTTPS porque el tunel ya entra por HTTPS.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.Run();
