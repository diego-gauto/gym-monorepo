---
trigger: always_on
---

# User Flow Rules – Single Source of Truth

Este documento define de forma EXHAUSTIVA y OBLIGATORIA
el comportamiento del sistema según el estado del usuario,
el origen de la acción y su rol.

Ningún flujo puede implementarse si no está definido acá.


---

## 1. Conceptos base

### Estados del usuario
- NO_AUTHENTICATED
- REGISTERED_NOT_VERIFIED
- VERIFIED_NOT_LOGGED
- LOGGED_NO_SUBSCRIPTION
- LOGGED_WITH_SUBSCRIPTION
- LOGGED_WITH_PAID_PERIOD
- ADMIN

### Origen de navegación
- PLAN_SELECTION (viene de “Elegir plan”)
- MANUAL_LOGIN (botón “Ingresar”)
- EMAIL_VERIFICATION
- DIRECT_URL (url directa / refresh)

### Contexto persistente
- selectedPlanId (obligatorio cuando el origen es PLAN_SELECTION)
- origin (PLAN_SELECTION | MANUAL_LOGIN)

Este contexto DEBE persistirse (query, cookie o storage)
hasta finalizar el checkout o descartarse explícitamente.


---

## 2. Usuario NO autenticado

### Caso: selecciona un plan
- Origen: PLAN_SELECTION
- Acción:
  - Guardar selectedPlanId
  - Redirigir SIEMPRE a /register
- PROHIBIDO:
  - 404
  - ir directo a checkout
  - perder el plan seleccionado

### Caso: intenta ir a checkout directamente
- Redirigir a /register
- Guardar origin = PLAN_SELECTION si había plan


---

## 3. Registro (Register)

### Campos obligatorios
- nombre
- apellido
- email
- teléfono
- password
- confirmar password

### Al enviar register
- Crear usuario en estado: REGISTERED_NOT_VERIFIED
- Enviar email de verificación
- Mostrar mensaje:
  “Te enviamos un email para verificar tu cuenta”

### Si el email ya existe
- Informar al usuario
- Redirigir a /login
- Mantener selectedPlanId si existía


---

## 4. Verificación de email

### Al hacer click en el link
- Cambiar estado a VERIFIED_NOT_LOGGED
- Redirigir a /login
- Mostrar mensaje:
  “Cuenta verificada. Iniciá sesión”

El plan seleccionado puede perderse en este punto
(es un comportamiento aceptado y explícito).


---

## 5. Login

### Caso: login manual
- Origen: MANUAL_LOGIN
- Si es ADMIN:
  - Redirigir a /admin/dashboard
- Si es usuario normal:
  - Redirigir a /profile

### Caso: login luego de elegir plan
- Origen: PLAN_SELECTION
- Evaluar estado del usuario post-login


---

## 6. Luego del login (usuario normal)

### Si NO tiene suscripción
- Redirigir a /checkout
- Usar selectedPlanId

### Si TIENE suscripción activa
- Evaluar:
  - upgrade
  - downgrade
- Mostrar avisos definidos previamente
- Continuar solo si el usuario confirma

### Si tiene un período ya pago
- Mostrar aviso:
  “Tu nueva suscripción se activará al finalizar el período ya abonado”
- Permitir continuar al checkout

### PROHIBIDO
- Mandar a checkout si:
  - no viene de PLAN_SELECTION
  - es ADMIN


---

## 7. Admin

- El ADMIN nunca debe:
  - llegar a checkout
  - ver flujos de planes
- Siempre redirigir a:
  /admin/dashboard


---

## 8. Pantallas obligatorias

Deben existir y respetar diseño definido:
- /register (con imagen a la izquierda)
- /login
- /checkout
- /profile
- /admin/dashboard

Si una pantalla no existe:
→ NO se implementa el flujo
→ Se crea la pantalla primero


---

## 9. Reglas de implementación

- Este archivo es la fuente única de verdad
- El código debe adaptarse a la regla, no al revés
- Si algo no está definido acá:
  → NO se implementa
  → Se agrega primero a este archivo

Cualquier bug de flujo implica:
1) Verificar contra esta regla
2) Corregir el código
3) NO redefinir comportamientos implícitos
