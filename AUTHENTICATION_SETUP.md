# Acceso y roles del CRM

## Usuario inicial

El primer usuario se crea automáticamente cuando `crm_usuario` está vacía y existe este secreto:

```text
Authentication:BootstrapPassword
```

El usuario inicial es:

```text
Usuario: admin
Contraseña inicial: Admin123!
Rol: Administrador
```

La contraseña se guardó en User Secrets, no en `appsettings.json`. Después del primer acceso debes cambiarla cuando esté disponible la administración de usuarios.

Para volver a configurar el secreto local:

```powershell
dotnet user-secrets set "Authentication:BootstrapPassword" "TU_CONTRASEÑA" --project ".\CRM.Data\CRM.Data.csproj"
```

El bootstrap solo se ejecuta si `crm_usuario` no tiene registros. No sobrescribe usuarios existentes.

## Roles

Los roles se leen desde `dbo.crm_usuario.c_rol`:

- `Administrador`: acceso completo a la gestión del CRM.
- `Supervisor`: contactos, pipeline, asignaciones, reportes y atención.
- `Asesor`: bandeja, conversaciones, mensajes y archivos.

Todos los usuarios deben tener `c_estado = 'A'` para iniciar sesión.

## Inicio de sesión

La web estática se abre en:

```text
http://localhost:5005/login.html
```

Después del login, la sesión se mantiene mediante una cookie HTTP-only. La web comprueba `/api/auth/me` antes de cargar el Inbox.

Endpoints disponibles:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

El webhook de Meta queda público para que Meta pueda verificarlo y enviar eventos. Las rutas de CRM, envío, archivos y estado de integraciones requieren sesión.