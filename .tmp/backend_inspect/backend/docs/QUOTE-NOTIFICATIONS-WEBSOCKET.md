# Notificaciones de cotizaciones en tiempo real

La notificación se genera únicamente cuando el cliente envía una cotización que estaba en estado `Borrador`. El estado cambia a `Pendiente` y, desde ese momento, los usuarios administrativos reciben el aviso.

```mermaid
sequenceDiagram
    actor C as Cliente
    participant API as Laravel API
    participant S as QuoteRequestService
    participant DB as Base de datos
    participant R as Laravel Reverb
    participant U as Admin / Comercial
    participant UI as Frontend: campana y snackbar

    C->>API: Envía la cotización
    API->>S: Procesa el envío
    S->>DB: Cambia Borrador a Pendiente
    S->>DB: Guarda el historial
    S->>DB: Guarda la notificación
    S->>R: Publica el evento broadcast
    R-->>UI: Envía el evento por canal privado
    UI->>U: Muestra snackbar y contador
    U->>UI: Hace clic en la notificación
    UI->>API: Solicita marcarla como leída
    API->>DB: Actualiza read_at
    UI->>U: Navega al detalle de la cotización
```

## Lectura rápida del flujo

```mermaid
flowchart LR
    C[Cliente envía cotización] --> V{¿Estaba en Borrador?}
    V -- No --> N[No se genera este aviso]
    V -- Sí --> P[Laravel procesa el envío]
    P --> E[Estado: Pendiente]
    P --> H[Historial guardado]
    P --> D[Notificación guardada en DB]
    D --> R[Reverb transmite en tiempo real]
    R --> U[Campana y snackbar del admin/comercial]
    U --> L[Usuario abre la notificación]
    L --> M[Se marca como leída]
    L --> Q[Se abre el detalle de la cotización]
```

## Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| Cliente | Envía una cotización guardada como borrador. |
| `QuoteRequestService` | Cambia el estado, guarda el historial y dispara la notificación. |
| Laravel Notification | Construye el mensaje y sus datos. |
| Tabla `notifications` | Conserva el aviso aunque el destinatario no esté conectado. |
| Laravel Reverb | Transmite el evento en tiempo real. |
| Laravel Echo | Escucha el canal privado del usuario en el frontend. |
| Campana y snackbar | Muestran el aviso y permiten abrir la cotización. |

## Información enviada

La notificación incluye:

- Tipo: `quote_submitted`.
- Título: `Nueva cotización pendiente`.
- Mensaje con el número de cotización.
- ID de la cotización para construir el enlace.
- Número de solicitud para mostrarlo al usuario.

## Seguridad y comportamiento

- Los eventos se envían por un canal privado asociado al usuario.
- Solo reciben la notificación los usuarios administrativos autorizados.
- La notificación se guarda antes de depender de la conexión WebSocket.
- Si el usuario estaba desconectado, puede verla al abrir la campanita.
- El frontend marca el registro como leído mediante la API.

## Servidores locales

```powershell
php artisan serve
php artisan reverb:start --host=127.0.0.1 --port=8080
pnpm dev
```
