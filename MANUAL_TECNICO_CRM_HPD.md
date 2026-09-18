# Manual tecnico operativo del CRM HPD

Fecha: 18 de septiembre de 2026

## 1. Proposito del sistema

El CRM HPD centraliza la atencion de clientes, principalmente por WhatsApp, y deja preparada la base para Facebook, Instagram y TikTok segun las reglas reales de cada plataforma.

El objetivo no es solo ver mensajes. El sistema convierte cada contacto en una ficha de trabajo: conversacion, datos del cliente, notas, tareas, ventas, etiquetas, asesor responsable, historial y reportes.

## 2. Arquitectura general

El sistema esta formado por:

- Frontend web en `wwwroot`: interfaz del CRM.
- Backend ASP.NET Core: APIs, reglas de negocio, autenticacion e integraciones.
- SQL Server LocalDB: base de datos del CRM.
- `App_Data`: configuraciones editables desde la interfaz.
- ngrok: tunel HTTPS temporal para desarrollo local.
- Cloudinary: publicacion de archivos con URL HTTPS.
- Meta APIs: WhatsApp, Facebook e Instagram.

Webhooks principales:

- WhatsApp: `/api/whatsapp/webhook`
- Facebook/Instagram: `/api/integraciones/meta/webhook`
- TikTok: `/api/integraciones/tiktok/webhook`

## 3. Roles y experiencia esperada

### Administrador

Debe ver todo porque configura, audita y supervisa el sistema completo.

Modulos visibles:

- Dashboard
- Comunicaciones
- Contactos
- Tareas
- Pipeline
- Ventas
- Reportes
- Comentarios
- Actividad
- Fallos
- Bot
- Conexiones
- Usuarios

Uso principal:

- Configurar canales.
- Crear usuarios.
- Revisar reportes.
- Auditar actividad.
- Ver errores de integracion.
- Ajustar bot y conexiones.

### Supervisor

Debe tener control operativo, pero no necesariamente administrar usuarios o secretos.

Modulos visibles:

- Dashboard
- Comunicaciones
- Contactos
- Tareas
- Pipeline
- Ventas
- Reportes
- Comentarios
- Actividad
- Fallos

Uso principal:

- Revisar carga de asesores.
- Asignar conversaciones.
- Supervisar tareas vencidas.
- Controlar ventas y seguimiento.
- Revisar fallos operativos.

### Asesor

Debe ver una interfaz simple. Su trabajo diario es atender, registrar seguimiento y cerrar ventas. No necesita conexiones, bot, usuarios, fallos tecnicos ni reportes ejecutivos.

Modulos visibles:

- Comunicaciones
- Contactos
- Tareas
- Ventas

Uso principal:

- Responder chats.
- Actualizar datos del cliente.
- Crear notas y tareas.
- Registrar oportunidades/ventas.
- Dar seguimiento a pendientes.

Estado actual del ajuste: el frontend ya oculta modulos avanzados para el rol `Asesor` y lo inicia directamente en `Comunicaciones`.

## 4. Modulos del CRM

### Dashboard

Pantalla ejecutiva para administradores y supervisores. Muestra salud operativa, canales, tareas, ventas, carga de asesores y alertas importantes.

No debe ser la pantalla principal del asesor porque puede saturarlo con informacion que no necesita.

### Comunicaciones

Es la bandeja de atencion. Muestra conversaciones por canal y permite:

- Ver chats.
- Filtrar por canal.
- Buscar cliente.
- Ver mensajes.
- Enviar respuestas.
- Usar plantillas rapidas.
- Adjuntar archivos.
- Abrir la ficha del cliente.

Para el asesor, esta es la pantalla principal.

### Ficha 360 del cliente

Panel lateral dentro de la conversacion. Centraliza:

- Datos del cliente.
- Etiquetas.
- Notas internas.
- Tareas.
- Ventas/oportunidades.
- Bot por conversacion.
- Actividad.

Sirve para que el asesor no tenga que saltar entre muchas pantallas.

### Contactos

Directorio de clientes. Permite buscar por:

- Cliente.
- Telefono.
- Canal.
- Asesor.
- Etiqueta.

Tambien permite abrir o crear conversaciones desde un contacto.

### Tareas

Seguimiento operativo. Se usa para llamadas, cotizaciones, recordatorios y pendientes.

Estados:

- Pendiente.
- Completada.
- Vencida.
- Cancelada.

Para el asesor debe funcionar como lista diaria de pendientes.

### Pipeline

Actualmente es un pipeline de atencion, no un embudo comercial puro. Ordena conversaciones por estado:

- Nuevo
- Abierto
- En atencion
- Esperando cliente
- Cotizacion enviada
- Cerrado
- Perdido
- No respondio

Recomendacion: mantenerlo para supervisor/admin. Para asesor puede ser demasiado pesado si su trabajo principal es responder y vender.

### Ventas

Modulo comercial de oportunidades. Es mas adecuado para asesores que el pipeline cuando se habla de ventas.

Etapas:

- Nueva
- Calificada
- Propuesta
- Negociacion
- Ganada
- Perdida

Uso esperado:

- Registrar oportunidades.
- Poner monto.
- Cambiar etapa.
- Marcar ganada/perdida.
- Revisar cierre estimado.

### Reportes

Vista de supervision y administracion. Resume:

- Clientes.
- Conversaciones.
- Mensajes.
- Tareas.
- Oportunidades.
- Monto abierto.
- Monto ganado.
- Carga por asesor.
- Canales.

No es necesario para asesor.

### Comentarios

Bandeja separada para comentarios de Facebook/Instagram cuando la API y webhooks correspondientes esten disponibles.

### Actividad

Auditoria del sistema. Permite saber que cambio, quien lo hizo y cuando.

Debe ser visible para admin/supervisor, no para asesor.

### Fallos

Historial tecnico de problemas de integracion, webhook o envio.

Debe ser visible para admin/supervisor. Sirve para diagnosticar errores sin abrir Visual Studio.

### Bot

Configura respuestas automaticas por canal. Actualmente el uso real esta centrado en WhatsApp.

Uso:

- Activar/desactivar bot.
- Editar mensaje principal.
- Configurar plantillas.
- Definir opciones que derivan a asesor.

### Conexiones

Modulo tecnico para credenciales y webhooks.

Contiene:

- WhatsApp.
- Instagram.
- Facebook.
- TikTok.

Debe ser solo para admin, o supervisor tecnico si se decide.

### Usuarios

Modulo del administrador. Permite crear asesores y supervisores.

## 5. WhatsApp

WhatsApp es el canal operativo principal.

Flujo entrante:

1. Cliente escribe a WhatsApp.
2. Meta envia webhook a ngrok.
3. ngrok reenvia al backend local.
4. `WhatsAppController` procesa el evento.
5. Se crea o actualiza cliente.
6. Se crea o actualiza conversacion.
7. Se guarda mensaje.
8. La conversacion aparece en el CRM.

Flujo saliente:

1. Asesor escribe desde el CRM.
2. El CRM guarda el mensaje.
3. Se envia a WhatsApp Cloud API.
4. Se actualiza estado del mensaje.

WhatsApp esta listo para uso real si:

- El token es valido.
- Phone Number ID es correcto.
- Business Account ID es correcto.
- El webhook esta verificado.
- ngrok/Cloudflare apunta al puerto correcto.
- Cloudinary esta configurado para archivos.

## 6. Instagram

Estado real actual:

- Token `IGAA` validado.
- Cuenta `seohpd` validada como `BUSINESS`.
- Professional User ID validado.
- El CRM consulta el endpoint correcto.
- Meta devuelve `data: []` en conversaciones.
- El asistente oficial de Meta no muestra destinatarios externos.
- Meta muestra aviso de que apps no publicadas solo reciben webhooks de prueba desde panel.

Conclusion tecnica:

En modo desarrollador no se estan recibiendo DMs reales de Instagram ni webhooks reales de mensajes. Esto no es un fallo del CRM.

Uso posible en desarrollo:

- Validar token.
- Consultar `/me`.
- Probar endpoints.
- Simular webhooks con Postman.
- Usar pruebas del panel de Meta si aparecen disponibles.

Uso real:

- Requiere app publicada y permisos/capability de mensajes aprobados por Meta si aplica.

## 7. Facebook

El CRM esta preparado para Facebook/Messenger mediante:

- Page ID.
- Page Access Token.
- Webhook Meta.
- Parser de mensajes sociales.

Para hacerlo real se debe:

- Suscribir pagina al webhook.
- Activar eventos de mensajes.
- Validar permisos de pagina.
- Probar evento real en ngrok.

## 8. TikTok

TikTok esta preparado como canal futuro para leads/campanas. No debe prometerse como inbox de DMs normales salvo que exista acceso oficial a TikTok Business Messaging o partner aprobado.

## 9. Seguridad

Puntos actuales:

- Login con cookies.
- Roles.
- Password hash.
- Endpoints protegidos.
- Auditoria.

Riesgos a corregir antes de produccion:

- No dejar secretos reales en `appsettings.json`.
- No compartir capturas con tokens.
- Regenerar App Secret y tokens expuestos.
- Mover claves a variables de entorno o secret manager.
- Reemplazar ngrok por dominio/tunel estable.

## 10. Evaluacion para uso real

### Esta bien para demo funcional

Si el objetivo es demostrar el flujo CRM con WhatsApp, el sistema esta en buen estado:

- Atiende mensajes.
- Registra clientes.
- Permite responder.
- Tiene ficha 360.
- Tiene tareas.
- Tiene ventas.
- Tiene reportes.
- Tiene roles.
- Tiene configuracion de conexiones.

### Falta para produccion real

Antes de usarlo como sistema productivo permanente falta:

- Secretos fuera de `appsettings.json`.
- Dominio/tunel estable.
- Backups de base de datos.
- Politica de logs.
- Manejo formal de errores.
- Pruebas automatizadas.
- Revision de permisos por modulo tambien en backend.
- Publicacion/aprobacion de Instagram si se requiere DMs reales.
- Politica de renovacion de tokens.

## 11. Recomendacion de producto

Para que se sienta como CRM profesional:

- Administrador: vista completa.
- Supervisor: vista de control y seguimiento.
- Asesor: vista simple centrada en conversaciones, contactos, tareas y ventas.

La venta debe vivir principalmente en `Ventas`, no en `Pipeline`. El pipeline debe quedar como herramienta de supervision de estados de atencion.

