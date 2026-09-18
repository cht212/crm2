using System.Net.Http.Headers;
using System.Text.Json;
using CRM.Data.Models;
using CRM.Data.Services;

namespace CRM.Data.Services;

public sealed class MetaGraphApiService
{
    private readonly HttpClient _httpClient;
    private readonly SocialIntegrationService _socialIntegrations;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MetaGraphApiService> _logger;

    public MetaGraphApiService(
        HttpClient httpClient,
        SocialIntegrationService socialIntegrations,
        IConfiguration configuration,
        ILogger<MetaGraphApiService> logger)
    {
        _httpClient = httpClient;
        _socialIntegrations = socialIntegrations;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<MetaDashboardResult> ObtenerDashboardAsync(DateTime? desde, DateTime? hasta)
    {
        var since = new DateTimeOffset((desde ?? DateTime.Today.AddDays(-30)).Date).ToUnixTimeSeconds();
        var until = new DateTimeOffset((hasta ?? DateTime.Today).Date.AddDays(1)).ToUnixTimeSeconds();

        var canales = new List<MetaChannelInsight>
        {
            await ObtenerFacebookAsync(since, until),
            await ObtenerInstagramAsync(since, until)
        };

        return new MetaDashboardResult(
            canales,
            canales.All(canal => canal.Errors.Count == 0));
    }

    public async Task<InstagramLoginSyncResult> SincronizarInstagramLoginAsync(SocialInboundService inbound)
    {
        var apiVersion = GetValue("Meta:ApiVersion") ??
            _configuration["Meta:ApiVersion"] ??
            "v26.0";
        var token = GetValue("Meta:Instagram:LoginAccessToken") ??
            GetValue("Meta:Instagram:AccessToken");
        var ownUserId = GetValue("Meta:Instagram:LoginUserId");
        var professionalUserId = GetValue("Meta:Instagram:InstagramBusinessAccountId");

        if (string.IsNullOrWhiteSpace(token))
        {
            return new InstagramLoginSyncResult(false, 0, 0, 0, "Falta Meta:Instagram:LoginAccessToken.", null);
        }

        try
        {
            var me = await ObtenerInstagramLoginMeAsync(apiVersion, token);
            ownUserId ??= me.Id;
            professionalUserId = !string.IsNullOrWhiteSpace(me.UserId)
                ? me.UserId
                : professionalUserId;
            var conversationsOwnerId = !string.IsNullOrWhiteSpace(professionalUserId)
                ? professionalUserId
                : "me";

            var conversationsUrl =
                $"https://graph.instagram.com/{apiVersion}/{Uri.EscapeDataString(conversationsOwnerId)}/conversations" +
                "?fields=id,participants,updated_time,message_count";

            using var conversationsRequest = new HttpRequestMessage(HttpMethod.Get, conversationsUrl);
            conversationsRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var conversationsResponse = await _httpClient.SendAsync(conversationsRequest);
            var conversationsBody = await conversationsResponse.Content.ReadAsStringAsync();
            if (!conversationsResponse.IsSuccessStatusCode)
            {
                return new InstagramLoginSyncResult(
                    false,
                    0,
                    0,
                    0,
                    $"Instagram Login HTTP {(int)conversationsResponse.StatusCode}: {conversationsBody}",
                    BuildInstagramDiagnostic(conversationsOwnerId, conversationsUrl, conversationsBody));
            }

            using var conversationsDocument = JsonDocument.Parse(conversationsBody);
            if (!conversationsDocument.RootElement.TryGetProperty("data", out var data) ||
                data.ValueKind != JsonValueKind.Array)
            {
                return new InstagramLoginSyncResult(
                    true,
                    0,
                    0,
                    0,
                    null,
                    BuildInstagramDiagnostic(conversationsOwnerId, conversationsUrl, conversationsBody));
            }

            var conversaciones = 0;
            var mensajesLeidos = 0;
            var mensajesImportados = 0;

            foreach (var conversation in data.EnumerateArray())
            {
                var conversationId = ReadString(conversation, "id");
                if (string.IsNullOrWhiteSpace(conversationId)) continue;

                conversaciones++;
                var imported = await SincronizarInstagramLoginConversationAsync(
                    apiVersion,
                    token,
                    ownUserId,
                    conversationId,
                    inbound);

                mensajesLeidos += imported.Leidos;
                mensajesImportados += imported.Importados;
            }

            return new InstagramLoginSyncResult(
                true,
                conversaciones,
                mensajesLeidos,
                mensajesImportados,
                null,
                BuildInstagramDiagnostic(conversationsOwnerId, conversationsUrl, conversationsBody));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "No se pudo conectar con Instagram Login API.");
            return new InstagramLoginSyncResult(false, 0, 0, 0, $"No se pudo conectar con Instagram API: {ex.Message}", null);
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Tiempo agotado conectando con Instagram Login API.");
            return new InstagramLoginSyncResult(false, 0, 0, 0, "Tiempo agotado conectando con Instagram API. Revisa internet/firewall y vuelve a intentar.", null);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Instagram Login API devolvio JSON invalido.");
            return new InstagramLoginSyncResult(false, 0, 0, 0, $"Instagram devolvio una respuesta invalida: {ex.Message}", null);
        }
    }

    private async Task<InstagramLoginMe> ObtenerInstagramLoginMeAsync(string apiVersion, string token)
    {
        var url = $"https://graph.instagram.com/{apiVersion}/me?fields=id,user_id,username,account_type";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return new InstagramLoginMe(null, null);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return new InstagramLoginMe(
            ReadString(document.RootElement, "id"),
            ReadString(document.RootElement, "user_id"));
    }

    private async Task<(int Leidos, int Importados)> SincronizarInstagramLoginConversationAsync(
        string apiVersion,
        string token,
        string? ownUserId,
        string conversationId,
        SocialInboundService inbound)
    {
        var url =
            $"https://graph.instagram.com/{apiVersion}/{Uri.EscapeDataString(conversationId)}/messages" +
            "?fields=id,created_time,from,to,message";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Instagram Login no devolvio mensajes para conversacion {ConversationId}. HTTP {StatusCode}: {Body}",
                conversationId,
                (int)response.StatusCode,
                body);
            return (0, 0);
        }

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("data", out var data) ||
            data.ValueKind != JsonValueKind.Array)
        {
            return (0, 0);
        }

        var leidos = 0;
        var importados = 0;
        foreach (var message in data.EnumerateArray().Reverse())
        {
            leidos++;
            var messageId = ReadString(message, "id");
            var text = ReadString(message, "message");
            var fromId = ReadNestedString(message, "from", "id");
            var fromUsername = ReadNestedString(message, "from", "username") ??
                ReadNestedString(message, "from", "name") ??
                "Instagram";

            if (string.IsNullOrWhiteSpace(messageId) ||
                string.IsNullOrWhiteSpace(text) ||
                string.IsNullOrWhiteSpace(fromId) ||
                (!string.IsNullOrWhiteSpace(ownUserId) && fromId.Equals(ownUserId, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            await inbound.RegistrarMensajeEntranteAsync(new SocialInboundMessage(
                CanalSocial.Instagram,
                conversationId,
                fromId,
                fromUsername,
                text,
                "text",
                messageId));

            importados++;
        }

        return (leidos, importados);
    }

    public async Task<MetaContactProfile?> ObtenerPerfilContactoAsync(
        string canal,
        string externalUserId,
        string? pageId = null)
    {
        var result = await ObtenerPerfilContactoDetalladoAsync(canal, externalUserId, pageId);
        return result.Profile;
    }

    public async Task<MetaProfileLookupResult> ObtenerPerfilContactoDetalladoAsync(
        string canal,
        string externalUserId,
        string? pageId = null)
    {
        var normalized = CanalSocial.Normalizar(canal);
        var configuredPageId = normalized == CanalSocial.Instagram
            ? GetValue("Meta:Instagram:PageId")
            : GetValue("Meta:Facebook:PageId");
        var configuredToken = normalized == CanalSocial.Instagram
            ? GetValue("Meta:Instagram:AccessToken")
            : GetValue("Meta:Facebook:AccessToken");

        if (string.IsNullOrWhiteSpace(configuredToken) || string.IsNullOrWhiteSpace(externalUserId))
        {
            return MetaProfileLookupResult.Failed(
                "Falta Page Access Token o identificador externo del contacto.",
                configuredPageId,
                pageId);
        }

        if (!string.IsNullOrWhiteSpace(pageId) &&
            !string.IsNullOrWhiteSpace(configuredPageId) &&
            !pageId.Equals(configuredPageId, StringComparison.OrdinalIgnoreCase))
        {
            return MetaProfileLookupResult.Failed(
                $"El mensaje llego para la pagina {pageId}, pero en Conexiones esta guardada la pagina {configuredPageId}. Guarda el Page Access Token de esa misma pagina.",
                configuredPageId,
                pageId);
        }

        var apiVersion = GetValue("Meta:ApiVersion") ??
            _configuration["Meta:ApiVersion"] ??
            "v25.0";
        var fields = normalized == CanalSocial.Instagram
            ? "name,username,profile_pic"
            : "first_name,last_name,name,profile_pic";
        var accessToken = await ResolvePageAccessTokenAsync(apiVersion, configuredPageId, configuredToken);
        var url =
            $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(externalUserId)}" +
            $"?fields={Uri.EscapeDataString(fields)}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        try
        {
            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Meta Graph API no devolvio perfil para {Canal}/{ExternalUserId}. HTTP {StatusCode}: {Body}",
                    normalized,
                    externalUserId,
                    (int)response.StatusCode,
                    body);
                return MetaProfileLookupResult.Failed(
                    $"Meta no devolvio perfil. HTTP {(int)response.StatusCode}: {body}",
                    configuredPageId,
                    pageId);
            }

            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            var firstName = ReadString(root, "first_name");
            var lastName = ReadString(root, "last_name");
            var name = ReadString(root, "name");
            var username = ReadString(root, "username");
            var picture = ReadString(root, "profile_pic");
            var displayName = JoinName(firstName, lastName) ?? name ?? username;

            if (string.IsNullOrWhiteSpace(displayName) && string.IsNullOrWhiteSpace(picture))
            {
                return MetaProfileLookupResult.Failed(
                    "Meta respondio, pero no devolvio nombre ni foto para este usuario.",
                    configuredPageId,
                    pageId);
            }

            return MetaProfileLookupResult.Ok(
                new MetaContactProfile(displayName, username, picture),
                configuredPageId,
                pageId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "No se pudo consultar perfil de Meta para {Canal}/{ExternalUserId}.",
                normalized,
                externalUserId);
            return MetaProfileLookupResult.Failed(ex.Message, configuredPageId, pageId);
        }
    }

    private async Task<string> ResolvePageAccessTokenAsync(
        string apiVersion,
        string? pageId,
        string configuredToken)
    {
        if (string.IsNullOrWhiteSpace(pageId))
        {
            return configuredToken;
        }

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
            return configuredToken;
        }

        using var accountsDocument = JsonDocument.Parse(accountsBody);
        if (!accountsDocument.RootElement.TryGetProperty("data", out var data) ||
            data.ValueKind != JsonValueKind.Array)
        {
            return configuredToken;
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

        return configuredToken;
    }

    private async Task<MetaChannelInsight> ObtenerFacebookAsync(long since, long until)
    {
        var pageId = GetValue("Meta:Facebook:PageId");
        var token = GetValue("Meta:Facebook:AccessToken");

        if (string.IsNullOrWhiteSpace(pageId) || string.IsNullOrWhiteSpace(token))
        {
            return MetaChannelInsight.NotConfigured(CanalSocial.Facebook, "Facebook");
        }

        var metrics = await GetInsightsAsync(
            pageId,
            token,
            "page_impressions,page_post_engagements,page_fans",
            "day",
            since,
            until);

        return new MetaChannelInsight(
            CanalSocial.Facebook,
            "Facebook",
            true,
            GetMetric(metrics, "page_fans"),
            GetMetric(metrics, "page_impressions"),
            GetMetric(metrics, "page_post_engagements"),
            0,
            metrics.Errors);
    }

    private async Task<MetaChannelInsight> ObtenerInstagramAsync(long since, long until)
    {
        var instagramId = GetValue("Meta:Instagram:InstagramBusinessAccountId");
        var token = GetValue("Meta:Instagram:AccessToken");

        if (string.IsNullOrWhiteSpace(instagramId) || string.IsNullOrWhiteSpace(token))
        {
            return MetaChannelInsight.NotConfigured(CanalSocial.Instagram, "Instagram");
        }

        var metrics = await GetInsightsAsync(
            instagramId,
            token,
            "reach,profile_views,website_clicks",
            "day",
            since,
            until);

        return new MetaChannelInsight(
            CanalSocial.Instagram,
            "Instagram",
            true,
            GetMetric(metrics, "reach"),
            GetMetric(metrics, "reach"),
            GetMetric(metrics, "profile_views") + GetMetric(metrics, "website_clicks"),
            GetMetric(metrics, "profile_views"),
            metrics.Errors);
    }

    private async Task<MetaInsightMetrics> GetInsightsAsync(
        string objectId,
        string accessToken,
        string metric,
        string period,
        long since,
        long until)
    {
        var apiVersion = GetValue("Meta:ApiVersion") ??
            _configuration["Meta:ApiVersion"] ??
            "v25.0";
        var url =
            $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(objectId)}/insights" +
            $"?metric={Uri.EscapeDataString(metric)}" +
            $"&period={Uri.EscapeDataString(period)}" +
            $"&since={since}" +
            $"&until={until}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        try
        {
            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Meta Graph API devolvió HTTP {StatusCode}: {Body}",
                    (int)response.StatusCode,
                    body);

                return MetaInsightMetrics.WithError($"HTTP {(int)response.StatusCode}: {body}");
            }

            return ParseMetrics(body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudieron obtener métricas de Meta para {ObjectId}.", objectId);
            return MetaInsightMetrics.WithError(ex.Message);
        }
    }

    private static MetaInsightMetrics ParseMetrics(string body)
    {
        var metrics = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("data", out var data) ||
            data.ValueKind != JsonValueKind.Array)
        {
            return new MetaInsightMetrics(metrics, []);
        }

        foreach (var metricNode in data.EnumerateArray())
        {
            if (!metricNode.TryGetProperty("name", out var nameProperty)) continue;
            var name = nameProperty.GetString();
            if (string.IsNullOrWhiteSpace(name)) continue;

            long total = 0;
            if (metricNode.TryGetProperty("values", out var values) &&
                values.ValueKind == JsonValueKind.Array)
            {
                foreach (var valueNode in values.EnumerateArray())
                {
                    if (!valueNode.TryGetProperty("value", out var value)) continue;
                    total += ReadLong(value);
                }
            }

            metrics[name] = total;
        }

        return new MetaInsightMetrics(metrics, []);
    }

    private static long ReadLong(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number))
        {
            return number;
        }

        if (value.ValueKind == JsonValueKind.Object)
        {
            long total = 0;
            foreach (var property in value.EnumerateObject())
            {
                total += ReadLong(property.Value);
            }

            return total;
        }

        return 0;
    }

    private static long GetMetric(MetaInsightMetrics metrics, string key) =>
        metrics.Values.TryGetValue(key, out var value) ? value : 0;

    private static string? ReadString(JsonElement root, string property) =>
        root.TryGetProperty(property, out var value) &&
        value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string? ReadNestedString(JsonElement root, string parent, string property) =>
        root.TryGetProperty(parent, out var parentNode) &&
        parentNode.ValueKind == JsonValueKind.Object &&
        parentNode.TryGetProperty(property, out var value) &&
        value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string BuildInstagramDiagnostic(string ownerId, string url, string body)
    {
        var safeUrl = url.Split('?')[0];
        var shortBody = body.Length > 500 ? $"{body[..500]}..." : body;
        return $"Owner usado: {ownerId}; endpoint: {safeUrl}; respuesta: {shortBody}";
    }

    private static string? JoinName(string? firstName, string? lastName)
    {
        var parts = new[] { firstName, lastName }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(part => part!.Trim())
            .ToArray();

        return parts.Length == 0 ? null : string.Join(" ", parts);
    }

    private string? GetValue(string key) =>
        _socialIntegrations.GetConfiguredValue(key) ?? _configuration[key];
}

public sealed record MetaContactProfile(
    string? DisplayName,
    string? Username,
    string? ProfilePictureUrl);

public sealed record InstagramLoginSyncResult(
    bool Success,
    int Conversaciones,
    int MensajesLeidos,
    int MensajesImportados,
    string? Error,
    string? Diagnostic);

internal sealed record InstagramLoginMe(
    string? Id,
    string? UserId);

public sealed record MetaProfileLookupResult(
    bool Success,
    MetaContactProfile? Profile,
    string? Error,
    string? ConfiguredPageId,
    string? WebhookPageId)
{
    public static MetaProfileLookupResult Ok(
        MetaContactProfile profile,
        string? configuredPageId,
        string? webhookPageId) =>
        new(true, profile, null, configuredPageId, webhookPageId);

    public static MetaProfileLookupResult Failed(
        string error,
        string? configuredPageId,
        string? webhookPageId) =>
        new(false, null, error, configuredPageId, webhookPageId);
}

public sealed record MetaDashboardResult(
    IReadOnlyList<MetaChannelInsight> Canales,
    bool Success);

public sealed record MetaChannelInsight(
    string Canal,
    string Nombre,
    bool Configurado,
    long Alcance,
    long Impresiones,
    long Interacciones,
    long VisitasPerfil,
    IReadOnlyList<string> Errors)
{
    public static MetaChannelInsight NotConfigured(string canal, string nombre) =>
        new(canal, nombre, false, 0, 0, 0, 0, []);
}

public sealed record MetaInsightMetrics(
    IReadOnlyDictionary<string, long> Values,
    IReadOnlyList<string> Errors)
{
    public static MetaInsightMetrics WithError(string error) =>
        new(new Dictionary<string, long>(), [error]);
}
