using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace CRM.Data.Controllers
{
    [ApiController]
    [Route("api/whatsapp")]
    [Authorize]
    public class WhatsAppController : ControllerBase
    {
        private readonly WhatsAppService _whatsappService;
        private readonly WhatsAppCloudApiService _whatsAppCloudApiService;
        private readonly CloudinaryStorageService _storage;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly SocialIntegrationService _socialIntegrations;
        private readonly CrmAccessService _access;
        private readonly ILogger<WhatsAppController> _logger;

        public WhatsAppController(
            WhatsAppService whatsappService,
            WhatsAppCloudApiService whatsAppCloudApiService,
            CloudinaryStorageService storage,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            SocialIntegrationService socialIntegrations,
            CrmAccessService access,
            ILogger<WhatsAppController> logger)
        {
            _whatsappService = whatsappService;
            _whatsAppCloudApiService = whatsAppCloudApiService;
            _storage = storage;
            _environment = environment;
            _configuration = configuration;
            _socialIntegrations = socialIntegrations;
            _access = access;
            _logger = logger;
        }


        // =========================================================
        // VERIFICACIÃ“N DEL WEBHOOK DE META
        // =========================================================
        //
        // Meta llamarÃ¡ a este endpoint cuando configuremos
        // el webhook.
        //
        // URL:
        // GET /api/whatsapp/webhook
        //
        // =========================================================

        [HttpGet("webhook")]
        [AllowAnonymous]
        public IActionResult VerificarWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? verifyToken,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            _logger.LogInformation(
                "Solicitud de verificaciÃ³n de webhook recibida."
            );

            string? tokenConfigurado =
                _socialIntegrations.GetConfiguredValue("WhatsApp:WebhookVerifyToken") ??
                _configuration["WhatsApp:WebhookVerifyToken"];

            if (
                mode == "subscribe" &&
                verifyToken == tokenConfigurado &&
                !string.IsNullOrWhiteSpace(challenge)
            )
            {
                _logger.LogInformation(
                    "Webhook de WhatsApp verificado correctamente."
                );

                return Ok(challenge);
            }

            _logger.LogWarning(
                "FallÃ³ la verificaciÃ³n del webhook de WhatsApp."
            );

            return Forbid();
        }


        // =========================================================
        // WEBHOOK DE META
        // =========================================================
        //
        // Meta enviarÃ¡ aquÃ­ los mensajes recibidos.
        //
        // POST /api/whatsapp/webhook
        //
        // =========================================================

        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> RecibirWebhook()
        {
            try
            {
                Request.EnableBuffering();
                using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
                var rawBody = await reader.ReadToEndAsync();
                Request.Body.Position = 0;

                if (!ValidarFirmaWebhook(rawBody))
                {
                    return Unauthorized();
                }

                using var payloadDocument = JsonDocument.Parse(rawBody);
                var payload = payloadDocument.RootElement;
                _logger.LogInformation(
                    "Webhook de WhatsApp recibido."
                );


                // -------------------------------------------------
                // Validar estructura bÃ¡sica
                // -------------------------------------------------

                if (!payload.TryGetProperty("entry", out JsonElement entry))
                {
                    _logger.LogWarning(
                        "Webhook recibido sin propiedad 'entry'."
                    );

                    return Ok(new
                    {
                        success = true,
                        message = "Webhook recibido sin mensajes."
                    });
                }


                // -------------------------------------------------
                // entry
                // -------------------------------------------------

                foreach (JsonElement entryItem in entry.EnumerateArray())
                {
                    if (!entryItem.TryGetProperty(
                            "changes",
                            out JsonElement changes))
                    {
                        continue;
                    }


                    // -------------------------------------------------
                    // changes
                    // -------------------------------------------------

                    foreach (JsonElement change in changes.EnumerateArray())
                    {
                        if (!change.TryGetProperty(
                                "value",
                                out JsonElement value))
                        {
                            continue;
                        }


                        // -------------------------------------------------
                        // statuses (acuses de recibo: enviado/entregado/
                        // leÃ­do/fallido de nuestros mensajes salientes)
                        // -------------------------------------------------

                        if (value.TryGetProperty(
                                "statuses",
                                out JsonElement statuses))
                        {
                            foreach (JsonElement statusItem in statuses.EnumerateArray())
                            {
                                await ProcesarEstadoMensajeMeta(statusItem);
                            }
                        }


                        // -------------------------------------------------
                        // messages
                        // -------------------------------------------------

                        if (!value.TryGetProperty(
                                "messages",
                                out JsonElement messages))
                        {
                            // Puede ser una notificaciÃ³n que no contiene
                            // un mensaje de cliente.
                            continue;
                        }


                        // -------------------------------------------------
                        // contactos
                        // -------------------------------------------------

                        string? nombreContacto = null;

                        if (value.TryGetProperty(
                                "contacts",
                                out JsonElement contacts))
                        {
                            JsonElement firstContact =
                                contacts.EnumerateArray()
                                .FirstOrDefault();

                            if (
                                firstContact.ValueKind !=
                                JsonValueKind.Undefined &&
                                firstContact.TryGetProperty(
                                    "profile",
                                    out JsonElement profile) &&
                                profile.TryGetProperty(
                                    "name",
                                    out JsonElement profileName)
                            )
                            {
                                nombreContacto =
                                    profileName.GetString();
                            }
                        }


                        // -------------------------------------------------
                        // Procesar mensajes
                        // -------------------------------------------------

                        foreach (JsonElement message in messages.EnumerateArray())
                        {
                            await ProcesarMensajeMeta(
                                message,
                                nombreContacto
                            );
                        }
                    }
                }


                // -------------------------------------------------
                // IMPORTANTE
                // -------------------------------------------------
                //
                // Respondemos 200 a Meta porque el webhook fue
                // recibido correctamente.
                //
                // -------------------------------------------------

                return Ok(new
                {
                    success = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error procesando webhook de WhatsApp."
                );

                // En caso de error interno devolvemos 500.
                // AsÃ­ podemos detectar el problema durante desarrollo.
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        success = false,
                        message = "Error procesando webhook."
                    }
                );
            }
        }


        // =========================================================
        // PROCESAR MENSAJE INDIVIDUAL DE META
        // =========================================================

        private async Task ProcesarMensajeMeta(
            JsonElement message,
            string? nombreContacto)
        {
            try
            {
                // -------------------------------------------------
                // ID DEL MENSAJE DE WHATSAPP
                // -------------------------------------------------

                string? whatsappId = null;

                if (message.TryGetProperty(
                        "id",
                        out JsonElement id))
                {
                    whatsappId = id.GetString();
                }


                // -------------------------------------------------
                // TELÃ‰FONO DEL CLIENTE
                // -------------------------------------------------

                string? telefono = null;

                if (message.TryGetProperty(
                        "from",
                        out JsonElement from))
                {
                    telefono = from.GetString();
                }


                if (string.IsNullOrWhiteSpace(telefono))
                {
                    _logger.LogWarning(
                        "Mensaje recibido sin nÃºmero de telÃ©fono."
                    );

                    return;
                }


                // -------------------------------------------------
                // TIPO DE MENSAJE
                // -------------------------------------------------

                string tipo = "unknown";

                if (message.TryGetProperty(
                        "type",
                        out JsonElement type))
                {
                    tipo = type.GetString() ?? "unknown";
                }


                // -------------------------------------------------
                // TEXTO
                // -------------------------------------------------

                string texto;
                string tipoGuardado = tipo;


                if (
                    tipo == "text" &&
                    message.TryGetProperty(
                        "text",
                        out JsonElement text)
                )
                {
                    texto =
                        text.TryGetProperty(
                            "body",
                            out JsonElement body)
                        ? body.GetString() ?? ""
                        : "";
                }
                else if (message.TryGetProperty(tipo, out var media) &&
                         media.TryGetProperty("id", out var mediaIdProperty))
                {
                    var mediaId = mediaIdProperty.GetString();
                    if (string.IsNullOrWhiteSpace(mediaId))
                    {
                        texto = $"[Mensaje de tipo: {tipo}]";
                    }
                    else
                    {
                        try
                        {
                            var mediaFile = await _whatsAppCloudApiService.DownloadMediaAsync(mediaId);
                            var fileName = ObtenerNombreArchivo(message, tipo, mediaFile.ContentType, mediaId);
                            var upload = await GuardarArchivoEntranteAsync(mediaFile, fileName);
                            texto = JsonSerializer.Serialize(new
                            {
                                nombre = fileName,
                                url = upload.SecureUrl,
                                mimeType = mediaFile.ContentType,
                                tamano = mediaFile.Content.Length,
                                publicId = upload.PublicId
                            });
                            tipoGuardado = tipo.Equals("image", StringComparison.OrdinalIgnoreCase)
                                ? "image"
                                : "document";
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(
                                ex,
                                "No se pudo procesar el archivo entrante de WhatsApp. Tipo: {Tipo}, MediaId: {MediaId}",
                                tipo,
                                mediaId);
                            texto = $"[No se pudo descargar el archivo de WhatsApp. Tipo: {tipo}]";
                            tipoGuardado = "text";
                        }
                    }
                }
                else
                {
                    texto = $"[Mensaje de tipo: {tipo}]";
                }


                // -------------------------------------------------
                // GUARDAR EN CRM
                // -------------------------------------------------

                long conversacionId =
                    await _whatsappService
                    .ProcesarMensajeEntranteAsync(
                        telefono,
                        nombreContacto,
                        texto,
                        tipoGuardado,
                        whatsappId
                    );


                _logger.LogInformation(
                    "Mensaje de WhatsApp procesado. " +
                    "ConversaciÃ³n: {ConversacionId}, " +
                    "TelÃ©fono: {Telefono}",
                    conversacionId,
                    telefono
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error procesando mensaje individual de WhatsApp."
                );

                throw;
            }
        }

        // =========================================================
        // PROCESAR ACUSE DE ESTADO (statuses) DE META
        // =========================================================
        //
        // Meta manda aquÃ­ sent / delivered / read / failed para cada
        // mensaje saliente que enviamos, identificado por su
        // whatsappId (message.id). Actualizamos el campo c_estado
        // del mensaje correspondiente para pintar los checks en el
        // chat (âœ“ enviado, âœ“âœ“ entregado, âœ“âœ“ azul leÃ­do, âœ— fallido).
        //
        // =========================================================

        private async Task ProcesarEstadoMensajeMeta(JsonElement statusItem)
        {
            try
            {
                string? whatsappId = statusItem.TryGetProperty("id", out var idProp)
                    ? idProp.GetString()
                    : null;

                string? estadoMeta = statusItem.TryGetProperty("status", out var statusProp)
                    ? statusProp.GetString()
                    : null;

                if (string.IsNullOrWhiteSpace(whatsappId) || string.IsNullOrWhiteSpace(estadoMeta))
                {
                    return;
                }

                string? detalleError = null;

                if (estadoMeta.Equals("failed", StringComparison.OrdinalIgnoreCase) &&
                    statusItem.TryGetProperty("errors", out var errors))
                {
                    var primerError = errors.EnumerateArray().FirstOrDefault();
                    if (primerError.ValueKind != JsonValueKind.Undefined &&
                        primerError.TryGetProperty("title", out var titulo))
                    {
                        detalleError = titulo.GetString();
                    }
                }

                await _whatsappService.ActualizarEstadoMensajeAsync(
                    whatsappId,
                    estadoMeta,
                    detalleError);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error procesando acuse de estado (statuses) de WhatsApp.");
            }
        }

        private bool ValidarFirmaWebhook(string rawBody)
        {
            var appSecret = _socialIntegrations.GetConfiguredValue("WhatsApp:AppSecret") ??
                _configuration["WhatsApp:AppSecret"];
            if (string.IsNullOrWhiteSpace(appSecret))
            {
                _logger.LogWarning("WhatsApp:AppSecret no estÃ¡ configurado; se omite la validaciÃ³n de firma para pruebas locales.");
                return true;
            }

            var signature = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(signature) || !signature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(appSecret));
            var expected = "sha256=" + Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody))).ToLowerInvariant();
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(signature));
        }

        private static string ObtenerNombreArchivo(JsonElement message, string type, string contentType, string mediaId)
        {
            if (message.TryGetProperty(type, out var media) &&
                media.TryGetProperty("filename", out var filename))
            {
                var suppliedName = Path.GetFileName(filename.GetString());
                if (!string.IsNullOrWhiteSpace(suppliedName)) return suppliedName;
            }

            var extension = contentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "application/pdf" => ".pdf",
                _ => ".bin"
            };
            return $"whatsapp-{mediaId}{extension}";
        }

        private async Task<CloudinaryUploadResult> GuardarArchivoEntranteAsync(
            WhatsAppMediaDownload mediaFile,
            string fileName)
        {
            await using var stream = new MemoryStream(mediaFile.Content);
            var formFile = new FormFile(stream, 0, mediaFile.Content.Length, "archivo", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = mediaFile.ContentType
            };

            try
            {
                return await _storage.UploadAsync(formFile, "crm-hpd");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Cloudinary no pudo guardar el archivo entrante. Se usará almacenamiento local temporal. Archivo: {FileName}",
                    fileName);

                var safeFileName = $"{Path.GetFileNameWithoutExtension(fileName)}-{Guid.NewGuid():N}{Path.GetExtension(fileName)}";
                var relativeFolder = Path.Combine("uploads", "whatsapp", DateTime.UtcNow.ToString("yyyyMMdd"));
                var absoluteFolder = Path.Combine(_environment.WebRootPath, relativeFolder);
                Directory.CreateDirectory(absoluteFolder);

                var absolutePath = Path.Combine(absoluteFolder, safeFileName);
                await System.IO.File.WriteAllBytesAsync(absolutePath, mediaFile.Content);

                var relativeUrl = "/" + Path.Combine(relativeFolder, safeFileName).Replace('\\', '/');
                return new CloudinaryUploadResult(
                    relativeUrl,
                    $"local/{safeFileName}",
                    mediaFile.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ? "image" : "raw");
            }
        }


        // =========================================================

        [HttpGet("conversaciones/{conversacionId:long}")]
        public async Task<IActionResult> Conversacion(long conversacionId)
        {
            var resultado = await _whatsappService.ObtenerConversacionAsync(
                conversacionId,
                _access.EsAsesor ? _access.UsuarioActualId : null,
                _access.EsAsesor);
            if (resultado == null)
            {
                return NotFound(new { message = "Conversacion no encontrada." });
            }

            return Ok(resultado);
        }

        [HttpGet("conversaciones")]
        public async Task<IActionResult> Todas()
        {
            var conversaciones = await _whatsappService.ObtenerTodasConversacionesAsync(
                _access.EsAsesor ? _access.UsuarioActualId : null,
                _access.EsAsesor);
            return Ok(conversaciones);
        }

        [HttpPost("conversaciones/{conversacionId:long}/escribiendo")]
        public async Task<IActionResult> MostrarEscribiendo(long conversacionId)
        {
            if (!await _access.PuedeAccederConversacionAsync(conversacionId))
            {
                return Forbid();
            }

            var enviado = await _whatsappService.MostrarEscribiendoAsync(conversacionId);
            return Ok(new { success = enviado });
        }

        [HttpPost("conversaciones/{conversacionId:long}/mensajes")]
        public async Task<IActionResult> EnviarMensaje(long conversacionId, [FromBody] EnviarMensajeDto dto)
        {
            if (conversacionId <= 0)
            {
                return BadRequest("La conversacion es obligatoria.");
            }

            if (string.IsNullOrWhiteSpace(dto.Mensaje))
            {
                return BadRequest("El mensaje es obligatorio.");
            }

            if (!await _access.PuedeAccederConversacionAsync(conversacionId))
            {
                return Forbid();
            }

            var mensajeId = await _whatsappService.ProcesarMensajeSalienteAsync(
                conversacionId,
                dto.Mensaje,
                _access.UsuarioActualId,
                dto.Tipo ?? "text",
                null);

            return Ok(new { success = true, mensajeId });
        }

        [HttpPut("conversaciones/{conversacionId:long}/bot")]
        public async Task<IActionResult> CambiarEstadoBot(long conversacionId, [FromBody] CambiarBotDto dto)
        {
            if (conversacionId <= 0)
            {
                return BadRequest("La conversacion es obligatoria.");
            }

            if (!await _access.PuedeAccederConversacionAsync(conversacionId))
            {
                return Forbid();
            }

            var usuarioId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
                ? id
                : (int?)null;

            await _whatsappService.CambiarEstadoBotConversacionAsync(
                conversacionId,
                dto.Estado ?? "PAUSADO",
                usuarioId);

            return Ok(new { success = true, estado = dto.Estado });
        }
    }

    public class EnviarMensajeDto
    {
        public string Mensaje { get; set; } = "";

        public long? UsuarioId { get; set; }

        public string? Tipo { get; set; }
    }

    public class CambiarBotDto
    {
        public string? Estado { get; set; }
    }
}
