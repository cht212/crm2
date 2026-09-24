# Manual operativo del CRM HPD

Fecha de actualización: 24 de septiembre de 2026

## 1. Objetivo

Este manual está pensado para uso real del negocio, no para desarrollo.

El CRM HPD sirve para centralizar la atención al cliente, especialmente por WhatsApp, y convertir esa atención en seguimiento, tareas, oportunidades y control operativo.

La idea principal es simple:

- atender conversaciones desde una sola vista
- asignar responsable
- seguir clientes con historial
- registrar tareas pendientes
- convertir interés en venta
- supervisar el trabajo del equipo

## 2. Roles reales del sistema

Los perfiles operativos activos en la aplicación son estos tres:

### Administrador

Tiene acceso completo al sistema.

Debe revisar:

- usuarios
- permisos
- conexiones externas
- bot
- alertas y fallos
- reportes de operación
- configuración general

### Supervisor

Controla la operación diaria sin entrar a configuraciones técnicas sensibles.

Debe revisar:

- dashboard
- conversaciones sin asignar
- tareas vencidas
- oportunidades abiertas
- desempeño del equipo
- casos prioritarios

### Asesor

Es el perfil de atención directa al cliente.

Debe enfocarse en:

- conversaciones asignadas
- respuesta a clientes
- notas internas
- tareas de seguimiento
- oportunidades reales
- cierre de casos

El asesor no debe entrar a configuraciones globales, usuarios o conexiones técnicas.

## 3. Qué es lo importante para trabajar cada día

No hace falta entender toda la arquitectura para operar bien.

Lo que importa en la práctica es esto:

- ver qué clientes están escribiendo
- responder rápido y con contexto
- asignar correctamente las conversaciones
- registrar tareas de seguimiento
- saber si hay ventas reales o solo consultas
- revisar pendientes del día
- mantener la ficha del cliente ordenada

## 4. Inicio de sesión

El usuario entra a la plataforma con su cuenta asignada.

Al iniciar sesión, el sistema lo lleva según su perfil:

- asesor: a atención y seguimiento
- supervisor: a control operativo
- administrador: a administración y configuración

Si el usuario no puede ver un módulo, normalmente es porque no tiene rol o permiso para ese área.

## 5. Dashboard

El dashboard sirve para ver el estado del negocio de forma rápida.

Debe usarse para responder preguntas como:

- ¿cuántas conversaciones hay activas?
- ¿qué tareas están pendientes?
- ¿qué oportunidades están abiertas?
- ¿hay casos sin asignar?
- ¿qué asesor tiene más carga?

No es un panel técnico. No debe usarse para revisar detalles de Meta, webhooks, tokens o configuración interna.

## 6. Comunicaciones

Esta es la parte central del trabajo diario.

### Función principal

Permite:

- ver el inbox del CRM
- abrir conversaciones
- leer el historial del cliente
- responder mensajes
- adjuntar archivos
- cambiar estado de atención
- asignar o tomar chats
- continuar el seguimiento de un caso

### Estados comunes

- Nuevo
- Abierto
- En atención
- Esperando cliente
- Cotización enviada
- Cerrado
- Perdido
- No respondió

### Buena práctica

El asesor debe entrar aquí cada vez que trabaja.

Antes de responder, debe revisar:

- si el cliente ya existe
- si hay nota previa
- si hay tarea pendiente
- si ya había una oportunidad
- si la conversación ya está asignada a alguien

## 7. Contactos

Contactos es la agenda del CRM con los clientes.

Sirve para:

- buscar clientes
- ver teléfono, correo y canal
- abrir la ficha del cliente
- revisar etiquetas
- ver la última conversación
- evitar duplicados

### Regla importante

Antes de crear un contacto nuevo, se debe revisar si ya existe. Un cliente duplicado genera ruido, tareas repetidas y mala información.

## 8. Ficha del cliente

La ficha del cliente es la base del trabajo profesional.

Debe mostrar todo lo necesario para atender sin perder contexto:

- datos básicos
- conversaciones relacionadas
- notas internas
- tareas
- oportunidades
- etiquetas
- historial relevante

Si el asesor entiende la ficha, responde mejor y vende con más contexto.

## 9. Notas internas

Las notas internas son comentarios privados del equipo.

Sirven para:

- dejar contexto para el siguiente asesor
- registrar detalles del cliente
- dejar acuerdos importantes
- avisar qué sigue en el caso

No deben usarse como almacenamiento técnico ni para guardar tokens, claves o información sensible innecesaria.

## 10. Tareas

Las tareas en CRM son el motor de seguimiento.

Sirven para programar acciones como:

- llamar mañana
- enviar cotización
- confirmar pago
- revisar stock
- hacer seguimiento nuevamente

### Campos básicos

- título
- descripción
- fecha de vencimiento
- cliente
- conversación
- oportunidad relacionada
- asesor asignado
- estado

### Estados recomendados

- pendiente
- vencida
- completada
- cancelada

### Regla de uso

Si el cliente no responde de inmediato, no se queda “en la mente”; se registra una tarea.

## 11. Ventas y pipeline

Hay dos cosas distintas y no deben mezclarse:

### Pipeline

Muestra la evolución de la atención.

Se usa para ver:

- conversaciones nuevas
- casos en atención
- casos esperando respuesta
- casos cerrados o perdidos

### Ventas

Muestra la oportunidad comercial real.

Se usa para registrar:

- cliente potencial
- monto estimado
- etapa
- probabilidad
- fecha estimada de cierre

### Regla práctica

Si hay interés real, se crea una oportunidad. Si no, se mantiene atención y seguimiento, no venta forzada.

## 12. Reportes

Los reportes sirven para ver el estado general del negocio.

Se usan para responder:

- cuántos clientes hay
- cuántas conversaciones entraron
- cuántas tareas están abiertas
- cuántas oportunidades hay
- qué asesor tiene mayor carga
- qué canal tiene más actividad

El asesor normalmente no necesita reportes globales. El supervisor y administrador sí.

## 13. Bot y plantillas rápidas

El bot ayuda con respuesta automática inicial, pero no reemplaza la atención humana.

### Bot

Se usa para:

- saludar al cliente
- ofrecer opciones
- derivar a asesor
- responder de forma automática en momentos específicos

### Plantillas rápidas

Son mensajes predefinidos que el asesor usa manualmente para ahorrar tiempo.

Ejemplos:

- saludo
- catálogo
- solicitud de datos
- seguimiento
- cierre

### Regla importante

La plantilla rápida no se envía sola. El asesor revisa el texto y decide si lo manda.

## 14. Flujo recomendado diario para cada rol

### Asesor

1. Ingresar a Comunicaciones.
2. Revisar chats nuevos o asignados.
3. Leer el historial del cliente.
4. Revisar ficha del cliente.
5. Responder con contexto.
6. Registrar nota si hay detalle importante.
7. Crear tarea si corresponde.
8. Crear o actualizar oportunidad si hay venta real.
9. Cambiar el estado de la conversación cuando termine.

### Supervisor

1. Revisar dashboard.
2. Ver conversaciones sin asignar.
3. Revisar tareas vencidas.
4. Revisar pipeline.
5. Ver oportunidades abiertas.
6. Detectar cuellos de botella y carga del equipo.

### Administrador

1. Revisar usuarios y permisos.
2. Revisar conexiones externas.
3. Revisar alertas y fallos.
4. Ver actividad del sistema.
5. Mantener bot, datos y configuración del negocio bajo control.

## 15. Qué no aporta valor para el día a día

Estas cosas son importantes para desarrollo, pero no para operar el CRM a diario:

- detalle de cada controlador
- explicación de webhooks y endpoints
- arquitectura interna completa
- carpetas y clases del proyecto
- integraciones futuras en detalle
- referencias de API sin uso inmediato
- roadmap técnico largo

Estas cosas se deben guardar en documentación técnica, no en la guía de operación.

## 16. Módulos que sí son operativos

Los módulos útiles del día a día son estos:

- Comunicaciones
- Contactos
- Ficha del cliente
- Notas internas
- Tareas
- Pipeline
- Ventas
- Dashboard
- Reportes
- Bot
- Usuarios y permisos para administración

## 17. Seguridad mínima que debe saber cualquier usuario

- nunca compartir usuario ni contraseña
- no guardar tokens en notas internas
- cerrar sesión en equipos compartidos
- no usar información sensible en mensajes de prueba
- reportar errores o comportamientos raros al administrador o supervisor

## 18. Qué revisar si algo no funciona

### Si no llega una conversación

- revisar si la conversación está asignada
- revisar si el canal está habilitado
- revisar si hay fallo en el sistema
- revisar si el webhook está activo

### Si un mensaje no se envía

- revisar el estado del canal
- verificar token o configuración
- revisar fallos del sistema
- confirmar si el envío real está activo

### Si no aparecen tareas o oportunidades

- revisar si el cliente o la conversación está vinculada correctamente
- revisar si la acción fue creada en el caso correcto
- revisar si el usuario tiene permisos sobre ese registro

## 19. Cierre

El CRM funciona mejor cuando se usa con disciplina operativa.

La regla clave es esta:

- el asesor atiende y sigue
- el supervisor controla flujo y riesgo
- el administrador mantiene el sistema seguro y estable

Si la operación diaria se centra en conversaciones, clientes, tareas y ventas, el CRM cumple su propósito. Todo lo demás debe quedar como soporte técnico o administración, no como parte central del trabajo diario.
