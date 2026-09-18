using System.Text.Json;
using CRM.Data.Models;

namespace CRM.Data.Services;

public sealed class MetaWebhookService
{
    private readonly SocialInboundService _inbound;
    private readonly MetaGraphApiService _metaGraph;
    private readonly ILogger<MetaWebhookService> _logger;

    public MetaWebhookService(
        SocialInboundService inbound,
        MetaGraphApiService metaGraph,
        ILogger<MetaWebhookService> logger)
    {
        _inbound = inbound;
        _metaGraph = metaGraph;
        _logger = logger;
    }

    public async Task<int> ProcesarAsync(string rawBody)
    {
        using var document = JsonDocument.Parse(rawBody);
        var root = document.RootElement;
        var objectType = root.TryGetProperty("object", out var objectProperty)
            ? objectProperty.GetString()
            : null;
        var canalDefault = objectType?.Contains("instagram", StringComparison.OrdinalIgnoreCase) == true
            ? CanalSocial.Instagram
            : CanalSocial.Facebook;

        if (!root.TryGetProperty("entry", out var entries) ||
            entries.ValueKind != JsonValueKind.Array)
        {
            return 0;
        }

        var procesados = 0;
        foreach (var entry in entries.EnumerateArray())
        {
            procesados += await ProcesarMensajesAsync(entry, canalDefault);
            procesados += await ProcesarCambiosAsync(entry, canalDefault);
        }

        return procesados;
    }

    private async Task<int> ProcesarMensajesAsync(JsonElement entry, string canal)
    {
        if (!entry.TryGetProperty("messaging", out var messaging) ||
            messaging.ValueKind != JsonValueKind.Array)
        {
            return 0;
        }

        var procesados = 0;
        foreach (var item in messaging.EnumerateArray())
        {
            if (item.TryGetProperty("delivery", out _) ||
                item.TryGetProperty("read", out _) ||
                item.TryGetProperty("reaction", out _) ||
                item.TryGetProperty("postback", out _) ||
                item.TryGetProperty("optin", out _) ||
                item.TryGetProperty("account_linking", out _) ||
                item.TryGetProperty("standby", out _))
            {
                continue;
            }

            var senderId = ReadNestedString(item, "sender", "id");
            var recipientId = ReadNestedString(item, "recipient", "id");
            var message = item.TryGetProperty("message", out var messageNode)
                ? messageNode
                : default;

            if (message.ValueKind == JsonValueKind.Undefined)
            {
                continue;
            }

            var isEcho = message.TryGetProperty("is_echo", out var echoNode) &&
                echoNode.ValueKind == JsonValueKind.True;
            if (isEcho)
            {
                continue;
            }

            var text = message.TryGetProperty("text", out var textNode)
                ? textNode.GetString()
                : null;
            var externalMessageId = message.ValueKind != JsonValueKind.Undefined &&
                message.TryGetProperty("mid", out var midNode)
                    ? midNode.GetString()
                    : null;

            if (string.IsNullOrWhiteSpace(senderId) ||
                string.IsNullOrWhiteSpace(externalMessageId) ||
                string.IsNullOrWhiteSpace(text))
            {
                continue;
            }

            var profileResult = await _metaGraph.ObtenerPerfilContactoDetalladoAsync(canal, senderId, recipientId);
            if (!profileResult.Success)
            {
                _logger.LogWarning(
                    "No se pudo resolver perfil Meta para {Canal}/{SenderId}: {Error}",
                    canal,
                    senderId,
                    profileResult.Error);
            }

            var profile = profileResult.Profile;
            var displayName = profile?.DisplayName ??
                profile?.Username ??
                (canal == CanalSocial.Instagram ? "Instagram" : "Facebook");

            await _inbound.RegistrarMensajeEntranteAsync(new SocialInboundMessage(
                canal,
                senderId,
                senderId,
                displayName,
                text,
                "text",
                externalMessageId,
                profile?.ProfilePictureUrl));

            procesados++;
        }

        return procesados;
    }

    private async Task<int> ProcesarCambiosAsync(JsonElement entry, string canal)
    {
        if (!entry.TryGetProperty("changes", out var changes) ||
            changes.ValueKind != JsonValueKind.Array)
        {
            return 0;
        }

        var procesados = 0;
        foreach (var change in changes.EnumerateArray())
        {
            if (!change.TryGetProperty("value", out var value)) continue;

            var fromId = ReadNestedString(value, "from", "id") ??
                ReadNestedString(value, "sender", "id");
            var fromName = ReadNestedString(value, "from", "name") ??
                (canal == CanalSocial.Instagram ? "Instagram" : "Facebook");
            var text = value.TryGetProperty("text", out var textNode)
                ? textNode.GetString()
                : value.TryGetProperty("message", out var messageNode)
                    ? messageNode.GetString()
                    : null;

            if (string.IsNullOrWhiteSpace(fromId) || string.IsNullOrWhiteSpace(text))
            {
                continue;
            }

            var commentId = value.TryGetProperty("comment_id", out var commentIdNode)
                ? commentIdNode.GetString()
                : value.TryGetProperty("id", out var idNode)
                    ? idNode.GetString()
                    : null;

            await _inbound.RegistrarMensajeEntranteAsync(new SocialInboundMessage(
                canal,
                fromId,
                fromId,
                fromName,
                $"Comentario: {text}",
                "comment",
                commentId ?? $"{fromId}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}"));

            procesados++;
        }

        return procesados;
    }

    private static string? ReadNestedString(JsonElement element, string parent, string child)
    {
        return element.TryGetProperty(parent, out var parentElement) &&
            parentElement.ValueKind == JsonValueKind.Object &&
            parentElement.TryGetProperty(child, out var childElement)
                ? childElement.GetString()
                : null;
    }
}
