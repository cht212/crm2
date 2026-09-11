using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CRM.Data.Services;

public sealed class CloudinaryStorageService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CloudinaryStorageService> _logger;

    public CloudinaryStorageService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<CloudinaryStorageService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<CloudinaryUploadResult> UploadAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken = default)
    {
        // ============================================================
        // VALIDAR ARCHIVO
        // ============================================================

        if (file == null)
        {
            throw new ArgumentNullException(nameof(file));
        }

        if (file.Length <= 0)
        {
            throw new InvalidOperationException(
                "El archivo está vacío.");
        }

        // ============================================================
        // CONFIGURACIÓN CLOUDINARY
        // ============================================================

        var cloudName = Required("Cloudinary:CloudName");
        var apiKey = Required("Cloudinary:ApiKey");
        var apiSecret = GetValue("Cloudinary:ApiSecret");
        var uploadPreset = GetValue("Cloudinary:UploadPreset") ?? string.Empty;
        var defaultFolder = GetValue("Cloudinary:Folder");
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var useUnsignedUpload = !string.IsNullOrWhiteSpace(uploadPreset);
        var useSignedUpload = !useUnsignedUpload && !string.IsNullOrWhiteSpace(apiSecret);

        if (!useSignedUpload && !useUnsignedUpload)
        {
            throw new InvalidOperationException(
                "Configura Cloudinary:ApiSecret para subida firmada o Cloudinary:UploadPreset para subida no firmada.");
        }

        if (string.IsNullOrWhiteSpace(folder))
        {
            folder = defaultFolder;
        }

        // ============================================================
        // ENDPOINT CLOUDINARY
        // ============================================================

        var endpoint =
            $"https://api.cloudinary.com/v1_1/{cloudName}/auto/upload";

        // ============================================================
        // LOG INICIAL
        // ============================================================

        _logger.LogInformation(
            "CLOUDINARY INICIO => CloudName={CloudName}, Signed={Signed}, UploadPresetConfigured={UploadPresetConfigured}, Folder={Folder}, FileName={FileName}, Size={Size}",
            cloudName,
            useSignedUpload,
            !string.IsNullOrWhiteSpace(uploadPreset),
            folder,
            file.FileName,
            file.Length);

        // ============================================================
        // ABRIR ARCHIVO
        // ============================================================

        await using var stream =
            file.OpenReadStream();

        // ============================================================
        // CREAR PETICIÓN MULTIPART EXACTA A CLOUDINARY
        // ============================================================
        // La implementación por defecto de MultipartFormDataContent en .NET no
        // coincide con la forma que Cloudinary acepta para uploads sin firma.
        // Construimos el cuerpo manualmente para imitar exactamente el formato
        // que validamos con curl.

        var boundary = $"----CRM-UPLOAD-{Guid.NewGuid():N}";
        var payload = new List<byte>();

        void Append(string value)
        {
            payload.AddRange(Encoding.UTF8.GetBytes(value));
        }

        var fileBytes = await ReadAllBytesAsync(stream);
        var fileName = Path.GetFileName(file.FileName);
        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        Append($"--{boundary}\r\n");
        Append($"Content-Disposition: form-data; name=\"file\"; filename=\"{fileName}\"\r\n");
        Append($"Content-Type: {contentType}\r\n\r\n");
        payload.AddRange(fileBytes);
        Append($"\r\n");

        if (useUnsignedUpload)
        {
            Append($"--{boundary}\r\n");
            Append("Content-Disposition: form-data; name=\"upload_preset\"\r\n\r\n");
            Append($"{uploadPreset}\r\n");

            if (!string.IsNullOrWhiteSpace(folder))
            {
                Append($"--{boundary}\r\n");
                Append("Content-Disposition: form-data; name=\"folder\"\r\n\r\n");
                Append($"{folder}\r\n");
            }
        }
        else if (useSignedUpload)
        {
            var signatureValues = new SortedDictionary<string, string>(StringComparer.Ordinal)
            {
                ["api_key"] = apiKey,
                ["timestamp"] = timestamp.ToString()
            };

            if (!string.IsNullOrWhiteSpace(folder))
            {
                signatureValues["folder"] = folder;
            }

            var signaturePayload = string.Join("&", signatureValues
                .Select(pair => $"{pair.Key}={pair.Value}"));

            Append($"--{boundary}\r\n");
            Append("Content-Disposition: form-data; name=\"api_key\"\r\n\r\n");
            Append($"{apiKey}\r\n");

            Append($"--{boundary}\r\n");
            Append("Content-Disposition: form-data; name=\"timestamp\"\r\n\r\n");
            Append($"{timestamp}\r\n");

            if (!string.IsNullOrWhiteSpace(folder))
            {
                Append($"--{boundary}\r\n");
                Append("Content-Disposition: form-data; name=\"folder\"\r\n\r\n");
                Append($"{folder}\r\n");
            }

            var signature = CreateSignature(signaturePayload, apiSecret!);
            Append($"--{boundary}\r\n");
            Append("Content-Disposition: form-data; name=\"signature\"\r\n\r\n");
            Append($"{signature}\r\n");
        }

        Append($"--{boundary}--\r\n");

        using var content = new ByteArrayContent(payload.ToArray());
        content.Headers.ContentType = MediaTypeHeaderValue.Parse($"multipart/form-data; boundary={boundary}");

        // ============================================================
        // MOSTRAR QUÉ SE ESTÁ ENVIANDO
        // ============================================================

        _logger.LogInformation(
            "CLOUDINARY PETICIÓN => Signed={Signed}, UploadPresetConfigured={UploadPresetConfigured}, UploadPreset={UploadPreset}",
            useSignedUpload,
            !string.IsNullOrWhiteSpace(uploadPreset),
            uploadPreset);

        _logger.LogInformation(
            "CLOUDINARY PETICIÓN => folder={Folder}",
            folder);

        try
        {
            // ========================================================
            // ENVIAR A CLOUDINARY
            // ========================================================

            using var response =
                await _httpClient.PostAsync(
                    endpoint,
                    content,
                    cancellationToken);

            // ========================================================
            // LEER RESPUESTA
            // ========================================================

            var responseBody =
                await response.Content.ReadAsStringAsync(
                    cancellationToken);

            // ========================================================
            // MOSTRAR RESPUESTA
            // ========================================================

            _logger.LogInformation(
                "CLOUDINARY RESPUESTA => HTTP {StatusCode}",
                (int)response.StatusCode);

            _logger.LogInformation(
                "CLOUDINARY RESPUESTA BODY => {ResponseBody}",
                responseBody);

            // ========================================================
            // SI CLOUDINARY DEVUELVE ERROR
            // ========================================================

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "CLOUDINARY ERROR => HTTP {StatusCode}: {Response}",
                    (int)response.StatusCode,
                    responseBody);

                throw new InvalidOperationException(
                    "Cloudinary rechazó el archivo. " +
                    $"HTTP {(int)response.StatusCode}: " +
                    $"{responseBody}");
            }

            // ========================================================
            // PROCESAR JSON
            // ========================================================

            using var json =
                JsonDocument.Parse(responseBody);

            var root =
                json.RootElement;

            // ========================================================
            // OBTENER SECURE URL
            // ========================================================

            string? secureUrl = null;

            if (root.TryGetProperty(
                "secure_url",
                out var secureUrlProperty))
            {
                secureUrl =
                    secureUrlProperty.GetString();
            }

            if (string.IsNullOrWhiteSpace(secureUrl))
            {
                _logger.LogError(
                    "Cloudinary no devolvió secure_url. Response={Response}",
                    responseBody);

                throw new InvalidOperationException(
                    "Cloudinary no devolvió secure_url.");
            }

            // ========================================================
            // OBTENER PUBLIC ID
            // ========================================================

            string publicId = string.Empty;

            if (root.TryGetProperty(
                "public_id",
                out var publicIdProperty))
            {
                publicId =
                    publicIdProperty.GetString()
                    ?? string.Empty;
            }

            // ========================================================
            // OBTENER RESOURCE TYPE
            // ========================================================

            string resourceType = "auto";

            if (root.TryGetProperty(
                "resource_type",
                out var resourceTypeProperty))
            {
                resourceType =
                    resourceTypeProperty.GetString()
                    ?? "auto";
            }

            // ========================================================
            // SUBIDA EXITOSA
            // ========================================================

            _logger.LogInformation(
                "CLOUDINARY ÉXITO => PublicId={PublicId}",
                publicId);

            _logger.LogInformation(
                "CLOUDINARY ÉXITO => SecureUrl={SecureUrl}",
                secureUrl);

            _logger.LogInformation(
                "CLOUDINARY ÉXITO => ResourceType={ResourceType}",
                resourceType);

            // ========================================================
            // DEVOLVER RESULTADO
            // ========================================================

            return new CloudinaryUploadResult(
                secureUrl,
                publicId,
                resourceType);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(
                ex,
                "CLOUDINARY => Error de conexión.");

            throw new InvalidOperationException(
                "No se pudo conectar con Cloudinary.",
                ex);
        }
    }

    // ================================================================
    // OBTENER CONFIGURACIÓN
    // ================================================================

    private string Required(string key)
    {
        var value = GetValue(key);

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Falta configurar {key} en appsettings.json o variables de entorno.");
        }

        return value;
    }

    private string? GetValue(string key)
    {
        var value = _configuration[key];
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var envKey = key
            .Replace("__", ":")
            .Replace(':', '_')
            .ToUpperInvariant();

        return Environment.GetEnvironmentVariable(envKey)
            ?? Environment.GetEnvironmentVariable(envKey.Replace("CLOUDINARY_", "Cloudinary_"));
    }

    private static async Task<byte[]> ReadAllBytesAsync(Stream stream)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        return ms.ToArray();
    }

    private static string CreateSignature(string parameters, string apiSecret)
    {
        var payload = Encoding.UTF8.GetBytes(parameters + apiSecret);
        var hash = SHA1.HashData(payload);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

// ====================================================================
// RESULTADO DE CLOUDINARY
// ====================================================================

public sealed record CloudinaryUploadResult(
    string SecureUrl,
    string PublicId,
    string ResourceType);
