using CRM.Data.DTOs.Social;
using CRM.Data.Models;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/integraciones")]
public sealed class IntegracionesController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly BotSettingsService _botSettings;
    private readonly SocialIntegrationService _socialIntegrations;
    private readonly SocialInboundService _inbound;
    private readonly MetaGraphApiService _metaGraph;
    private readonly MetaWebhookService _metaWebhook;
    private readonly AuditoriaService _auditoria;
    private readonly ILogger<IntegracionesController> _logger;

    public IntegracionesController(
        IConfiguration configuration,
        BotSettingsService botSettings,
        SocialIntegrationService socialIntegrations,
        SocialInboundService inbound,
        MetaGraphApiService metaGraph,
        MetaWebhookService metaWebhook,
        AuditoriaService auditoria,
        ILogger<IntegracionesController> logger)
    {
        _configuration = configuration;
        _botSettings = botSettings;
        _socialIntegrations = socialIntegrations;
        _inbound = inbound;
        _metaGraph = metaGraph;
        _metaWebhook = metaWebhook;
        _auditoria = auditoria;
        _logger = logger;
    }

    [HttpGet("estado")]
    [Authorize]
    public IActionResult Estado()
    {
        bool TieneValor(string key) =>
            !string.IsNullOrWhiteSpace(_socialIntegrations.GetConfiguredValue(key) ?? _configuration[key]);

        return Ok(new
        {
            api = "OK",
            cloudinary = new
            {
                cloudName = TieneValor("Cloudinary:CloudName"),
                apiKey = TieneValor("Cloudinary:ApiKey"),
                apiSecret = TieneValor("Cloudinary:ApiSecret"),
                uploadPreset = TieneValor("Cloudinary:UploadPreset")
            },
            whatsapp = new
            {
                verifyToken = TieneValor("WhatsApp:WebhookVerifyToken"),
                accessToken = TieneValor("WhatsApp:AccessToken"),
                phoneNumberId = TieneValor("WhatsApp:PhoneNumberId"),
                businessAccountId = TieneValor("WhatsApp:BusinessAccountId"),
                apiVersion = _configuration["WhatsApp:ApiVersion"] ?? "v25.0",
                sendMessagesToMeta =
                    bool.TryParse(_configuration["WhatsApp:SendMessagesToMeta"], out var enabled) &&
                    enabled
            },
            bot = new
            {
                whatsappAutoReply = _botSettings.WhatsAppAutoReplyEnabled,
                whatsappMessage = _botSettings.WhatsAppAutoReplyMessage,
                maxAutoReplies = _botSettings.MaxAutoRepliesPerConversation
            },
            canales = _socialIntegrations.GetChannels(Request)
        });
    }

    [HttpGet("canales")]
    [Authorize]
    public IActionResult Canales()
    {
        return Ok(_socialIntegrations.GetChannels(Request));
    }

    [HttpGet("{canal}/oauth/start")]
    [Authorize]
    public IActionResult OAuthStart(string canal)
    {
        return Ok(_socialIntegrations.BuildOauthStart(Request, canal));
    }

    [HttpGet("{canal}/configuracion")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> Configuracion(string canal, [FromQuery] bool revealSecrets = false)
    {
        if (revealSecrets && !User.IsInRole("Administrador"))
        {
            return Forbid();
        }

        if (revealSecrets)
        {
            int? usuarioId = int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out var parsedUsuarioId)
                ? parsedUsuarioId
                : null;

            await _auditoria.RegistrarAsync(
                "Integracion",
                0,
                "LECTURA_SECRETOS",
                null,
                CanalSocial.Normalizar(canal),
                usuarioId);
        }

        return Ok(_socialIntegrations.GetConfiguration(canal, revealSecrets));
    }

    [HttpPut("{canal}/configuracion")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public IActionResult GuardarConfiguracion(string canal, SocialIntegrationSaveDto dto)
    {
        var updated = _socialIntegrations.SaveConfiguration(
            canal,
            dto.Values ?? new Dictionary<string, string?>());

        return Ok(new
        {
            success = true,
            configuration = updated
        });
    }

    [HttpGet("{canal}/oauth/callback")]
    [Authorize]
    public IActionResult OAuthCallback(
        string canal,
        [FromQuery] string? code,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return BadRequest(new
            {
                success = false,
                canal,
                error,
                detail = errorDescription
            });
        }

        return Ok(new
        {
            success = true,
            canal,
            pending = true,
            message = "OAuth recibido. Falta intercambiar el code por token y guardarlo en configuracion segura.",
            codeReceived = !string.IsNullOrWhiteSpace(code)
        });
    }

    [HttpGet("meta/webhook")]
    [AllowAnonymous]
    public IActionResult VerificarMetaWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? token,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var expected = _socialIntegrations.GetConfiguredValue("Meta:WebhookVerifyToken") ??
            _configuration["Meta:WebhookVerifyToken"];

        if (mode == "subscribe" &&
            !string.IsNullOrWhiteSpace(expected) &&
            token == expected)
        {
            return Content(challenge ?? string.Empty);
        }

        return Unauthorized();
    }

    [HttpGet("meta/estadisticas")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> EstadisticasMeta(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null)
    {
        var dashboard = await _metaGraph.ObtenerDashboardAsync(desde, hasta);
        return Ok(dashboard);
    }

    [HttpGet("meta/facebook/feed")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> FeedFacebook(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] int limit = 10)
    {
        return Ok(await _metaGraph.ObtenerFacebookFeedAsync(desde, hasta, limit));
    }

    [HttpGet("meta/estadisticas/diagnostico")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> DiagnosticoEstadisticasMeta(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null)
    {
        var diagnostico = await _metaGraph.DiagnosticarInsightsAsync(desde, hasta);
        return Ok(diagnostico);
    }

    [HttpGet("meta/credenciales/diagnostico")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> DiagnosticoCredencialesMeta()
    {
        return Ok(await _metaGraph.DiagnosticarCredencialesAsync());
    }

    [HttpPost("instagram/sincronizar")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> SincronizarInstagramLogin()
    {
        var result = await _metaGraph.SincronizarInstagramLoginAsync(_inbound);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        await _auditoria.RegistrarAsync(
            "Integracion",
            0,
            "INSTAGRAM_LOGIN_SYNC",
            null,
            $"Conversaciones: {result.Conversaciones}; mensajes leidos: {result.MensajesLeidos}; importados: {result.MensajesImportados}",
            null);

        return Ok(result);
    }

    [HttpPost("meta/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> RecibirMetaWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();

        if (!ValidarFirmaMeta(payload))
        {
            return Unauthorized();
        }

        try
        {
            var procesados = await _metaWebhook.ProcesarAsync(payload);

            _logger.LogInformation(
                "Webhook Meta recibido para Instagram/Facebook. Eventos procesados: {Procesados}.",
                procesados);

            return Ok(new { success = true, received = true, procesados });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error procesando webhook Meta.");
            await _auditoria.RegistrarAsync(
                "Integracion",
                0,
                "WEBHOOK_META_ERROR",
                null,
                "Error interno al procesar el webhook Meta.",
                null);
            return Ok(new
            {
                success = false,
                received = true,
                error = "Error interno al procesar el webhook."
            });
        }
    }

    [HttpGet("tiktok/webhook")]
    [AllowAnonymous]
    public IActionResult VerificarTikTokWebhook()
    {
        return Ok(new
        {
            success = true,
            message = "Endpoint de verificacion TikTok preparado. Ajustar challenge segun la app de TikTok."
        });
    }

    [HttpPost("tiktok/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> RecibirTikTokWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();

        if (!ValidarFirmaTikTok(payload))
        {
            return Unauthorized();
        }

        _logger.LogInformation("Webhook TikTok recibido. Longitud: {PayloadLength}", payload.Length);
        await _auditoria.RegistrarAsync("Integracion", 0, "WEBHOOK_TIKTOK_RECIBIDO", null, "Pendiente de parser TikTok", null);

        return Ok(new { success = true, received = true });
    }

    private bool ValidarFirmaMeta(string payload)
    {
        var secret = _socialIntegrations.GetConfiguredValue("Meta:AppSecret") ??
            _configuration["Meta:AppSecret"];
        var signature = Request.Headers["X-Hub-Signature-256"].FirstOrDefault();

        return ValidarHmac(payload, secret, signature, "sha256=");
    }

    private bool ValidarFirmaTikTok(string payload)
    {
        var secret = _socialIntegrations.GetConfiguredValue("TikTok:WebhookSecret") ??
            _configuration["TikTok:WebhookSecret"];
        var signature = Request.Headers["TikTok-Signature"].FirstOrDefault() ??
            Request.Headers["X-Tt-Signature"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var timestamp = ExtractSignatureValue(signature, "t");
        var signedValue = ExtractSignatureValue(signature, "s") ??
            RemoveSignaturePrefix(signature);
        var payloadToSign = payload;

        if (!string.IsNullOrWhiteSpace(timestamp))
        {
            if (!long.TryParse(timestamp, NumberStyles.Integer, CultureInfo.InvariantCulture, out var unixTimestamp))
            {
                return false;
            }

            var age = Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - unixTimestamp);
            if (age > TimeSpan.FromMinutes(5).TotalSeconds)
            {
                return false;
            }

            payloadToSign = $"{timestamp}.{payload}";
        }

        return ValidarHmac(payloadToSign, secret, signedValue, null);
    }

    private static bool ValidarHmac(string payload, string? secret, string? signature, string? requiredPrefix)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(requiredPrefix) &&
            !signature.StartsWith(requiredPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var received = RemoveSignaturePrefix(signature);
        if (received.Length != 64 || !received.All(Uri.IsHexDigit))
        {
            return false;
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(received.ToUpperInvariant()));
    }

    private static string RemoveSignaturePrefix(string signature)
    {
        var value = signature.Trim();
        return value.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase)
            ? value[7..]
            : value;
    }

    private static string? ExtractSignatureValue(string signature, string key)
    {
        return signature
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2, StringSplitOptions.TrimEntries))
            .Where(parts => parts.Length == 2 && parts[0].Equals(key, StringComparison.OrdinalIgnoreCase))
            .Select(parts => parts[1])
            .FirstOrDefault();
    }

    [HttpPost("{canal}/mensajes/prueba")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> MensajePrueba(string canal, SocialInboundTestDto dto)
    {
        var conversacionId = await _inbound.RegistrarMensajeEntranteAsync(new SocialInboundMessage(
            canal,
            dto.ExternalUserId,
            dto.ContactValue,
            dto.DisplayName,
            dto.Text,
            dto.Type,
            dto.ExternalMessageId));

        return Ok(new
        {
            success = true,
            canal = CanalSocial.Normalizar(canal),
            conversacionId
        });
    }
}
