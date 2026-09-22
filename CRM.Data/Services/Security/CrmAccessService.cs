using System.Security.Claims;
using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Services;

public sealed class CrmAccessService
{
    private readonly CrmDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CrmAccessService(CrmDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public int? UsuarioActualId =>
        int.TryParse(
            _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id)
            ? id
            : null;

    public bool EsAsesor =>
        _httpContextAccessor.HttpContext?.User.IsInRole("Asesor") == true;

    public bool TieneAccesoGlobal =>
        _httpContextAccessor.HttpContext?.User.IsInRole("Administrador") == true ||
        _httpContextAccessor.HttpContext?.User.IsInRole("Supervisor") == true;

    public bool PuedeGestionarUsuarios =>
        _httpContextAccessor.HttpContext?.User.IsInRole("Administrador") == true;

    public bool PuedeVerDashboard =>
        TieneAccesoGlobal || EsAsesor;

    public bool PuedeAccederModulo(string modulo)
    {
        if (string.IsNullOrWhiteSpace(modulo))
        {
            return false;
        }

        var moduloNormalizado = modulo.Trim().ToLowerInvariant();

        if (TieneAccesoGlobal)
        {
            return moduloNormalizado switch
            {
                "dashboard" or "inbox" or "contactos" or "tareas" or "pipeline" or "ventas" or
                "campanas" or "automatizacion" or "agenda" or "alertas" or "reportes" or "comentarios" or
                "actividad" or "fallos" or "bot" or "conexiones" => true,
                "usuarios" => PuedeGestionarUsuarios,
                _ => false
            };
        }

        return moduloNormalizado switch
        {
            "inbox" or "contactos" or "tareas" or "pipeline" or "comentarios" => true,
            _ => false
        };
    }

    public static bool EsConversacionDisponibleParaAsesor(Conversacion conversacion) =>
        !conversacion.nUsuarioAsignado.HasValue &&
        conversacion.cEstado is "NUEVO" or "ABIERTO" or "EN_ATENCION";

    public IQueryable<Conversacion> FiltrarConversaciones(IQueryable<Conversacion> query)
    {
        if (TieneAccesoGlobal)
        {
            return query;
        }

        return UsuarioActualId.HasValue
            ? query.Where(conversacion =>
                conversacion.nUsuarioAsignado == UsuarioActualId.Value ||
                (!conversacion.nUsuarioAsignado.HasValue &&
                 (conversacion.cEstado == "NUEVO" ||
                  conversacion.cEstado == "ABIERTO" ||
                  conversacion.cEstado == "EN_ATENCION")))
            : query.Where(_ => false);
    }

    public IQueryable<Cliente> FiltrarClientes(IQueryable<Cliente> query)
    {
        if (TieneAccesoGlobal)
        {
            return query;
        }

        return UsuarioActualId.HasValue
            ? query.Where(cliente =>
                cliente.Conversaciones.Any(conversacion =>
                    conversacion.nUsuarioAsignado == UsuarioActualId.Value ||
                    (!conversacion.nUsuarioAsignado.HasValue &&
                     (conversacion.cEstado == "NUEVO" ||
                      conversacion.cEstado == "ABIERTO" ||
                      conversacion.cEstado == "EN_ATENCION"))))
            : query.Where(_ => false);
    }

    public IQueryable<Mensaje> FiltrarMensajes(IQueryable<Mensaje> query)
    {
        if (TieneAccesoGlobal)
        {
            return query;
        }

        return UsuarioActualId.HasValue
            ? query.Where(mensaje =>
                mensaje.Conversacion.nUsuarioAsignado == UsuarioActualId.Value)
            : query.Where(_ => false);
    }

    public IQueryable<Oportunidad> FiltrarOportunidades(IQueryable<Oportunidad> query)
    {
        if (TieneAccesoGlobal)
        {
            return query;
        }

        return UsuarioActualId.HasValue
            ? query.Where(oportunidad =>
                oportunidad.nUsuarioAsignado == UsuarioActualId.Value ||
                (oportunidad.nConversacion.HasValue &&
                 oportunidad.Conversacion != null &&
                 oportunidad.Conversacion.nUsuarioAsignado == UsuarioActualId.Value) ||
                oportunidad.Cliente.Conversaciones.Any(conversacion =>
                    conversacion.nUsuarioAsignado == UsuarioActualId.Value))
            : query.Where(_ => false);
    }

    public IQueryable<Tarea> FiltrarTareas(IQueryable<Tarea> query)
    {
        if (TieneAccesoGlobal)
        {
            return query;
        }

        return UsuarioActualId.HasValue
            ? query.Where(tarea =>
                tarea.nAsignadoA == UsuarioActualId.Value ||
                (tarea.nConversacion.HasValue &&
                 tarea.Conversacion != null &&
                 tarea.Conversacion.nUsuarioAsignado == UsuarioActualId.Value) ||
                (tarea.nCliente.HasValue &&
                 tarea.Cliente != null &&
                 tarea.Cliente.Conversaciones.Any(conversacion =>
                     conversacion.nUsuarioAsignado == UsuarioActualId.Value)))
            : query.Where(_ => false);
    }

    public async Task<bool> PuedeAccederConversacionAsync(long conversacionId)
    {
        return await FiltrarConversaciones(_context.Conversaciones.AsNoTracking())
            .AnyAsync(conversacion => conversacion.nConversacion == conversacionId);
    }

    public async Task<bool> PuedeAccederClienteAsync(long clienteId)
    {
        return await FiltrarClientes(_context.Clientes.AsNoTracking())
            .AnyAsync(cliente => cliente.nCliente == clienteId);
    }

    public async Task<bool> PuedeAccederOportunidadAsync(long oportunidadId)
    {
        return await FiltrarOportunidades(_context.Oportunidades.AsNoTracking())
            .AnyAsync(oportunidad => oportunidad.nOportunidad == oportunidadId);
    }

    public async Task<bool> PuedeAccederTareaAsync(long tareaId)
    {
        return await FiltrarTareas(_context.Tareas.AsNoTracking())
            .AnyAsync(tarea => tarea.nTarea == tareaId);
    }
}
