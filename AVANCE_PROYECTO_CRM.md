# Estado actual del proyecto CRM HPD

Fecha de actualización: 28 de septiembre de 2026

Este archivo registra el estado implementado del proyecto. No contiene una lista de propuestas ni un plan de trabajo.

## Aplicación

CRM HPD funciona como una aplicación web ASP.NET Core .NET 10 con frontend HTML, CSS y JavaScript, Entity Framework Core y SQL Server.

## Funciones disponibles

- autenticación por cookies;
- roles Administrador, Supervisor y Asesor;
- clientes y fichas de contacto;
- conversaciones y mensajes;
- WhatsApp Cloud API;
- Facebook e Instagram mediante Meta Graph API y webhooks;
- TikTok mediante webhook y consulta de publicaciones con Display API;
- bot de WhatsApp por conversación;
- tareas, oportunidades, notas, etiquetas y campañas;
- dashboard y reportes operativos por fecha;
- estadísticas de publicaciones por fecha para Facebook, Instagram y TikTok;
- exportación de reportes;
- configuración de conexiones desde el panel;
- auditoría y endpoints de salud.

## WhatsApp con varios números

El CRM admite varios números del mismo WABA mediante `WhatsApp:Numbers`. Cada entrada tiene `phoneNumberId` y `displayNumber`. El webhook lee el `metadata.phone_number_id`, lo guarda en la conversación y usa el mismo número para las respuestas posteriores. El campo `WhatsApp:PhoneNumberId` continúa disponible para una configuración de un solo número.

## Estadísticas de publicaciones

El endpoint `/api/integraciones/publicaciones/estadisticas` consulta publicaciones dentro de un rango de fechas. Reportes muestra por canal y por día la cantidad de publicaciones, enlaces, me gusta, comentarios, compartidos y visualizaciones.

Facebook utiliza el Page ID y Page Access Token. Instagram utiliza el identificador de cuenta profesional y su token. TikTok utiliza `TikTok:DisplayAccessToken` con el permiso `video.list`.

## Archivos

Cloudinary recibe los archivos cuando está configurado. Si no responde, el archivo se guarda en `App_Data/private-uploads` y se entrega mediante `/api/archivos/local/{nombre}` después de validar la sesión y el acceso al mensaje. `/uploads` no se sirve públicamente.

## Persistencia y seguridad

Las migraciones se aplican al inicio. Los intentos fallidos de login se guardan en `crm_login_attempt` y el bloqueo se comparte entre instancias. Las conversaciones almacenan el número de WhatsApp asociado en `c_phone_number_id`.

## Configuración operativa

Las integraciones se guardan en `App_Data/social-integrations.json` o se leen desde la configuración de la aplicación. Los secretos se muestran enmascarados y los campos editables se gestionan desde Conexiones.

## Endpoints principales

- `/api/health/live`
- `/api/health/ready`
- `/api/whatsapp/webhook`
- `/api/integraciones/meta/webhook`
- `/api/integraciones/tiktok/webhook`
- `/api/integraciones/meta/estadisticas`
- `/api/integraciones/meta/facebook/feed`
- `/api/integraciones/publicaciones/estadisticas`
