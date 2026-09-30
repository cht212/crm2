# Organización de estilos

Las hojas se cargan desde `wwwroot/index.html` en este orden:

1. `00-foundation.css`: variables, normalización, estructura y navegación general.
2. `10-inbox.css`: bandeja, chat, mensajes, adjuntos y ficha del contacto.
3. `20-crm-modules.css`: módulos operativos como contactos, tareas, ventas y reportes.
4. `30-theme-dashboard.css`: modo oscuro, correcciones compartidas y dashboard.
5. `40-marketing.css`: panel, métricas, publicaciones y comentarios de Marketing.
6. `50-responsive-overrides.css`: adaptaciones finales, navegación e interfaz móvil.

Mantén este orden porque conserva la cascada histórica. Para un cambio localizado,
edita primero la hoja del módulo correspondiente. `MaterializeReference.css` queda
únicamente como referencia de compatibilidad y ya no se carga en la aplicación.

`login.css` pertenece exclusivamente a `wwwroot/login.html` y se carga desde esa
página; no forma parte de la cascada de la aplicación principal.

## Reglas de consistencia

- Usa las variables de `00-foundation.css` para colores, radios, sombras y altura
  de controles; evita crear valores visuales nuevos dentro de un módulo.
- Cada módulo conserva sus estilos base y sus adaptaciones propias. El archivo
  `50-responsive-overrides.css` se reserva para estructura compartida y navegación.
- Breakpoints compartidos: `1100px` para tableta, `720px` para móvil y `520px`
  para pantallas compactas.
- No declares dos valores distintos de una misma propiedad para el mismo selector
  dentro del mismo contexto. Si existe una variante, usa una clase o un breakpoint.
- Los estados interactivos deben utilizar `:focus-visible` y los colores semánticos
  `--primary`, `--success`, `--warning` y `--error`.
