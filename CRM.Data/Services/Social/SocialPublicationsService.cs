using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CRM.Data.Models;

namespace CRM.Data.Services;

public sealed record SocialPublication(string Canal, string Id, DateTimeOffset PublicadoEn,
    string Texto, string? Url, string? ImagenUrl, long MeGusta, long Comentarios,
    long Compartidos, long Visualizaciones);

public sealed record SocialPublicationChannel(string Canal, bool Configured, string? Error,
    bool Partial, IReadOnlyList<SocialPublication> Posts);

public sealed record SocialPublicationDay(DateOnly Fecha, string Canal, int Publicaciones,
    long MeGusta, long Comentarios, long Compartidos, long Visualizaciones);

public sealed record SocialPublicationReport(DateOnly Desde, DateOnly Hasta,
    IReadOnlyList<SocialPublicationChannel> Canales, IReadOnlyList<SocialPublicationDay> Serie);

public sealed class SocialPublicationsService
{
    private readonly HttpClient _http;
    private readonly SocialIntegrationService _settings;
    private readonly MetaGraphApiService _meta;

    public SocialPublicationsService(HttpClient http, SocialIntegrationService settings, MetaGraphApiService meta)
    {
        _http = http;
        _settings = settings;
        _meta = meta;
    }

    public async Task<SocialPublicationReport> GetReportAsync(DateOnly desde, DateOnly hasta, CancellationToken ct)
    {
        var channels = new[]
        {
            await FacebookAsync(desde, hasta),
            await InstagramAsync(desde, hasta, ct),
            await TikTokAsync(desde, hasta, ct)
        };
        var series = channels.SelectMany(c => c.Posts)
            .GroupBy(p => new { Fecha = DateOnly.FromDateTime(p.PublicadoEn.UtcDateTime), p.Canal })
            .Select(g => new SocialPublicationDay(g.Key.Fecha, g.Key.Canal, g.Count(),
                g.Sum(p => p.MeGusta), g.Sum(p => p.Comentarios),
                g.Sum(p => p.Compartidos), g.Sum(p => p.Visualizaciones)))
            .OrderBy(x => x.Fecha).ThenBy(x => x.Canal).ToArray();
        return new SocialPublicationReport(desde, hasta, channels, series);
    }

    private async Task<SocialPublicationChannel> FacebookAsync(DateOnly desde, DateOnly hasta)
    {
        var result = await _meta.ObtenerFacebookFeedAsync(desde.ToDateTime(TimeOnly.MinValue),
            hasta.ToDateTime(TimeOnly.MinValue), 25);
        var posts = result.Posts.Select(p => new SocialPublication(CanalSocial.Facebook, p.Id,
            DateTimeOffset.TryParse(p.CreatedTime, out var at) ? at : DateTimeOffset.MinValue,
            p.Message, p.PermalinkUrl, p.MediaUrl, p.Likes, p.Comments, p.Shares, p.Impressions))
            .Where(p => InRange(p.PublicadoEn, desde, hasta)).ToArray();
        return new SocialPublicationChannel(CanalSocial.Facebook,
            _settings.GetConfiguredValue("Meta:Facebook:PageId") != null,
            result.Error, result.Posts.Count >= 25, posts);
    }

    private async Task<SocialPublicationChannel> InstagramAsync(DateOnly desde, DateOnly hasta, CancellationToken ct)
    {
        var id = _settings.GetConfiguredValue("Meta:Instagram:InstagramBusinessAccountId");
        var token = _settings.GetConfiguredValue("Meta:Instagram:AccessToken");
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(token))
            return new(CanalSocial.Instagram, false,
                "Configura Instagram Professional User ID y el token con permiso de lectura de medios.", false, []);

        var posts = new List<SocialPublication>();
        string? after = null;
        var partial = false;
        try
        {
            for (var page = 0; page < 5; page++)
            {
                var version = _settings.GetConfiguredValue("Meta:ApiVersion") ?? "v25.0";
                var url = $"https://graph.facebook.com/{version}/{Uri.EscapeDataString(id)}/media" +
                    "?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25" +
                    (after == null ? "" : $"&after={Uri.EscapeDataString(after)}");
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                using var response = await _http.SendAsync(request, ct);
                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                if (!response.IsSuccessStatusCode)
                    return new(CanalSocial.Instagram, true, ApiError(doc.RootElement), partial, posts);
                var root = doc.RootElement;
                if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array) break;
                var oldest = DateTimeOffset.MaxValue;
                foreach (var item in data.EnumerateArray())
                {
                    if (!DateTimeOffset.TryParse(Str(item, "timestamp"), out var at)) continue;
                    if (at < oldest) oldest = at;
                    if (!InRange(at, desde, hasta)) continue;
                    posts.Add(new(CanalSocial.Instagram, Str(item, "id") ?? "", at,
                        Str(item, "caption") ?? "", Str(item, "permalink"),
                        Str(item, "media_url") ?? Str(item, "thumbnail_url"),
                        Num(item, "like_count"), Num(item, "comments_count"), 0, 0));
                }
                after = root.TryGetProperty("paging", out var paging) &&
                    paging.TryGetProperty("cursors", out var cursors) ? Str(cursors, "after") : null;
                if (after == null || oldest.UtcDateTime.Date < desde.ToDateTime(TimeOnly.MinValue)) break;
                partial = page == 4;
            }
            return new(CanalSocial.Instagram, true, null, partial, posts);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return new(CanalSocial.Instagram, true, "No se pudo consultar Instagram: " + ex.Message, partial, posts);
        }
    }

    private async Task<SocialPublicationChannel> TikTokAsync(DateOnly desde, DateOnly hasta, CancellationToken ct)
    {
        var token = _settings.GetConfiguredValue("TikTok:DisplayAccessToken");
        if (string.IsNullOrWhiteSpace(token))
            return new(CanalSocial.TikTok, false,
                "Configura el token de TikTok Display API con permiso video.list.", false, []);

        var posts = new List<SocialPublication>();
        long? cursor = null;
        var partial = false;
        try
        {
            for (var page = 0; page < 5; page++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Post,
                    "https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,title,video_description,cover_image_url,share_url,like_count,comment_count,share_count,view_count");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                request.Content = new StringContent(JsonSerializer.Serialize(new { max_count = 20, cursor }),
                    Encoding.UTF8, "application/json");
                using var response = await _http.SendAsync(request, ct);
                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                var root = doc.RootElement;
                if (!response.IsSuccessStatusCode ||
                    (root.TryGetProperty("error", out var err) && Str(err, "code") != "ok"))
                    return new(CanalSocial.TikTok, true, ApiError(root), partial, posts);
                if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("videos", out var videos)) break;
                var oldest = DateTimeOffset.MaxValue;
                foreach (var item in videos.EnumerateArray())
                {
                    var at = DateTimeOffset.FromUnixTimeSeconds(Num(item, "create_time"));
                    if (at < oldest) oldest = at;
                    if (!InRange(at, desde, hasta)) continue;
                    posts.Add(new(CanalSocial.TikTok, Str(item, "id") ?? "", at,
                        Str(item, "video_description") ?? Str(item, "title") ?? "",
                        Str(item, "share_url"), Str(item, "cover_image_url"),
                        Num(item, "like_count"), Num(item, "comment_count"),
                        Num(item, "share_count"), Num(item, "view_count")));
                }
                if (!data.TryGetProperty("has_more", out var more) || more.ValueKind != JsonValueKind.True ||
                    !data.TryGetProperty("cursor", out var next) || !next.TryGetInt64(out var nextCursor) ||
                    oldest.UtcDateTime.Date < desde.ToDateTime(TimeOnly.MinValue)) break;
                cursor = nextCursor;
                partial = page == 4;
            }
            return new(CanalSocial.TikTok, true, null, partial, posts);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or ArgumentOutOfRangeException)
        {
            return new(CanalSocial.TikTok, true, "No se pudo consultar TikTok: " + ex.Message, partial, posts);
        }
    }

    private static bool InRange(DateTimeOffset at, DateOnly from, DateOnly to) =>
        DateOnly.FromDateTime(at.UtcDateTime) is var day && day >= from && day <= to;

    private static string? Str(JsonElement node, string name) =>
        node.ValueKind == JsonValueKind.Object && node.TryGetProperty(name, out var value) &&
        value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static long Num(JsonElement node, string name) =>
        node.ValueKind == JsonValueKind.Object && node.TryGetProperty(name, out var value) &&
        value.TryGetInt64(out var number) ? number : 0;

    private static string ApiError(JsonElement root) =>
        root.TryGetProperty("error", out var error) && Str(error, "message") is { } message
            ? message : "La API rechazo la consulta. Revisa el token y los permisos.";
}
