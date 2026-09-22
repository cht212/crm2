# Documentacion Integral del Proyecto CRM

Fecha: 16 de septiembre de 2026

## 1. Resumen ejecutivo

El proyecto es un CRM local enfocado en la atencion de clientes por WhatsApp y preparado para evolucionar a un centro multicanal con Instagram, Facebook y TikTok. La aplicacion permite centralizar conversaciones, registrar clientes, responder mensajes, organizar estados de atencion, asignar asesores, crear tareas de seguimiento, registrar oportunidades de venta, guardar notas internas, clasificar clientes con etiquetas, administrar bot de derivacion, configurar conexiones externas y consultar reportes operativos.

El sistema empezo como una integracion con WhatsApp Cloud API y fue creciendo hasta convertirse en una plataforma CRM funcional. Actualmente corre en la maquina local de desarrollo y utiliza ngrok para exponer temporalmente un webhook HTTPS publico hacia WhatsApp. A futuro, la idea es usar Cloudflare Tunnel para tener una conexion publica mas estable y controlada.

En una explicacion simple: el CRM vive localmente, los canales externos se comunican con el por un tunel seguro, la informacion se guarda en SQL Server y los archivos se publican mediante Cloudinary cuando se necesita una URL HTTPS. 

## 2. Objetivo del proyecto

El objetivo principal es convertir WhatsApp en un canal controlado de gestion comercial. En lugar de atender clientes desde un telefono aislado, el equipo puede trabajar desde una interfaz web con historial, responsables, estado de atencion, tareas, notas, ventas y reportes.

Objetivos especificos:

- Centralizar conversaciones de WhatsApp en una bandeja CRM.
- Dejar preparada la arquitectura para Instagram, Facebook y TikTok.
- Registrar automaticamente clientes que escriben por WhatsApp.
- Permitir respuestas desde el CRM hacia WhatsApp.
- Organizar conversaciones por estados de atencion.
- Asignar conversaciones a asesores.
- Guardar datos comerciales del cliente.
- Crear tareas y recordatorios de seguimiento.
- Registrar oportunidades de venta y etapas comerciales.
- Medir actividad mediante reportes.
- Configurar conexiones externas desde el CRM sin modificar `appsettings.json`.
- Administrar plantillas del bot desde la interfaz.
- Mantener trazabilidad mediante auditoria.

## 3. Alcance actual

El proyecto cubre una version funcional de CRM con integracion WhatsApp y base preparada para canales sociales. No es solo una maqueta visual: ya tiene backend, base de datos, autenticacion, roles, endpoints, servicios internos, frontend, persistencia en SQL Server y configuracion local editable desde el propio CRM.

El alcance actual incluye:

- Login y control de acceso.
- Gestion de usuarios.
- Inbox de WhatsApp.
- Bandeja preparada para filtrar por WhatsApp, Instagram, Facebook y TikTok.
- Recepcion de mensajes por webhook.
- Envio de mensajes salientes.
- Envio y recepcion de archivos/imagenes.
- Contactos.
- Pipeline de atencion.
- Ficha CRM del cliente.
- Etiquetas.
- Notas internas.
- Tareas.
- Oportunidades de venta.
- Reportes.
- Auditoria.
- Bot de derivacion con plantillas editables.
- Modulo de conexiones para tokens, webhooks y OAuth.
- Configuracion local en `App_Data`.
- Base de datos relacional.
- Documentacion y diagramas explicativos.

## 4. Arquitectura general

La arquitectura actual es local. Esto significa que la aplicacion, la API y la base de datos corren en la computadora de desarrollo. Para que WhatsApp Cloud API pueda llamar al webhook local, se usa un tunel HTTPS publico.

Componentes principales:

- Usuarios del CRM: administradores, supervisores y asesores.
- Frontend web local: interfaz HTML, CSS y JavaScript.
- Backend ASP.NET Core local: API, reglas de negocio, autenticacion y servicios.
- SQL Server LocalDB: base de datos del CRM.
- ngrok: tunel HTTPS actual para exponer el webhook local.
- Cloudflare Tunnel: alternativa futura para reemplazar o mejorar ngrok.
- WhatsApp Cloud API: servicio de Meta para recibir y enviar mensajes.
- Meta Graph API: base para Facebook e Instagram.
- TikTok Developers / Business API: base futura para TikTok.
- Cloudinary: servicio externo para publicar imagenes/documentos con URL HTTPS.
- `App_Data`: archivos locales de configuracion editable para bot e integraciones.

Flujo general:

- El asesor entra al CRM desde el navegador.
- El navegador consume endpoints del backend ASP.NET Core.
- El backend lee y escribe en SQL Server usando Entity Framework Core.
- WhatsApp Cloud API envia webhooks a una URL publica de ngrok.
- Facebook e Instagram usaran el webhook Meta preparado para eventos sociales.
- TikTok usara el webhook TikTok preparado.
- ngrok reenvia la peticion hacia el backend local.
- El backend procesa el mensaje, actualiza clientes/conversaciones/mensajes y lo muestra en el CRM.
- Cuando se envia un archivo, Cloudinary genera una URL publica para que WhatsApp pueda acceder al contenido.

Webhooks preparados:

- WhatsApp: `/api/whatsapp/webhook`.
- Facebook/Instagram: `/api/integraciones/meta/webhook`.
- TikTok: `/api/integraciones/tiktok/webhook`.

Redirects OAuth preparados:

- Instagram: `/api/integraciones/instagram/oauth/callback`.
- Facebook: `/api/integraciones/facebook/oauth/callback`.
- TikTok: `/api/integraciones/tiktok/oauth/callback`.

## 5. Infraestructura local, ngrok y futuro Cloudflare

Actualmente el CRM no esta desplegado en un servidor publico. Funciona en local, normalmente desde Visual Studio o Kestrel.

ngrok cumple una funcion clave:

- Crea una URL HTTPS publica temporal.
- Redirige esa URL hacia el puerto local donde corre ASP.NET Core.
- Permite configurar el webhook de WhatsApp con una URL accesible desde internet.
- Hace posible desarrollar y probar WhatsApp sin desplegar todavia en nube.

Limitacion de ngrok:

- La URL puede cambiar.
- Depende de una sesion activa.
- No es la opcion ideal para produccion permanente.

Cloudflare Tunnel como siguiente etapa:

- Puede exponer el CRM local con una URL mas estable.
- Permite mejor control de acceso y seguridad.
- Puede trabajar con un dominio propio.
- Evita abrir puertos manualmente en el router.

Forma correcta de explicar esto: el CRM es local, pero WhatsApp necesita una URL publica para entregar mensajes. ngrok es el puente actual; Cloudflare Tunnel seria el puente futuro mas estable.

## 6. Tecnologias utilizadas

Backend:

- ASP.NET Core.
- C#.
- Entity Framework Core.
- SQL Server LocalDB.
- Cookies de autenticacion.
- PasswordHasher de ASP.NET Identity.
- HttpClient para integraciones externas.

Frontend:

- HTML.
- CSS.
- JavaScript.
- Lucide Icons para iconos.
- Interfaz tipo CRM con inbox, panel de conversacion, ficha de cliente y modulos laterales.

Servicios externos:

- WhatsApp Cloud API.
- Meta Graph API para Instagram/Facebook.
- TikTok Developers / Business API.
- Cloudinary.
- ngrok.
- Cloudflare Tunnel como proyeccion futura.

Herramientas:

- Visual Studio.
- SQL Server Management Studio.
- Git.
- Node para validar sintaxis del JavaScript.
- Microsoft Word para generar documentacion.

## 7. Estructura general del proyecto

El proyecto principal esta en `CRM.Data`.

Carpetas principales:

- `Controllers`: contiene los controladores API.
- `Data`: contiene `CrmDbContext`, que mapea las tablas de SQL Server.
- `Models`: contiene las entidades del dominio CRM.
- `Services`: contiene la logica de WhatsApp, Cloudinary, auditoria, bot e integraciones sociales.
- `wwwroot`: contiene la interfaz web, estilos, scripts, imagenes y archivos subidos localmente.
- `App_Data`: contiene configuracion local editable desde el CRM.
- `Migrations`: contiene migraciones de Entity Framework.
- `Properties`: configuracion de perfiles de ejecucion.
- `tools`: scripts para generar documentacion.

Archivos importantes:

- `Program.cs`: configuracion general de servicios, autenticacion, endpoints y pipeline HTTP.
- `CRM.Data.csproj`: configuracion del proyecto .NET.
- `appsettings.json`: configuracion local, cadenas de conexion y claves de integracion.
- `CrmDbContext.cs`: configuracion del modelo de base de datos.
- `Script.js`: logica principal del frontend.
- `MaterializeReference.css`: estilos visuales activos del CRM.
- `index.html`: pantalla principal del CRM.
- `login.html`: pantalla de inicio de sesion.
- `App_Data/bot-whatsapp.json`: mensaje principal y plantillas del bot.
- `App_Data/social-integrations.json`: tokens, IDs y configuracion local de canales externos.

## 8. Configuracion general

El proyecto depende de configuraciones locales que no deben exponerse publicamente.

Configuraciones principales:

- Cadena de conexion a SQL Server.
- Credenciales de WhatsApp Cloud API.
- Token de verificacion del webhook de WhatsApp.
- Configuracion de Cloudinary.
- Usuario/clave inicial de arranque si no existen usuarios.
- Tokens e IDs de Instagram, Facebook y TikTok desde el modulo Conexiones.
- Plantillas del bot desde el modulo Bot.

Puntos importantes:

- `appsettings.json` contiene valores sensibles y no debe compartirse con credenciales reales.
- `App_Data/*.json` tambien contiene datos sensibles locales y esta ignorado en `.gitignore`.
- Los archivos de ejemplo fueron retirados para evitar confusion.
- Para produccion o un despliegue mas formal, estas claves deberian moverse a variables de entorno o un administrador de secretos.

## 9. Autenticacion y roles

El CRM tiene login propio mediante cookies. El usuario inicia sesion desde `login.html`, el backend valida credenciales y crea una sesion autenticada.

Roles actuales:

- Administrador: acceso completo, puede crear usuarios y gestionar modulos sensibles.
- Supervisor: puede gestionar pipeline, asignaciones, etiquetas y reportes.
- Asesor: puede atender conversaciones y trabajar con clientes asignados.

Funciones relacionadas:

- Login.
- Logout.
- Proteccion de endpoints con `[Authorize]`.
- Restriccion por roles en acciones administrativas.
- Hash de contrasenas con `PasswordHasher`.

Controlador principal:

- `AuthenticationController`: maneja login y logout.

## 10. Modulos funcionales del CRM

### Comunicaciones / Inbox

El inbox es la bandeja principal de conversaciones. Permite ver clientes que escribieron por WhatsApp y queda preparado para separar Instagram, Facebook y TikTok cuando se conecten.

Funciones:

- Listar conversaciones.
- Seleccionar conversacion.
- Ver mensajes entrantes y salientes.
- Enviar mensajes de texto.
- Enviar archivos.
- Mostrar estado del mensaje.
- Mostrar ficha del cliente al lado derecho.
- Actualizar informacion periodicamente.
- Filtrar por canal: Todas, WhatsApp, Instagram, Facebook y TikTok.
- Filtrar por nuevas, abiertas, mis chats, sin asesor y pendientes.
- Mostrar notificacion interna cuando un cliente responde.
- Pintar mensajes salientes de forma inmediata para que el envio se sienta rapido.

### Contactos

El modulo de contactos muestra clientes registrados desde WhatsApp.

Funciones:

- Listar clientes.
- Mostrar nombre, telefono, email y cantidad de conversaciones.
- Permitir actualizar datos del cliente desde la ficha.
- Validar email para evitar errores cuando se deja vacio.

### Pipeline

El pipeline actual organiza conversaciones por estado de atencion. Es un tablero operativo para saber que chats estan nuevos, abiertos, en atencion, cerrados o perdidos.

Estados:

- NUEVO.
- ABIERTO.
- EN_ATENCION.
- CERRADO.
- PERDIDO.
- NO_RESPONDIO.

Funciones:

- Ver conversaciones en columnas.
- Cambiar estado.
- Asignar asesor.
- Asignar pendientes automaticamente.
- Abrir una conversacion desde el pipeline sin mezclarla con todo el inbox.
- Ver avatar del asesor asignado.

Nota importante:

- En otros CRM, el pipeline principal suele representar oportunidades comerciales.
- En este proyecto existen dos conceptos separados: pipeline de atencion para conversaciones y oportunidades de venta para el embudo comercial.

### Ficha CRM del cliente

La ficha lateral concentra la informacion del cliente y sus acciones de seguimiento.

Tabs actuales:

- Datos.
- Notas.
- Tareas.
- Ventas.
- Bot.
- Actividad.

Desde la ficha se puede:

- Editar nombre, telefono, email y documento.
- Ver y asignar etiquetas.
- Crear etiquetas nuevas.
- Quitar etiquetas del cliente.
- Crear notas internas.
- Crear tareas.
- Completar tareas.
- Crear oportunidades.
- Cambiar etapa de oportunidad.
- Activar o pausar el bot por conversacion.
- Ver actividad registrada.

### Etiquetas

Las etiquetas sirven para clasificar clientes.

Ejemplos:

- Cliente VIP.
- Pendiente de pago.
- Interesado.
- Reclamo.
- Seguimiento.

Funciones:

- Crear etiquetas.
- Asignar etiquetas a clientes.
- Quitar etiquetas.
- Usar colores para diferenciarlas visualmente.

### Notas internas

Las notas internas son comentarios privados del equipo. No se envian al cliente.

Uso esperado:

- Registrar contexto de la conversacion.
- Anotar acuerdos.
- Dejar observaciones para otro asesor.
- Guardar informacion que no debe ir por WhatsApp.

### Tareas

Las tareas permiten dar seguimiento posterior.

Ejemplos:

- Llamar manana.
- Enviar cotizacion.
- Confirmar pago.
- Revisar disponibilidad.

Datos principales:

- Titulo.
- Descripcion.
- Fecha de vencimiento.
- Estado.
- Asesor asignado.
- Cliente, conversacion u oportunidad relacionada.

Estados:

- PENDIENTE.
- COMPLETADA.
- VENCIDA.
- CANCELADA.

### Oportunidades de venta

Las oportunidades convierten una conversacion en seguimiento comercial.

Datos principales:

- Titulo.
- Cliente.
- Conversacion asociada.
- Asesor asignado.
- Monto.
- Moneda.
- Etapa.
- Probabilidad.
- Fecha estimada de cierre.
- Fecha real de cierre.
- Motivo de perdida si aplica.

Etapas:

- NUEVA.
- CALIFICADA.
- PROPUESTA.
- NEGOCIACION.
- GANADA.
- PERDIDA.

### Actividad y auditoria

El sistema registra acciones relevantes para tener trazabilidad.

Registra:

- Entidad afectada.
- ID de entidad.
- Accion.
- Valor anterior.
- Valor nuevo.
- Usuario.
- Fecha.

Ejemplos de actividad:

- Cambio de estado de conversacion.
- Reasignacion.
- Edicion de datos del cliente.
- Creacion de oportunidad.
- Cambio de etapa comercial.

### Reportes

El modulo de reportes muestra resumen operativo.

Metricas actuales:

- Total de clientes.
- Total de conversaciones.
- Mensajes recibidos.
- Mensajes enviados.
- Tareas pendientes.
- Tareas vencidas.
- Tareas completadas.
- Oportunidades abiertas.
- Oportunidades ganadas.
- Oportunidades perdidas.
- Monto abierto.
- Monto ganado.
- Conversaciones por estado.
- Oportunidades por etapa.
- Filtros por fecha.
- Filtros por asesor.
- Carga por asesor: chats activos, tareas pendientes, tareas vencidas, oportunidades abiertas y monto abierto.
- Datos por canal para preparar medicion multicanal.

### Bot

El modulo Bot permite configurar la respuesta automatica de derivacion.

Funciones:

- Activar o apagar el bot de WhatsApp.
- Editar el mensaje principal.
- Editar plantillas/opciones del bot.
- Agregar nuevas opciones.
- Quitar opciones.
- Marcar si una opcion deriva a asesor.
- Guardar configuracion en `App_Data/bot-whatsapp.json`.

Uso esperado:

- El bot no reemplaza al asesor.
- Su funcion es responder rapido, ordenar la solicitud y derivar.
- Cuando un asesor responde, el bot se pausa en esa conversacion.

### Conexiones

El modulo Conexiones administra integraciones externas.

Canales actuales:

- WhatsApp.
- Instagram.
- Facebook.
- TikTok.

Funciones:

- Configurar tokens e IDs desde el CRM.
- Copiar URL de webhook por canal.
- Preparar inicio OAuth para Meta/TikTok.
- Ver que claves faltan por canal.
- Mostrar dominios que seguridad/redes debe permitir.
- Guardar configuracion local en `App_Data/social-integrations.json`.

Este modulo evita depender exclusivamente de `appsettings.json` durante la etapa local.

### Usuarios

Modulo disponible para administrador.

Funciones:

- Listar usuarios activos.
- Crear asesores.
- Crear supervisores.
- Asignar rol.
- Gestionar acceso del equipo.

## 11. Integracion con WhatsApp Cloud API

WhatsApp es el canal principal de comunicacion con los clientes.

### Recepcion de mensajes

Flujo:

- El cliente envia un mensaje por WhatsApp.
- WhatsApp Cloud API envia un webhook a la URL publica configurada.
- Esa URL publica apunta a ngrok.
- ngrok reenvia la peticion al proyecto local ASP.NET Core.
- `WhatsAppController` recibe el webhook.
- El backend busca o crea el cliente.
- El backend busca o crea la conversacion.
- Se guarda el mensaje en `crm_mensaje`.
- Se actualiza la fecha del ultimo mensaje.
- La conversacion aparece en el inbox.

### Envio de mensajes

Flujo:

- El asesor escribe desde el CRM.
- El frontend llama al endpoint de envio.
- El frontend muestra el mensaje inmediatamente como `ENVIANDO`.
- `WhatsAppService` guarda el mensaje saliente rapidamente.
- El envio a Meta se realiza en segundo plano.
- `WhatsAppCloudApiService` envia el mensaje a WhatsApp Cloud API.
- Se actualiza el ID de WhatsApp y el estado cuando Meta responde.
- Si falla, el mensaje queda como `FALLIDO`.

Este cambio mejora la experiencia visual: el usuario no siente que el boton Enviar se queda congelado esperando la red de Meta.

### Indicador de escribiendo

Cuando el asesor escribe, el CRM puede notificar a Meta para mostrar que se esta escribiendo. Se controla por intervalo para no saturar la API.

### Estados de mensajes

El frontend muestra estados como:

- Enviando.
- Enviado.
- Leido.
- Fallido.
- Local.

El estado local aparece cuando el archivo queda guardado en el CRM pero no se envia a WhatsApp porque no existe una URL HTTPS publica valida.

## 12. Manejo de imagenes y archivos

WhatsApp necesita URLs publicas HTTPS para enviar archivos. Por eso el proyecto usa Cloudinary.

Flujo de salida:

- El asesor adjunta un archivo desde el CRM.
- El backend recibe el archivo.
- `CloudinaryStorageService` intenta subirlo a Cloudinary.
- Cloudinary devuelve `secure_url`.
- El backend envia esa URL a WhatsApp Cloud API.
- El mensaje queda registrado en la base de datos.

Flujo de entrada:

- El cliente envia una imagen o archivo por WhatsApp.
- El webhook recibe el ID del medio.
- El backend descarga el archivo desde Meta.
- Se intenta subir a Cloudinary.
- Si Cloudinary falla, se guarda localmente como respaldo.
- El mensaje se registra para visualizarlo en el CRM.

Correccion importante:

- Se corrigio el problema SSL de Cloudinary en Windows usando `WinHttpHandler`.
- Si Cloudinary no responde, la aplicacion ya no se bloquea.
- Existe fallback local en `wwwroot/uploads/whatsapp`.

## 13. Cloudinary

Cloudinary se usa para publicar archivos con URL HTTPS.

Razones:

- WhatsApp necesita poder descargar el archivo desde internet.
- Un archivo local no sirve directamente para Meta.
- Cloudinary da una URL publica segura.

Uso actual:

- Imagenes.
- Documentos.
- Archivos multimedia.

Fallback:

- Si Cloudinary falla, el archivo se guarda localmente.
- En ese caso el archivo puede quedar visible dentro del CRM local, pero no siempre se podra enviar por WhatsApp si Meta no puede acceder a una URL publica.

## 14. Base de datos

La base de datos esta en SQL Server LocalDB.

Ruta del diagrama en SQL Server:

`Server[@Name='win11cho24\LOCALDB#B65D27D9']/Database[@Name='CRM_hdp']/DatabaseDiagram[@Name='Diagram_0' and @OwnerID='1']`

El modelo esta centrado en `crm_cliente`. Desde el cliente salen las relaciones hacia conversaciones, mensajes, notas, tareas, oportunidades y etiquetas.

### Tablas principales

`crm_cliente`

- Guarda clientes.
- Campos principales: nombre, telefono, email, documento, fecha de registro y estado.
- Guarda canal de origen (`c_canal_origen`) para saber si el cliente llego por WhatsApp, Instagram, Facebook o TikTok.
- Es la entidad central del CRM.

`crm_conversacion`

- Guarda conversaciones asociadas a un cliente.
- Tiene estado de atencion.
- Puede tener asesor asignado.
- Guarda fechas de inicio, ultimo mensaje y ultimo mensaje del cliente.
- Guarda canal (`c_canal`) y thread externo (`c_external_thread_id`) para soportar redes sociales.
- Guarda estado del bot por conversacion.

`crm_mensaje`

- Guarda mensajes de cada conversacion.
- Identifica si el mensaje es entrante o saliente.
- Guarda tipo, texto o URL, estado, fecha e ID de WhatsApp.
- Guarda canal (`c_canal`) e ID externo (`c_external_id`) para soportar mensajes que no vienen de WhatsApp.

`crm_usuario`

- Guarda usuarios del CRM.
- Contiene usuario, nombre, estado, hash de contrasena y rol.
- Se usa para login, asignacion y auditoria.

`crm_etiqueta`

- Catalogo de etiquetas.
- Guarda nombre y color.

`crm_cliente_etiqueta`

- Tabla puente entre clientes y etiquetas.
- Permite relacion muchos a muchos.
- Guarda fecha de asignacion.

`crm_nota_interna`

- Guarda notas privadas del equipo.
- Se relaciona con cliente, conversacion y usuario creador.

`crm_tarea`

- Guarda tareas de seguimiento.
- Puede relacionarse con cliente, conversacion y oportunidad.
- Tiene estado, vencimiento, creador y asignado.

`crm_oportunidad`

- Guarda oportunidades comerciales.
- Se relaciona con cliente, conversacion y asesor.
- Tiene monto, moneda, etapa, probabilidad y fechas de cierre.

`crm_actividad_log`

- Guarda trazabilidad de acciones.
- Permite saber que cambio, quien lo hizo y cuando.

`__EFMigrationsHistory`

- Tabla tecnica de Entity Framework.
- No pertenece al negocio del CRM.
- Sirve para saber que migraciones ya fueron aplicadas.

### Relaciones principales

- Un cliente puede tener muchas conversaciones.
- Una conversacion puede tener muchos mensajes.
- Una conversacion pertenece a un canal.
- Un cliente puede tener muchas notas internas.
- Un cliente puede tener muchas oportunidades.
- Un cliente puede tener muchas tareas.
- Una oportunidad puede tener tareas asociadas.
- Un cliente puede tener muchas etiquetas.
- Una etiqueta puede estar en muchos clientes.
- Un usuario puede ser asesor de conversaciones.
- Un usuario puede crear notas, tareas u oportunidades.
- Un usuario puede aparecer en logs de actividad.

### Como explicar el diagrama

Una forma simple:

- Primero se explica `crm_cliente`, porque todo parte del cliente.
- Luego se explica WhatsApp: `crm_conversacion` y `crm_mensaje`.
- Despues se explica seguimiento comercial: `crm_oportunidad`, `crm_tarea`, `crm_nota_interna` y etiquetas.
- Finalmente se explica control interno: `crm_usuario` y `crm_actividad_log`.

## 15. Backend y endpoints

Controladores principales:

`AuthenticationController`

- Ruta base: `/api/auth`.
- Login.
- Logout.

`WhatsAppController`

- Ruta base: `/api/whatsapp`.
- Recibe webhooks.
- Lista conversaciones.
- Obtiene una conversacion.
- Envia mensajes.
- Notifica escribiendo.

`WhatsAppAttachmentsController`

- Ruta base: `/api/whatsapp/conversaciones`.
- Envia archivos asociados a una conversacion.

`CrmManagementController`

- Ruta base: `/api/crm`.
- Contactos.
- Pipeline.
- Usuarios.
- Estado de conversaciones.
- Asignacion de conversaciones.
- Actividad.
- Reportes.

Endpoints minimos en `Program.cs`:

- `/api/integraciones/estado`: estado general de conexiones.
- `/api/integraciones/canales`: lista de canales preparados.
- `/api/integraciones/{canal}/configuracion`: leer/guardar configuracion de canal.
- `/api/integraciones/{canal}/oauth/start`: preparar login OAuth.
- `/api/integraciones/{canal}/oauth/callback`: recibir callback OAuth.
- `/api/integraciones/meta/webhook`: webhook para Facebook/Instagram.
- `/api/integraciones/tiktok/webhook`: webhook para TikTok.
- `/api/integraciones/{canal}/mensajes/prueba`: registrar mensaje de prueba por canal.

`EtiquetasController`

- Ruta base: `/api/etiquetas`.
- Listar etiquetas.
- Crear etiquetas.
- Asignar etiqueta a cliente.
- Quitar etiqueta de cliente.
- Listar etiquetas de un cliente.

`NotasController`

- Ruta base: `/api/clientes/{clienteId}/notas`.
- Listar notas.
- Crear notas.

`TareasController`

- Ruta base: `/api/tareas`.
- Listar tareas.
- Crear tareas.
- Completar tareas.
- Cancelar tareas.

`OportunidadesController`

- Ruta base: `/api/oportunidades`.
- Listar oportunidades.
- Resumen por etapa.
- Crear oportunidades.
- Cambiar etapa.
- Asignar asesor.

## 16. Servicios internos

`WhatsAppService`

- Procesa mensajes entrantes.
- Crea clientes y conversaciones si no existen.
- Guarda mensajes.
- Procesa mensajes salientes.
- Asigna conversaciones pendientes.
- Coordina envio con Meta.

`WhatsAppCloudApiService`

- Encapsula llamadas HTTP a WhatsApp Cloud API.
- Envia mensajes.
- Envia multimedia.
- Descarga medios.
- Maneja integracion externa con Meta.

`CloudinaryStorageService`

- Sube archivos a Cloudinary.
- Devuelve URL segura.
- Usa `WinHttpHandler` en Windows para evitar problemas SSL.
- Guarda localmente si Cloudinary falla.

`AuditoriaService`

- Registra acciones importantes en `crm_actividad_log`.
- Permite mostrar actividad en la ficha del cliente.

`BotSettingsService`

- Administra el estado del bot.
- Guarda mensaje principal y plantillas.
- Usa `App_Data/bot-whatsapp.json`.

`SocialIntegrationService`

- Administra configuracion de WhatsApp, Instagram, Facebook y TikTok.
- Lee valores desde `appsettings.json` y desde `App_Data/social-integrations.json`.
- Permite configurar credenciales desde el CRM.
- Construye URLs OAuth y expone estado de cada canal.

`SocialInboundService`

- Servicio generico para convertir eventos de redes sociales en datos CRM.
- Crea o reutiliza cliente.
- Crea o reutiliza conversacion.
- Guarda mensaje entrante con canal correspondiente.
- Prepara el camino para Instagram, Facebook y TikTok.

## 17. Frontend

La interfaz esta en `wwwroot`.

Archivos principales:

- `index.html`: estructura principal del CRM.
- `login.html`: pantalla de acceso.
- `Script.js`: logica de modulos, llamadas API y eventos.
- `MaterializeReference.css`: CSS activo del CRM, con base visual propia inspirada en Materialize y colores HPD.
- `Styles.css`: fue eliminado para evitar duplicidad; el CRM usa un solo CSS activo.

Sobre la plantilla `Plantilla.zip`:

- Es una referencia comercial de Materialize Admin.
- No se debe subir completa al repositorio por peso y licencia.
- No se copio completa dentro del CRM.
- Solo se tomo como guia visual para tarjetas, botones, sombras, tablas y layout administrativo.
- La paleta final no usa los colores morados de Materialize; se adapto a los colores del logo HPD: celeste/azul con acento verde lima.
- El ZIP queda ignorado en `.gitignore`.

Pantallas principales:

- Login.
- Inbox.
- Dashboard.
- Contactos.
- Pipeline.
- Tareas.
- Ventas.
- Reportes.
- Bot.
- Conexiones.
- Actividad.
- Usuarios.
- Ficha del cliente.

Caracteristicas visuales:

- Navegacion lateral.
- Bandeja de conversaciones.
- Panel central de chat.
- Panel derecho de detalle.
- Tabs CRM.
- Kanban para pipeline.
- Tarjetas de metricas.
- Etiquetas con color.
- Botones, modales, formularios y tarjetas pulidos visualmente.
- Diseno preparado para operar como CRM administrativo, no como landing page.

## 18. Flujos principales del negocio

### Nuevo cliente escribe por WhatsApp

- Cliente envia mensaje.
- WhatsApp llama al webhook.
- CRM registra cliente si no existe.
- CRM crea conversacion si no existe.
- CRM guarda mensaje.
- Conversacion aparece en inbox y pipeline.

### Asesor responde desde CRM

- Asesor abre conversacion.
- Escribe respuesta.
- CRM pinta el mensaje inmediatamente.
- CRM guarda mensaje saliente.
- CRM envia mensaje a WhatsApp Cloud API en segundo plano.
- Cliente recibe el mensaje.
- CRM actualiza estado real del mensaje.

### Supervisor organiza atencion

- Entra al pipeline.
- Cambia estado de conversacion.
- Asigna asesor.
- Puede asignar pendientes automaticamente.

### Equipo da seguimiento comercial

- Se crea una oportunidad.
- Se asigna monto y probabilidad.
- Se cambia etapa comercial.
- Se crean tareas relacionadas.
- Se agregan notas internas.
- Se revisa actividad.

### Administrador configura conexiones

- Entra al modulo Conexiones.
- Abre Configurar en WhatsApp, Instagram, Facebook o TikTok.
- Pega tokens, IDs y verify tokens.
- Copia URL de webhook.
- Inicia OAuth cuando el canal lo permita.
- El CRM guarda la configuracion en `App_Data/social-integrations.json`.

### Bot atiende primera respuesta

- Cliente escribe.
- Bot responde si esta activo.
- Bot usa mensaje principal y plantillas configuradas.
- Conversacion queda visible para asesor.
- Cuando el asesor responde, el bot se pausa.

### Administrador gestiona equipo

- Crea usuarios.
- Define roles.
- Supervisa reportes.
- Revisa actividad.

## 19. Reportes y medicion

Los reportes dan una vista rapida del estado operativo.

Permiten responder preguntas como:

- Cuantos clientes hay registrados.
- Cuantas conversaciones existen.
- Cuantos mensajes entraron y salieron.
- Cuantas tareas estan pendientes.
- Cuantas tareas estan vencidas.
- Cuantas oportunidades estan abiertas.
- Cuanto monto abierto hay.
- Cuanto monto ganado hay.
- En que etapa estan las oportunidades.
- En que estado estan las conversaciones.
- Que carga tiene cada asesor.
- Que canal origina interacciones.

## 20. Seguridad y control

Medidas actuales:

- Login obligatorio.
- Cookies de autenticacion.
- Roles por usuario.
- Hash de contrasenas.
- Endpoints protegidos.
- Restriccion de acciones administrativas.
- Auditoria de cambios importantes.

Consideraciones:

- Las claves reales deben mantenerse fuera de repositorios publicos.
- ngrok sirve para desarrollo, no como exposicion definitiva.
- Cloudflare Tunnel o un despliegue formal ayudarian a mejorar seguridad y estabilidad.
- Se recomienda usar variables de entorno para credenciales.
- `App_Data/*.json` esta ignorado para evitar subir tokens locales.

## 21. Limpieza y mejoras realizadas

Durante el avance se limpio el proyecto para dejarlo mas ordenado.

Acciones realizadas:

- Eliminacion de archivos de ejemplo que confundian.
- Eliminacion de documentacion antigua innecesaria.
- Revision de codigo no utilizado.
- Correccion de problemas de finales de linea.
- Ajuste de rutas antiguas de prueba.
- Correccion del problema de email vacio.
- Correccion del problema SSL con Cloudinary.
- Fallback local para archivos.
- Mejoras de paginacion y limites.
- Agregado de modulos CRM completos.
- Bot editable con plantillas.
- Conexiones multicanal configurables desde la interfaz.
- Preparacion de webhooks y OAuth para Meta/TikTok.
- Campos de canal en cliente, conversacion y mensaje.
- Envio saliente optimizado con respuesta visual inmediata.
- Pulido visual general del CRM.

## 22. Estado actual del proyecto

El sistema esta en una etapa funcional local. Ya permite demostrar un ciclo completo de WhatsApp y esta preparado para integrar canales sociales:

- Un cliente escribe por WhatsApp.
- El mensaje llega al CRM local por ngrok.
- El equipo atiende desde el inbox.
- Se actualiza informacion del cliente.
- Se asigna asesor.
- Se crea seguimiento.
- Se crea oportunidad comercial.
- Se registran notas y actividad.
- Se revisan reportes.
- Se configura el bot desde el CRM.
- Se configuran tokens y webhooks desde Conexiones.

Esto permite presentar el proyecto como un CRM operativo para WhatsApp y como base multicanal, no solo como una prueba tecnica.

## 23. Pendientes recomendados

Pendientes tecnicos:

- Pasar de ngrok a Cloudflare Tunnel.
- Mover secretos a variables de entorno.
- Crear pruebas automatizadas.
- Agregar logs mas consultables.
- Preparar instalacion o despliegue controlado.
- Completar intercambio real de OAuth code por token para Meta/TikTok.
- Parsear payload real de comentarios y mensajes de Instagram/Facebook.

Pendientes funcionales:

- Busqueda avanzada.
- Filtros por asesor, etiqueta, estado y fecha.
- Exportacion a Excel o PDF.
- Plantillas de respuesta rapida.
- Notificaciones de tareas vencidas.
- Mejor panel para administracion de etiquetas.
- Bandeja especifica para comentarios de publicaciones.
- Pipeline comercial separado de pipeline de atencion si se desea seguir el modelo de otros CRM.

## 24. Como presentar el proyecto

Guion sugerido:

- Explicar el problema: WhatsApp concentra clientes, pero sin CRM es dificil medir, asignar y dar seguimiento.
- Explicar la solucion: un CRM local conectado a WhatsApp mediante ngrok.
- Mostrar la arquitectura: navegador, ASP.NET Core local, SQL Server local, ngrok, WhatsApp Cloud API y Cloudinary.
- Mostrar el inbox: llegada de conversaciones y mensajes.
- Mostrar la ficha del cliente: datos, etiquetas, notas, tareas, ventas y actividad.
- Mostrar el pipeline: estados y asignacion de asesores.
- Mostrar reportes: clientes, mensajes, tareas y oportunidades.
- Explicar la base de datos: cliente como centro, conversaciones/mensajes como atencion, oportunidades/tareas/notas como gestion comercial, usuarios/auditoria como control.
- Cerrar con siguientes pasos: Cloudflare Tunnel, OAuth real de Meta/TikTok, comentarios sociales, exportaciones y automatizaciones.

Frase corta para explicarlo:

Este CRM permite que una empresa atienda WhatsApp desde una plataforma ordenada, con clientes, historial, responsables, tareas, ventas, reportes, bot, conexiones y auditoria. Por ahora corre local con ngrok, y la siguiente etapa es estabilizar la exposicion con Cloudflare Tunnel y completar la conexion real de Instagram, Facebook y TikTok.

## 25. Documentos e imagenes generadas

Archivos generados:

- `AVANCE_PROYECTO_CRM.md`: documentacion del avance del proyecto.
- `ARQUITECTURA_CRM.png`: imagen de arquitectura local con ngrok y futuro Cloudflare.
- `MODELO_DATOS_CRM.png`: imagen explicativa del modelo de datos.
- `MANUAL_USO_CRM_HPD.md`: manual operativo para uso del sistema.
- `DOCUMENTACION_COMPLETA_CRM_HPD.md`: documentacion tecnica completa del proyecto.

## 26. Conclusion

El proyecto ya cuenta con una base solida de CRM conectado a WhatsApp. Tiene atencion conversacional, gestion de clientes, pipeline, usuarios, roles, tareas, notas, oportunidades, etiquetas, reportes, auditoria, bot editable, modulo de conexiones, manejo de archivos y documentacion tecnica.

La arquitectura actual es adecuada para desarrollo y demostracion local: ASP.NET Core y SQL Server corren en la maquina local, ngrok expone webhooks, Cloudinary publica archivos y `App_Data` guarda configuracion local editable. El siguiente paso natural es reemplazar ngrok por Cloudflare Tunnel, completar OAuth real con Meta/TikTok y avanzar hacia un despliegue mas estable.
