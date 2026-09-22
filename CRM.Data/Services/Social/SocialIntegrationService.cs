using CRM.Data.Models;
using System.Text.Json;

namespace CRM.Data.Services;

public sealed class SocialIntegrationService
{
    private readonly IConfiguration _configuration;
    private readonly string _settingsPath;
    private readonly object _sync = new();
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };
    private Dictionary<string, string> _values = new(StringComparer.OrdinalIgnoreCase);

    public SocialIntegrationService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _settingsPath = Path.Combine(environment.ContentRootPath, "App_Data", "social-integrations.json");
        Load();
    }

    public IReadOnlyList<SocialChannelStatus> GetChannels(HttpRequest request)
    {
        var baseUrl = $"{request.Scheme}://{request.Host}";

        return
        [
            BuildWhatsApp(baseUrl),
            BuildMetaChannel(
                CanalSocial.Instagram,
                "Instagram",
                "Meta Graph API + Instagram Messaging/Comments",
                $"{baseUrl}/api/integraciones/meta/webhook",
                "Meta:Instagram"),
            BuildMetaChannel(
                CanalSocial.Facebook,
                "Facebook",
                "Meta Graph API + Messenger/Page webhooks",
                $"{baseUrl}/api/integraciones/meta/webhook",
                "Meta:Facebook"),
            BuildTikTok(baseUrl)
        ];
    }

    public SocialChannelStatus? GetChannel(HttpRequest request, string canal) =>
        GetChannels(request).FirstOrDefault(channel =>
            channel.Canal.Equals(CanalSocial.Normalizar(canal), StringComparison.OrdinalIgnoreCase));

    public SocialOauthStart BuildOauthStart(HttpRequest request, string canal)
    {
        var normalized = CanalSocial.Normalizar(canal);
        var channel = GetChannel(request, normalized);
        if (channel == null)
        {
            return new SocialOauthStart(false, null, ["Canal no soportado."], "Canal no soportado.");
        }

        var missing = channel.RequiredConfig
            .Where(item => !item.Configured)
            .Select(item => item.Key)
            .ToArray();

        if (missing.Length > 0)
        {
            return new SocialOauthStart(false, null, missing, "Faltan credenciales para iniciar OAuth.");
        }

        var redirectUri = Uri.EscapeDataString($"{request.Scheme}://{request.Host}/api/integraciones/{normalized.ToLowerInvariant()}/oauth/callback");
        var authorizationUrl = normalized switch
        {
            CanalSocial.Instagram or CanalSocial.Facebook =>
                $"https://www.facebook.com/{ApiVersion}/dialog/oauth?client_id={GetValue("Meta:AppId")}&redirect_uri={redirectUri}&response_type=code&scope={Uri.EscapeDataString(MetaScopes)}",
            CanalSocial.TikTok =>
                $"https://www.tiktok.com/v2/auth/authorize/?client_key={GetValue("TikTok:ClientKey")}&redirect_uri={redirectUri}&response_type=code&scope={Uri.EscapeDataString(TikTokScopes)}",
            _ => null
        };

        return new SocialOauthStart(
            authorizationUrl != null,
            authorizationUrl,
            [],
            authorizationUrl == null
                ? "WhatsApp usa token/webhook, no OAuth desde este panel."
                : "Abre esta URL para autorizar la cuenta.");
    }

    public SocialChannelConfiguration GetConfiguration(string canal, bool revealSecrets = false)
    {
        var normalized = CanalSocial.Normalizar(canal);
        return new SocialChannelConfiguration(
            normalized,
            GetFields(normalized)
                .Select(field => new SocialConfigField(
                    field.Key,
                    field.Label,
                    field.Secret,
                    field.Required,
                    HasValue(field.Key),
                    field.Secret && !revealSecrets ? Mask(GetValue(field.Key)) : GetValue(field.Key)))
                .ToArray());
    }

    public SocialChannelConfiguration SaveConfiguration(string canal, IReadOnlyDictionary<string, string?> values)
    {
        var normalized = CanalSocial.Normalizar(canal);
        var allowed = GetFields(normalized).Select(field => field.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

        lock (_sync)
        {
            foreach (var item in values)
            {
                if (!allowed.Contains(item.Key)) continue;
                if (item.Value == null) continue;

                var value = item.Value.Trim();
                if (string.IsNullOrWhiteSpace(value))
                {
                    _values.Remove(item.Key);
                }
                else if (value.Contains('*') && HasValue(item.Key))
                {
                    continue;
                }
                else
                {
                    _values[item.Key] = value;
                }
            }

            Save();
        }

        return GetConfiguration(normalized);
    }

    public string? GetConfiguredValue(string key) => GetValue(key);

    private string ApiVersion => GetValue("Meta:ApiVersion") ?? "v25.0";

    private const string MetaScopes =
        "pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata,read_insights,instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";

    private const string TikTokScopes =
        "user.info.basic,business.basic,video.list,comment.list";

    private SocialChannelStatus BuildWhatsApp(string baseUrl)
    {
        var required = new[]
        {
            Required("WhatsApp:WebhookVerifyToken"),
            Required("WhatsApp:AccessToken"),
            Required("WhatsApp:PhoneNumberId"),
            Required("WhatsApp:BusinessAccountId")
        };

        return new SocialChannelStatus(
            CanalSocial.WhatsApp,
            "WhatsApp",
            "Meta WhatsApp Cloud API",
            required.All(item => item.Configured),
            $"{baseUrl}/api/whatsapp/webhook",
            null,
            required,
            ["graph.facebook.com", "lookaside.fbsbx.com", "res.cloudinary.com"]);
    }

    private SocialChannelStatus BuildMetaChannel(
        string canal,
        string nombre,
        string provider,
        string webhookUrl,
        string prefix)
    {
        var required = canal == CanalSocial.Instagram
            ? new[]
            {
                Required("Meta:AppId"),
                Required("Meta:AppSecret"),
                Required("Meta:WebhookVerifyToken"),
                Required("Meta:Instagram:LoginUserId"),
                Required("Meta:Instagram:LoginAccessToken")
            }
            : new[]
            {
                Required("Meta:AppId"),
                Required("Meta:AppSecret"),
                Required("Meta:WebhookVerifyToken"),
                Required($"{prefix}:PageId"),
                Required($"{prefix}:AccessToken")
            };

        return new SocialChannelStatus(
            canal,
            nombre,
            provider,
            required.All(item => item.Configured),
            webhookUrl,
            $"/api/integraciones/{canal.ToLowerInvariant()}/oauth/start",
            required,
            canal == CanalSocial.Instagram
                ? ["graph.instagram.com", "graph.facebook.com"]
                : ["graph.facebook.com", "www.facebook.com"]);
    }

    private SocialChannelStatus BuildTikTok(string baseUrl)
    {
        var required = new[]
        {
            Required("TikTok:ClientKey"),
            Required("TikTok:ClientSecret"),
            Required("TikTok:WebhookSecret"),
            Required("TikTok:AdvertiserId"),
            Required("TikTok:AccessToken")
        };

        return new SocialChannelStatus(
            CanalSocial.TikTok,
            "TikTok",
            "TikTok Developers / Business API",
            required.All(item => item.Configured),
            $"{baseUrl}/api/integraciones/tiktok/webhook",
            "/api/integraciones/tiktok/oauth/start",
            required,
            ["open.tiktokapis.com", "business-api.tiktok.com", "www.tiktok.com"]);
    }

    private SocialRequiredConfig Required(string key) =>
        new(key, HasValue(key));

    private string? GetValue(string key) =>
        _values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : _configuration[key];

    private bool HasValue(string key) => !string.IsNullOrWhiteSpace(GetValue(key));

    private void Load()
    {
        if (!File.Exists(_settingsPath)) return;

        try
        {
            var data = JsonSerializer.Deserialize<SocialIntegrationSettingsFile>(
                File.ReadAllText(_settingsPath),
                _jsonOptions);
            _values = data?.Values == null
                ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, string>(data.Values, StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            _values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath)!);
        File.WriteAllText(_settingsPath, JsonSerializer.Serialize(new SocialIntegrationSettingsFile
        {
            Values = _values
        }, _jsonOptions));
    }

    private static string? Mask(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Length <= 8
            ? new string('*', value.Length)
            : $"{value[..4]}{new string('*', Math.Min(12, value.Length - 8))}{value[^4..]}";
    }

    private static IReadOnlyList<SocialConfigFieldDefinition> GetFields(string canal) =>
        CanalSocial.Normalizar(canal) switch
        {
            CanalSocial.Instagram =>
            [
                new("Meta:AppId", "Meta App ID", false, true),
                new("Meta:AppSecret", "Meta App Secret", true, true),
                new("Meta:WebhookVerifyToken", "Meta Webhook Verify Token", true, true),
                new("Meta:ApiVersion", "Meta API Version", false, false),
                new("Meta:Instagram:LoginUserId", "Instagram Login User ID", false, true),
                new("Meta:Instagram:LoginAccessToken", "Instagram Login Access Token", true, true),
                new("Meta:Instagram:PageId", "Facebook Page ID vinculada (flujo anterior)", false, false),
                new("Meta:Instagram:InstagramBusinessAccountId", "Instagram Professional User ID", false, false),
                new("Meta:Instagram:AccessToken", "Instagram/Page Access Token (flujo anterior)", true, false)
            ],
            CanalSocial.Facebook =>
            [
                new("Meta:AppId", "Meta App ID", false, true),
                new("Meta:AppSecret", "Meta App Secret", true, true),
                new("Meta:WebhookVerifyToken", "Meta Webhook Verify Token", true, true),
                new("Meta:ApiVersion", "Meta API Version", false, false),
                new("Meta:Facebook:PageId", "Facebook Page ID", false, true),
                new("Meta:Facebook:AccessToken", "Page Access Token", true, true)
            ],
            CanalSocial.TikTok =>
            [
                new("TikTok:ClientKey", "TikTok Client Key", false, true),
                new("TikTok:ClientSecret", "TikTok Client Secret", true, true),
                new("TikTok:WebhookSecret", "TikTok Webhook Secret", true, true),
                new("TikTok:AdvertiserId", "TikTok Advertiser ID", false, true),
                new("TikTok:AccessToken", "Access Token", true, true)
            ],
            _ =>
            [
                new("WhatsApp:WebhookVerifyToken", "Webhook Verify Token", true, true),
                new("WhatsApp:AppSecret", "Meta App Secret para firma del webhook", true, true),
                new("WhatsApp:AccessToken", "Access Token", true, true),
                new("WhatsApp:PhoneNumberId", "Phone Number ID", false, true),
                new("WhatsApp:BusinessAccountId", "Business Account ID", false, true),
                new("WhatsApp:ApiVersion", "API Version", false, false),
                new("WhatsApp:SendMessagesToMeta", "Enviar mensajes a Meta true/false", false, false)
            ]
        };
}
