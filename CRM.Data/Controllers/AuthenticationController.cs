using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Security.Claims;
using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticationController : ControllerBase
{
    // Estado compartido por todas las instancias mediante SQL Server.
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
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Usuario) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { success = false, message = "Usuario y contraseña son obligatorios." });
        }

        var claveIntento = Convert.ToHexString(SHA256.HashData(
            Encoding.UTF8.GetBytes(dto.Usuario.Trim().ToUpperInvariant())));
        var estado = await _context.LoginAttempts.AsNoTracking().FirstOrDefaultAsync(x => x.Key == claveIntento);
        if (estado?.BlockedUntilUtc > DateTime.UtcNow)
        {
            var minutosRestantes = Math.Ceiling((estado.BlockedUntilUtc.Value - DateTime.UtcNow).TotalMinutes);
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
            await RegistrarIntentoFallidoAsync(claveIntento);
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        var result = _hasher.VerifyHashedPassword(usuario, usuario.cPasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            await RegistrarIntentoFallidoAsync(claveIntento);
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        await _context.LoginAttempts.Where(x => x.Key == claveIntento).ExecuteDeleteAsync();

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

    private async Task RegistrarIntentoFallidoAsync(string key)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var attempt = await _context.LoginAttempts
            .FromSqlInterpolated($"SELECT * FROM crm_login_attempt WITH (UPDLOCK, HOLDLOCK) WHERE c_key = {key}")
            .SingleOrDefaultAsync();
        var now = DateTime.UtcNow;
        if (attempt == null)
        {
            attempt = new LoginAttempt { Key = key };
            _context.LoginAttempts.Add(attempt);
        }
        if (attempt.BlockedUntilUtc <= now || now - attempt.UpdatedUtc > TiempoBloqueo)
            attempt.Failures = 0;
        attempt.Failures++;
        attempt.BlockedUntilUtc = attempt.Failures >= MaxIntentos ? now.Add(TiempoBloqueo) : null;
        attempt.UpdatedUtc = now;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
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
