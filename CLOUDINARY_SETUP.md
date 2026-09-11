# Configuración de Cloudinary

## Descripción del problema resuelto
El error `"Upload preset must be specified when using unsigned upload"` ocurría porque:
1. Faltaba `api_secret` (credencial) o era incorrecto, impidiendo una subida firmada válida
2. No se especificaba `upload_preset` para una subida no firmada

## Soluciones disponibles (elige una)

### Opción A: Subida Firmada (Recomendado para producción)

1. **Obtén tus credenciales en Cloudinary dashboard:**
   - Cloud Name: `https://cloudinary.com/console/settings/account`
   - API Key: En Account Settings > API Keys
   - API Secret: En Account Settings > API Keys (mantener secreto)

2. **Configura en appsettings.json o secrets:**
   ```json
   {
	 "Cloudinary": {
	   "CloudName": "tu_cloud_name",
	   "ApiKey": "tu_api_key",
	   "ApiSecret": "tu_api_secret"
	 }
   }
   ```

3. **No incluyas `Cloudinary:UploadPreset`** o déjalo vacío. El código detectará automáticamente que es subida firmada.

### Opción B: Subida No Firmada (Más simple, menor seguridad)

1. **Crea un Upload Preset en Cloudinary:**
   - Ve a Settings > Upload > Add upload preset
   - Nombre: ej. `crm_unsigned`
   - Signing Mode: `Unsigned`
   - Resource type: `Auto`
   - Folder: `crm_uploads` (opcional)
   - Guardar

2. **Configura en appsettings.json:**
   ```json
   {
	 "Cloudinary": {
	   "CloudName": "tu_cloud_name",
	   "ApiKey": "tu_api_key",
	   "ApiSecret": "no_necesario_para_unsigned",
	   "UploadPreset": "crm_unsigned"
	 }
   }
   ```

3. El código usará automáticamente `upload_preset` en lugar de firma.

## Cambios implementados

✅ **Soporte dual:** El código detecta automáticamente si usar subida firmada o no firmada
✅ **Logging mejorado:** Ahora registra el tipo de subida, CloudName, folder y resultados
✅ **Manejo de errores:** Incluye logging de errores HTTP y TimeoutException
✅ **Inyección de logger:** Se requiere `ILogger<CloudinaryStorageService>` en el constructor

## Actualizar registro de dependencias

Si usas ASP.NET Core, asegurate de que el servicio esté registrado con ILogger:

```csharp
services.AddHttpClient<CloudinaryStorageService>();
// O si registras manualmente:
services.AddScoped<CloudinaryStorageService>();
```

La inyección de ILogger ocurre automáticamente en ASP.NET Core.

## Prueba rápida

```csharp
// El código ahora mostrará logs como:
// "Iniciando carga en Cloudinary: CloudName=mi_cloud, Folder=perfil, Signed=True"
// Si hay error: "Cloudinary rechazó la carga: StatusCode=400, Body={...}"
```

## Solución de problemas adicionales

| Error | Causa | Solución |
|-------|-------|----------|
| "Falta configurar Cloudinary:CloudName" | CloudName no en config | Verificar appsettings.json o secrets |
| StatusCode 401 | API Key inválida | Verificar credenciales en Cloudinary |
| StatusCode 403 | API Secret incorrecto | Confirmar ApiSecret es exacto (sin espacios) |
| Timeout | Red lenta o URL inválida | Aumentar HttpClient.Timeout si es necesario |

