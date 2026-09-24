using CRM.Data.Data;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Administrador,Supervisor,Asesor")]
[EnableRateLimiting("api")]
public class DashboardController : ControllerBase
{
    private readonly CrmDbContext _context;
    private readonly CrmAccessService _access;

    public DashboardController(CrmDbContext context, CrmAccessService access)
    {
        _context = context;
        _access = access;
    }

    [HttpGet("ejecutivo")]
    public async Task<IActionResult> Ejecutivo([FromQuery] int? usuarioId = null)
    {
        var usuarioActualId = _access.UsuarioActualId;

        if (!_access.TieneAccesoGlobal)
        {
            if (!usuarioActualId.HasValue)
            {
                return Forbid();
            }

            usuarioId = usuarioActualId.Value;
        }

        if (usuarioId.HasValue)
        {
            if (!_access.TieneAccesoGlobal && usuarioActualId != usuarioId.Value)
            {
                return Forbid();
            }

            var existeUsuario = await _context.Usuarios
                .AsNoTracking()
                .AnyAsync(u => u.nUsuario == usuarioId.Value && u.cEstado == 'A');

            if (!existeUsuario)
            {
                return NotFound("El usuario seleccionado no existe o no está activo.");
            }
        }

        int? filtroUsuario = usuarioId;
        var hoy = DateTime.Now.Date;

        var clientesQuery = _context.Clientes.AsNoTracking().AsQueryable();
        if (filtroUsuario.HasValue)
        {
            clientesQuery = clientesQuery.Where(c => c.Conversaciones.Any(conv => conv.nUsuarioAsignado == filtroUsuario.Value));
        }

        var conversacionesQuery = _context.Conversaciones.AsNoTracking().AsQueryable();
        if (filtroUsuario.HasValue)
        {
            conversacionesQuery = conversacionesQuery.Where(c => c.nUsuarioAsignado == filtroUsuario.Value);
        }

        var tareasQuery = _context.Tareas.AsNoTracking().AsQueryable();
        if (filtroUsuario.HasValue)
        {
            tareasQuery = tareasQuery.Where(t => t.nAsignadoA == filtroUsuario.Value);
        }

        var oportunidadesQuery = _context.Oportunidades.AsNoTracking().AsQueryable();
        if (filtroUsuario.HasValue)
        {
            oportunidadesQuery = oportunidadesQuery.Where(o => o.nUsuarioAsignado == filtroUsuario.Value);
        }

        var clientesNuevos = await clientesQuery.CountAsync(c => c.dFechaRegistro >= hoy);
        var conversacionesAbiertas = await conversacionesQuery.CountAsync(c => c.cEstado != "CERRADO" && c.cEstado != "PERDIDO" && c.cEstado != "NO_RESPONDIO");
        var tareasPendientes = await tareasQuery.CountAsync(t => t.cEstado == "PENDIENTE");
        var tareasVencidas = await tareasQuery.CountAsync(t => t.cEstado == "PENDIENTE" && t.dFechaVencimiento < DateTime.Now);
        var oportunidadesAbiertas = await oportunidadesQuery.CountAsync(o => o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA");
        var oportunidadesGanadas = await oportunidadesQuery.CountAsync(o => o.cEtapa == "GANADA");
        var montoTotalPendiente = await oportunidadesQuery.Where(o => o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA").SumAsync(o => (decimal?)o.nMonto) ?? 0m;
        var montoTotalGanado = await oportunidadesQuery.Where(o => o.cEtapa == "GANADA").SumAsync(o => (decimal?)o.nMonto) ?? 0m;

        var asesoresQuery = _context.Usuarios
            .AsNoTracking()
            .Where(u => u.cEstado == 'A');

        if (filtroUsuario.HasValue)
        {
            asesoresQuery = asesoresQuery.Where(u => u.nUsuario == filtroUsuario.Value);
        }

        var porAsesor = await asesoresQuery
            .Select(u => new
            {
                usuarioId = u.nUsuario,
                nombre = u.cNombre,
                rol = u.cRol,
                conversaciones = _context.Conversaciones.Count(c => c.nUsuarioAsignado == u.nUsuario && c.cEstado != "CERRADO" && c.cEstado != "PERDIDO" && c.cEstado != "NO_RESPONDIO"),
                tareasPendientes = _context.Tareas.Count(t => t.nAsignadoA == u.nUsuario && t.cEstado == "PENDIENTE"),
                oportunidadesAbiertas = _context.Oportunidades.Count(o => o.nUsuarioAsignado == u.nUsuario && o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA"),
                montoEnPipeline = _context.Oportunidades.Where(o => o.nUsuarioAsignado == u.nUsuario && o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA").Sum(o => (decimal?)o.nMonto) ?? 0m
            })
            .OrderByDescending(x => x.montoEnPipeline)
            .ToListAsync();

        var resumen = new
        {
            filtroUsuario,
            clientesNuevos,
            conversacionesAbiertas,
            tareasPendientes,
            tareasVencidas,
            oportunidadesAbiertas,
            oportunidadesGanadas,
            montoTotalPendiente,
            montoTotalGanado,
            porAsesor
        };

        return Ok(resumen);
    }

    [HttpGet("carga-asesores")]
    public async Task<IActionResult> CargaAsesores([FromQuery] int? usuarioId = null)
    {
        if (!_access.TieneAccesoGlobal)
        {
            if (!_access.UsuarioActualId.HasValue)
            {
                return Forbid();
            }

            usuarioId = _access.UsuarioActualId.Value;
        }

        var asesoresQuery = _context.Usuarios
            .AsNoTracking()
            .Where(u => u.cEstado == 'A' && (u.cRol == "Asesor" || u.cRol == "Supervisor"));

        if (usuarioId.HasValue)
        {
            asesoresQuery = asesoresQuery.Where(u => u.nUsuario == usuarioId.Value);
        }

        var asesores = await asesoresQuery
            .OrderBy(u => u.cNombre)
            .Select(u => new
            {
                usuarioId = u.nUsuario,
                nombre = u.cNombre,
                rol = u.cRol,
                conversacionesActivas = _context.Conversaciones.Count(c => c.nUsuarioAsignado == u.nUsuario && c.cEstado != "CERRADO" && c.cEstado != "PERDIDO" && c.cEstado != "NO_RESPONDIO"),
                tareasPendientes = _context.Tareas.Count(t => t.nAsignadoA == u.nUsuario && t.cEstado == "PENDIENTE"),
                tareasVencidas = _context.Tareas.Count(t => t.nAsignadoA == u.nUsuario && t.cEstado == "PENDIENTE" && t.dFechaVencimiento < DateTime.Now),
                oportunidadesAbiertas = _context.Oportunidades.Count(o => o.nUsuarioAsignado == u.nUsuario && o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA"),
                montoAbierto = _context.Oportunidades.Where(o => o.nUsuarioAsignado == u.nUsuario && o.cEtapa != "GANADA" && o.cEtapa != "PERDIDA").Sum(o => (decimal?)o.nMonto) ?? 0m,
                clientesAsignados = _context.Clientes.Count(c => c.Conversaciones.Any(conv => conv.nUsuarioAsignado == u.nUsuario))
            })
            .ToListAsync();

        var items = asesores
            .Select(item => new
            {
                item.usuarioId,
                item.nombre,
                item.rol,
                item.conversacionesActivas,
                item.tareasPendientes,
                item.tareasVencidas,
                item.oportunidadesAbiertas,
                item.montoAbierto,
                item.clientesAsignados,
                cargaTotal = item.conversacionesActivas + item.tareasPendientes + item.oportunidadesAbiertas
            })
            .OrderByDescending(item => item.cargaTotal)
            .ThenBy(item => item.nombre)
            .ToList();

        return Ok(new
        {
            total = items.Count,
            usuarioId = usuarioId,
            items
        });
    }

    [HttpGet("hoy")]
    public async Task<IActionResult> Hoy([FromQuery] int? usuarioId = null)
    {
        var usuarioActualId = _access.UsuarioActualId;
        if (!_access.TieneAccesoGlobal)
        {
            if (!usuarioActualId.HasValue)
            {
                return Forbid();
            }

            usuarioId = usuarioActualId.Value;
        }

        if (usuarioId.HasValue && !await _context.Usuarios.AsNoTracking()
                .AnyAsync(usuario => usuario.nUsuario == usuarioId.Value && usuario.cEstado == 'A'))
        {
            return NotFound("El usuario seleccionado no existe o no está activo.");
        }

        var ahora = DateTime.Now;
        var inicioHoy = ahora.Date;
        var inicioManana = inicioHoy.AddDays(1);
        var limiteOportunidades = inicioHoy.AddDays(7);
        var limiteFuturo = inicioManana;

        var clientesQuery = _access.FiltrarClientes(_context.Clientes.AsNoTracking());
        var conversacionesQuery = _access.FiltrarConversaciones(_context.Conversaciones.AsNoTracking());
        var tareasQuery = _access.FiltrarTareas(_context.Tareas.AsNoTracking());
        var oportunidadesQuery = _access.FiltrarOportunidades(_context.Oportunidades.AsNoTracking());

        if (usuarioId.HasValue && _access.TieneAccesoGlobal)
        {
            clientesQuery = clientesQuery.Where(cliente => cliente.Conversaciones.Any(conversacion => conversacion.nUsuarioAsignado == usuarioId.Value));
            conversacionesQuery = conversacionesQuery.Where(conversacion => conversacion.nUsuarioAsignado == usuarioId.Value);
            tareasQuery = tareasQuery.Where(tarea => tarea.nAsignadoA == usuarioId.Value);
            oportunidadesQuery = oportunidadesQuery.Where(oportunidad => oportunidad.nUsuarioAsignado == usuarioId.Value);
        }

        var clientesNuevos = await clientesQuery
            .Where(cliente => cliente.dFechaRegistro >= inicioHoy)
            .OrderByDescending(cliente => cliente.dFechaRegistro)
            .Take(50)
            .Select(cliente => new
            {
                id = cliente.nCliente,
                nombre = cliente.cNombre,
                canal = cliente.cCanalOrigen,
                fecha = cliente.dFechaRegistro,
                conversacionId = cliente.Conversaciones
                    .OrderByDescending(conversacion => conversacion.dUltimoMensaje)
                    .Select(conversacion => (long?)conversacion.nConversacion)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var mensajesPendientes = await conversacionesQuery
            .Where(conversacion =>
                conversacion.cEstado != "CERRADO" &&
                conversacion.cEstado != "PERDIDO" &&
                conversacion.cEstado != "NO_RESPONDIO" &&
                conversacion.dUltimoMensajeCliente.HasValue &&
                (!conversacion.Mensajes.Any(mensaje => mensaje.cDireccion == 'S' && mensaje.cTipo != "bot") ||
                 conversacion.dUltimoMensajeCliente > conversacion.Mensajes
                    .Where(mensaje => mensaje.cDireccion == 'S' && mensaje.cTipo != "bot")
                    .Max(mensaje => (DateTime?)mensaje.dFecha)))
            .OrderByDescending(conversacion => conversacion.dUltimoMensajeCliente)
            .Take(50)
            .Select(conversacion => new
            {
                id = conversacion.nConversacion,
                clienteId = conversacion.nCliente,
                nombre = conversacion.Cliente.cNombre,
                canal = conversacion.cCanal,
                estado = conversacion.cEstado,
                fecha = conversacion.dUltimoMensajeCliente
            })
            .ToListAsync();

        var tareasHoy = await tareasQuery
            .Where(tarea => tarea.cEstado == "PENDIENTE" && tarea.dFechaVencimiento < inicioManana)
            .OrderBy(tarea => tarea.dFechaVencimiento)
            .Take(50)
            .Select(tarea => new
            {
                id = tarea.nTarea,
                titulo = tarea.cTitulo,
                vence = tarea.dFechaVencimiento,
                vencida = tarea.dFechaVencimiento < ahora,
                clienteId = tarea.nCliente,
                conversacionId = tarea.nConversacion,
                cliente = tarea.Cliente == null ? null : tarea.Cliente.cNombre
            })
            .ToListAsync();

        var oportunidadesAccion = await oportunidadesQuery
            .Where(oportunidad =>
                oportunidad.cEtapa != "GANADA" &&
                oportunidad.cEtapa != "PERDIDA" &&
                ((!oportunidad.dFechaActualizacion.HasValue || oportunidad.dFechaActualizacion < ahora.AddDays(-3)) ||
                 (oportunidad.dFechaCierreEstimada.HasValue && oportunidad.dFechaCierreEstimada <= limiteOportunidades) ||
                 oportunidad.cEtapa == "PROPUESTA" ||
                 oportunidad.cEtapa == "NEGOCIACION"))
            .OrderBy(oportunidad => oportunidad.dFechaCierreEstimada ?? DateTime.MaxValue)
            .ThenBy(oportunidad => oportunidad.dFechaActualizacion ?? oportunidad.dFechaCreacion)
            .Take(50)
            .Select(oportunidad => new
            {
                id = oportunidad.nOportunidad,
                titulo = oportunidad.cTitulo,
                etapa = oportunidad.cEtapa,
                monto = oportunidad.nMonto,
                moneda = oportunidad.cMoneda,
                clienteId = oportunidad.nCliente,
                conversacionId = oportunidad.nConversacion,
                cliente = oportunidad.Cliente.cNombre,
                fechaCierreEstimada = oportunidad.dFechaCierreEstimada
            })
            .ToListAsync();

        var tareasFuturas = await tareasQuery
            .Where(tarea => tarea.cEstado == "PENDIENTE" && tarea.dFechaVencimiento >= limiteFuturo)
            .OrderBy(tarea => tarea.dFechaVencimiento)
            .Take(50)
            .Select(tarea => new
            {
                id = tarea.nTarea,
                titulo = tarea.cTitulo,
                vence = tarea.dFechaVencimiento,
                clienteId = tarea.nCliente,
                conversacionId = tarea.nConversacion,
                cliente = tarea.Cliente == null ? null : tarea.Cliente.cNombre
            })
            .ToListAsync();

        return Ok(new
        {
            fecha = inicioHoy,
            usuarioId,
            hoy = new
            {
                clientesNuevos,
                mensajesPendientes,
                tareas = tareasHoy,
                oportunidades = oportunidadesAccion,
                total = clientesNuevos.Count + mensajesPendientes.Count + tareasHoy.Count + oportunidadesAccion.Count
            },
            futuro = new
            {
                tareas = tareasFuturas,
                total = tareasFuturas.Count
            }
        });
    }
}
