# Billing Logic & Payment Engine Rules

> [!IMPORTANT]
> Reglas críticas para el manejo de dinero y acceso. Violaciones aquí pueden causar pérdidas financieras.

## Reglas

### [OBLIGATORIO] Regla 1: Prohibición de Suscripciones Nativas

**Descripción:**
**NO** se deben utilizar las funcionalidades de "Suscripción" o "Débito Automático" nativas de Mercado Pago o Mobbex.

**Razón:**
- Comisiones más altas.
- Menor flexibilidad para manejar lógica de negocio personalizada (ej: reintentos inteligentes, pausas, upgrades).

---

### [OBLIGATORIO] Regla 2: Custom Billing Engine & Ciclo de Reintentos

**Descripción:**
La lógica de cobro debe residir en el backend (`BillingEngine`) utilizando **Checkout API (Card on File)** de Mercado Pago.
- **Persistencia en User**: Se deben persistir los siguientes campos en la entidad `User`: `mercadopagoCustomerId`, `mercadopagoCardId`, `cardBrand`, `cardLastFour` y `cardIssuer`.
- **Ciclo de Cobro**: Dura 7 días exactos con reintentos basados en el tipo de error:
  - **Error Soft (Saldo/Técnico)**: El socio pasa a estado `GRACE_PERIOD`. Se programan reintentos automáticos en el **Día 3** y **Día 7**.
  - **Error Fatal (Robo/Fraude)**: El socio pasa inmediatamente a estado `REJECTED`. **NO** se deben realizar reintentos.
- **Fallo Final**: Tras el fallo del Intento 3 (Día 7) en errores soft, el socio pasa a estado `REJECTED` y se bloquea el acceso.

---

### [OBLIGATORIO] Regla 3: Acceso Condicional (QR)

**Descripción:**
El sistema de generación de QR de acceso debe consultar **en tiempo real** el estado del socio.
- Si estado != `ACTIVE` (o `GRACE_PERIOD`), el QR no se genera o es inválido.
- Si `MedicalCertificate` está vencido, el QR es inválido.

**Razón:**
Evitar el acceso no autorizado de usuarios rechazados o sin apto físico.

---

### [CRÍTICO] Regla 4: Idempotencia

**Descripción:**
El `BillingEngine` debe implementar claves de idempotencia en cada intento de cobro. 
- **Header**: Se debe incluir el header `X-Idempotency-Key`.
- **Valor**: El valor del header debe ser el **UUID de la Invoice**.
Antes de llamar a la pasarela, se debe verificar si esa factura ya fue procesada satisfactoriamente para evitar cobros duplicados.

---

### [CRÍTICO] Regla 5: Política de 'Anchor Date' (Fecha Ancla)

**Descripción:**
El sistema debe gestionar el día original de cobro basándose en el estado de la suscripción:

- **MANTENIMIENTO (Periodo de Gracia)**: Mientras el socio esté en `GRACE_PERIOD`, el Anchor Day original se respeta estrictamente. Al pagar de forma exitosa en este periodo, la suscripción se extiende desde la fecha de vencimiento original (no desde la fecha de pago), manteniendo el ciclo.
- **REINICIO (Reactivación)**: Si el socio llega al estado `REJECTED`, la suscripción se considera caída. Al momento de realizar un pago exitoso para reactivarse, se debe establecer un **NUEVO Anchor Day** basado en la fecha de ese pago.
- **Manejo de Fin de Mes**: Si el Anchor Day es el 31 y el siguiente mes tiene 30, se cobra el 30, pero el subsiguiente **debe volver al 31** si el mes lo permite.
- **Años Bisiestos**: Si el Anchor Day es el 29 de Febrero, en años no bisiestos se cobra el 28, pero vuelve al 29 en el siguiente año bisiesto.

---

### [OBLIGATORIO] Regla 6: Duración de Planes

**Descripción:**
Todos los cálculos de vencimiento deben partir de la fecha de inicio actual respetando el Anchor Day:
- **MENSUAL**: Fecha actual + 1 mes (ajustado al Anchor Day).
- **TRIMESTRAL**: Fecha actual + 3 meses (ajustado al Anchor Day).
- **ANUAL**: Fecha actual + 1 año.

---

### [OBLIGATORIO] Regla 7: Modelo 'Invoice-First' y Precios

**Descripción:**
Toda intención de cobro debe estar respaldada por una entidad `Invoice`.

- **Precios**: La `Invoice` debe crearse utilizando el **precio del plan vigente** al momento de su creación. No se debe recalcular el precio al momento del pago si hubo cambios de tarifas posteriores a la generación de la factura.
- **Generación Previa**: Toda suscripción con `auto_renew: true` genera una factura `PENDING` antes del vencimiento.
- **No Deuda Infinita**: En caso de que los reintentos fallen (Día 7), la factura pasará a estado `EXPIRED`. **NO** se deben acumular facturas pendientes como deuda exigible si el socio no reactiva el servicio.
- **Reactivación**: Al reactivarse desde el estado `REJECTED`, el socio paga una **NUEVA** factura (con el precio vigente en ese momento), la cual establece su nuevo periodo y su nuevo Anchor Day.

---

### [OBLIGATORIO] Regla 8: Cancelación en GRACE_PERIOD

**Descripción:**
Si un usuario solicita la baja de su suscripción mientras se encuentra en estado `GRACE_PERIOD`:
- La suscripción debe pasar inmediatamente a estado `CANCELLED`.
- La factura actual en estado `PENDING` debe marcarse como `VOIDED`.
- **Razón**: Detener inmediatamente los reintentos de cobro y evitar generar deuda o cargos no deseados tras la solicitud de baja.

---

### [OBLIGATORIO] Regla 9: Cobro por Cambio de Tarjeta

**Descripción:**
Si un usuario registra una tarjeta nueva y su estado actual es `GRACE_PERIOD` (con factura `PENDING`) o `REJECTED` (con factura `EXPIRED` pendiente):
- El sistema debe ejecutar un intento de cobro inmediato utilizando la nueva tarjeta.
- Si el cobro es exitoso, la suscripción se normaliza a `ACTIVE` (respetando las reglas de Anchor Day correspondientes al estado previo).

---

### [OBLIGATORIO] Regla 10: Prioridad de Pago Manual

**Descripción:**
Cualquier pago manual exitoso realizado por el usuario a través de la interfaz debe tener prioridad sobre el sistema automático.
- Al confirmarse el pago manual, la factura debe pasar a estado `PAID`.
- El sistema debe cancelar automáticamente cualquier reintento programado por el Cron Job para esa factura específica.

---

### [INFO] Regla 11: Política de Pago Único (autoRenew: false)

**Descripción:**
Para usuarios que no tienen activada la renovación automática (`autoRenew: false`):
- El registro de una tarjeta de crédito/débito **NO** dispara cobros automáticos.
- La tarjeta queda guardada únicamente para facilitar pagos futuros iniciados manualmente por el usuario.

---

### [INFO] Flujo de Estados del Socio

Para garantizar la coherencia del sistema, las transiciones de estado deben ser:

1. **ACTIVE**: Socio al día. Las fechas se extienden respetando el Anchor Day.
2. **GRACE_PERIOD**: Desde el fallo de cobro (Día 0) al Día 7. El socio aún tiene acceso. Se mantiene el Anchor Day original.
3. **REJECTED**: Tras el fallo del Día 7 (o error fatal). Acceso denegado. La suscripción se detiene.
4. **CANCELLED**: Socio solicita la baja. Si estaba en `GRACE_PERIOD`, las facturas pendientes pasan a `VOIDED`.
5. **ACTIVE (Post-Reactivación)**: Al pagar desde el estado REJECTED, el socio vuelve a ACTIVE pero con un **NUEVO Anchor Day**.
