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
                m.nConversacion == conversacionId &&
                m.cTipo != "comment" &&
                m.cTipo != "comment_reply")
            .OrderBy(m => m.dFecha)
            .ToListAsync();
    var mensajesPorExternalId = mensajes
        .Where(m => !string.IsNullOrWhiteSpace(m.cExternalId))
        .GroupBy(m => m.cExternalId!, StringComparer.Ordinal)
        .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

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

        mensajes = mensajes.Select(m =>
        {
            mensajesPorExternalId.TryGetValue(m.cReplyToExternalId ?? string.Empty, out var mensajeRespondido);
            return new
            {
                id = m.nMensaje,

                whatsappId =
                    m.cWhatsappId,

                canal =
                    m.cCanal,

                externalId =
                    m.cExternalId,

                replyToExternalId =
                    m.cReplyToExternalId,

                respuestaA = mensajeRespondido == null
                    ? null
                    : new
                    {
                        id = mensajeRespondido.nMensaje,
                        direccion = mensajeRespondido.cDireccion,
                        tipo = mensajeRespondido.cTipo,
                        mensaje = mensajeRespondido.cMensaje
                    },

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
            };
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
            .Include(c => c.UsuarioAsignado)
            .Where(c => c.Mensajes.Any(m =>
                m.cTipo != "comment" &&
                m.cTipo != "comment_reply"));

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
                    c.Mensajes
                        .Where(m => m.cTipo != "comment" && m.cTipo != "comment_reply")
                        .Max(m => (DateTime?)m.dFecha),

                ultimoMensajeTexto =
                    c.Mensajes
                        .Where(m => m.cTipo != "comment" && m.cTipo != "comment_reply")
                        .OrderByDescending(m => m.dFecha)
                        .ThenByDescending(m => m.nMensaje)
                        .Select(m => m.cMensaje)
                        .FirstOrDefault(),

                ultimoMensajeTipo =
                    c.Mensajes
                        .Where(m => m.cTipo != "comment" && m.cTipo != "comment_reply")
                        .OrderByDescending(m => m.dFecha)
                        .ThenByDescending(m => m.nMensaje)
                        .Select(m => m.cTipo)
                        .FirstOrDefault(),

                ultimoMensajeDireccion =
                    c.Mensajes
                        .Where(m => m.cTipo != "comment" && m.cTipo != "comment_reply")
                        .OrderByDescending(m => m.dFecha)
                        .ThenByDescending(m => m.nMensaje)
                        .Select(m => (char?)m.cDireccion)
                        .FirstOrDefault(),

                ultimoMensajeCliente =
                    c.Mensajes
                        .Where(m =>
                            m.cDireccion == 'E' &&
                            m.cTipo != "comment" &&
                            m.cTipo != "comment_reply")
                        .Max(m => (DateTime?)m.dFecha),

                requiereAtencion =
                    c.Mensajes.Any(m =>
                        m.cDireccion == 'E' &&
                        m.cTipo != "comment" &&
                        m.cTipo != "comment_reply") &&
                    (
                        !c.Mensajes.Any(m =>
                            m.cDireccion == 'S' &&
                            m.cTipo != "bot" &&
                            m.cTipo != "comment" &&
                            m.cTipo != "comment_reply") ||
                        c.Mensajes
                            .Where(m =>
                                m.cDireccion == 'E' &&
                                m.cTipo != "comment" &&
                                m.cTipo != "comment_reply")
                            .Max(m => (DateTime?)m.dFecha) >
                        c.Mensajes
                            .Where(m =>
                                m.cDireccion == 'S' &&
                                m.cTipo != "bot" &&
                                m.cTipo != "comment" &&
                                m.cTipo != "comment_reply")
                            .Max(m => (DateTime?)m.dFecha)
                    )
            })
            .ToListAsync();

    return conversaciones;
}
}
