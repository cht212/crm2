# Tecnologias del sistema

Este documento resume las tecnologias utilizadas en la aplicacion de cotizaciones,
su organizacion y las funcionalidades agregadas para las notificaciones en tiempo
real.

## Arquitectura general

El sistema esta dividido en dos repositorios:

- `frontend`: aplicacion web para clientes, comerciales y administradores.
- `backend`: API REST, autenticacion, reglas de negocio, persistencia y WebSockets.

La comunicacion normal utiliza HTTP/JSON. Las notificaciones en tiempo real
utilizan una conexion WebSocket privada por usuario.

## Frontend

### Tecnologias principales

- Vue 3.5: framework de interfaz.
- TypeScript 5.9: tipado estatico.
- Vite 7: servidor de desarrollo y empaquetado.
- Vuetify 3: componentes visuales y layout.
- Vue Router 4: navegacion entre vistas.
- Pinia: estado compartido.
- VueUse: composables reutilizables.
- Sass: estilos.
- `ofetch`: cliente HTTP para consumir la API.
- CASL: control de habilidades y permisos en la interfaz.

### Herramientas de interfaz

- Iconify y los paquetes de iconos `ri` y `mdi`.
- ApexCharts y Chart.js: graficas.
- Tiptap: editor de texto enriquecido.
- Mapbox GL: mapas.
- Flatpickr: seleccion de fechas.
- Swiper: carruseles.
- Perfect Scrollbar: desplazamiento en menus y listas.

### Notificaciones en tiempo real

- `laravel-echo`: suscripcion a canales y eventos de Laravel.
- `pusher-js`: transporte compatible utilizado por Echo para Reverb.
- Laravel Reverb: servidor WebSocket del backend.
- Web Audio API: sonido corto al recibir una notificacion nueva.

Archivos principales:

- `src/services/echo.ts`: crea y configura la instancia de Echo.
- `src/services/notificationService.ts`: consulta, marca como leida y elimina
  notificaciones.
- `src/layouts/components/NavBarNotifications.vue`: campana, punto rojo,
  snackbar, sonido y suscripcion al canal privado.
- `src/pages/quotations/[id]/index.vue`: recarga la cotizacion cuando cambia el
  parametro de ruta, incluso si Vue reutiliza la misma pagina.

## Backend

### Tecnologias principales

- PHP 8.3.
- Laravel 13.
- Laravel Passport 13: autenticacion API con tokens Bearer.
- Laravel Reverb 1.11: servidor WebSocket.
- Laravel Notifications: notificaciones persistentes y broadcast.
- Laravel Queue: procesamiento asincrono de broadcasts.
- MySQL: base de datos principal.
- Spatie Laravel Permission: roles y permisos.
- Laravel Tinker: diagnostico y consultas manuales.

### Dependencias de desarrollo

- PHPUnit 12: pruebas automatizadas.
- Laravel Pint: formateo de PHP.
- Faker: datos de prueba.
- Mockery: mocks para pruebas.
- Laravel Pail: visualizacion de logs.

## Flujo de una notificacion de cotizacion

1. El cliente envia una cotizacion en estado `Borrador`.
2. Laravel la cambia a `Pendiente`.
3. Se registra el historial de la cotizacion.
4. Se crea una notificacion en la tabla `notifications`.
5. Laravel crea el trabajo `BroadcastNotificationCreated`.
6. `queue:work` procesa el trabajo.
7. Reverb publica el evento por WebSocket.
8. Echo recibe el evento en el canal privado del usuario.
9. La interfaz muestra:
   - snackbar;
   - punto rojo en la campana;
   - nuevo registro;
   - sonido corto.

La notificacion queda guardada en la base de datos, por lo que tambien puede
mostrarse cuando el usuario vuelve a conectarse.

## Seguridad de los canales

Cada usuario escucha un canal privado con el formato:

```text
App.Models.User.{user_id}
```

El endpoint `/broadcasting/auth` utiliza el guard `auth:api`. El frontend envia
el token Passport como:

```text
Authorization: Bearer {access_token}
```

La autorizacion confirma que el usuario autenticado solo pueda suscribirse a su
propio canal.

## Acciones sobre notificaciones

La campana permite:

- listar las ultimas notificaciones;
- marcar una notificacion como leida;
- marcar varias notificaciones como leidas o no leidas;
- eliminar una notificacion con la `X`;
- abrir la cotizacion relacionada.

Cuando se elimina una notificacion, se borra tanto de la interfaz como de la
tabla `notifications`, por lo que no reaparece al recargar.

Endpoints utilizados:

```text
GET    /api/notifications
POST   /api/notifications/{id}/read
DELETE /api/notifications/{id}
POST   /broadcasting/auth
```

## Configuracion local

Backend:

```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=local-app
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
QUEUE_CONNECTION=database
```

Frontend:

```env
VITE_API_BASE_URL=/api
VITE_REVERB_APP_KEY=local-key
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

## Ejecucion local

Se deben mantener activos el servidor HTTP, Reverb, el worker de la cola y
Vite:

```powershell
# Backend
cd C:\laragon\www\project\backend
php artisan serve
```

```powershell
# WebSocket
cd C:\laragon\www\project\backend
php artisan reverb:start --host=127.0.0.1 --port=8080
```

```powershell
# Cola de notificaciones
cd C:\laragon\www\project\backend
php artisan queue:work --tries=3
```

```powershell
# Frontend
cd C:\laragon\www\project\frontend
pnpm dev
```

## Validacion

Frontend:

```powershell
pnpm typecheck
pnpm build
```

Backend:

```powershell
php artisan test
```

La prueba especifica de notificaciones es:

```powershell
php artisan test tests/Feature/Commercial/QuoteNotificationTest.php
```

## Ramas

La funcionalidad de notificaciones en tiempo real se encuentra en:

```text
feature/quote-notifications
```

Los commits asociados son:

- Frontend: `741ab6c feat(notifications): complete realtime quote alerts`
- Backend: `a00a387 feat(notifications): add realtime quote alerts`

La rama `develop` conserva el estado anterior a esta funcionalidad hasta que
se decida integrar los cambios.
