# Guía de Ciclo de Vida de Suscripciones

> [!IMPORTANT]
> Este documento es la referencia definitiva para el manejo de estados y transiciones de suscripciones. Cualquier implementación en el `BillingEngine` o módulos de suscripción debe seguir estos flujos.

## 1. Escenario: Suscripción Inicial (El "Día 0")

### Pago Online (Mercado Pago)
El usuario elige un plan y carga su tarjeta para activar la recurrencia.
- **Éxito**: 
  - Se persiste `mercadopagoCardId` y datos de la tarjeta en el `User`.
  - Suscripción pasa a `ACTIVE`.
  - Se crea `Invoice` con el precio vigente en estado `PAID`.
  - Se establece el **Anchor Day** (Día Ancla).
- **Fallo**: 
  - No se crea la suscripción.
  - Se informa el error al usuario inmediatamente.

### Pago en Local (Efectivo/Manual)
El administrativo registra el pago manualmente desde el panel.
- **Lógica**: 
  - Suscripción pasa a `ACTIVE`.
  - Se crea `Invoice` en estado `PAID`.
  - La propiedad `autoRenew` se establece en `false` por defecto (a menos que el usuario vincule una tarjeta posteriormente).

---

## 2. Escenario: Renovación Automática (Recurrencia)

### Caso Exitoso
El Cron Job ejecuta el cobro en el **Anchor Day**.
- La `Invoice` pasa a `PAID`.
- La suscripción se mantiene `ACTIVE`.
- El acceso sigue vigente sin interrupciones.

### Caso Fallo Soft (Saldo insuficiente/Error Técnico)
- **Día 0 (Fallo inicial)**: Suscripción -> `GRACE_PERIOD`. `Invoice` -> `PENDING`. El acceso **SÍ** se mantiene.
- **Día 3**: Reintento 1. Si falla, el estado no cambia.
- **Día 7**: Reintento 2 (último). 
  - Si falla: Suscripción -> `REJECTED`, `Invoice` -> `EXPIRED`. El acceso **NO** se permite.

### Caso Fallo Fatal (Tarjeta Denunciada/Expirada/Fraude)
- **Día 0**: Suscripción pasa inmediatamente a `REJECTED_FATAL`. `Invoice` -> `EXPIRED`. El acceso se corta al instante (**NO**).

---

## 3. Escenario: Actualización de Tarjeta con Deuda

### Usuario en REJECTED o GRACE_PERIOD
El usuario carga una nueva tarjeta para regularizar su situación.
- **Lógica**: El sistema detecta una `Invoice` pendiente (`PENDING` en `GRACE_PERIOD` o `EXPIRED` en `REJECTED`) y dispara un intento de cobro inmediato.
- **Resultado**: 
  - Si es exitoso: Suscripción -> `ACTIVE`.
  - **Cambio de Ciclo**: Si el usuario venía de estar `REJECTED`, se genera un **NUEVO Anchor Day** basado en la fecha de este pago exitoso.

---

## 4. Escenario: Cancelación de Suscripción

### Desde ACTIVE
El usuario solicita la baja pero ya pagó el periodo actual.
- **Lógica**: Suscripción -> `PENDING_CANCELLATION`. `autoRenew` -> `false`.
- **Acceso**: Se mantiene hasta el fin del periodo pagado. Una vez alcanzada esa fecha, la suscripción pasa a `CANCELLED`.

### Desde GRACE_PERIOD
El usuario solicita la baja mientras está en mora técnica.
- **Lógica**: Suscripción -> `CANCELLED` inmediatamente.
- **Facturación**: La `Invoice` actual en estado `PENDING` pasa a `VOIDED`.
- **Efecto**: Se detienen los reintentos de cobro y el acceso se corta al instante.

---

## 5. Escenario: Reactivación (El retorno del socio)

### Desde EXPIRED (Pago Único) o CANCELLED
El usuario decide volver a contratar el servicio.
- **Lógica**: Se crea una nueva `Invoice` en estado `PAID`. La suscripción vuelve a estar `ACTIVE`. Se establece un **NUEVO Anchor Day**.

### Desde REJECTED (Con deuda previa)
El usuario paga la factura que quedó pendiente.
- **Lógica**: Se marca la `Invoice` previa (`EXPIRED`) como `PAID`.
- **Nuevo Ciclo**: Se genera una nueva `Invoice` por el mes/periodo que comienza ahora.
- **Anchor Day**: Se establece un **NUEVO Anchor Day** basado en la fecha de pago actual.

---

## 6. Matriz de Estados Final (Referencia Rápida)

| Estado Suscripción | Significado | Acceso QR | autoRenew |
| :--- | :--- | :--- | :--- |
| **ACTIVE** | Al día y pagado | SÍ | true / false |
| **PENDING_CANCELLATION** | Baja programada (periodo pago) | SÍ | false |
| **GRACE_PERIOD** | En mora técnica (periodo de gracia) | SÍ | true / false |
| **REJECTED** | Suspensión por falta de pago | NO | true |
| **REJECTED_FATAL** | Baja por fraude o error fatal | NO | true |
| **EXPIRED** | Fin de ciclo (pago único) | NO | false |
| **CANCELLED** | Baja definitiva solicitada | NO | false |

---

## 7. Reglas de Oro para el Desarrollador

1. **Idempotencia Absoluta**: Siempre incluir el header `X-Idempotency-Key` con el UUID de la `Invoice` en cada llamada a la API de Mercado Pago.
2. **Prioridad del Pago Manual**: Un pago manual (en local o app) debe invalidar y cancelar cualquier reintento programado por el Cron Job para esa misma factura.
3. **Cambios de Plan (Plan Upgrade/Downgrade)**: Cualquier `SubscriptionChangeRequest` debe procesarse y aplicarse **ANTES** de que el Cron Job genere la factura del siguiente ciclo.
4. **Respeto al Precio de Creación**: Una factura siempre mantiene el precio del plan vigente al momento en que fue generada, independientemente de subas posteriores de precios.
