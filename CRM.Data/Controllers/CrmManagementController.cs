using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/crm")]
[Authorize(Roles = "Administrador,Supervisor,Asesor")]
public class CrmManagementController : ControllerBase
{
    private readonly CrmDbContext _context;
    private readonly IPasswordHasher<CrmUsuario> _hasher;

    public CrmManagementController(CrmDbContext context, IPasswordHasher<CrmUsuario> hasher)
    {
        _context = context;
        _hasher = hasher;
    }

    [HttpGet("contactos")]
    public async Task<IActionResult> Contactos([FromQuery] string? search = null)
    {
        var query = _context.Clientes.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim();
            query = query.Where(cliente =>
                cliente.cNombre.Contains(search) || cliente.cTelefono.Contains(search));
        }

        var result = await query
            .OrderByDescending(cliente => cliente.dFechaRegistro)
            .Select(cliente => new
            {
                id = cliente.nCliente,
                nombre = cliente.cNombre,
                telefono = cliente.cTelefono,
                email = cliente.cEmail,
                documento = cliente.cDocumento,
                estado = cliente.cEstado,
                conversaciones = cliente.Conversaciones.Count
            })
            .Take(200)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("pipeline")]
    public async Task<IActionResult> Pipeline()
    {
        var result = await _context.Conversaciones
            .AsNoTracking()
            .Include(conversacion => conversacion.Cliente)
            .Include(conversacion => conversacion.UsuarioAsignado)
            .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
            .Select(conversacion => new
            {
                id = conversacion.nConversacion,
                estado = conversacion.cEstado,
                cliente = new
                {
                    id = conversacion.Cliente.nCliente,
                    nombre = conversacion.Cliente.cNombre,
                    telefono = conversacion.Cliente.cTelefono
                },
                asesor = conversacion.UsuarioAsignado == null
                    ? null
                    : conversacion.UsuarioAsignado.cNombre,
                ultimoMensaje = conversacion.dUltimoMensaje,
                inicio = conversacion.dFechaInicio
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("usuarios")]
    public async Task<IActionResult> Usuarios()
    {
        var result = await _context.Usuarios
            .AsNoTracking()
            .Where(usuario => usuario.cEstado == 'A')
            .OrderBy(usuario => usuario.cNombre)
            .Select(usuario => new
            {
                id = usuario.nUsuario,
                usuario = usuario.cUsuario,
                nombre = usuario.cNombre,
                rol = usuario.cRol
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost("usuarios")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CrearUsuario([FromBody] CrearUsuarioDto dto)
    {
        var usuario = (dto.Usuario ?? string.Empty).Trim();
        var nombre = (dto.Nombre ?? string.Empty).Trim();
        var rol = (dto.Rol ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(nombre) ||
            string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Usuario, nombre y contraseña son obligatorios.");
        }

        if (!new[] { "Supervisor", "Asesor" }.Contains(rol, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest("El rol debe ser Supervisor o Asesor.");
        }

        if (await _context.Usuarios.AnyAsync(item => item.cUsuario == usuario))
        {
            return Conflict("El usuario ya existe.");
        }

        var nuevoUsuario = new CrmUsuario
        {
            cUsuario = usuario,
            cNombre = nombre,
            cEstado = 'A',
            cRol = rol.Equals("Supervisor", StringComparison.OrdinalIgnoreCase) ? "Supervisor" : "Asesor"
        };
        nuevoUsuario.cPasswordHash = _hasher.HashPassword(nuevoUsuario, dto.Password);
        _context.Usuarios.Add(nuevoUsuario);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = nuevoUsuario.nUsuario,
            usuario = nuevoUsuario.cUsuario,
            nombre = nuevoUsuario.cNombre,
            rol = nuevoUsuario.cRol
        });
    }

    [HttpPut("conversaciones/{id:long}/estado")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> CambiarEstado(long id, [FromBody] EstadoDto dto)
    {
        var estado = (dto.Estado ?? string.Empty).Trim().ToUpperInvariant();
        var estadosPermitidos = new[] { "NUEVO", "ABIERTO", "CERRADO", "PERDIDO" };
        if (!estadosPermitidos.Contains(estado))
        {
            return BadRequest("Estado no válido.");
        }

        var conversacion = await _context.Conversaciones.FindAsync(id);
        if (conversacion == null)
        {
            return NotFound("Conversación no encontrada.");
        }

        conversacion.cEstado = estado;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, id, estado });
    }

    [HttpPut("conversaciones/{id:long}/asignar")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> Asignar(long id, [FromBody] AsignacionDto dto)
    {
        var conversacion = await _context.Conversaciones.FindAsync(id);
        if (conversacion == null)
        {
            return NotFound("Conversación no encontrada.");
        }

        if (dto.UsuarioId.HasValue)
        {
            var existe = await _context.Usuarios.AnyAsync(usuario =>
                usuario.nUsuario == dto.UsuarioId.Value && usuario.cEstado == 'A');
            if (!existe)
            {
                return BadRequest("El asesor no existe o está inactivo.");
            }
        }

        conversacion.nUsuarioAsignado = dto.UsuarioId;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, id, usuarioId = dto.UsuarioId });
    }

    [HttpPut("contactos/{id:long}")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> ActualizarContacto(long id, [FromBody] ContactoDto dto)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Nombre)) cliente.cNombre = dto.Nombre.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Telefono)) cliente.cTelefono = dto.Telefono.Trim();
        cliente.cEmail = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        cliente.cDocumento = string.IsNullOrWhiteSpace(dto.Documento) ? null : dto.Documento.Trim();
        await _context.SaveChangesAsync();
        return Ok(new { success = true, id = cliente.nCliente });
    }

    [HttpGet("reportes/resumen")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> ReporteResumen()
    {
        var porEstado = await _context.Conversaciones
            .AsNoTracking()
            .GroupBy(conversacion => conversacion.cEstado)
            .Select(grupo => new { estado = grupo.Key, cantidad = grupo.Count() })
            .ToListAsync();

        var totalClientes = await _context.Clientes.AsNoTracking().CountAsync();
        var totalMensajes = await _context.Mensajes.AsNoTracking().CountAsync();
        var mensajesEntrantes = await _context.Mensajes.AsNoTracking()
            .CountAsync(mensaje => mensaje.cDireccion == 'E');
        var mensajesSalientes = await _context.Mensajes.AsNoTracking()
            .CountAsync(mensaje => mensaje.cDireccion == 'S');

        return Ok(new
        {
            clientes = totalClientes,
            conversaciones = porEstado.Sum(item => item.cantidad),
            mensajes = totalMensajes,
            entrantes = mensajesEntrantes,
            salientes = mensajesSalientes,
            porEstado
        });
    }
}

public sealed class EstadoDto
{
    public string? Estado { get; set; }
}

public sealed class AsignacionDto
{
    public int? UsuarioId { get; set; }
}

public sealed class ContactoDto
{
    public string? Nombre { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Documento { get; set; }
}

public sealed class CrearUsuarioDto
{
    public string? Usuario { get; set; }
    public string? Nombre { get; set; }
    public string? Password { get; set; }
    public string? Rol { get; set; }
}
