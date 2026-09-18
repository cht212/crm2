using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CRM.Data.Services;

public partial class WhatsAppService
{
// =========================================================
// OBTENER CONVERSACIÓN
// =========================================================

public async Task<object?> ObtenerConversacionAsync(
    long conversacionId,
    int? usuarioAsignadoId = null,
    bool incluirDisponiblesParaTomar = false)
{
    IQueryable<Conversacion> query =
        _context.Conversaciones
            .AsNoTracking()
            .Include(c => c.Cliente)
            .Include(c => c.UsuarioAsignado)
            .Where(c => c.nConversacion == conversacionId);

    if (usuarioAsignadoId.HasValue)
    {
        query = query.Where(c =>
            c.nUsuarioAsignado == usuarioAsignadoId.Value ||
            (incluirDisponiblesParaTomar &&
             !c.nUsuarioAsignado.HasValue &&
             (c.cEstado == "NUEVO" ||
              c.cEstado == "ABIERTO" ||
              c.cEstado == "EN_ATENCION")));
    }

    var conversacion = await query.FirstOrDefaultAsync();

    if (conversacion == null)
    {
        return null;
    }

    var mensajes =
        await _context.Mensajes
            .AsNoTracking()
            .Where(m =>
                m.nConversacion == conversacionId)
            .OrderBy(m => m.dFecha)
            .ToListAsync();

    return new
    {
        id = conversacion.nConversacion,

        cliente = new
        {
            id = conversacion.Cliente.nCliente,

            nombre =
                conversacion.Cliente.cNombre,

            telefono =
                conversacion.Cliente.cTelefono,

            email =
                conversacion.Cliente.cEmail,

            documento =
                conversacion.Cliente.cDocumento,

            fotoPerfilUrl =
                conversacion.Cliente.cFotoPerfilUrl
        },

        estado =
            conversacion.cEstado,

        usuarioAsignado =
            conversacion.UsuarioAsignado == null
                ? null
                : new
                {
                    id =
                        conversacion.UsuarioAsignado.nUsuario,

                    usuario =
                        conversacion.UsuarioAsignado.cUsuario,

                    nombre =
                        conversacion.UsuarioAsignado.cNombre
                },

        fechaCreacion =
            conversacion.dFechaInicio,

        ultimoMensaje =
            conversacion.dUltimoMensaje,

        ultimoMensajeCliente =
            conversacion.dUltimoMensajeCliente,

        bot = new
        {
            estado = conversacion.cBotEstado,
            pausadoDesde = conversacion.dBotPausadoDesde,
            pausadoPor = conversacion.nBotPausadoPor
        },

        canal = conversacion.cCanal,

        requiereAsignacion =
            !conversacion.nUsuarioAsignado.HasValue &&
            conversacion.cEstado is "NUEVO" or "ABIERTO" or "EN_ATENCION",

        mensajes =
            mensajes.Select(m => new
            {
                id = m.nMensaje,

                whatsappId =
                    m.cWhatsappId,

                canal =
                    m.cCanal,

                externalId =
                    m.cExternalId,

                direccion =
                    m.cDireccion,

                tipo =
                    m.cTipo,

                estado =
                    m.cEstado,

                mensaje =
                    m.cMensaje,

                fecha =
                    m.dFecha
            })
    };
}

// =========================================================
// TODAS LAS CONVERSACIONES
// =========================================================

public async Task<object> ObtenerTodasConversacionesAsync(
    int? usuarioAsignadoId = null,
    bool incluirDisponiblesParaTomar = false)
{
    IQueryable<Conversacion> query =
        _context.Conversaciones
            .AsNoTracking()
            .Include(c => c.Cliente)
            .Include(c => c.UsuarioAsignado);

    if (usuarioAsignadoId.HasValue)
    {
        query = query.Where(c =>
            c.nUsuarioAsignado == usuarioAsignadoId.Value ||
            (incluirDisponiblesParaTomar &&
             !c.nUsuarioAsignado.HasValue &&
             (c.cEstado == "NUEVO" ||
              c.cEstado == "ABIERTO" ||
              c.cEstado == "EN_ATENCION")));
    }

    var conversaciones =
        await query
            .OrderByDescending(
                c => c.dUltimoMensaje)
            .Select(c => new
            {
                id =
                    c.nConversacion,

                clienteId =
                    c.nCliente,

                telefono =
                    c.Cliente.cTelefono,

                nombre =
                    c.Cliente.cNombre,

                fotoPerfilUrl =
                    c.Cliente.cFotoPerfilUrl,

                estado =
                    c.cEstado,

                botEstado =
                    c.cBotEstado,

                canal =
                    c.cCanal,

                usuarioAsignadoId =
                    c.nUsuarioAsignado,

                usuarioAsignado =
                    c.UsuarioAsignado == null
                        ? null
                        : c.UsuarioAsignado.cNombre,

                requiereAsignacion =
                    !c.nUsuarioAsignado.HasValue &&
                    (c.cEstado == "NUEVO" || c.cEstado == "ABIERTO" || c.cEstado == "EN_ATENCION"),

                ultimoMensaje =
                    c.dUltimoMensaje,

                ultimoMensajeCliente =
                    c.dUltimoMensajeCliente,

                requiereAtencion =
                    c.dUltimoMensajeCliente != null &&
                    (
                        !c.Mensajes.Any(m =>
                            m.cDireccion == 'S' &&
                            m.cTipo != "bot") ||
                        c.dUltimoMensajeCliente >
                        c.Mensajes
                            .Where(m =>
                                m.cDireccion == 'S' &&
                                m.cTipo != "bot")
                            .Max(m => (DateTime?)m.dFecha)
                    )
            })
            .ToListAsync();

    return conversaciones;
}
}
