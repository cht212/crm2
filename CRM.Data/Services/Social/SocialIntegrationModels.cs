namespace CRM.Data.Services;

public sealed record SocialChannelStatus(
    string Canal,
    string Nombre,
    string Provider,
    bool Connected,
    string WebhookUrl,
    string? OauthStartUrl,
    IReadOnlyList<SocialRequiredConfig> RequiredConfig,
    IReadOnlyList<string> NetworkAllowList);

public sealed record SocialRequiredConfig(string Key, bool Configured);

public sealed record SocialOauthStart(
    bool Ready,
    string? AuthorizationUrl,
    IReadOnlyList<string> MissingConfig,
    string Message);

public sealed record SocialChannelConfiguration(
    string Canal,
    IReadOnlyList<SocialConfigField> Fields);

public sealed record SocialConfigField(
    string Key,
    string Label,
    bool Secret,
    bool Required,
    bool Configured,
    string? Value);

public sealed record SocialConfigFieldDefinition(
    string Key,
    string Label,
    bool Secret,
    bool Required);

public sealed class SocialIntegrationSettingsFile
{
    public Dictionary<string, string> Values { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
