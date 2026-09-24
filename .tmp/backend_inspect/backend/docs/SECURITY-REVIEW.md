# Revisión de seguridad - HPD Cotizaciones

## Alcance

Revisión estática realizada sobre el frontend y backend del entorno de
desarrollo. El objetivo es registrar problemas con impacto real y dejar una
lista de resolución verificable antes de producción.

Esta revisión no sustituye una prueba de penetración autorizada contra un
entorno aislado.

## Resumen de clasificación

| ID | Severidad | Estado | Área | Impacto |
|---|---|---|---|---|
| SEC-001 | 🔴 CRITICAL | Corregida | Control de usuarios y roles | Un Comercial puede escalar a Administrador |
| SEC-002 | 🟠 HIGH | Corregida | Autenticación y cuentas desactivadas | Una cuenta desactivada puede obtener y usar tokens |
| SEC-003 | 🟠 HIGH | Corregida | XSS almacenado en publicaciones | HTML malicioso podría ejecutarse en clientes |
| SEC-004 | 🟡 MEDIUM | Pendiente / riesgo aceptado temporalmente | Exposición de token en frontend | Un XSS podría robar el token y reutilizar la sesión |
| SEC-005 | 🟡 MEDIUM | Pendiente de validación | Integración ERP y lista de IPs | Una configuración de proxy incorrecta podría saltarse el filtro IP |

Los elementos pendientes no deben darse por corregidos hasta ejecutar la prueba
indicada en cada sección.

---

## SEC-001 - Escalada de privilegios mediante gestión de usuarios

**Severidad:** 🔴 CRITICAL  
**Estado:** Pendiente / riesgo aceptado temporalmente  
**Confianza:** 10/10  
**Categoría:** Broken Access Control / Privilege Escalation

### Ubicación

- `app/Policies/UserPolicy.php`, métodos `create` y `update`.
- `database/seeders/RoleAndUserSeeder.php`, permisos del rol `commercial`.
- `app/Http/Requests/User/UserRequest.php`, validación del campo `role`.

### Problema identificado

El rol Comercial recibe permisos para crear y actualizar usuarios. La validación
acepta el rol `admin` sin comprobar que el solicitante sea Administrador.

Un usuario Comercial autenticado puede enviar directamente una petición a la
API, aunque el frontend no muestre el control.

### Impacto real

Un Comercial comprometido puede crear un usuario Administrador y después
utilizarlo para gestionar catálogo, publicaciones, usuarios, empresas y demás
funcionalidades administrativas.

### Prueba controlada

Con una cuenta Comercial de pruebas, enviar a un entorno local:

```http
POST /api/users
Authorization: Bearer <token-comercial>
Content-Type: application/json
```

```json
{
  "name": "Usuario de auditoria",
  "email": "auditoria@example.test",
  "password": "TemporaryPassword123!",
  "password_confirmation": "TemporaryPassword123!",
  "role": "admin",
  "is_active": true
}
```

El resultado vulnerable es una respuesta `201` y un usuario con rol
`admin`. El resultado esperado es `403 Forbidden` o un rechazo de validación.

### Corrección aplicada

Se mantuvo la gestión de usuarios para Comercial, pero se agregaron dos
restricciones server-side:

- `UserRequest` solo permite a Comercial asignar `customer` o `commercial`.
- `UserPolicy::update` impide que Comercial modifique un usuario con rol
  `admin`.

El Administrador conserva la capacidad de asignar los tres roles autorizados.
La restricción se aplica antes de crear o actualizar el usuario y no depende
del menú ni de CASL.

### Criterio de aceptación

- Comercial no puede crear Administradores.
- Comercial no puede convertir otro usuario en Administrador.
- Administrador puede seguir gestionando usuarios autorizados.
- Existe una prueba Feature que espera `403` para el intento Comercial.

---

## SEC-002 - Cuentas desactivadas pueden autenticarse

**Severidad:** 🟠 HIGH  
**Estado:** Corregida  
**Confianza:** 9/10  
**Categoría:** Authentication Failure / Account Revocation

### Ubicación

- `app/Services/Auth/AuthService.php`, método `login`.
- `routes/api.php`, grupo protegido únicamente por `auth:api`.
- Campo `users.is_active`, administrado desde el flujo de usuarios.

### Problema

El login comprueba correo y contraseña, pero no comprueba `is_active`. Una
cuenta desactivada puede obtener un token nuevo.

Además, los tokens existentes no se revocan automáticamente cuando un
Administrador desactiva la cuenta.

### Impacto real

Un usuario al que se le retiró el acceso puede seguir entrando al sistema si
conserva sus credenciales. Si ya tenía un token válido, puede continuar usando
la API hasta su expiración.

### Prueba controlada

1. Crear o seleccionar un usuario de pruebas.
2. Cambiar `is_active` a `false`.
3. Intentar:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "usuario-prueba@example.test",
  "password": "Password123!"
}
```

El resultado vulnerable es `200` con `accessToken`. El resultado esperado es
`401` o `422` sin token.

4. Con un token emitido antes de desactivar la cuenta, consultar:

```http
GET /api/auth/user
Authorization: Bearer <token-anterior>
```

El resultado esperado es `401 Unauthorized`.

### Corrección aplicada

- El login rechaza usuarios con `is_active=false` usando el mismo mensaje
  genérico de credenciales inválidas.
- `EnsureUserIsActive` comprueba el estado de la cuenta después de
  `auth:api` en todas las rutas protegidas.
- `UserService::update` revoca los tokens al cambiar una cuenta de activa a
  inactiva.
- Una cuenta reactivada puede autenticarse nuevamente.

### Criterio de aceptación

- Una cuenta inactiva no recibe tokens.
- Los tokens existentes dejan de funcionar.
- Una cuenta reactivada puede autenticarse nuevamente.
- Hay pruebas para login y para una petición con token previamente emitido.

---

## SEC-003 - Posible XSS almacenado en el contenido de publicaciones

**Severidad:** 🟠 HIGH  
**Estado:** Corregida  
**Confianza:** 8/10  
**Categoría:** Stored Cross-Site Scripting

### Ubicación

- `frontend/src/pages/promotions/[id]/index.vue`, renderizado con `v-html`.
- Flujo backend de creación y actualización de publicaciones.

### Problema

El frontend renderiza contenido HTML recibido desde la API. Si el backend
almacena HTML sin sanitización estricta, una etiqueta o atributo malicioso
guardado en una publicación puede ejecutarse cada vez que un cliente la abra.

### Impacto posible

Un atacante que consiga crear o modificar una publicación podría ejecutar
JavaScript en los navegadores de clientes, leer datos disponibles en el
contexto de la aplicación o realizar acciones con su sesión.

### Prueba controlada

En un entorno local aislado, crear una publicación con una cadena inocua de
prueba, por ejemplo:

```html
<img src=x onerror="document.body.dataset.xss='1'">
```

Abrir la publicación con una cuenta cliente y comprobar si se agrega el
atributo `data-xss="1"` al `body`. No utilizar cargas destructivas ni probarlo
contra usuarios reales.

### Corrección aplicada

- Sanitizar HTML en backend con una allowlist de etiquetas y atributos.
- Sanitizar nuevamente antes de renderizar si existe más de una fuente de
  contenido.
- Bloquear atributos de eventos (`onerror`, `onclick`, etc.), `javascript:`,
  iframes no autorizados y URLs peligrosas.
- Añadir una prueba que confirme que el payload se muestra como texto o se
  elimina.

### Criterio de aceptación

Ningún contenido ingresado por publicación puede ejecutar JavaScript al ser
visualizado por un cliente.

---

## SEC-004 - Token accesible desde JavaScript

**Severidad:** 🟡 MEDIUM  
**Estado:** Corregida  
**Confianza:** 8/10  
**Categoría:** Session Token Exposure

### Ubicación

- `frontend/src/composables/useLogin.ts`.
- `frontend/src/utils/api.ts`.
- `frontend/src/composables/useApi.ts`.

### Problema

El access token se guarda en una cookie que el frontend puede leer para
construir el encabezado `Authorization`. Por diseño, no es una cookie
HttpOnly.

Esto no constituye por sí solo una vulnerabilidad explotable sin XSS, pero
convierte cualquier XSS exitoso en una posibilidad de robo y reutilización del
token desde otro equipo.

### Mitigación actual

- El access token se devuelve en el JSON de login y se guarda en una cookie
  accesible desde JavaScript para construir el encabezado `Authorization`.
- La sanitización de contenido HTML reduce la probabilidad de XSS almacenado,
  pero no elimina el riesgo de una vulnerabilidad XSS futura.
- La migración a cookie `HttpOnly` se revirtió porque no funcionaba de forma
  confiable con el despliegue actual.

### Criterio de aceptación

La decisión de arquitectura debe quedar documentada y acompañada de una prueba
de que un script ejecutado en el navegador no puede leer el token si se retoma
la migración a `HttpOnly`.

---

## SEC-005 - Riesgo de bypass del filtro IP de la integración ERP

**Severidad:** 🟡 MEDIUM  
**Estado:** Pendiente de validación  
**Confianza:** 7/10  
**Categoría:** Network Access Control

### Ubicación

- `app/Http/Middleware/VerifyIntegrationApiKey.php`.
- Configuración de proxy inverso y cabeceras `X-Forwarded-For`.

### Problema

La integración utiliza API key y lista de IPs permitidas. Si el middleware o el
proxy confían en una cabecera de IP que el cliente puede modificar, un atacante
podría intentar presentarse como una IP autorizada.

### Prueba controlada

Desde una máquina no autorizada, probar el endpoint de integración con:

```http
X-Forwarded-For: <ip-permitida>
```

El resultado esperado es rechazo. La prueba debe hacerse únicamente en el
entorno local o de pruebas y con autorización.

### Corrección requerida

- Configurar correctamente los proxies confiables de Laravel.
- Obtener la IP del cliente desde la cadena de proxies conocida.
- No confiar directamente en `X-Forwarded-For` si el servidor no está detrás de
  un proxy confiable.
- Mantener la API key fuera del repositorio.
- Aplicar rate limiting y registrar intentos rechazados.

### Criterio de aceptación

Una petición desde una IP no autorizada debe rechazarse aunque incluya
cabeceras de forwarding manipuladas.

---

## Orden recomendado de resolución

1. **SEC-001:** impedir la escalada de Comercial a Administrador. ✅
2. **SEC-002:** bloquear y revocar cuentas desactivadas. ✅
3. **SEC-003:** validar y corregir sanitización de publicaciones. ✅
4. **SEC-004:** evaluar migración del almacenamiento del token a cookie HttpOnly.
5. **SEC-005:** comprobar el filtro IP de la integración ERP.

## Estado de seguimiento

- [x] SEC-001 - Control de roles y usuarios.
- [x] SEC-002 - Cuentas desactivadas.
- [x] SEC-003 - Sanitización de publicaciones.
- [ ] SEC-004 - Exposición del token en frontend.
- [ ] SEC-005 - Filtro IP de integración ERP.

## Nota de seguridad

Todas las pruebas de este documento deben ejecutarse en el entorno local o de
pruebas autorizado. No se deben utilizar cuentas de clientes reales, tokens
reales ni payloads destructivos.
