using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace CRM.Data.Services;

public sealed class WhatsAppCloudApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WhatsAppCloudApiService> _logger;

    public WhatsAppCloudApiService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<WhatsAppCloudApiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public bool ShouldSendToMeta =>
        bool.TryParse(_configuration["WhatsApp:SendMessagesToMeta"], out var enabled) &&
        enabled &&
        IsConfigured;

    private bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_configuration["WhatsApp:AccessToken"]) &&
        !string.IsNullOrWhiteSpace(_configuration["WhatsApp:PhoneNumberId"]);

    public Task<string?> SendTextMessageAsync(
        string to,
        string text,
        CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            messaging_product = "whatsapp",
            recipient_type = "individual",
            to,
            type = "text",
            text = new
            {
                preview_url = false,
                body = text
            }
        };

        return SendMessageAsync(payload, cancellationToken);
    }

    public async Task<WhatsAppMediaDownload> DownloadMediaAsync(
        string mediaId,
        CancellationToken cancellationToken = default)
    {
        var accessToken = Required("WhatsApp:AccessToken");
        var apiVersion = _configuration["WhatsApp:ApiVersion"] ?? "v25.0";
        using var metadataRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"https://graph.facebook.com/{apiVersion}/{mediaId}");
        metadataRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var metadataResponse = await _httpClient.SendAsync(metadataRequest, cancellationToken);
        var metadataBody = await metadataResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!metadataResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Meta no devolvió la información del archivo. HTTP {(int)metadataResponse.StatusCode}: {metadataBody}");
        }

        using var metadata = JsonDocument.Parse(metadataBody);
        var root = metadata.RootElement;
        var downloadUrl = root.GetProperty("url").GetString();
        if (string.IsNullOrWhiteSpace(downloadUrl))
        {
            throw new InvalidOperationException("Meta no devolvió la URL del archivo.");
        }

        using var fileRequest = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        fileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var fileResponse = await _httpClient.SendAsync(fileRequest, cancellationToken);
        if (!fileResponse.IsSuccessStatusCode)
        {
            var fileError = await fileResponse.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"Meta no permitió descargar el archivo. HTTP {(int)fileResponse.StatusCode}: {fileError}");
        }

        var bytes = await fileResponse.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = root.TryGetProperty("mime_type", out var mimeType)
            ? mimeType.GetString() ?? "application/octet-stream"
            : "application/octet-stream";

        return new WhatsAppMediaDownload(bytes, contentType);
    }

    public Task<string?> SendMediaMessageAsync(
        string to,
        string type,
        string url,
        string? fileName,
        string? caption,
        CancellationToken cancellationToken = default)
    {
        var normalizedType = type.Equals("image", StringComparison.OrdinalIgnoreCase)
            ? "image"
            : "document";

        object media = normalizedType == "image"
            ? new { link = url, caption }
            : new { link = url, filename = fileName, caption };

        var payload = new Dictionary<string, object?>
        {
            ["messaging_product"] = "whatsapp",
            ["recipient_type"] = "individual",
            ["to"] = to,
            ["type"] = normalizedType,
            [normalizedType] = media
        };

        return SendMessageAsync(payload, cancellationToken);
    }

    private async Task<string?> SendMessageAsync(
        object payload,
        CancellationToken cancellationToken)
    {
        var accessToken = Required("WhatsApp:AccessToken");
        var phoneNumberId = Required("WhatsApp:PhoneNumberId");
        var apiVersion = _configuration["WhatsApp:ApiVersion"];
        if (string.IsNullOrWhiteSpace(apiVersion))
        {
            apiVersion = "v25.0";
        }

        var endpoint = $"https://graph.facebook.com/{apiVersion}/{phoneNumberId}/messages";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "META WHATSAPP ERROR => HTTP {StatusCode}: {ResponseBody}",
                (int)response.StatusCode,
                responseBody);

            throw new InvalidOperationException(
                $"Meta rechazo el mensaje. HTTP {(int)response.StatusCode}: {responseBody}");
        }

        using var json = JsonDocument.Parse(responseBody);
        if (json.RootElement.TryGetProperty("messages", out var messages))
        {
            var firstMessage = messages.EnumerateArray().FirstOrDefault();
            if (firstMessage.ValueKind != JsonValueKind.Undefined &&
                firstMessage.TryGetProperty("id", out var id))
            {
                return id.GetString();
            }
        }

        return null;
    }

    private string Required(string key)
    {
        var value = _configuration[key];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Falta configurar {key}.");
        }

        return value;
    }
}

public sealed record WhatsAppMediaDownload(byte[] Content, string ContentType);
