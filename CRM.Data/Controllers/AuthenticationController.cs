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

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(item =>
            item.cUsuario == dto.Usuario.Trim() && item.cEstado == 'A');
        if (usuario == null || string.IsNullOrWhiteSpace(usuario.cPasswordHash))
        {
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

        var result = _hasher.VerifyHashedPassword(usuario, usuario.cPasswordHash, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
        }

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

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        autenticado = true,
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