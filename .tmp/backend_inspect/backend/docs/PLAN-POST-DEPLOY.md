# Plan posterior al despliegue

Este documento servirá como lista de seguimiento para las tareas que realizaremos después de poner la aplicación en producción. Se irá actualizando conforme se completen o agreguen nuevas actividades.

## 1. Preparación del entorno de producción

- [ ] Configurar las variables de entorno de producción.
- [ ] Configurar el dominio y el certificado HTTPS.
- [ ] Configurar la conexión de producción a la base de datos.
- [ ] Configurar el almacenamiento de archivos y permisos.
- [ ] Configurar Laravel Reverb para conexiones en tiempo real.
- [ ] Configurar el worker de colas de Laravel.
- [ ] Configurar el scheduler de Laravel.
- [ ] Desactivar `APP_DEBUG`.
- [ ] Generar y proteger las credenciales de producción.

## 2. Publicación de la aplicación

- [ ] Ejecutar las migraciones con `--force`.
- [ ] Verificar los seeders necesarios para producción.
- [ ] Construir el frontend para producción.
- [ ] Configurar el servidor web.
- [ ] Verificar las rutas del frontend y del backend.
- [ ] Confirmar que los archivos públicos sean accesibles únicamente mediante las rutas esperadas.
- [ ] Comprobar que el inicio de sesión funcione con HTTPS.

## 3. Verificación funcional después del deploy

- [ ] Probar inicio y cierre de sesión.
- [ ] Crear y editar clientes.
- [ ] Crear una cotización como cliente.
- [ ] Enviar una cotización a revisión.
- [ ] Verificar notificaciones internas de cotizaciones.
- [ ] Verificar correos de cliente y administración.
- [ ] Crear un borrador de publicación.
- [ ] Publicar una novedad.
- [ ] Publicar una promoción.
- [ ] Verificar la audiencia global y seleccionada.
- [ ] Verificar el snackbar en tiempo real.
- [ ] Verificar la campanita y el contador de no leídas.
- [ ] Verificar la navegación hacia publicaciones y cotizaciones.
- [ ] Verificar la paginación de publicaciones.
- [ ] Verificar los embeds de YouTube y otras plataformas.
- [ ] Verificar la carga y descarga de archivos.

## 4. Notificaciones y tareas programadas

- [ ] Confirmar que `php artisan schedule:work` o el scheduler del servidor esté activo.
- [ ] Confirmar la limpieza diaria de notificaciones leídas con más de 30 días.
- [ ] Revisar los logs del comando `notifications:clean-read`.
- [ ] Verificar que las notificaciones no leídas no se eliminen.
- [ ] Configurar el procesamiento de notificaciones mediante colas cuando aumente la cantidad de clientes.
- [ ] Evaluar una vista de historial completo de notificaciones.

## 5. Backups y recuperación

- [ ] Crear backups automáticos de la base de datos.
- [ ] Crear backups automáticos de archivos e imágenes.
- [ ] Comprimir los backups en archivos ZIP.
- [ ] Definir una política de retención.
- [ ] Copiar los backups a un destino externo.
- [ ] Proteger los backups con permisos y cifrado.
- [ ] Realizar una prueba de restauración.
- [ ] Documentar el procedimiento de recuperación ante fallos.

## 6. Seguridad

- [ ] Revisar permisos por rol.
- [ ] Confirmar que un cliente no pueda consultar publicaciones de otra audiencia.
- [ ] Revisar validaciones de formularios.
- [ ] Revisar límites de tamaño y tipos de archivos.
- [ ] Confirmar que los archivos privados no estén expuestos públicamente.
- [ ] Revisar configuración de CORS.
- [ ] Revisar protección contra abuso y exceso de peticiones.
- [ ] Renovar credenciales de prueba antes del uso real.
- [ ] Revisar los logs en busca de errores o accesos sospechosos.

## 7. Rendimiento y mantenimiento

- [ ] Revisar tiempos de respuesta de las APIs.
- [ ] Revisar consultas lentas de la base de datos.
- [ ] Confirmar índices en tablas de alto crecimiento.
- [ ] Supervisar el tamaño de la tabla `notifications`.
- [ ] Supervisar el almacenamiento de imágenes y adjuntos.
- [ ] Configurar cache cuando sea necesario.
- [ ] Revisar consumo de CPU, memoria y disco.
- [ ] Configurar alertas para errores críticos.

## 8. Observabilidad

- [ ] Revisar logs de Laravel.
- [ ] Revisar errores del frontend en el navegador.
- [ ] Supervisar Laravel Reverb.
- [ ] Supervisar workers y trabajos fallidos.
- [ ] Configurar alertas de caídas del servicio.
- [ ] Registrar eventos importantes de publicación y notificaciones.
- [ ] Medir publicaciones creadas, notificaciones enviadas y notificaciones leídas.

## 9. Mejoras funcionales posteriores

- [x] Implementar “Ver todas las notificaciones” con paginación.
- [ ] Agregar filtros de notificaciones por tipo y estado.
- [ ] Agregar búsqueda de publicaciones en el panel administrativo.
- [ ] Agregar estadísticas de visualización y clics.
- [ ] Permitir reintentar notificaciones fallidas.
- [ ] Mejorar la compresión automática de imágenes.
- [ ] Agregar más controles para publicaciones programadas.
- [ ] Evaluar soporte para varios idiomas.

## 10. Orden recomendado

Se recomienda avanzar en este orden:

1. Seguridad y variables de producción.
2. Deploy y HTTPS.
3. Colas, Reverb y scheduler.
4. Pruebas funcionales posteriores al deploy.
5. Backups y restauración.
6. Monitoreo y logs.
7. Optimización de rendimiento.
8. Nuevas funcionalidades.

## 11. Registro de cambios futuros

Usaremos esta sección para anotar tareas nuevas que aparezcan después del despliegue.

| Fecha | Tarea | Prioridad | Estado | Observaciones |
|---|---|---|---|---|
| 2026-09-15 | Crear plan posterior al despliegue | Alta | Completada | Documento inicial |

## 12. Criterio de finalización

La etapa posterior al despliegue se considerará estable cuando:

- La aplicación funcione correctamente con HTTPS.
- Las APIs respondan sin errores críticos.
- Las notificaciones, correos y Reverb estén operativos.
- El scheduler y las colas estén activos.
- Existan backups probados y recuperables.
- Los permisos y la privacidad de los datos estén verificados.
- Se cuente con logs y monitoreo suficientes para detectar problemas.
