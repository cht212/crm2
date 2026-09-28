# Manual de uso del CRM HPD

Fecha de actualización: 28 de septiembre de 2026

## 1. Acceso

Abre la dirección del CRM y escribe usuario y contraseña. La sesión se mantiene activa durante la jornada y se cierra desde el menú de usuario.

Los roles disponibles son Administrador, Supervisor y Asesor. El menú y los datos visibles dependen del rol.

## 2. Dashboard

El Dashboard muestra el resumen de clientes, conversaciones, tareas, oportunidades, ventas y canales. Los valores se actualizan al entrar al módulo o al recargar la información.

## 3. Clientes

En Clientes se puede buscar, crear y actualizar la ficha de una persona. La ficha contiene nombre, teléfono, correo, documento, canal de origen, foto, etiquetas, conversaciones, tareas, notas y oportunidades.

## 4. Bandeja de conversaciones

La bandeja reúne las conversaciones disponibles según el rol. Una conversación puede pertenecer a WhatsApp, Facebook o Instagram.

Desde una conversación se puede:

- leer el historial;
- responder mensajes;
- enviar archivos permitidos;
- añadir notas internas;
- asignar responsable;
- cambiar el estado;
- pausar o reanudar el bot;
- crear una tarea u oportunidad.

Las conversaciones de WhatsApp muestran el número que recibió el mensaje cuando el WABA tiene varios números configurados.

## 5. WhatsApp

Los mensajes entrantes aparecen cuando Meta envía el webhook configurado. Las respuestas automáticas se generan cuando el bot está activo para la conversación. Las respuestas de asesores y del bot se envían por el número asociado a la conversación.

Los archivos aceptados son PDF, Word, Excel, JPG, JPEG, PNG y WEBP, hasta 15 MB. El archivo se muestra en el mensaje y queda disponible mediante una ruta protegida del CRM o mediante Cloudinary.

## 6. Tareas y oportunidades

Las tareas contienen título, descripción, fecha límite, estado, prioridad, responsable y relación con cliente o conversación. Las oportunidades contienen etapa, monto, probabilidad, responsable y fecha de cierre.

El módulo de ventas permite consultar oportunidades abiertas, ganadas y perdidas por etapa.

## 7. Reportes operativos

Reportes permite seleccionar fecha inicial, fecha final y asesor. Presenta clientes, conversaciones, mensajes entrantes y salientes, tareas, oportunidades, estados, etapas y carga por asesor. El botón de exportación genera el CSV del reporte operativo.

En el mismo módulo se muestran las publicaciones de Facebook, Instagram y TikTok dentro del rango seleccionado. Se muestran publicaciones por canal, publicaciones por día, enlace, me gusta, comentarios, compartidos y visualizaciones.

La fecha usada en el gráfico es la fecha de publicación. Las interacciones son los valores actuales entregados por cada red.

## 8. Conexiones

Conexiones muestra el estado de WhatsApp, Facebook, Instagram, TikTok y Cloudinary. Administradores y supervisores pueden abrir la configuración. Los secretos se muestran ocultos; el administrador puede revelarlos para revisarlos.

Para WhatsApp se puede registrar un número único o una lista JSON de números del mismo WABA. La lista se escribe en `WhatsApp:Numbers` con este formato:

```json
[{"phoneNumberId":"123456789012345","displayNumber":"+51 999 999 999"}]
```

El formulario valida el JSON, los identificadores numéricos y los duplicados. El botón de webhook copia la dirección que se registra en Meta. Instagram incluye una acción de sincronización para importar conversaciones cuando Instagram Login está configurado. Facebook incluye diagnóstico de credenciales y permisos.

## 9. Indicadores y permisos

El diagnóstico de Meta informa si el token es válido, su tipo, vencimiento y permisos recibidos. Las publicaciones de Facebook requieren un Page Access Token con acceso a la página y lectura de publicaciones e insights. Instagram requiere una cuenta profesional, su identificador y un token con acceso a medios e insights. TikTok necesita `TikTok:DisplayAccessToken` con permiso `video.list` para cargar publicaciones y contadores.

Si una red no tiene token, identificador o permiso, el reporte muestra el canal como no configurado o devuelve el detalle del error de la API.

## 10. Administración

El Administrador gestiona usuarios, roles, conexiones, bot, plantillas, campañas, reglas automáticas y reportes. El Supervisor gestiona la operación y los reportes disponibles para su rol. El Asesor trabaja con conversaciones, clientes, tareas, notas y oportunidades asignadas.

## 11. Cierre de sesión

Usa el menú de usuario y selecciona Cerrar sesión. La cookie de sesión se invalida en el servidor.
