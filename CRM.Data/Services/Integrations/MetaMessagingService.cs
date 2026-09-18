using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CRM.Data.Models;

namespace CRM.Data.Services;

public sealed class MetaMessagingService
{
    private readonly HttpClient _httpClient;
    private readonly SocialIntegrationService _socialIntegrations;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MetaMessagingService> _logger;

    public MetaMessagingService(
        HttpClient httpClient,
        SocialIntegrationService socialIntegrations,
        IConfiguration configuration,
        ILogger<MetaMessagingService> logger)
    {
        _httpClient = httpClient;
        _socialIntegrations = socialIntegrations;
        _configuration = configuration;
        _logger = logger;
    }

    public bool PuedeEnviar(string canal)
    {
        var normalized = CanalSocial.Normalizar(canal);
        if (normalized is not (CanalSocial.Facebook or CanalSocial.Instagram))
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(GetPageId(normalized)) &&
            !string.IsNullOrWhiteSpace(GetAccessToken(normalized));
    }

    public async Task<string?> SendTextMessageAsync(string canal, string recipientId, string text)
    {
        var normalized = CanalSocial.Normalizar(canal);
        var pageId = GetPageId(normalized);
        var configuredToken = GetAccessToken(normalized);

        if (string.IsNullOrWhiteSpace(pageId) || string.IsNullOrWhiteSpace(configuredToken))
        {
            throw new InvalidOperationException($"Faltan Page ID o Access Token para {normalized}.");
        }

        if (string.IsNullOrWhiteSpace(recipientId))
        {
            throw new InvalidOperationException("No hay identificador externo del cliente para responder.");
        }

        var apiVersion = GetValue("Meta:ApiVersion") ??
            _configuration["Meta:ApiVersion"] ??
            "v25.0";
        var accessToken = await ResolvePageAccessTokenAsync(apiVersion, pageId, configuredToken);
        var url = $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(pageId)}/messages";
        var payload = new
        {
            recipient = new { id = recipientId },
            messaging_type = "RESPONSE",
            message = new { text }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Meta Messaging devolvio HTTP {StatusCode} para {Canal}: {Body}",
                (int)response.StatusCode,
                normalized,
                body);
            throw new InvalidOperationException($"Meta rechazo el mensaje. HTTP {(int)response.StatusCode}: {body}");
        }

        return ReadMessageId(body);
    }

    private async Task<string> ResolvePageAccessTokenAsync(
        string apiVersion,
        string pageId,
        string configuredToken)
    {
        var meUrl =
            $"https://graph.facebook.com/{apiVersion}/me" +
            $"?fields=id,name&access_token={Uri.EscapeDataString(configuredToken)}";

        try
        {
            using var meResponse = await _httpClient.GetAsync(meUrl);
            var meBody = await meResponse.Content.ReadAsStringAsync();
            if (meResponse.IsSuccessStatusCode)
            {
                using var meDocument = JsonDocument.Parse(meBody);
                var meId = meDocument.RootElement.TryGetProperty("id", out var idNode)
                    ? idNode.GetString()
                    : null;

                if (pageId.Equals(meId, StringComparison.OrdinalIgnoreCase))
                {
                    return configuredToken;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo validar si el token de Meta pertenece a la pagina.");
        }

        var accountsUrl =
            $"https://graph.facebook.com/{apiVersion}/me/accounts" +
            $"?fields=id,name,access_token&access_token={Uri.EscapeDataString(configuredToken)}";

        using var accountsResponse = await _httpClient.GetAsync(accountsUrl);
        var accountsBody = await accountsResponse.Content.ReadAsStringAsync();
        if (!accountsResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"El token no permite obtener las paginas administradas. HTTP {(int)accountsResponse.StatusCode}: {accountsBody}");
        }

        using var accountsDocument = JsonDocument.Parse(accountsBody);
        if (!accountsDocument.RootElement.TryGetProperty("data", out var data) ||
            data.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Meta no devolvio paginas administradas para obtener Page Access Token.");
        }

        foreach (var page in data.EnumerateArray())
        {
            var id = page.TryGetProperty("id", out var idNode)
                ? idNode.GetString()
                : null;
            if (!pageId.Equals(id, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var pageToken = page.TryGetProperty("access_token", out var tokenNode)
                ? tokenNode.GetString()
                : null;
            if (!string.IsNullOrWhiteSpace(pageToken))
            {
                return pageToken;
            }
        }

        throw new InvalidOperationException(
            $"El token configurado no contiene acceso a la pagina {pageId}. Genera un Page Access Token de esa pagina.");
    }

    private string? GetPageId(string canal) =>
        canal == CanalSocial.Instagram
            ? GetValue("Meta:Instagram:PageId")
            : GetValue("Meta:Facebook:PageId");

    private string? GetAccessToken(string canal) =>
        canal == CanalSocial.Instagram
            ? GetValue("Meta:Instagram:AccessToken")
            : GetValue("Meta:Facebook:AccessToken");

    private string? GetValue(string key) =>
        _socialIntegrations.GetConfiguredValue(key) ?? _configuration[key];

    private static string? ReadMessageId(string body)
    {
        using var document = JsonDocument.Parse(body);
        return document.RootElement.TryGetProperty("message_id", out var messageId)
            ? messageId.GetString()
            : null;
    }
}
