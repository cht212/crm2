using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Services;

public sealed class SocialInboundService
{
    private readonly CrmDbContext _context;
    private readonly BotSettingsService _botSettings;
    private readonly MetaMessagingService _metaMessaging;
    private readonly ILogger<SocialInboundService> _logger;

    public SocialInboundService(
        CrmDbContext context,
        BotSettingsService botSettings,
        MetaMessagingService metaMessaging,
        ILogger<SocialInboundService> logger)
    {
        _context = context;
        _botSettings = botSettings;
        _metaMessaging = metaMessaging;
        _logger = logger;
    }

    public async Task<long> RegistrarMensajeEntranteAsync(SocialInboundMessage input)
    {
        var canal = CanalSocial.Normalizar(input.Canal);
        var externalUserId = string.IsNullOrWhiteSpace(input.ExternalUserId)
            ? input.ContactValue
            : input.ExternalUserId.Trim();
        var contacto = string.IsNullOrWhiteSpace(input.ContactValue)
            ? externalUserId
            : input.ContactValue.Trim();
        var nombre = string.IsNullOrWhiteSpace(input.DisplayName)
            ? contacto
            : input.DisplayName.Trim();

        if (!string.IsNullOrWhiteSpace(input.ExternalMessageId))
        {
            var mensajeExistente = await _context.Mensajes
                .AsNoTracking()
                .Where(mensaje =>
                    mensaje.cCanal == canal &&
                    mensaje.cDireccion == 'E' &&
                    mensaje.cExternalId == input.ExternalMessageId)
                .Select(mensaje => (long?)mensaje.nConversacion)
                .FirstOrDefaultAsync();

            if (mensajeExistente.HasValue)
            {
                return mensajeExistente.Value;
            }
        }

        var cliente = await _context.Clientes
            .FirstOrDefaultAsync(item =>
                item.cCanalOrigen == canal &&
                item.cTelefono == contacto);

        if (cliente == null)
        {
            cliente = new Cliente
            {
                cNombre = nombre,
                cTelefono = contacto,
                cFotoPerfilUrl = NormalizeUrl(input.ProfilePictureUrl),
                cCanalOrigen = canal,
                cEstado = 'A',
                dFechaRegistro = DateTime.Now
            };
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();
        }
        else
        {
            var cambiado = false;
            if (DebeActualizarNombre(cliente.cNombre, nombre, contacto, canal))
            {
                cliente.cNombre = nombre;
                cambiado = true;
            }

            var foto = NormalizeUrl(input.ProfilePictureUrl);
            if (!string.IsNullOrWhiteSpace(foto) &&
                !foto.Equals(cliente.cFotoPerfilUrl, StringComparison.OrdinalIgnoreCase))
            {
                cliente.cFotoPerfilUrl = foto;
                cambiado = true;
            }

            if (cambiado)
            {
                await _context.SaveChangesAsync();
            }
        }

        var conversacion = await _context.Conversaciones
            .Where(item =>
                item.nCliente == cliente.nCliente &&
                item.cCanal == canal &&
                item.cExternalThreadId == externalUserId &&
                (item.cEstado == "NUEVO" ||
                 item.cEstado == "ABIERTO" ||
                 item.cEstado == "EN_ATENCION"))
            .OrderByDescending(item => item.dUltimoMensaje)
            .FirstOrDefaultAsync();

        var conversacionFueCreada = conversacion == null;

        if (conversacion == null)
        {
            conversacion = new Conversacion
            {
                nCliente = cliente.nCliente,
                cEstado = "NUEVO",
                cCanal = canal,
                cExternalThreadId = externalUserId,
                cBotEstado = canal is CanalSocial.Facebook or CanalSocial.Instagram
                    ? "ACTIVO"
                    : "PAUSADO",
                dFechaInicio = DateTime.Now,
                dUltimoMensaje = DateTime.Now,
                dUltimoMensajeCliente = DateTime.Now
            };

            _context.Conversaciones.Add(conversacion);
            await _context.SaveChangesAsync();
        }
        else
        {
            if (canal is CanalSocial.Facebook or CanalSocial.Instagram &&
                conversacion.cBotEstado == "PAUSADO" &&
                !conversacion.nBotPausadoPor.HasValue)
            {
                conversacion.cBotEstado = "ACTIVO";
                conversacion.dBotPausadoDesde = null;
            }

            conversacion.dUltimoMensaje = DateTime.Now;
            conversacion.dUltimoMensajeCliente = DateTime.Now;
        }

        var mensaje = new Mensaje
        {
            nConversacion = conversacion.nConversacion,
            cCanal = canal,
            cExternalId = input.ExternalMessageId,
            cWhatsappId = canal == CanalSocial.WhatsApp ? input.ExternalMessageId : null,
            cDireccion = 'E',
            cTipo = input.Type ?? "text",
            cEstado = "RECIBIDO",
            cMensaje = input.Text,
            dFecha = DateTime.Now
        };

        _context.Mensajes.Add(mensaje);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (!string.IsNullOrWhiteSpace(input.ExternalMessageId))
        {
            _context.Entry(mensaje).State = EntityState.Detached;

            var mensajeExistente = await _context.Mensajes
                .AsNoTracking()
                .Where(item =>
                    item.cCanal == canal &&
                    item.cDireccion == 'E' &&
                    item.cExternalId == input.ExternalMessageId)
                .Select(item => (long?)item.nConversacion)
                .FirstOrDefaultAsync();

            if (mensajeExistente.HasValue)
            {
                return mensajeExistente.Value;
            }

            throw;
        }

        var respuestaBot = await ObtenerRespuestaBotAsync(
            conversacion.nConversacion,
            conversacion.cBotEstado,
            conversacionFueCreada,
            mensaje.cTipo,
            mensaje.cMensaje);

        if (!string.IsNullOrWhiteSpace(respuestaBot))
        {
            await EnviarRespuestaBotMetaAsync(
                conversacion,
                canal,
                externalUserId,
                respuestaBot);
        }

        return conversacion.nConversacion;
    }

    private async Task<string?> ObtenerRespuestaBotAsync(
        long conversacionId,
        string botEstado,
        bool conversacionFueCreada,
        string tipo,
        string texto)
    {
        if (botEstado == "PAUSADO")
        {
            _logger.LogInformation("Bot Meta no responde: conversacion {ConversacionId} pausada.", conversacionId);
            return null;
        }

        if (!_botSettings.WhatsAppAutoReplyEnabled)
        {
            _logger.LogInformation("Bot Meta no responde: bot global desactivado.");
            return null;
        }

        if (!tipo.Equals("text", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Bot Meta no responde: tipo {Tipo} no es texto.", tipo);
            return null;
        }

        var textoCliente = texto.Trim();
        var opcion = _botSettings.Options.FirstOrDefault(option =>
            option.Key.Equals(textoCliente, StringComparison.OrdinalIgnoreCase));

        if (opcion is not null)
        {
            return opcion.Response;
        }

        var ultimaRespuestaAsesor = await _context.Mensajes
            .AsNoTracking()
            .Where(m =>
                m.nConversacion == conversacionId &&
                m.cDireccion == 'S' &&
                m.cTipo != "bot")
            .MaxAsync(m => (DateTime?)m.dFecha);

        var respuestasBotQuery = _context.Mensajes
            .AsNoTracking()
            .Where(m =>
                m.nConversacion == conversacionId &&
                m.cDireccion == 'S' &&
                m.cTipo == "bot");

        if (ultimaRespuestaAsesor.HasValue)
        {
            respuestasBotQuery = respuestasBotQuery.Where(m => m.dFecha > ultimaRespuestaAsesor.Value);
        }

        var respuestasBotEnviadas = await respuestasBotQuery.CountAsync();

        if (respuestasBotEnviadas >= _botSettings.MaxAutoRepliesPerConversation)
        {
            _logger.LogInformation(
                "Bot Meta no responde: conversacion {ConversacionId} alcanzo limite {Limite}.",
                conversacionId,
                _botSettings.MaxAutoRepliesPerConversation);
            return null;
        }

        return conversacionFueCreada || respuestasBotEnviadas == 0
            ? _botSettings.WhatsAppAutoReplyMessage
            : null;
    }

    private async Task EnviarRespuestaBotMetaAsync(
        Conversacion conversacion,
        string canal,
        string recipientId,
        string texto)
    {
        string? metaId = null;
        string? errorEnvio = null;
        var intentoEnviarAMeta = _metaMessaging.PuedeEnviar(canal);

        if (intentoEnviarAMeta)
        {
            try
            {
                metaId = await _metaMessaging.SendTextMessageAsync(canal, recipientId, texto);
            }
            catch (Exception ex)
            {
                errorEnvio = ex.Message;
                _logger.LogWarning(
                    ex,
                    "No se pudo enviar la respuesta automática del bot por {Canal}. Se guardará localmente.",
                    canal);
            }
        }

        _context.Mensajes.Add(new Mensaje
        {
            nConversacion = conversacion.nConversacion,
            cCanal = canal,
            cExternalId = metaId,
            cDireccion = 'S',
            cTipo = "bot",
            cEstado = !string.IsNullOrWhiteSpace(errorEnvio)
                ? $"FALLIDO: {errorEnvio}"
                : intentoEnviarAMeta && string.IsNullOrWhiteSpace(metaId) ? "LOCAL" : "BOT",
            cMensaje = texto,
            dFecha = DateTime.Now
        });

        conversacion.dUltimoMensaje = DateTime.Now;
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Respuesta automática del bot registrada para {Canal}, conversación {ConversacionId}.",
            canal,
            conversacion.nConversacion);
    }

    private static string? NormalizeUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        return Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
                ? uri.ToString()
                : null;
    }

    private static bool DebeActualizarNombre(
        string nombreActual,
        string nombreNuevo,
        string contacto,
        string canal)
    {
        if (string.IsNullOrWhiteSpace(nombreNuevo)) return false;
        if (nombreNuevo.Equals(nombreActual, StringComparison.OrdinalIgnoreCase)) return false;
        if (nombreNuevo.Equals(contacto, StringComparison.OrdinalIgnoreCase)) return false;

        return string.IsNullOrWhiteSpace(nombreActual) ||
            nombreActual.Equals(contacto, StringComparison.OrdinalIgnoreCase) ||
            nombreActual.Equals(canal, StringComparison.OrdinalIgnoreCase) ||
            nombreActual.Equals("Facebook", StringComparison.OrdinalIgnoreCase) ||
            nombreActual.Equals("Instagram", StringComparison.OrdinalIgnoreCase);
    }
}
