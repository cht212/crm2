using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

using CRM.Data.Data;

namespace CRM.Data.Services;

public partial class WhatsAppService
{
// =========================================================
// MENSAJE SALIENTE
// =========================================================
//
// Con SendMessagesToMeta=false se conserva la prueba local.
// Con SendMessagesToMeta=true se envía por WhatsApp Cloud API antes
// de guardar el mensaje como enviado.
//
// =========================================================

public async Task<long> ProcesarMensajeSalienteAsync(
    long conversacionId,
    string mensaje,
    long? usuarioId,
    string tipo,
    string? whatsappId)
{
    Conversacion? conversacion =
        await _context.Conversaciones
            .Include(c => c.Cliente)
            .FirstOrDefaultAsync(c =>
                c.nConversacion == conversacionId);

    if (conversacion == null)
    {
        throw new InvalidOperationException(
            "La conversación no existe.");
    }

    // =====================================================
    // Si el asesor responde,
    // la conversación queda abierta
    // =====================================================

    conversacion.cEstado = "EN_ATENCION";

    conversacion.dUltimoMensaje =
        DateTime.Now;

    if (usuarioId.HasValue)
    {
        // El modelo usa int?, mientras que
        // el método recibe long?.
        conversacion.nUsuarioAsignado =
            (int)usuarioId.Value;
    }

    if (tipo != "bot")
    {
        conversacion.cBotEstado = "PAUSADO";
        conversacion.dBotPausadoDesde = DateTime.Now;
        conversacion.nBotPausadoPor = usuarioId.HasValue ? (int)usuarioId.Value : null;
    }

    var canal = CanalSocial.Normalizar(conversacion.cCanal);
    var intentoEnviarAMeta = canal switch
    {
        CanalSocial.WhatsApp => _whatsAppCloudApiService.ShouldSendToMeta,
        CanalSocial.Facebook or CanalSocial.Instagram => _metaMessagingService.PuedeEnviar(canal),
        _ => false
    };

    // =====================================================
    // Crear mensaje
    // =====================================================

    var nuevoMensaje = new Mensaje
    {
        nConversacion =
            conversacion.nConversacion,

        cWhatsappId =
            whatsappId,

        cCanal = canal,

        cExternalId = whatsappId,

        cDireccion = 'S',

        cTipo = tipo,

        cEstado = intentoEnviarAMeta
            ? "ENVIANDO"
            : "LOCAL",

        cMensaje = mensaje,

        dFecha = DateTime.Now
    };

    _context.Mensajes.Add(nuevoMensaje);

    // =====================================================
    // GUARDAR
    // =====================================================

    await _context.SaveChangesAsync();

    if (intentoEnviarAMeta)
    {
        _ = EnviarMensajeMetaEnSegundoPlanoAsync(
            nuevoMensaje.nMensaje,
            conversacion.Cliente.cTelefono,
            conversacion.cExternalThreadId,
            canal,
            mensaje,
            tipo,
            whatsappId);
    }

    _logger.LogInformation(
        "Mensaje saliente guardado. " +
        "Conversación: {ConversacionId}, " +
        "Mensaje: {MensajeId}",
        conversacionId,
        nuevoMensaje.nMensaje);

    return nuevoMensaje.nMensaje;
}

private async Task EnviarMensajeMetaEnSegundoPlanoAsync(
    long mensajeId,
    string telefono,
    string? externalThreadId,
    string canal,
    string mensaje,
    string tipo,
    string? whatsappId)
{
    try
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
        var cloudApi = scope.ServiceProvider.GetRequiredService<WhatsAppCloudApiService>();
        var metaMessaging = scope.ServiceProvider.GetRequiredService<MetaMessagingService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<WhatsAppService>>();

        var metaId = await EnviarAMetaAsync(
            cloudApi,
            metaMessaging,
            canal,
            telefono,
            externalThreadId,
            mensaje,
            tipo,
            whatsappId);
        var mensajeDb = await context.Mensajes.FirstOrDefaultAsync(m => m.nMensaje == mensajeId);
        if (mensajeDb == null) return;

        mensajeDb.cWhatsappId = metaId;
        mensajeDb.cExternalId = metaId;
        mensajeDb.cEstado = string.IsNullOrWhiteSpace(metaId) ? "LOCAL" : "ENVIADO";
        await context.SaveChangesAsync();

        logger.LogInformation("Mensaje {MensajeId} enviado a Meta en segundo plano.", mensajeId);
    }
    catch (Exception ex)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
        var mensajeDb = await context.Mensajes.FirstOrDefaultAsync(m => m.nMensaje == mensajeId);
        if (mensajeDb != null)
        {
            mensajeDb.cEstado = $"FALLIDO: {ex.Message}";
            await context.SaveChangesAsync();
        }

        _logger.LogError(ex, "No se pudo enviar el mensaje {MensajeId} a Meta.", mensajeId);
    }
}

private async Task<string?> EnviarAMetaAsync(
    string telefono,
    string mensaje,
    string tipo,
    string? whatsappId)
{
    return await EnviarAMetaAsync(
        _whatsAppCloudApiService,
        _metaMessagingService,
        CanalSocial.WhatsApp,
        telefono,
        null,
        mensaje,
        tipo,
        whatsappId);
}

private async Task<string?> EnviarAMetaAsync(
    WhatsAppCloudApiService cloudApi,
    MetaMessagingService metaMessaging,
    string canal,
    string telefono,
    string? externalThreadId,
    string mensaje,
    string tipo,
    string? whatsappId)
{
    if (canal is CanalSocial.Facebook or CanalSocial.Instagram)
    {
        if (!tipo.Equals("text", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Por ahora Facebook/Instagram solo envian texto desde el CRM.");
        }

        return await metaMessaging.SendTextMessageAsync(
            canal,
            externalThreadId ?? telefono,
            mensaje);
    }

    if (tipo.Equals("text", StringComparison.OrdinalIgnoreCase))
    {
        return await cloudApi.SendTextMessageAsync(
            telefono,
            mensaje);
    }

    if (TryReadAttachment(mensaje, out var url, out var nombre))
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
        {
            _logger.LogWarning(
                "No se enviará el adjunto a Meta porque no tiene una URL pública HTTPS. Url={Url}",
                url);
            return whatsappId;
        }

        return await cloudApi.SendMediaMessageAsync(
            telefono,
            tipo,
            url,
            nombre,
            null);
    }

    return whatsappId;
}

private static bool TryReadAttachment(
    string mensaje,
    out string url,
    out string? nombre)
{
    url = string.Empty;
    nombre = null;

    try
    {
        using var json = JsonDocument.Parse(mensaje);
        var root = json.RootElement;

        if (root.TryGetProperty("url", out var urlProperty))
        {
            url = urlProperty.GetString() ?? string.Empty;
        }

        if (root.TryGetProperty("nombre", out var nombreProperty))
        {
            nombre = nombreProperty.GetString();
        }

        return !string.IsNullOrWhiteSpace(url);
    }
    catch (JsonException)
    {
        return false;
    }
}
}
