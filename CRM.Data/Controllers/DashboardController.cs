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

        var porAsesor = await _context.Usuarios
            .AsNoTracking()
            .Where(u => u.cEstado == 'A')
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
        if (usuarioId.HasValue && !_access.TieneAccesoGlobal && _access.UsuarioActualId != usuarioId.Value)
        {
            return Forbid();
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
}
