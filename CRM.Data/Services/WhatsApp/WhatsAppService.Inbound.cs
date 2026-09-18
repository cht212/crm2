using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CRM.Data.Services;

public partial class WhatsAppService
{

// =========================================================
// MENSAJE ENTRANTE
// =========================================================

public async Task<long> ProcesarMensajeEntranteAsync(
    string telefono,
    string? nombre,
    string mensaje,
    string tipo,
    string? whatsappId)
{
    telefono = telefono.Trim();

    // =====================================================
    // 1. EVITAR MENSAJES DUPLICADOS
    // =====================================================

    if (!string.IsNullOrWhiteSpace(whatsappId))
    {
        bool mensajeExiste =
            await _context.Mensajes
                .AnyAsync(m => m.cWhatsappId == whatsappId);

        if (mensajeExiste)
        {
            _logger.LogInformation(
                "Mensaje duplicado ignorado: {WhatsappId}",
                whatsappId);

            var mensajeExistente =
                await _context.Mensajes
                    .AsNoTracking()
                    .FirstAsync(m => m.cWhatsappId == whatsappId);

            return mensajeExistente.nConversacion;
        }
    }

    // =====================================================
    // 2. BUSCAR CLIENTE
    // =====================================================

    Cliente? cliente =
        await _context.Clientes
            .FirstOrDefaultAsync(c =>
                c.cTelefono == telefono);

    // =====================================================
    // 3. CREAR CLIENTE SI NO EXISTE
    // =====================================================

    if (cliente == null)
    {
        cliente = new Cliente
        {
            cNombre =
                string.IsNullOrWhiteSpace(nombre)
                    ? telefono
                    : nombre.Trim(),

            cTelefono = telefono,

            cCanalOrigen = CanalSocial.WhatsApp,

            dFechaRegistro = DateTime.Now,

            cEstado = 'A'
        };

        _context.Clientes.Add(cliente);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Cliente creado: {ClienteId}",
            cliente.nCliente);
    }
    else
    {
        // Si Meta nos manda un nombre nuevo,
        // podemos actualizarlo.

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            cliente.cNombre = nombre.Trim();
        }
    }

    // =====================================================
    // 4. BUSCAR CONVERSACIÓN ABIERTA
    // =====================================================

    Conversacion? conversacion =
        await _context.Conversaciones
            .Where(c =>
                c.nCliente == cliente.nCliente &&
                (
                    c.cEstado == "NUEVO" ||
                    c.cEstado == "ABIERTO" ||
                    c.cEstado == "EN_ATENCION"
                ))
            .OrderByDescending(
                c => c.dUltimoMensaje)
            .FirstOrDefaultAsync();

    // =====================================================
    // 5. CREAR CONVERSACIÓN
    // =====================================================

    var conversacionFueCreada = conversacion == null;

    if (conversacion == null)
    {
        conversacion = new Conversacion
        {
            nCliente = cliente.nCliente,

            cEstado = "NUEVO",

            cCanal = CanalSocial.WhatsApp,

            cExternalThreadId = telefono,

            dFechaInicio = DateTime.Now,

            dUltimoMensaje = DateTime.Now,

            dUltimoMensajeCliente = DateTime.Now
        };

        _context.Conversaciones.Add(conversacion);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Conversación creada: {ConversacionId}",
            conversacion.nConversacion);
    }
    else
    {
        // =================================================
        // Actualizar conversación
        // =================================================

        conversacion.dUltimoMensaje =
            DateTime.Now;

        conversacion.dUltimoMensajeCliente =
            DateTime.Now;
    }

    // =====================================================
    // 5.1 ASIGNACIÓN AUTOMÁTICA DEL ASESOR
    // =====================================================
    //
    // Si la conversación (nueva o existente) todavía no
    // tiene un asesor asignado, se reparte automáticamente
    // entre los asesores activos, igual que hace Kommo con
    // la distribución automática de leads. Así el
    // administrador ya no necesita asignarla a mano: solo
    // entra al Pipeline y ve a quién le tocó.
    //
    // =====================================================

    if (!conversacion.nUsuarioAsignado.HasValue)
    {
        await AsignarAutomaticamenteAsync(conversacion);
    }

    // =====================================================
    // 6. CREAR MENSAJE
    // =====================================================

    var nuevoMensaje = new Mensaje
    {
        nConversacion =
            conversacion.nConversacion,

        cWhatsappId =
            whatsappId,

        cCanal = CanalSocial.WhatsApp,

        cExternalId = whatsappId,

        cDireccion = 'E',

        cTipo = tipo,

        cEstado = "RECIBIDO",

        cMensaje = mensaje,

        dFecha = DateTime.Now
    };

    _context.Mensajes.Add(nuevoMensaje);

    // =====================================================
    // 7. GUARDAR
    // =====================================================

    await _context.SaveChangesAsync();

    _logger.LogInformation(
        "Mensaje entrante guardado. " +
        "Conversación: {ConversacionId}, " +
        "Mensaje: {MensajeId}",
        conversacion.nConversacion,
        nuevoMensaje.nMensaje);

    var respuestaBot = await ObtenerRespuestaBotAsync(
        conversacion.nConversacion,
        conversacionFueCreada,
        tipo,
        mensaje);

    if (!string.IsNullOrWhiteSpace(respuestaBot))
    {
        await EnviarRespuestaBotAsync(conversacion, telefono, respuestaBot);
    }

    return conversacion.nConversacion;
}

private async Task<string?> ObtenerRespuestaBotAsync(
    long conversacionId,
    bool conversacionFueCreada,
    string tipo,
    string mensaje)
{
    var conversacion = await _context.Conversaciones
        .AsNoTracking()
        .FirstOrDefaultAsync(c => c.nConversacion == conversacionId);

    if (conversacion == null)
    {
        _logger.LogInformation("Bot no responde: conversacion {ConversacionId} no existe.", conversacionId);
        return null;
    }

    if (conversacion.cBotEstado == "PAUSADO")
    {
        _logger.LogInformation("Bot no responde: conversacion {ConversacionId} esta pausada.", conversacionId);
        return null;
    }

    if (!_botSettings.WhatsAppAutoReplyEnabled)
    {
        _logger.LogInformation("Bot no responde: bot global desactivado.");
        return null;
    }

    if (!tipo.Equals("text", StringComparison.OrdinalIgnoreCase))
    {
        _logger.LogInformation("Bot no responde: tipo de mensaje {Tipo} no es texto.", tipo);
        return null;
    }

    var textoCliente = mensaje.Trim();
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
            "Bot no responde: conversacion {ConversacionId} alcanzo limite de respuestas {Limite} desde la ultima respuesta manual.",
            conversacionId,
            _botSettings.MaxAutoRepliesPerConversation);
        return null;
    }

    if (conversacionFueCreada || respuestasBotEnviadas == 0)
    {
        return _botSettings.WhatsAppAutoReplyMessage;
    }

    _logger.LogInformation(
        "Bot no responde: el mensaje '{Mensaje}' no coincide con ninguna opcion configurada.",
        textoCliente);

    return null;
}

private async Task EnviarRespuestaBotAsync(Conversacion conversacion, string telefono, string texto)
{
    string? whatsappId = null;
    var intentoEnviarAMeta = _whatsAppCloudApiService.ShouldSendToMeta;

    if (intentoEnviarAMeta)
    {
        try
        {
            whatsappId = await _whatsAppCloudApiService.SendTextMessageAsync(
                telefono,
                texto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "No se pudo enviar la respuesta automática del bot por WhatsApp. Se guardará localmente.");
        }
    }

    _context.Mensajes.Add(new Mensaje
    {
        nConversacion = conversacion.nConversacion,
        cWhatsappId = whatsappId,

        cCanal = CanalSocial.WhatsApp,

        cExternalId = whatsappId,
        cDireccion = 'S',
        cTipo = "bot",
        cEstado = intentoEnviarAMeta && string.IsNullOrWhiteSpace(whatsappId) ? "LOCAL" : "BOT",
        cMensaje = texto,
        dFecha = DateTime.Now
    });

    conversacion.dUltimoMensaje = DateTime.Now;
    await _context.SaveChangesAsync();

    _logger.LogInformation(
        "Respuesta automática del bot registrada para la conversación {ConversacionId}, asesor asignado {UsuarioId}.",
        conversacion.nConversacion,
        conversacion.nUsuarioAsignado);
}
}
