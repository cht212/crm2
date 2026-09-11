# WhatsApp Cloud API y CRM

## 1. Prueba local con la web estática

Para pruebas sin envío real usa temporalmente:

```json
{
  "WhatsApp": {
    "SendMessagesToMeta": false,
    "WebhookVerifyToken": "tu-token-de-verificacion",
    "AppSecret": ""
  }
}
```

Inicia la aplicación en el puerto local configurado:

```powershell
dotnet run --urls http://localhost:5005
```

La web estática estará disponible en:

```text
http://localhost:5005/
```

En este modo, los mensajes de prueba se guardan en SQL Server, pero las respuestas no se envían a un número real de WhatsApp.

## 2. Exponer el CRM para Meta

Inicia ngrok apuntando al puerto local:

```powershell
ngrok http 5005
```

Usa la URL HTTPS que muestre ngrok. La URL del webhook será:

```text
https://TU-DOMINIO-NGROK.ngrok-free.app/api/whatsapp/webhook
```

La URL debe ser HTTPS y la aplicación debe permanecer ejecutándose mientras Meta realiza las pruebas.

## 3. Configurar el webhook en Meta

En la configuración de la aplicación de Meta:

- Callback URL: `https://TU-DOMINIO-NGROK.ngrok-free.app/api/whatsapp/webhook`
- Verify token: el mismo valor de `WhatsApp:WebhookVerifyToken`
- Suscripción: `messages`

La verificación inicial usa:

```text
GET /api/whatsapp/webhook
```

Los eventos posteriores usan:

```text
POST /api/whatsapp/webhook
```

Cuando se configure `WhatsApp:AppSecret`, el CRM validará automáticamente la cabecera `X-Hub-Signature-256` enviada por Meta. Mientras esté vacío, la validación se omite solo para facilitar pruebas locales.

## 4. Activar el envío real

La configuración del proyecto ya tiene activado el envío real:

```json
"SendMessagesToMeta": true
```

Debes configurar `WhatsApp:AppSecret` con el App Secret de Meta. Ahora mismo ese valor está vacío, por lo que el webhook todavía no valida la firma `X-Hub-Signature-256`. No lo publiques ni lo guardes en el repositorio; usa User Secrets o una variable de entorno:

```powershell
dotnet user-secrets set "WhatsApp:AppSecret" "TU_APP_SECRET"
```

Reinicia el CRM después de modificar la configuración.

Con `true`, el flujo será:

```text
CRM -> WhatsApp Cloud API -> Meta -> Cliente
```

El mensaje se guarda en la base de datos después de que Meta acepte el envío. Si Meta lo rechaza, el CRM devuelve el error y no lo registra como enviado correctamente.

## 5. Archivos

- Los archivos salientes se suben a Cloudinary y después se envían a Meta mediante su URL pública.
- Los archivos entrantes recibidos por Meta se descargan usando el token de WhatsApp y se guardan en Cloudinary.
- La interfaz muestra imágenes y documentos desde la URL almacenada.
- El límite actual del endpoint de archivos es de 15 MB.

## 6. Prueba recomendada antes de activar Meta

1. Comprobar `GET http://localhost:5005/api`.
2. Abrir la web estática y seleccionar una conversación.
3. Enviar un texto con `SendMessagesToMeta=false`.
4. Adjuntar una imagen y enviarla desde el composer.
5. Revisar que el mensaje y la URL de Cloudinary aparezcan en el historial.
6. Configurar ngrok y verificar el webhook en Meta.
7. Añadir `AppSecret` mediante User Secrets.
8. Reiniciar la aplicación.
9. Probar primero con un número autorizado por Meta.
