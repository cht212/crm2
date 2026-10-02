# Claves de conexiones de redes

Este archivo documenta las claves de prueba configuradas actualmente en el CRM.
Usalo como plantilla para saber que valores necesitaras reemplazar cuando pases
de cuentas de prueba a cuentas reales de empresa.

No compartas este archivo publicamente. Contiene tokens y secretos reales de la
cuenta de prueba.

## Meta general

Estas claves se comparten entre Facebook, Instagram y, en esta configuracion,
tambien WhatsApp.

| Clave en el CRM | Valor actual | Para que sirve |
|---|---|---|
| `Meta:AppId` | `1745636563370681` | ID de la app creada en Meta Developers. |
| `Meta:AppSecret` | `74c63d41c0ba59d8d74e6cf81f8893d3` | Secreto de la app Meta. |
| `Meta:WebhookVerifyToken` | `crm_hpd_meta_2026` | Token que Meta usa para verificar el webhook. |
| `Meta:ApiVersion` | `v26.0` | Version de Graph API usada por Facebook/Instagram. |

## Instagram

| Clave en el CRM | Valor actual | Para que sirve |
|---|---|---|
| `Meta:Instagram:PageId` | `1311354342063988` | Pagina de Facebook vinculada a Instagram. |
| `Meta:Instagram:InstagramBusinessAccountId` | `17841423991337948` | ID de la cuenta profesional de Instagram. |
| `Meta:Instagram:LoginUserId` | `29026570336950769` | ID devuelto por Instagram Login OAuth. |
| `Meta:Instagram:LoginAccessToken` | `IGAAZAmMz1ZBWK5BZAFpWU3BmeHNRSlZAvTXBVWXJ3dno3TFlvbXc1V3puOFVtcGR1SHJDdlRqQVdtU0Q4ZAktSSlQxY1dZAdVdhVUtUMS11eVM4U2VGVXFzdkl4VS1WTzNoSnFKSnVCcXFONl9QYmlhdUVKRFN3QWRDRkUzNDRkblZAvVQZDZD` | Token de Instagram Login. Actualmente no valida para comentarios. |
| `Meta:Instagram:AccessToken` | `EAAYzpa9EQrkBStBZAyOmvyziA9njQECmqF7S9ohokZBd9RsUNdQJT3ZCY8Ssr56nKutCJSk2CFxZCZBW2cZCv3vbEeN7dti60plZCOFvbLSGxgkuRC3rn69C7pzHiGkiavf3rf57vvw6ZAlRxwMPTudM85THdtNfGNxloXyXkKzuySVAt34pG8ZAwNtOMTRcWDzcs2kLBhVvR` | Token legacy/Page usado como respaldo para comentarios de Instagram. |

Permisos que debes pedir/autorizar para la cuenta real:

```text
instagram_business_basic
instagram_business_manage_comments
instagram_business_manage_messages
instagram_business_content_publish
```

Si usas el flujo legacy/Page como respaldo:

```text
instagram_basic
instagram_manage_comments
instagram_manage_messages
pages_show_list
pages_read_engagement
pages_manage_engagement
pages_manage_metadata
```

## Facebook

| Clave en el CRM | Valor actual | Para que sirve |
|---|---|---|
| `Meta:Facebook:PageId` | `1311354342063988` | ID de la pagina de Facebook. |
| `Meta:Facebook:AccessToken` | `EAAYzpa9EQrkBStBZAyOmvyziA9njQECmqF7S9ohokZBd9RsUNdQJT3ZCY8Ssr56nKutCJSk2CFxZCZBW2cZCv3vbEeN7dti60plZCOFvbLSGxgkuRC3rn69C7pzHiGkiavf3rf57vvw6ZAlRxwMPTudM85THdtNfGNxloXyXkKzuySVAt34pG8ZAwNtOMTRcWDzcs2kLBhVvR` | Page Access Token para Messenger, publicaciones y comentarios. |

Permisos que debes pedir/autorizar para la cuenta real:

```text
pages_show_list
pages_messaging
pages_read_engagement
pages_read_user_content
pages_manage_engagement
pages_manage_posts
pages_manage_metadata
read_insights
```

## WhatsApp

| Clave en el CRM | Valor actual | Para que sirve |
|---|---|---|
| `WhatsApp:AccessToken` | `EAAYzpa9EQrkBSiiHTTO6MBFBKSb5uIM1QO5qUr9cNy8nNqhZBVq61tuFOaymAVIHvfTfZAU7rUJZCSQPYFD3tGAjgOKgXFx7GZCfZCTRZCw4P2EZCW901Y3UHTMgkgQAN0NcWmycOSjmDgVqve1fG7K590onKckgOpkKG0PPI14HSL66c6KgW923WhlJZBstZCm1U09JXjQRzIptBCZBy9BjIyrhOIn2BZAxeS0OZAiq` | Token para WhatsApp Cloud API. |
| `WhatsApp:PhoneNumberId` | `1299028959963331` | ID del numero de WhatsApp Cloud API. |
| `WhatsApp:BusinessAccountId` | `1803129347780429` | ID del WhatsApp Business Account. |
| `WhatsApp:ApiVersion` | `v25.0` | Version de Graph API usada por WhatsApp. |
| `WhatsApp:SendMessagesToMeta` | `True` | Activa envio real de mensajes hacia Meta. |
| `WhatsApp:WebhookVerifyToken` | `Guarana` | Token de verificacion del webhook de WhatsApp. |
| `WhatsApp:AppSecret` | `74c63d41c0ba59d8d74e6cf81f8893d3` | Secreto de la app Meta usado para validar firmas. |

## TikTok

| Clave en el CRM | Valor actual | Para que sirve |
|---|---|---|
| `TikTok:PublicUrl` | `https://www.tiktok.com/@hpdglassgroup` | URL publica de la cuenta TikTok. |

Valores que faltarian si vas a conectar una cuenta TikTok real:

```text
TikTok:ClientKey
TikTok:ClientSecret
TikTok:WebhookSecret
TikTok:AdvertiserId
TikTok:AccessToken
TikTok:DisplayAccessToken
TikTok:RefreshToken
TikTok:OpenId
```

## Cloudflare R2

No hay claves R2 guardadas actualmente en `App_Data/social-integrations.json`.

Valores que necesitarias para una cuenta real:

```text
R2:AccountId
R2:AccessKeyId
R2:SecretAccessKey
R2:BucketName
```

## Sitio web

No hay `Website:PublicUrl` guardado actualmente en el archivo de conexiones.
El CRM tiene un valor por defecto en codigo:

```text
https://www.hpdglass.com/
```

## URLs que debes registrar al pasar a dominio real

Reemplaza `TU_DOMINIO` por el dominio definitivo del CRM:

```text
https://TU_DOMINIO/api/integraciones/meta/webhook
https://TU_DOMINIO/api/integraciones/instagram/oauth/callback
https://TU_DOMINIO/api/integraciones/facebook/oauth/callback
https://TU_DOMINIO/api/integraciones/tiktok/oauth/callback
https://TU_DOMINIO/api/whatsapp/webhook
```
