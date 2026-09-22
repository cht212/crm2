using CRM.Data.Extensions;
using CRM.Data.Startup;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCrmDatabase(builder.Configuration);
builder.Services.AddCrmApplicationServices();
builder.Services.AddCrmCookieAuthentication(builder.Environment);
builder.Services.AddCrmCors(builder.Configuration);
builder.Services.AddCrmRateLimiting();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

await DatabaseInitializer.InitializeAsync(app.Services, builder.Configuration);

app.UseCrmExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseCrmSecurityHeaders();
app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CRM");
app.UseRateLimiter();
app.UseCrmRequestSecurity();

// En local/ngrok no redirigimos a HTTPS porque el tunel ya entra por HTTPS.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
