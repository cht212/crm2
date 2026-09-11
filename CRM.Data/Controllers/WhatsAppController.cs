using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
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
        private readonly IConfiguration _configuration;
        private readonly ILogger<WhatsAppController> _logger;

        public WhatsAppController(
            WhatsAppService whatsappService,
            WhatsAppCloudApiService whatsAppCloudApiService,
            CloudinaryStorageService storage,
            IConfiguration configuration,
            ILogger<WhatsAppController> logger)
        {
            _whatsappService = whatsappService;
            _whatsAppCloudApiService = whatsAppCloudApiService;
            _storage = storage;
            _configuration = configuration;
            _logger = logger;
        }


        // =========================================================
        // VERIFICACIÓN DEL WEBHOOK DE META
        // =========================================================
        //
        // Meta llamará a este endpoint cuando configuremos
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
                "Solicitud de verificación de webhook recibida."
            );

            string? tokenConfigurado =
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
                "Falló la verificación del webhook de WhatsApp."
            );

            return Forbid();
        }


        // =========================================================
        // WEBHOOK DE META
        // =========================================================
        //
        // Meta enviará aquí los mensajes recibidos.
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
                // Validar estructura básica
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
                        // messages
                        // -------------------------------------------------

                        if (!value.TryGetProperty(
                                "messages",
                                out JsonElement messages))
                        {
                            // Puede ser una notificación que no contiene
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
                // Así podemos detectar el problema durante desarrollo.
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
                // TELÉFONO DEL CLIENTE
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
                        "Mensaje recibido sin número de teléfono."
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
                        var mediaFile = await _whatsAppCloudApiService.DownloadMediaAsync(mediaId);
                        var fileName = ObtenerNombreArchivo(message, tipo, mediaFile.ContentType, mediaId);
                        await using var stream = new MemoryStream(mediaFile.Content);
                        var formFile = new FormFile(stream, 0, mediaFile.Content.Length, "archivo", fileName)
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = mediaFile.ContentType
                        };
                        var upload = await _storage.UploadAsync(formFile, "crm-hpd");
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
                    "Conversación: {ConversacionId}, " +
                    "Teléfono: {Telefono}",
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

        private bool ValidarFirmaWebhook(string rawBody)
        {
            var appSecret = _configuration["WhatsApp:AppSecret"];
            if (string.IsNullOrWhiteSpace(appSecret))
            {
                _logger.LogWarning("WhatsApp:AppSecret no está configurado; se omite la validación de firma para pruebas locales.");
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


        // =========================================================
        // PRUEBA MANUAL
        // =========================================================
        //
        // Este endpoint nos permite probar el CRM sin depender
        // todavía de Meta.
        //
        // POST /api/whatsapp/test/mensaje
        //
        // =========================================================

        [HttpPost("test/mensaje")]
        [AllowAnonymous]
        public async Task<IActionResult> MensajePrueba(
            [FromBody] MensajePruebaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Telefono))
            {
                return BadRequest(
                    "El teléfono es obligatorio."
                );
            }

            if (string.IsNullOrWhiteSpace(dto.Mensaje))
            {
                return BadRequest(
                    "El mensaje es obligatorio."
                );
            }


            long conversacionId =
                await _whatsappService
                .ProcesarMensajeEntranteAsync(
                    dto.Telefono,
                    dto.Nombre,
                    dto.Mensaje,
                    dto.Tipo ?? "text",
                    dto.WhatsappId
                );


            return Ok(new
            {
                success = true,
                conversacionId
            });
        }


        // =========================================================
        // HISTORIAL
        // =========================================================

        [HttpGet("test/historial")]
        [AllowAnonymous]
        public async Task<IActionResult> Historial(
            [FromQuery] string telefono)
        {
            if (string.IsNullOrWhiteSpace(telefono))
            {
                return BadRequest(
                    "El teléfono es obligatorio."
                );
            }


            var historial =
                await _whatsappService
                .ObtenerHistorialPorTelefonoAsync(
                    telefono
                );


            return Ok(historial);
        }


        // =========================================================
        // CONVERSACIÓN
        // =========================================================

        [HttpGet("test/conversacion/{conversacionId:long}")]
        public async Task<IActionResult> Conversacion(
            long conversacionId)
        {
            var resultado =
                await _whatsappService
                .ObtenerConversacionAsync(
                    conversacionId
                );


            if (resultado == null)
            {
                return NotFound(
                    new
                    {
                        message = "Conversación no encontrada."
                    }
                );
            }


            return Ok(resultado);
        }


        // =========================================================
        // TODAS LAS CONVERSACIONES
        // =========================================================

        [HttpGet("test/todas")]
        public async Task<IActionResult> Todas()
        {
            var conversaciones =
                await _whatsappService
                .ObtenerTodasConversacionesAsync();


            return Ok(conversaciones);
        }


        // =========================================================
        // RESPUESTA DEL ASESOR
        // =========================================================
        //
        // El envío a Meta se activa con WhatsApp:SendMessagesToMeta=true.
        // =========================================================

        [HttpPost("test/enviar")]
        public async Task<IActionResult> EnviarMensaje(
            [FromBody] EnviarMensajeDto dto)
        {
            if (dto.ConversacionId <= 0)
            {
                return BadRequest(
                    "La conversación es obligatoria."
                );
            }

            if (string.IsNullOrWhiteSpace(dto.Mensaje))
            {
                return BadRequest(
                    "El mensaje es obligatorio."
                );
            }


            long mensajeId =
                await _whatsappService
                .ProcesarMensajeSalienteAsync(
                    dto.ConversacionId,
                    dto.Mensaje,
                    dto.UsuarioId,
                    dto.Tipo ?? "text",
                    dto.WhatsappId
                );


            return Ok(new
            {
                success = true,
                mensajeId
            });
        }
    }


    // =========================================================
    // DTO MENSAJE DE PRUEBA
    // =========================================================

    public class MensajePruebaDto
    {
        public string Telefono { get; set; } = "";

        public string? Nombre { get; set; }

        public string Mensaje { get; set; } = "";

        public string? Tipo { get; set; }

        public string? WhatsappId { get; set; }
    }


    // =========================================================
    // DTO MENSAJE SALIENTE
    // =========================================================

    public class EnviarMensajeDto
    {
        public long ConversacionId { get; set; }

        public string Mensaje { get; set; } = "";

        public long? UsuarioId { get; set; }

        public string? Tipo { get; set; }

        public string? WhatsappId { get; set; }
    }
}