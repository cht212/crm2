# Manual operativo del CRM HPD

Fecha: 18 de septiembre de 2026

## 1. Objetivo del manual

Este manual esta pensado para el personal que va a entrar al CRM y necesita entender que hace cada seccion, para que sirve y cuando debe usarla.

No es un manual de programacion. La documentacion tecnica completa del codigo, carpetas, base de datos, seguridad e integraciones esta en `DOCUMENTACION_TECNICA_COMPLETA_CRM_HPD.md`.

## 2. Que es el CRM HPD

El CRM HPD es una plataforma para centralizar la atencion de clientes, principalmente por WhatsApp. Permite trabajar con conversaciones, clientes, tareas, ventas, notas, etiquetas, reportes, usuarios, bot y conexiones con plataformas externas.

La idea principal es que cada cliente tenga historial y seguimiento. No se atiende solo un mensaje aislado; se atiende una ficha completa con datos, conversacion, responsable, pendientes y oportunidades comerciales.

## 3. Roles de usuario

### Administrador

El administrador ve todo el sistema.

Puede:

- Configurar conexiones.
- Crear usuarios.
- Revisar todos los clientes y conversaciones.
- Ver reportes.
- Revisar actividad y fallos.
- Configurar bot.
- Supervisar seguridad operativa.

### Supervisor

El supervisor controla la operacion diaria sin administrar claves sensibles ni usuarios.

Puede:

- Ver dashboard operativo.
- Revisar conversaciones.
- Asignar asesores.
- Ver contactos.
- Ver tareas.
- Revisar ventas.
- Revisar reportes.
- Revisar actividad y fallos.
- Configurar bot si tiene permiso.

### Asesor

El asesor tiene una vista simple. Su trabajo principal es atender clientes y dar seguimiento.

Puede:

- Ver conversaciones asignadas.
- Tomar conversaciones nuevas cuando esten disponibles para atencion.
- Responder mensajes.
- Ver o crear contactos permitidos.
- Crear notas internas.
- Crear tareas.
- Ver Pipeline con sus casos y los chats sin asignar disponibles para tomar.
- Registrar oportunidades de venta.
- Dar seguimiento a sus pendientes.

El asesor no debe ver configuraciones tecnicas, usuarios, conexiones globales ni fallos del sistema.

En un flujo CRM real, el asesor debe trabajar en una experiencia simple tipo "Mi trabajo": conversaciones, clientes, tareas, pipeline propio y ventas. Todo lo tecnico debe quedar para supervisor o administrador.

## 4. Inicio de sesion

El usuario entra desde la pantalla de login.

Debe usar:

- Usuario asignado por el administrador.
- Contrasena asignada o actualizada.

Si las credenciales son correctas, el sistema abre el CRM segun el rol.

Si el usuario es asesor, el CRM lo lleva principalmente a Comunicaciones para atender clientes.

## 5. Dashboard

El Dashboard es la vista ejecutiva del CRM.

Sirve para ver rapidamente:

- Salud operativa.
- Conversaciones activas.
- Tareas pendientes.
- Tareas vencidas.
- Oportunidades abiertas.
- Monto comercial abierto.
- Rendimiento por canal.
- Carga de asesores.
- Estado de analiticas reales por canal.
- Resultado tecnico por metrica de Meta.

Uso recomendado:

- Administrador: revision general del negocio.
- Supervisor: seguimiento diario del equipo.
- Asesor: no es su pantalla principal.

### Que significan las metricas del Dashboard

El Dashboard mezcla dos tipos de datos:

- Datos internos del CRM: contactos, conversaciones, mensajes, tareas, oportunidades, ventas y carga de asesores.
- Datos externos de plataformas: estadisticas que vienen desde APIs como Meta Graph API para Facebook e Instagram.

Los datos internos aparecen cuando el CRM registra actividad propia. Por ejemplo, si entra un mensaje, se crea una conversacion, se asigna un asesor o se crea una oportunidad.

Los datos externos dependen de que la plataforma entregue estadisticas por API. Si Meta no entrega datos, el CRM no los inventa.

### Analiticas reales

La seccion "Analiticas reales" indica si cada canal esta listo para traer estadisticas externas.

Estados:

- OPERATIVO: el canal esta funcionando para el tipo de dato mostrado.
- SIN_DATOS: la API respondio correctamente, pero devolvio cero en el rango consultado.
- NO_CONFIGURADO: falta una clave, token, pagina o identificador.
- ERROR: la API rechazo la consulta por permiso, token, pagina o metrica.
- PENDIENTE: el canal esta preparado, pero aun no tiene servicio real de analiticas conectado.

### Resultado por metrica de Meta

La seccion "Resultado por metrica de Meta" sirve para comprobar el dato real sin adivinar.

Puede mostrar:

- CON_DATOS: Meta devolvio un valor mayor que cero.
- CERO: Meta acepto la metrica, pero devolvio 0 para el rango consultado.
- ERROR: Meta rechazo esa metrica especifica.
- NO_CONFIGURADO: falta configurar token o ID para probarla.

Facebook prueba metricas como vistas, alcance, interacciones y seguidores. Instagram prueba alcance, visitas al perfil y clicks al sitio web.

Si Facebook aparece como SIN_DATOS, no necesariamente esta mal configurado. Significa que Meta acepto la consulta, pero no devolvio valores para ese periodo.

Si Instagram aparece como NO_CONFIGURADO, normalmente falta el token de insights de Page/Instagram profesional. El token de Instagram Login usado para DMs no reemplaza ese token.

## 6. Comunicaciones

Comunicaciones es el inbox del CRM.

Sirve para:

- Ver conversaciones.
- Abrir un chat.
- Leer historial.
- Responder al cliente.
- Ver si la conversacion requiere atencion.
- Ver el canal: WhatsApp, Facebook, Instagram u otro canal preparado.
- Pausar bot cuando interviene un asesor.
- Adjuntar archivos permitidos.
- Actualizar perfil si aplica para Meta.

Estados comunes:

- NUEVO: conversacion nueva.
- ABIERTO: conversacion activa.
- EN_ATENCION: un asesor la esta atendiendo.
- ESPERANDO_CLIENTE: se espera respuesta del cliente.
- COTIZACION_ENVIADA: se envio propuesta.
- CERRADO: atencion terminada.
- PERDIDO: oportunidad o caso perdido.
- NO_RESPONDIO: el cliente no respondio.

Para asesores:

- Solo deben aparecer conversaciones permitidas o asignadas.
- Las conversaciones nuevas disponibles pueden tomarse para empezar la atencion.
- Si responden una conversacion, queda pausado el bot para evitar respuestas automaticas fuera de contexto.
- Puede usar plantillas rapidas para acelerar mensajes frecuentes como saludo, catalogo, solicitud de datos, seguimiento o cierre.

### Plantillas rapidas dentro de Comunicaciones

Cuando una conversacion esta abierta, el CRM muestra una fila compacta de botones con respuestas frecuentes.

Uso:

- El asesor hace clic en una plantilla.
- El texto se coloca en el campo de mensaje.
- El asesor revisa o ajusta el texto.
- Luego envia manualmente.

Importante:

- La plantilla no se envia sola.
- No reemplaza el criterio del asesor.
- Sirve para ahorrar tiempo y mantener respuestas consistentes.

## 7. Contactos

Contactos contiene la lista de clientes.

Sirve para:

- Buscar clientes.
- Ver datos basicos.
- Ver telefono, documento, email y canal de origen.
- Abrir la ficha del cliente.
- Ver etiquetas.
- Ver ultima conversacion.
- Crear un contacto manual.

Uso recomendado:

- Revisar si un cliente ya existe antes de crear uno nuevo.
- Mantener datos limpios.
- No duplicar clientes con el mismo telefono.

Para asesores:

- El backend limita los contactos visibles segun sus conversaciones asignadas.
- Si un asesor crea un contacto nuevo, el sistema crea una conversacion inicial asignada a el.

## 8. Ficha del cliente

La ficha del cliente resume la informacion importante de un cliente en un solo lugar.

Puede incluir:

- Datos principales.
- Conversaciones.
- Notas internas.
- Tareas.
- Oportunidades.
- Etiquetas.
- Actividad relacionada.

Sirve para que el asesor entienda rapidamente el contexto antes de responder o vender, sin tener que buscar informacion en varias pantallas.

## 9. Notas internas

Las notas internas son comentarios privados del equipo.

Sirven para:

- Registrar contexto.
- Dejar indicaciones para otro asesor.
- Registrar acuerdos no visibles para el cliente.
- Anotar detalles de seguimiento.

Importante:

- No son mensajes enviados al cliente.
- No deben usarse para guardar claves, tokens o informacion sensible innecesaria.

## 10. Tareas

Tareas permite programar seguimientos.

Ejemplos:

- Llamar manana.
- Enviar cotizacion.
- Confirmar pago.
- Revisar stock.
- Dar seguimiento a una oportunidad.

Campos principales:

- Titulo.
- Descripcion.
- Fecha de vencimiento.
- Cliente relacionado.
- Conversacion relacionada.
- Oportunidad relacionada.
- Asesor asignado.
- Estado.

Estados:

- PENDIENTE.
- VENCIDA, cuando ya paso su fecha.
- COMPLETADA.
- CANCELADA.

Para asesores:

- Debe funcionar como lista diaria de pendientes.
- El backend limita las tareas a las que le pertenecen o estan vinculadas a sus clientes/conversaciones.

## 11. Ventas

Ventas maneja oportunidades comerciales.

Sirve para:

- Crear oportunidades.
- Registrar monto.
- Asignar etapa.
- Estimar cierre.
- Marcar oportunidades ganadas o perdidas.

Etapas:

- NUEVA.
- CALIFICADA.
- PROPUESTA.
- NEGOCIACION.
- GANADA.
- PERDIDA.

Uso recomendado:

- Usar Ventas para oportunidades reales.
- No confundir Pipeline con Ventas: Pipeline muestra estados de atencion; Ventas muestra oportunidades comerciales.

Para asesores:

- Pueden trabajar oportunidades relacionadas con sus clientes o conversaciones.
- Deben registrar una oportunidad cuando exista una posibilidad real de venta, no por cada mensaje recibido.
- Deben cerrar como GANADA o PERDIDA para que los reportes sean utiles.

## 12. Pipeline

Pipeline muestra el estado de las conversaciones y la atencion.

Sirve para:

- Ver casos nuevos.
- Ver conversaciones en atencion.
- Identificar casos cerrados o perdidos.
- Mover tarjetas entre etapas con drag and drop.
- Supervisar asignaciones.
- Revisar la carga de trabajo.

Uso recomendado:

- Supervisor y administrador lo usan para control operativo completo.
- El asesor puede usar Pipeline como tablero filtrado de sus casos y conversaciones nuevas sin asignar, no como vista global de toda la empresa.

## 13. Reportes

Reportes muestra informacion agregada del CRM.

Permite responder:

- Cuantos clientes existen.
- Cuantas conversaciones entraron.
- Cuantos mensajes se enviaron o recibieron.
- Cuantas tareas estan pendientes.
- Cuantas oportunidades estan abiertas.
- Cuanto monto comercial hay.
- Que asesor tiene mas carga.
- Que canal genera mas actividad.

Uso recomendado:

- Administrador: revision estrategica.
- Supervisor: seguimiento del equipo.
- Asesor: normalmente no requiere reportes generales.

## 14. Comentarios

Comentarios esta preparado para centralizar interacciones tipo comentario de redes sociales.

Sirve para:

- Ver comentarios entrantes.
- Identificar de que canal vienen.
- Relacionarlos con cliente/conversacion.

Estado actual:

- Preparado para Facebook/Instagram segun permisos y webhooks reales de Meta.

## 15. Actividad

Actividad muestra acciones realizadas dentro del sistema.

Ejemplos:

- Creacion de cliente.
- Cambio de estado.
- Reasignacion de conversacion.
- Creacion de oportunidad.
- Eventos de integracion.

Uso recomendado:

- Administrador y supervisor.
- Sirve para auditoria y trazabilidad.

## 16. Fallos

Fallos muestra problemas detectados en integraciones o mensajes.

Puede mostrar:

- Mensajes no enviados.
- Errores de API.
- Eventos de webhook fallidos.
- Respuestas locales cuando el envio real no esta activo.

Uso recomendado:

- Administrador y supervisor.
- No es una vista normal de asesor.

## 17. Plantillas rapidas

Las plantillas rapidas son respuestas manuales para asesores.

Sirven para:

- Responder mas rapido.
- Mantener mensajes consistentes.
- Evitar escribir lo mismo muchas veces.
- Usar textos frecuentes sin que el bot los envie automaticamente.

Ejemplos:

- Saludo.
- Envio de catalogo.
- Solicitud de datos para cotizar.
- Seguimiento.
- Cierre.

Importante:

- Las plantillas rapidas no reemplazan al asesor.
- El asesor elige la plantilla, la revisa y luego envia el mensaje.
- Se administran desde el modulo Bot, pero son distintas a las plantillas del bot automatico.

### Como agregar o editar plantillas rapidas

Solo administrador o supervisor debe administrar estas respuestas.

Pasos:

1. Entrar al CRM como Administrador o Supervisor.
2. Abrir el modulo Bot.
3. Buscar la seccion "Plantillas rapidas" o "Respuestas manuales para asesores".
4. Editar el titulo, categoria y texto del mensaje.
5. Activar o desactivar la plantilla segun corresponda.
6. Usar "Agregar respuesta rapida" si se necesita una nueva.
7. Presionar "Guardar respuestas rapidas".

Campos:

- Titulo: nombre corto que vera el asesor en Comunicaciones.
- Categoria: ayuda a ordenar el tipo de respuesta.
- Mensaje: texto que se insertara en el campo de respuesta.
- Activa: permite mostrar u ocultar la plantilla sin borrarla.

Buenas practicas:

- Usar titulos cortos.
- Evitar textos demasiado largos.
- No incluir claves, tokens, datos bancarios sensibles o informacion privada innecesaria.
- Revisar ortografia y tono antes de guardar.
- Mantener plantillas para casos repetidos: saludo, catalogo, cotizacion, seguimiento y cierre.

## 18. Bot

Bot permite configurar respuestas automaticas.

Sirve para:

- Definir mensaje de bienvenida.
- Crear opciones.
- Definir respuestas.
- Derivar a asesor.
- Limitar respuestas automaticas.

Regla importante:

- Cuando un asesor responde, el bot se pausa en esa conversacion.
- Esto evita que el cliente reciba respuestas automaticas despues de que una persona ya tomo el caso.
- Las plantillas del bot son para automatizacion. Las plantillas rapidas son para respuestas manuales del asesor.

### Diferencia entre plantillas del bot y plantillas rapidas

Plantillas del bot:

- Las usa el bot automatico.
- Se activan segun opciones que responde el cliente.
- Pueden derivar a asesor.
- Funcionan antes de que una persona tome el caso.

Plantillas rapidas:

- Las usa manualmente el asesor.
- Solo insertan texto en el campo de mensaje.
- No se envian automaticamente.
- Ayudan durante la atencion humana.

## 19. Flujo recomendado para asesores

El flujo ideal para un asesor debe ser simple y repetible.

### Paso 1: revisar conversaciones

El asesor entra a Comunicaciones y revisa:

- Chats asignados.
- Chats nuevos disponibles para tomar.
- Ultimo mensaje del cliente.
- Estado de la conversacion.
- Canal de origen.

### Paso 2: abrir la ficha del cliente

Antes de responder, debe revisar:

- Nombre.
- Telefono.
- Canal.
- Etiquetas.
- Historial.
- Notas internas.
- Tareas pendientes.
- Oportunidades abiertas.

### Paso 3: responder con contexto

Puede responder:

- Escribiendo manualmente.
- Usando plantillas rapidas.
- Adjuntando archivo.
- Enviando informacion comercial.

### Paso 4: registrar seguimiento

Si el cliente no compra de inmediato, el asesor debe crear una tarea.

Ejemplos:

- Llamar manana.
- Enviar cotizacion.
- Confirmar pago.
- Hacer seguimiento en 48 horas.

### Paso 5: registrar venta

Si hay interes comercial real, debe crear o actualizar una oportunidad en Ventas.

Debe registrar:

- Cliente.
- Monto estimado.
- Etapa.
- Probabilidad.
- Fecha estimada de cierre.

### Paso 6: cerrar correctamente

Cuando termina la atencion:

- Cambiar estado de conversacion.
- Marcar tarea como completada si aplica.
- Marcar oportunidad como GANADA o PERDIDA si corresponde.
- Dejar nota interna si queda contexto importante.

## 20. Modulos que debe ver cada rol

### Asesor

Debe ver solo:

- Comunicaciones.
- Contactos.
- Tareas.
- Pipeline.
- Ventas.

No debe ver:

- Conexiones.
- Usuarios.
- Fallos tecnicos.
- Actividad global.
- Configuracion global del bot.
- Reportes globales.
- Conversaciones de otros asesores.

### Supervisor

Debe ver:

- Dashboard.
- Comunicaciones.
- Contactos.
- Pipeline.
- Tareas.
- Ventas.
- Reportes.
- Actividad.
- Fallos.
- Bot.

### Administrador

Debe ver todo:

- Dashboard.
- Comunicaciones.
- Contactos.
- Tareas.
- Pipeline.
- Ventas.
- Reportes.
- Comentarios.
- Actividad.
- Fallos.
- Bot.
- Conexiones.
- Usuarios.

## 21. Conexiones

Conexiones permite configurar integraciones externas.

Canales:

- WhatsApp.
- Instagram.
- Facebook.
- TikTok.

Sirve para:

- Configurar tokens.
- Copiar webhooks.
- Validar datos.
- Sincronizar o diagnosticar integraciones.
- Revisar que los identificadores usados correspondan a la misma pagina/cuenta.

Uso recomendado:

- Solo administrador o personal tecnico.
- No debe manipularse durante atencion normal.

Relaciones importantes:

- WhatsApp usa Phone Number ID, Business Account ID, token y webhook.
- Facebook Insights requiere Page ID y Page Access Token con permiso de estadisticas.
- Instagram DMs puede usar Instagram Login, pero Instagram Insights requiere datos de la cuenta profesional y token compatible con insights.
- TikTok esta preparado como integracion futura; sus analiticas reales dependen de TikTok Business/Marketing API.

## 22. Usuarios

Usuarios permite administrar cuentas internas del CRM.

Sirve para:

- Crear asesores.
- Crear supervisores.
- Cambiar contrasenas.
- Mantener usuarios activos.

Uso recomendado:

- Solo administrador.

## 23. Canales

### WhatsApp

Es el canal principal operativo.

Flujo:

- Cliente escribe por WhatsApp.
- Meta envia webhook.
- CRM crea o actualiza cliente.
- CRM crea o actualiza conversacion.
- Mensaje aparece en Comunicaciones.
- Asesor responde.
- CRM registra el mensaje y lo envia por WhatsApp Cloud API si el envio real esta activo.

### Instagram

Estado actual:

- Cuenta profesional validada.
- Token de Instagram Login validado.
- El CRM consulta Graph API correctamente.
- En modo desarrollador Meta no entrega DMs reales externos ni webhooks reales de mensajes como produccion.

Para recibir DMs reales se requiere publicacion/capability/aprobacion de Meta.

### Facebook

Preparado para Messenger y Page Webhooks.

Requiere:

- Pagina vinculada.
- Page Access Token.
- Permisos correctos.
- Webhook suscrito.

Para estadisticas reales de Facebook:

- El CRM consulta Meta Graph API.
- Si sale SIN_DATOS, Meta acepto la consulta pero devolvio 0.
- Si sale ERROR, revisar token, permisos o metrica.
- Si sale NO_CONFIGURADO, falta Page ID o Page Access Token.

### TikTok

Preparado como canal futuro de leads/campanas.

No se debe prometer como inbox de DMs normales sin acceso oficial, partner o producto aprobado.

Para estadisticas reales de TikTok se requiere una integracion aprobada con TikTok Business/Marketing API o un proveedor autorizado.

## 24. Seguridad visible para el usuario

El usuario debe entender estas reglas:

- No compartir usuario ni contrasena.
- No enviar tokens por capturas.
- No guardar claves en notas internas.
- Cerrar sesion en equipos compartidos.
- Reportar errores o mensajes sospechosos.
- El asesor solo debe trabajar sus clientes/conversaciones.

Controles ya aplicados:

- Login obligatorio.
- Roles.
- Vista simplificada por rol.
- Restriccion backend por asignacion para asesores.
- Bot restringido a roles superiores.
- Endpoints protegidos.
- Rate limiting.
- Cookies endurecidas.
- Protecciones contra solicitudes externas indebidas.

## 25. Recomendacion de uso diario

Para asesores:

1. Entrar al CRM.
2. Ir a Comunicaciones.
3. Revisar conversaciones pendientes.
4. Responder al cliente.
5. Actualizar datos del contacto si hace falta.
6. Crear nota interna cuando haya contexto importante.
7. Crear tarea si hay seguimiento.
8. Crear oportunidad si hay venta real.
9. Cerrar o cambiar estado cuando corresponda.

Para supervisores:

1. Revisar Dashboard.
2. Revisar Pipeline.
3. Validar conversaciones sin asignar.
4. Revisar tareas vencidas.
5. Revisar ventas abiertas.
6. Revisar reportes y fallos.

Para administradores:

1. Revisar usuarios.
2. Revisar conexiones.
3. Revisar fallos.
4. Revisar actividad.
5. Mantener configuraciones y permisos.

## 26. Que hacer si algo no aparece

Si no aparece una conversacion:

- Revisar si esta asignada al usuario correcto.
- Revisar si el canal esta configurado.
- Revisar Fallos si eres supervisor/admin.
- Revisar si el webhook publico esta activo.

Si no aparece Instagram:

- Recordar que en modo desarrollador Meta limita DMs reales.
- Probar con datos simulados o esperar aprobacion/publicacion.

Si no se envia un mensaje:

- Revisar estado del canal.
- Revisar token.
- Revisar Fallos.
- Revisar si el envio real esta activo.

Si las estadisticas externas salen en cero:

- Revisar en Dashboard la seccion "Resultado por metrica de Meta".
- Si dice CERO, la API respondio bien pero no hubo datos en ese rango.
- Si dice ERROR, revisar el mensaje tecnico mostrado.
- Si dice NO_CONFIGURADO, completar los datos en Conexiones.
- Probar un rango de fechas mas amplio si aplica.

Si no aparecen plantillas rapidas:

- Revisar en Bot si existen plantillas rapidas activas.
- Confirmar que se presiono "Guardar respuestas rapidas".
- Abrir una conversacion en Comunicaciones; las plantillas solo aparecen dentro de un chat.
- Si se editaron recientemente, recargar el modulo Comunicaciones.

## 27. Cierre

El CRM ya esta preparado para operar como centro de atencion y seguimiento comercial. El uso correcto depende de separar bien responsabilidades:

- Asesor atiende y vende.
- Supervisor controla operacion.
- Administrador configura y audita.
