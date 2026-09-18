using System.Collections.Concurrent;
using System.Security.Claims;
using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticationController : ControllerBase
{
    // ---------------------------------------------------------------
    // Bloqueo simple de intentos fallidos (mitiga fuerza bruta).
    //
    // Es una solución en memoria: no persiste entre reinicios y no se
    // comparte entre instancias si en algún momento se escala a más de
    // un servidor. Para producción a mayor escala conviene moverlo a
    // una tabla o a un almacén distribuido (Redis), pero esto ya cubre
    // el caso de un único servidor, que es el escenario actual.
    // ---------------------------------------------------------------
    private static readonly ConcurrentDictionary<string, (int Intentos, DateTime BloqueadoHasta)> IntentosFallidos = new();
    private const int MaxIntentos = 5;
    private static readonly TimeSpan TiempoBloqueo = TimeSpan.FromMinutes(15);

    private readonly CrmDbContext _context;
    private readonly IPasswordHasher<CrmUsuario> _hasher;

    public AuthenticationController(CrmDbContext context, IPasswordHasher<CrmUsuario> hasher)
    {
        _context = context;
        _hasher = hasher;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Usuario) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { success = false, message = "Usuario y contraseña son obligatorios." });
        }

        var claveIntento = dto.Usuario.Trim().ToLowerInvariant();
        if (IntentosFallidos.TryGetValue(claveIntento, out var estado) && estado.BloqueadoHasta > DateTime.UtcNow)
        {
            var minutosRestantes = Math.Ceiling((estado.BloqueadoHasta - DateTime.UtcNow).TotalMinutes);
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                success = false,
                message = $"Demasiados intentos fallidos. Intenta de nuevo en {minutosRestantes} minuto(s)."
            });
        }

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(item =>
            item.cUsuario == dto.Usuario.Trim() && item.cEstado == 'A');
        if (usuario == null || string.IsNullOrWhiteSpace(usuario.cPasswordHash))
        {
            RegistrarIntentoFallido(claveIntento);
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        var result = _hasher.VerifyHashedPassword(usuario, usuario.cPasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            RegistrarIntentoFallido(claveIntento);
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        IntentosFallidos.TryRemove(claveIntento, out _);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.nUsuario.ToString()),
            new(ClaimTypes.Name, usuario.cNombre),
            new(ClaimTypes.Role, usuario.cRol)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = dto.Recordarme });

        return Ok(new { success = true, usuario = usuario.cNombre, rol = usuario.cRol });
    }

    private static void RegistrarIntentoFallido(string claveIntento)
    {
        IntentosFallidos.AddOrUpdate(
            claveIntento,
            _ => (1, DateTime.MinValue),
            (_, actual) =>
            {
                var intentos = actual.Intentos + 1;
                var bloqueadoHasta = intentos >= MaxIntentos ? DateTime.UtcNow.Add(TiempoBloqueo) : DateTime.MinValue;
                return (intentos, bloqueadoHasta);
            });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        autenticado = true,
        id = User.FindFirstValue(ClaimTypes.NameIdentifier),
        usuario = User.Identity?.Name,
        rol = User.FindFirstValue(ClaimTypes.Role)
    });

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { success = true });
    }
}

public sealed class LoginDto
{
    public string? Usuario { get; set; }
    public string? Password { get; set; }
    public bool Recordarme { get; set; }
}
