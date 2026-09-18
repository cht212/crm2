﻿using System.Text.Json;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api/whatsapp/conversaciones")]
[Authorize]
public class WhatsAppAttachmentsController : ControllerBase
{
    private static readonly HashSet<string> ExtensionesPermitidas = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> ExtensionesImagen = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    // Antes se guardaba siempre "document", por lo que el front nunca podía
    // distinguir una imagen de un PDF/Word y jamás mostraba una miniatura.
    private static string DeterminarTipo(string extension) =>
        ExtensionesImagen.Contains(extension) ? "image" : "document";

    private const long TamanoMaximo = 15 * 1024 * 1024;
    private readonly WhatsAppService _whatsappService;
    private readonly CloudinaryStorageService _storage;

    public WhatsAppAttachmentsController(
        WhatsAppService whatsappService,
        CloudinaryStorageService storage)
    {
        _whatsappService = whatsappService;
        _storage = storage;
    }

    [HttpPost("{conversacionId:long}/archivos")]
    [RequestSizeLimit(TamanoMaximo)]
    public async Task<IActionResult> EnviarArchivo(
        long conversacionId,
        [FromForm] IFormFile archivo,
        [FromForm] string? usuarioId,
        CancellationToken cancellationToken)
    {
        if (conversacionId <= 0)
        {
            return BadRequest("La conversación es obligatoria.");
        }

        if (archivo == null || archivo.Length == 0)
        {
            return BadRequest("El archivo es obligatorio.");
        }

        if (archivo.Length > TamanoMaximo)
        {
            return BadRequest("El archivo supera el límite de 15 MB.");
        }

        var extension = Path.GetExtension(archivo.FileName);
        if (!ExtensionesPermitidas.Contains(extension))
        {
            return BadRequest("Tipo de archivo no permitido.");
        }

        if (!TryParseUsuarioId(usuarioId, out var usuarioIdParsed))
        {
            return BadRequest(new { success = false, message = "El usuario no es valido." });
        }

        var resultado = await _storage.UploadAsync(archivo, "crm-hpd", cancellationToken);
        var urlPublica = resultado.SecureUrl;
        var contenido = JsonSerializer.Serialize(new
        {
            nombre = Path.GetFileName(archivo.FileName),
            url = urlPublica,
            mimeType = archivo.ContentType,
            tamano = archivo.Length,
            publicId = resultado.PublicId
        });

        var mensajeId = await _whatsappService.ProcesarMensajeSalienteAsync(
            conversacionId,
            contenido,
            usuarioIdParsed,
            DeterminarTipo(extension),
            null);

        return Ok(new
        {
            success = true,
            mensajeId,
            url = urlPublica
        });
    }

    private static bool TryParseUsuarioId(string? value, out long? usuarioId)
    {
        usuarioId = null;
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        if (long.TryParse(value, out var parsed) && parsed > 0)
        {
            usuarioId = parsed;
            return true;
        }

        return false;
    }
}
