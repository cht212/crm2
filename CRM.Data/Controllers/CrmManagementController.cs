using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text;
using CRM.Data.Data;
using CRM.Data.Models;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/crm")]
[Authorize(Roles = "Administrador,Supervisor,Asesor")]
[EnableRateLimiting("api")]
public class CrmManagementController : ControllerBase
{
    private static readonly string[] EstadosConversacionPermitidos =
    {
        "NUEVO",
        "ABIERTO",
        "EN_ATENCION",
        "ESPERANDO_CLIENTE",
        "COTIZACION_ENVIADA",
        "CERRADO",
        "PERDIDO",
        "NO_RESPONDIO"
    };

    private readonly CrmDbContext _context;
    private readonly IPasswordHasher<CrmUsuario> _hasher;
    private readonly WhatsAppService _whatsappService;
    private readonly AuditoriaService _auditoria;
    private readonly MetaGraphApiService _metaGraph;
    private readonly CrmAccessService _access;

    public CrmManagementController(
        CrmDbContext context,
        IPasswordHasher<CrmUsuario> hasher,
        WhatsAppService whatsappService,
        AuditoriaService auditoria,
        MetaGraphApiService metaGraph,
        CrmAccessService access)
    {
        _context = context;
        _hasher = hasher;
        _whatsappService = whatsappService;
        _auditoria = auditoria;
        _metaGraph = metaGraph;
        _access = access;
    }

    private int? UsuarioActualId =>
        int.TryParse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet("contactos")]
    public async Task<IActionResult> Contactos(
        [FromQuery] string? search = null,
        [FromQuery] string? canal = null,
        [FromQuery] int? usuarioId = null,
        [FromQuery] int? etiquetaId = null)
    {
        var query = _access.FiltrarClientes(_context.Clientes.AsNoTracking());
        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim();
            query = query.Where(cliente =>
                cliente.cNombre.Contains(search) ||
                cliente.cTelefono.Contains(search) ||
                (cliente.cEmail != null && cliente.cEmail.Contains(search)) ||
                (cliente.cDocumento != null && cliente.cDocumento.Contains(search)) ||
                cliente.Conversaciones.Any(conversacion =>
                    conversacion.cCanal.Contains(search) ||
                    (conversacion.UsuarioAsignado != null && conversacion.UsuarioAsignado.cNombre.Contains(search))) ||
                _context.ClienteEtiquetas.Any(clienteEtiqueta =>
                    clienteEtiqueta.nCliente == cliente.nCliente &&
                    clienteEtiqueta.Etiqueta.cNombre.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(canal) && !canal.Equals("TODOS", StringComparison.OrdinalIgnoreCase))
        {
            var canalNormalizado = CanalSocial.Normalizar(canal);
            query = query.Where(cliente =>
                cliente.cCanalOrigen == canalNormalizado ||
                cliente.Conversaciones.Any(conversacion => conversacion.cCanal == canalNormalizado));
        }

        if (usuarioId.HasValue)
        {
            if (_access.TieneAccesoGlobal)
            {
                query = query.Where(cliente =>
                    cliente.Conversaciones.Any(conversacion => conversacion.nUsuarioAsignado == usuarioId.Value));
            }
        }

        if (etiquetaId.HasValue)
        {
            query = query.Where(cliente =>
                _context.ClienteEtiquetas.Any(clienteEtiqueta =>
                    clienteEtiqueta.nCliente == cliente.nCliente &&
                    clienteEtiqueta.nEtiqueta == etiquetaId.Value));
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
                fotoPerfilUrl = cliente.cFotoPerfilUrl,
                estado = cliente.cEstado,
                canalOrigen = cliente.cCanalOrigen,
                etiquetas = _context.ClienteEtiquetas
                    .Where(clienteEtiqueta => clienteEtiqueta.nCliente == cliente.nCliente)
                    .Select(clienteEtiqueta => new
                    {
                        id = clienteEtiqueta.nEtiqueta,
                        nombre = clienteEtiqueta.Etiqueta.cNombre,
                        color = clienteEtiqueta.Etiqueta.cColor
                    })
                    .ToList(),
                conversaciones = cliente.Conversaciones.Count,
                ultimaConversacionId = cliente.Conversaciones
                    .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
                    .Select(conversacion => (long?)conversacion.nConversacion)
                    .FirstOrDefault(),
                ultimoMensaje = cliente.Conversaciones
                    .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
                    .Select(conversacion => conversacion.dUltimoMensaje)
                    .FirstOrDefault()
            })
            .Take(200)
            .ToListAsync();

        return Ok(result);
    }
    [HttpPost("contactos")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> CrearContacto([FromBody] ContactoDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var nombre = dto.Nombre?.Trim();
        var telefono = dto.Telefono?.Trim();
        if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(telefono))
        {
            return BadRequest("Nombre y teléfono son obligatorios.");
        }

        if (await _context.Clientes.AnyAsync(cliente => cliente.cTelefono == telefono))
        {
            return Conflict("Ya existe un contacto con ese teléfono.");
        }

        var clienteNuevo = new Cliente
        {
            cNombre = nombre,
            cTelefono = telefono,
            cEmail = dto.Email,
            cDocumento = dto.Documento,
            cCanalOrigen = CanalSocial.WhatsApp,
            dFechaRegistro = DateTime.Now,
            cEstado = 'A'
        };

        _context.Clientes.Add(clienteNuevo);
        await _context.SaveChangesAsync();

        long? conversacionInicialId = null;
        if (_access.EsAsesor && UsuarioActualId.HasValue)
        {
            var conversacionInicial = new Conversacion
            {
                nCliente = clienteNuevo.nCliente,
                nUsuarioAsignado = UsuarioActualId.Value,
                cEstado = "EN_ATENCION",
                cCanal = CanalSocial.WhatsApp,
                cExternalThreadId = clienteNuevo.cTelefono,
                cBotEstado = "PAUSADO",
                dFechaInicio = DateTime.Now,
                dUltimoMensaje = DateTime.Now,
                dBotPausadoDesde = DateTime.Now,
                nBotPausadoPor = UsuarioActualId.Value
            };

            _context.Conversaciones.Add(conversacionInicial);
            await _context.SaveChangesAsync();
            conversacionInicialId = conversacionInicial.nConversacion;
        }

        await _auditoria.RegistrarAsync("Cliente", clienteNuevo.nCliente, "CREACION", null,
            $"{clienteNuevo.cNombre} / {clienteNuevo.cTelefono}", UsuarioActualId);

        return Ok(new
        {
            success = true,
            id = clienteNuevo.nCliente,
            nombre = clienteNuevo.cNombre,
            telefono = clienteNuevo.cTelefono,
            conversacionId = conversacionInicialId
        });
    }

    [HttpPost("contactos/{id:long}/conversaciones")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> CrearConversacionContacto(long id)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado.");
        }

        if (!_access.TieneAccesoGlobal && !await _access.PuedeAccederClienteAsync(id))
        {
            return Forbid();
        }

        var conversacionAbierta = await _context.Conversaciones
            .Where(conversacion =>
                conversacion.nCliente == id &&
                (conversacion.cEstado == "NUEVO" ||
                 conversacion.cEstado == "ABIERTO" ||
                 conversacion.cEstado == "EN_ATENCION"))
            .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
            .FirstOrDefaultAsync();

        if (conversacionAbierta != null)
        {
            return Ok(new { success = true, id = conversacionAbierta.nConversacion, existente = true });
        }

        var nuevaConversacion = new Conversacion
        {
            nCliente = id,
            nUsuarioAsignado = UsuarioActualId,
            cEstado = UsuarioActualId.HasValue ? "EN_ATENCION" : "NUEVO",
            cCanal = cliente.cCanalOrigen,
            cExternalThreadId = cliente.cTelefono,
            cBotEstado = "PAUSADO",
            dFechaInicio = DateTime.Now,
            dUltimoMensaje = DateTime.Now,
            dBotPausadoDesde = DateTime.Now,
            nBotPausadoPor = UsuarioActualId
        };

        _context.Conversaciones.Add(nuevaConversacion);
        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Conversacion", nuevaConversacion.nConversacion, "CREACION_MANUAL", null,
            $"Cliente {cliente.cNombre}", UsuarioActualId);

        return Ok(new { success = true, id = nuevaConversacion.nConversacion, existente = false });
    }

    // Antes traía TODAS las conversaciones sin límite: con volumen real
    // esto se vuelve lento y pesado para el navegador. Ahora pagina y
    // permite filtrar por estado.
    [HttpGet("pipeline")]
    public async Task<IActionResult> Pipeline(
        [FromQuery] string? estado = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 50 : pageSize;

        var query = _access.FiltrarConversaciones(_context.Conversaciones.AsNoTracking());
        if (!string.IsNullOrWhiteSpace(estado))
        {
            query = query.Where(c => c.cEstado == estado.Trim().ToUpperInvariant());
        }

        var total = await query.CountAsync();

        var items = await query
            .Include(conversacion => conversacion.Cliente)
            .Include(conversacion => conversacion.UsuarioAsignado)
            .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(conversacion => new
            {
                id = conversacion.nConversacion,
                estado = conversacion.cEstado,
                canal = conversacion.cCanal,
                cliente = new
                {
                    id = conversacion.Cliente.nCliente,
                    nombre = conversacion.Cliente.cNombre,
                    telefono = conversacion.Cliente.cTelefono,
                    fotoPerfilUrl = conversacion.Cliente.cFotoPerfilUrl
                },
                asesor = conversacion.UsuarioAsignado == null
                    ? null
                    : conversacion.UsuarioAsignado.cNombre,
                ultimoMensaje = conversacion.dUltimoMensaje,
                inicio = conversacion.dFechaInicio
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
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

    [HttpPut("usuarios/{id:int}/password")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> CambiarPassword(int id, [FromBody] CambiarPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8)
        {
            return BadRequest("La contraseña debe tener al menos 8 caracteres.");
        }

        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
        {
            return NotFound("Usuario no encontrado.");
        }

        usuario.cPasswordHash = _hasher.HashPassword(usuario, dto.Password);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("conversaciones/{id:long}/estado")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> CambiarEstado(long id, [FromBody] EstadoDto dto)
    {
        var estado = (dto.Estado ?? string.Empty).Trim().ToUpperInvariant();
        if (!EstadosConversacionPermitidos.Contains(estado))
        {
            return BadRequest("Estado no válido.");
        }

        var conversacion = await _context.Conversaciones.FindAsync(id);
        if (conversacion == null)
        {
            return NotFound("Conversación no encontrada.");
        }

        if (!await _access.PuedeAccederConversacionAsync(id))
        {
            return Forbid();
        }

        var estadoAnterior = conversacion.cEstado;
        conversacion.cEstado = estado;
        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Conversacion", id, "CAMBIO_ESTADO", estadoAnterior, estado, UsuarioActualId);
        return Ok(new { success = true, id, estado });
    }

    [HttpPut("conversaciones/{id:long}/tomar")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> TomarConversacion(long id)
    {
        if (!UsuarioActualId.HasValue)
        {
            return Unauthorized();
        }

        var conversacion = await _context.Conversaciones.FindAsync(id);
        if (conversacion == null)
        {
            return NotFound("Conversación no encontrada.");
        }

        if (!_access.TieneAccesoGlobal &&
            conversacion.nUsuarioAsignado.HasValue &&
            conversacion.nUsuarioAsignado != UsuarioActualId)
        {
            return Forbid();
        }

        var asignadoAnterior = conversacion.nUsuarioAsignado?.ToString() ?? "sin asignar";
        var estadoAnterior = conversacion.cEstado;

        conversacion.nUsuarioAsignado = UsuarioActualId.Value;
        if (conversacion.cEstado is "NUEVO" or "ABIERTO")
        {
            conversacion.cEstado = "EN_ATENCION";
        }

        conversacion.cBotEstado = "PAUSADO";
        conversacion.dBotPausadoDesde = DateTime.Now;
        conversacion.nBotPausadoPor = UsuarioActualId.Value;

        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Conversacion", id, "TOMADA", asignadoAnterior,
            UsuarioActualId.Value.ToString(), UsuarioActualId);

        if (estadoAnterior != conversacion.cEstado)
        {
            await _auditoria.RegistrarAsync("Conversacion", id, "CAMBIO_ESTADO", estadoAnterior,
                conversacion.cEstado, UsuarioActualId);
        }

        return Ok(new
        {
            success = true,
            id,
            usuarioId = UsuarioActualId.Value,
            estado = conversacion.cEstado
        });
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

        var asignadoAnterior = conversacion.nUsuarioAsignado?.ToString() ?? "sin asignar";
        conversacion.nUsuarioAsignado = dto.UsuarioId;
        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Conversacion", id, "REASIGNACION", asignadoAnterior,
            dto.UsuarioId?.ToString() ?? "sin asignar", UsuarioActualId);
        return Ok(new { success = true, id, usuarioId = dto.UsuarioId });
    }

    [HttpPost("conversaciones/{id:long}/actualizar-perfil-meta")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> ActualizarPerfilMeta(long id)
    {
        var conversacion = await _context.Conversaciones
            .Include(item => item.Cliente)
            .FirstOrDefaultAsync(item => item.nConversacion == id);

        if (conversacion == null)
        {
            return NotFound("Conversación no encontrada.");
        }

        if (!await _access.PuedeAccederConversacionAsync(id))
        {
            return Forbid();
        }

        if (conversacion.cCanal is not (CanalSocial.Facebook or CanalSocial.Instagram))
        {
            return BadRequest("Esta acción solo aplica para Facebook e Instagram.");
        }

        var externalId = conversacion.cExternalThreadId ?? conversacion.Cliente.cTelefono;
        var result = await _metaGraph.ObtenerPerfilContactoDetalladoAsync(conversacion.cCanal, externalId);
        if (!result.Success || result.Profile == null)
        {
            return Ok(new
            {
                success = false,
                updated = false,
                error = result.Error,
                configuredPageId = result.ConfiguredPageId,
                webhookPageId = result.WebhookPageId
            });
        }

        var nombre = result.Profile.DisplayName ?? result.Profile.Username;
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return Ok(new
            {
                success = false,
                updated = false,
                error = "Meta devolvió el perfil, pero sin nombre visible."
            });
        }

        var nombreAnterior = conversacion.Cliente.cNombre;
        conversacion.Cliente.cNombre = nombre.Trim();
        if (!string.IsNullOrWhiteSpace(result.Profile.ProfilePictureUrl))
        {
            conversacion.Cliente.cFotoPerfilUrl = result.Profile.ProfilePictureUrl.Trim();
        }
        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync(
            "Cliente",
            conversacion.Cliente.nCliente,
            "ACTUALIZACION_PERFIL_META",
            nombreAnterior,
            conversacion.Cliente.cNombre,
            UsuarioActualId);

        return Ok(new
        {
            success = true,
            updated = true,
            clienteId = conversacion.Cliente.nCliente,
            nombre = conversacion.Cliente.cNombre,
            fotoPerfilUrl = conversacion.Cliente.cFotoPerfilUrl
        });
    }

    // =========================================================
    // ASIGNAR PENDIENTES (BACKFILL)
    // =========================================================
    //
    // Reparte de una sola vez todas las conversaciones NUEVO/
    // ABIERTO que quedaron "Sin asignar" (por ejemplo, las que ya
    // existían antes de activar el reparto automático). De ahí en
    // adelante, cada mensaje nuevo de un cliente se asigna solo.
    //
    // =========================================================

    [HttpPost("conversaciones/asignar-pendientes")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> AsignarPendientes()
    {
        var cantidad = await _whatsappService.AsignarConversacionesPendientesAsync();
        return Ok(new { success = true, asignadas = cantidad });
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

        var datosAnteriores = $"{cliente.cNombre} / {cliente.cTelefono} / {cliente.cEmail}";
        if (!string.IsNullOrWhiteSpace(dto.Nombre)) cliente.cNombre = dto.Nombre.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Telefono)) cliente.cTelefono = dto.Telefono.Trim();
        cliente.cEmail = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        cliente.cDocumento = string.IsNullOrWhiteSpace(dto.Documento) ? null : dto.Documento.Trim();
        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Cliente", id, "EDICION", datosAnteriores,
            $"{cliente.cNombre} / {cliente.cTelefono} / {cliente.cEmail}", UsuarioActualId);
        return Ok(new { success = true, id = cliente.nCliente });
    }

    [HttpGet("actividad")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> Actividad(
        [FromQuery] string? entidad = null,
        [FromQuery] long? entidadId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 50 : pageSize;

        var query = _context.ActividadLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entidad)) query = query.Where(a => a.cEntidad == entidad);
        if (entidadId.HasValue) query = query.Where(a => a.nEntidadId == entidadId.Value);

        var total = await query.CountAsync();
        var items = await query
            .Include(a => a.Usuario)
            .OrderByDescending(a => a.dFecha)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                id = a.nActividad,
                entidad = a.cEntidad,
                entidadId = a.nEntidadId,
                accion = a.cAccion,
                anterior = a.cValorAnterior,
                nuevo = a.cValorNuevo,
                usuario = a.Usuario == null ? "sistema" : a.Usuario.cNombre,
                fecha = a.dFecha
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("contactos/exportar")]
    public async Task<IActionResult> ExportarContactos(
        [FromQuery] string? search = null,
        [FromQuery] string? canal = null,
        [FromQuery] int? usuarioId = null,
        [FromQuery] int? etiquetaId = null)
    {
        var query = _access.FiltrarClientes(_context.Clientes.AsNoTracking());
        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim();
            query = query.Where(cliente =>
                cliente.cNombre.Contains(search) ||
                cliente.cTelefono.Contains(search) ||
                (cliente.cEmail != null && cliente.cEmail.Contains(search)) ||
                (cliente.cDocumento != null && cliente.cDocumento.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(canal) && !canal.Equals("TODOS", StringComparison.OrdinalIgnoreCase))
        {
            var canalNormalizado = CanalSocial.Normalizar(canal);
            query = query.Where(cliente => cliente.cCanalOrigen == canalNormalizado || cliente.Conversaciones.Any(c => c.cCanal == canalNormalizado));
        }

        if (usuarioId.HasValue && _access.TieneAccesoGlobal) query = query.Where(cliente => cliente.Conversaciones.Any(c => c.nUsuarioAsignado == usuarioId.Value));
        if (etiquetaId.HasValue) query = query.Where(cliente => _context.ClienteEtiquetas.Any(ce => ce.nCliente == cliente.nCliente && ce.nEtiqueta == etiquetaId.Value));

        var filas = await query
            .OrderBy(cliente => cliente.cNombre)
            .Select(cliente => new string?[]
            {
                cliente.cNombre,
                cliente.cTelefono,
                cliente.cEmail,
                cliente.cDocumento,
                cliente.cCanalOrigen,
                cliente.Conversaciones.Count.ToString(),
                cliente.Conversaciones.OrderByDescending(c => c.dUltimoMensaje).Select(c => c.dUltimoMensaje).FirstOrDefault().ToString()
            })
            .ToListAsync();

        return CsvFile("contactos-crm.csv", new[] { "Nombre", "Telefono", "Email", "Documento", "Canal", "Conversaciones", "Ultima actividad" }, filas);
    }

    [HttpGet("comentarios")]
    [Authorize(Roles = "Administrador,Supervisor,Asesor")]
    public async Task<IActionResult> Comentarios([FromQuery] string? canal = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 100 : pageSize;

        var query = _access.FiltrarMensajes(_context.Mensajes.AsNoTracking())
            .Where(mensaje => mensaje.cTipo == "comment");
        if (!string.IsNullOrWhiteSpace(canal) && !canal.Equals("TODOS", StringComparison.OrdinalIgnoreCase))
        {
            var canalNormalizado = CanalSocial.Normalizar(canal);
            query = query.Where(mensaje => mensaje.cCanal == canalNormalizado);
        }

        var total = await query.CountAsync();
        var items = await query
            .Include(mensaje => mensaje.Conversacion)
            .ThenInclude(conversacion => conversacion.Cliente)
            .OrderByDescending(mensaje => mensaje.dFecha)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(mensaje => new
            {
                id = mensaje.nMensaje,
                canal = mensaje.cCanal,
                texto = (string?)mensaje.cMensaje,
                estado = mensaje.cEstado,
                fecha = mensaje.dFecha,
                externalId = mensaje.cExternalId,
                conversacionId = mensaje.nConversacion,
                cliente = new
                {
                    id = mensaje.Conversacion.Cliente.nCliente,
                    nombre = mensaje.Conversacion.Cliente.cNombre,
                    telefono = mensaje.Conversacion.Cliente.cTelefono
                }
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("fallos")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> Fallos([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 100 : pageSize;

        var mensajesFallidos = _context.Mensajes
            .AsNoTracking()
            .Where(mensaje => mensaje.cEstado != null &&
                (mensaje.cEstado.Contains("FALLIDO") || mensaje.cEstado.Contains("ERROR") || mensaje.cEstado.Contains("LOCAL")))
            .Select(mensaje => new
            {
                tipo = "Mensaje",
                id = mensaje.nMensaje,
                canal = mensaje.cCanal,
                detalle = mensaje.cEstado,
                texto = (string?)mensaje.cMensaje,
                fecha = mensaje.dFecha,
                conversacionId = (long?)mensaje.nConversacion
            });

        var eventosFallidos = _context.ActividadLogs
            .AsNoTracking()
            .Where(log => log.cEntidad == "Integracion" || log.cAccion.Contains("WEBHOOK") || log.cAccion.Contains("ERROR"))
            .Select(log => new
            {
                tipo = log.cEntidad,
                id = log.nActividad,
                canal = log.cAccion,
                detalle = log.cValorNuevo,
                texto = log.cValorAnterior,
                fecha = log.dFecha,
                conversacionId = (long?)null
            });

        var query = mensajesFallidos.Concat(eventosFallidos);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(item => item.fecha).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }
    [HttpGet("reportes/resumen")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> ReporteResumen(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] int? usuarioId = null)
    {
        var fechaDesde = desde?.Date;
        var fechaHasta = hasta?.Date;
        var fechaHastaExclusiva = fechaHasta?.AddDays(1);

        var clientesQuery = _context.Clientes.AsNoTracking().AsQueryable();
        if (fechaDesde.HasValue) clientesQuery = clientesQuery.Where(cliente => cliente.dFechaRegistro >= fechaDesde.Value);
        if (fechaHastaExclusiva.HasValue) clientesQuery = clientesQuery.Where(cliente => cliente.dFechaRegistro < fechaHastaExclusiva.Value);

        var conversacionesQuery = _context.Conversaciones.AsNoTracking().AsQueryable();
        if (fechaDesde.HasValue) conversacionesQuery = conversacionesQuery.Where(conversacion => conversacion.dFechaInicio >= fechaDesde.Value);
        if (fechaHastaExclusiva.HasValue) conversacionesQuery = conversacionesQuery.Where(conversacion => conversacion.dFechaInicio < fechaHastaExclusiva.Value);
        if (usuarioId.HasValue) conversacionesQuery = conversacionesQuery.Where(conversacion => conversacion.nUsuarioAsignado == usuarioId.Value);

        var mensajesQuery = _context.Mensajes.AsNoTracking().AsQueryable();
        if (fechaDesde.HasValue) mensajesQuery = mensajesQuery.Where(mensaje => mensaje.dFecha >= fechaDesde.Value);
        if (fechaHastaExclusiva.HasValue) mensajesQuery = mensajesQuery.Where(mensaje => mensaje.dFecha < fechaHastaExclusiva.Value);
        if (usuarioId.HasValue) mensajesQuery = mensajesQuery.Where(mensaje => mensaje.Conversacion.nUsuarioAsignado == usuarioId.Value);

        var oportunidadesQuery = _context.Oportunidades.AsNoTracking().AsQueryable();
        if (fechaDesde.HasValue) oportunidadesQuery = oportunidadesQuery.Where(oportunidad => oportunidad.dFechaCreacion >= fechaDesde.Value);
        if (fechaHastaExclusiva.HasValue) oportunidadesQuery = oportunidadesQuery.Where(oportunidad => oportunidad.dFechaCreacion < fechaHastaExclusiva.Value);
        if (usuarioId.HasValue) oportunidadesQuery = oportunidadesQuery.Where(oportunidad => oportunidad.nUsuarioAsignado == usuarioId.Value);

        var tareasQuery = _context.Tareas.AsNoTracking().AsQueryable();
        if (fechaDesde.HasValue) tareasQuery = tareasQuery.Where(tarea => tarea.dFechaCreacion >= fechaDesde.Value);
        if (fechaHastaExclusiva.HasValue) tareasQuery = tareasQuery.Where(tarea => tarea.dFechaCreacion < fechaHastaExclusiva.Value);
        if (usuarioId.HasValue) tareasQuery = tareasQuery.Where(tarea => tarea.nAsignadoA == usuarioId.Value);

        var porEstado = await conversacionesQuery
            .GroupBy(conversacion => conversacion.cEstado)
            .Select(grupo => new { estado = grupo.Key, cantidad = grupo.Count() })
            .ToListAsync();

        var totalClientes = await clientesQuery.CountAsync();
        var totalMensajes = await mensajesQuery.CountAsync();
        var mensajesEntrantes = await mensajesQuery.CountAsync(mensaje => mensaje.cDireccion == 'E');
        var mensajesSalientes = await mensajesQuery.CountAsync(mensaje => mensaje.cDireccion == 'S');
        var oportunidadesPorEtapa = await oportunidadesQuery
            .GroupBy(oportunidad => oportunidad.cEtapa)
            .Select(grupo => new
            {
                etapa = grupo.Key,
                cantidad = grupo.Count(),
                montoTotal = grupo.Sum(oportunidad => oportunidad.nMonto)
            })
            .ToListAsync();
        var tareasPendientes = await tareasQuery.CountAsync(tarea => tarea.cEstado == "PENDIENTE");
        var tareasVencidas = await tareasQuery
            .CountAsync(tarea => tarea.cEstado == "PENDIENTE" && tarea.dFechaVencimiento < DateTime.Now);
        var tareasCompletadas = await tareasQuery.CountAsync(tarea => tarea.cEstado == "COMPLETADA");
        var ventasGanadas = oportunidadesPorEtapa
            .Where(item => item.etapa == "GANADA")
            .Sum(item => item.montoTotal);
        var ventasAbiertas = oportunidadesPorEtapa
            .Where(item => item.etapa is not "GANADA" and not "PERDIDA")
            .Sum(item => item.montoTotal);
        var totalConversaciones = porEstado.Sum(item => item.cantidad);
        var oportunidadesAbiertas = oportunidadesPorEtapa
            .Where(item => item.etapa is not "GANADA" and not "PERDIDA")
            .Sum(item => item.cantidad);
        var oportunidadesGanadas = oportunidadesPorEtapa
            .Where(item => item.etapa == "GANADA")
            .Sum(item => item.cantidad);
        var oportunidadesPerdidas = oportunidadesPorEtapa
            .Where(item => item.etapa == "PERDIDA")
            .Sum(item => item.cantidad);

        var usuarios = await _context.Usuarios
            .AsNoTracking()
            .Where(usuario => usuario.cEstado == 'A')
            .Select(usuario => new
            {
                usuarioId = usuario.nUsuario,
                nombre = usuario.cNombre,
                rol = usuario.cRol
            })
            .ToListAsync();

        var conversacionesActivasPorAsesor = await _context.Conversaciones
            .AsNoTracking()
            .Where(conversacion =>
                conversacion.nUsuarioAsignado.HasValue &&
                conversacion.cEstado != "CERRADO" &&
                conversacion.cEstado != "PERDIDO" &&
                conversacion.cEstado != "NO_RESPONDIO")
            .GroupBy(conversacion => conversacion.nUsuarioAsignado!.Value)
            .Select(grupo => new { usuarioId = grupo.Key, conversacionesActivas = grupo.Count() })
            .ToListAsync();

        var tareasPorAsesor = await _context.Tareas
            .AsNoTracking()
            .Where(tarea => tarea.nAsignadoA.HasValue && tarea.cEstado == "PENDIENTE")
            .GroupBy(tarea => tarea.nAsignadoA!.Value)
            .Select(grupo => new
            {
                usuarioId = grupo.Key,
                tareasPendientes = grupo.Count(),
                tareasVencidas = grupo.Count(tarea => tarea.dFechaVencimiento < DateTime.Now)
            })
            .ToListAsync();

        var oportunidadesPorAsesor = await _context.Oportunidades
            .AsNoTracking()
            .Where(oportunidad =>
                oportunidad.nUsuarioAsignado.HasValue &&
                oportunidad.cEtapa != "GANADA" &&
                oportunidad.cEtapa != "PERDIDA")
            .GroupBy(oportunidad => oportunidad.nUsuarioAsignado!.Value)
            .Select(grupo => new
            {
                usuarioId = grupo.Key,
                oportunidadesAbiertas = grupo.Count(),
                montoAbierto = grupo.Sum(oportunidad => oportunidad.nMonto)
            })
            .ToListAsync();

        var cargaAsesores = usuarios
            .Select(usuario =>
            {
                var conversacionesActivas = conversacionesActivasPorAsesor
                    .FirstOrDefault(item => item.usuarioId == usuario.usuarioId)?.conversacionesActivas ?? 0;
                var tareas = tareasPorAsesor
                    .FirstOrDefault(item => item.usuarioId == usuario.usuarioId);
                var oportunidades = oportunidadesPorAsesor
                    .FirstOrDefault(item => item.usuarioId == usuario.usuarioId);

                return new
                {
                    usuario.usuarioId,
                    usuario.nombre,
                    usuario.rol,
                    conversacionesActivas,
                    tareasPendientes = tareas?.tareasPendientes ?? 0,
                    tareasVencidas = tareas?.tareasVencidas ?? 0,
                    oportunidadesAbiertas = oportunidades?.oportunidadesAbiertas ?? 0,
                    montoAbierto = oportunidades?.montoAbierto ?? 0m,
                    cargaTotal = conversacionesActivas + (tareas?.tareasPendientes ?? 0) + (oportunidades?.oportunidadesAbiertas ?? 0)
                };
            })
            .OrderByDescending(item => item.cargaTotal)
            .ThenBy(item => item.nombre)
            .ToList();

        var clientesPorCanal = await clientesQuery
            .GroupBy(cliente => cliente.cCanalOrigen)
            .Select(grupo => new { canal = grupo.Key, cantidad = grupo.Count() })
            .ToListAsync();
        var conversacionesPorCanal = await conversacionesQuery
            .GroupBy(conversacion => conversacion.cCanal)
            .Select(grupo => new { canal = grupo.Key, cantidad = grupo.Count() })
            .ToListAsync();
        var mensajesPorCanal = await mensajesQuery
            .GroupBy(mensaje => mensaje.cCanal)
            .Select(grupo => new
            {
                canal = grupo.Key,
                interacciones = grupo.Count(),
                entrantes = grupo.Count(mensaje => mensaje.cDireccion == 'E'),
                salientes = grupo.Count(mensaje => mensaje.cDireccion == 'S')
            })
            .ToListAsync();

        var canales = CanalSocial.Soportados.Select(canal =>
        {
            var mensajesCanal = mensajesPorCanal.FirstOrDefault(item => item.canal == canal);
            return new
            {
                canal,
                nombre = canal switch
                {
                    CanalSocial.Instagram => "Instagram",
                    CanalSocial.Facebook => "Facebook",
                    CanalSocial.TikTok => "TikTok",
                    _ => "WhatsApp"
                },
                conectado = canal == CanalSocial.WhatsApp,
                clientes = clientesPorCanal.FirstOrDefault(item => item.canal == canal)?.cantidad ?? 0,
                conversaciones = conversacionesPorCanal.FirstOrDefault(item => item.canal == canal)?.cantidad ?? 0,
                interacciones = mensajesCanal?.interacciones ?? 0,
                entrantes = mensajesCanal?.entrantes ?? 0,
                salientes = mensajesCanal?.salientes ?? 0,
                oportunidades = canal == CanalSocial.WhatsApp
                    ? oportunidadesAbiertas + oportunidadesGanadas + oportunidadesPerdidas
                    : 0,
                montoAbierto = canal == CanalSocial.WhatsApp ? ventasAbiertas : 0m,
                montoGanado = canal == CanalSocial.WhatsApp ? ventasGanadas : 0m,
                tareasPendientes = canal == CanalSocial.WhatsApp ? tareasPendientes : 0,
                tareasVencidas = canal == CanalSocial.WhatsApp ? tareasVencidas : 0
            };
        }).ToArray();

        return Ok(new
        {
            clientes = totalClientes,
            conversaciones = totalConversaciones,
            mensajes = totalMensajes,
            entrantes = mensajesEntrantes,
            salientes = mensajesSalientes,
            canales,
            porEstado,
            filtros = new
            {
                desde = fechaDesde,
                hasta = fechaHasta,
                usuarioId
            },
            cargaAsesores,
            tareas = new
            {
                pendientes = tareasPendientes,
                vencidas = tareasVencidas,
                completadas = tareasCompletadas
            },
            oportunidades = new
            {
                abiertas = oportunidadesAbiertas,
                ganadas = oportunidadesGanadas,
                perdidas = oportunidadesPerdidas,
                montoAbierto = ventasAbiertas,
                montoGanado = ventasGanadas,
                porEtapa = oportunidadesPorEtapa
            }
        });
    }

    [HttpGet("reportes/exportar")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> ExportarReporte(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] int? usuarioId = null)
    {
        var resumen = await ReporteResumen(desde, hasta, usuarioId) as OkObjectResult;
        if (resumen?.Value == null)
        {
            return BadRequest("No se pudo generar el reporte.");
        }

        var json = System.Text.Json.JsonSerializer.Serialize(resumen.Value);
        using var document = System.Text.Json.JsonDocument.Parse(json);
        var root = document.RootElement;
        var filas = new List<string?[]>
        {
            new[] { "Clientes", root.GetProperty("clientes").ToString() },
            new[] { "Conversaciones", root.GetProperty("conversaciones").ToString() },
            new[] { "Mensajes", root.GetProperty("mensajes").ToString() },
            new[] { "Entrantes", root.GetProperty("entrantes").ToString() },
            new[] { "Salientes", root.GetProperty("salientes").ToString() }
        };

        if (root.TryGetProperty("tareas", out var tareas))
        {
            filas.Add(new[] { "Tareas pendientes", tareas.GetProperty("pendientes").ToString() });
            filas.Add(new[] { "Tareas vencidas", tareas.GetProperty("vencidas").ToString() });
            filas.Add(new[] { "Tareas completadas", tareas.GetProperty("completadas").ToString() });
        }

        if (root.TryGetProperty("oportunidades", out var oportunidades))
        {
            filas.Add(new[] { "Oportunidades abiertas", oportunidades.GetProperty("abiertas").ToString() });
            filas.Add(new[] { "Oportunidades ganadas", oportunidades.GetProperty("ganadas").ToString() });
            filas.Add(new[] { "Oportunidades perdidas", oportunidades.GetProperty("perdidas").ToString() });
            filas.Add(new[] { "Monto abierto", oportunidades.GetProperty("montoAbierto").ToString() });
            filas.Add(new[] { "Monto ganado", oportunidades.GetProperty("montoGanado").ToString() });
        }

        return CsvFile("reporte-crm.csv", new[] { "Metrica", "Valor" }, filas);
    }

    private static IActionResult CsvFile(string fileName, string[] headers, IEnumerable<string?[]> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine(string.Join(",", headers.Select(EscapeCsv)));
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsv)));
        }

        return new FileContentResult(Encoding.UTF8.GetBytes(builder.ToString()), "text/csv; charset=utf-8")
        {
            FileDownloadName = fileName
        };
    }

    private static string EscapeCsv(string? value) => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";
}

public sealed class EstadoDto
{
    [Required]
    public string? Estado { get; set; }
}

public sealed class AsignacionDto
{
    public int? UsuarioId { get; set; }
}

public sealed class ContactoDto
{
    private string? _email;
    private string? _documento;

    [StringLength(150)]
    public string? Nombre { get; set; }

    [StringLength(30)]
    public string? Telefono { get; set; }

    [EmailAddress(ErrorMessage = "El correo no tiene un formato válido.")]
    [StringLength(150)]
    public string? Email
    {
        get => _email;
        set => _email = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    [StringLength(20)]
    public string? Documento
    {
        get => _documento;
        set => _documento = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public sealed class CrearUsuarioDto
{
    [Required(ErrorMessage = "El usuario es obligatorio.")]
    [StringLength(50)]
    public string? Usuario { get; set; }

    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(150)]
    public string? Nombre { get; set; }

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres.")]
    public string? Password { get; set; }

    [Required(ErrorMessage = "El rol es obligatorio.")]
    public string? Rol { get; set; }
}

public sealed class CambiarPasswordDto
{
    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres.")]
    public string? Password { get; set; }
}
