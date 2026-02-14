# Checkout + Billing Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Terminar el flujo de checkout con UX profesional post-pago y consistencia de dominio (status, invoices, reintentos) sin romper reglas actuales.

**Architecture:** Mantener `billing` como orquestador de reglas de suscripción/pago; separar claramente UX (web) de decisiones de negocio (api). Para evitar facturas “basura”, el checkout inmediato debe usar una política explícita de intento de cobro (idempotente) y sólo dejar invoices trazables/consistentes.

**Tech Stack:** Next.js (app router), React, NestJS, TypeORM, Mercado Pago SDK.

---

### Task 1: Pantalla de Pago Exitoso (UX post-checkout)

**Files:**
- Create: `apps/web/src/app/checkout/success/page.tsx`
- Create: `apps/web/src/app/checkout/success/CheckoutSuccessClient.tsx`
- Create: `apps/web/src/app/checkout/success/CheckoutSuccessClient.module.css`
- Modify: `apps/web/src/app/checkout/mercadopago/CheckoutClient.tsx`
- Modify: `apps/web/src/lib/auth-flow.ts`
- Test: `apps/web/src/app/checkout/mercadopago/CheckoutClient.spec.tsx`

**Plan:**
1. Redirigir a `/checkout/success?invoice=...&subscription=...&plan=...` cuando `payCheckout` aprueba.
2. Mostrar en success:
- plan comprado
- monto
- “podés ver factura desde tu perfil”
- “podés cancelar suscripción desde tu perfil”
3. Agregar CTA: `Ir al perfil` y `Volver al inicio`.
4. Mantener fallback si falta query string (estado inválido).

**Checks:**
- `pnpm --filter @gym-admin/web test`
- `pnpm --filter @gym-admin/web build`

---

### Task 2: Clarificar y sincronizar `users.status` vs `subscriptions.status`

**Files:**
- Modify: `apps/api/src/modules/billing/billing.service.ts`
- Modify: `apps/api/src/modules/billing/billing-cron.service.ts`
- Modify: `apps/api/src/modules/billing/subscriptions.service.ts`
- Create: `docs/plans/status-semantics.md` (o mover a docs funcional)
- Test: `apps/api/src/modules/billing/*.spec.ts`

**Plan:**
1. Definir semántica oficial:
- `subscriptions.status`: estado del contrato de suscripción.
- `users.status`: estado operativo global del socio (acceso/negocio).
2. Agregar helper único de sincronización (ej. `syncUserStatusFromSubscription`).
3. Llamar helper en todos los cambios de estado (pago aprobado, gracia, rechazo, cancelación, reactivación).
4. Documentar tabla de mapeo estado->estado.

**Checks:**
- `pnpm --filter @gym-admin/api test -- billing.integration.spec.ts payments.service.spec.ts subscriptions.service.spec.ts`
- `pnpm --filter @gym-admin/api build`

---

### Task 3: `invoices.user_id` y `subscription_id` (consistencia de modelo)

**Files:**
- Modify: `apps/api/src/modules/billing/entities/invoice.entity.ts` (solo si se cambia criterio)
- Modify: `apps/api/src/modules/billing/billing.service.ts`
- Create/Modify: tests billing integración
- Create: `docs/plans/invoice-model-decision.md`

**Plan:**
1. Mantener `invoices.user_id` (no eliminar): sirve para consultas directas e invoices sin subscription (casos diferidos o históricos).
2. Endurecer consistencia en servicio:
- si hay `subscriptionId`, verificar que `invoice.userId === subscription.userId`.
3. Documentar explícitamente por qué no es redundancia “innecesaria”.

**Checks:**
- test de integración que falle si hay mismatch user/subscription.

---

### Task 4: Política de invoice en checkout inmediato (evitar PENDING acumulados)

**Files:**
- Modify: `apps/api/src/modules/billing/billing.service.ts`
- Modify: `apps/api/src/modules/billing/payments.service.ts`
- Modify: `apps/api/src/modules/billing/entities/invoice.entity.ts` (si agregamos metadata de intentos)
- Test: `apps/api/src/modules/billing/billing.integration.spec.ts`

**Plan (recomendado):**
1. En checkout inmediato:
- crear invoice técnica `PENDING` antes del cobro (necesario por `external_reference`)
- si cobro falla -> cerrar ese intento como `VOIDED` (no dejar `PENDING`)
2. Reintentos manuales:
- no reciclar invoices fallidas; crear nuevo intento trazable
- pero nunca dejar pendientes huérfanas.
3. Si MP devuelve error de credenciales/configuración:
- marcar invoice `VOIDED`
- devolver mensaje claro al frontend.

**Checks:**
- test: error MP -> invoice queda `VOIDED`.
- test: pago aprobado -> invoice `PAID` + subscription activa.

---

### Task 5: Limpieza UX de estados de pago fallido y reintentos

**Files:**
- Modify: `apps/web/src/app/checkout/mercadopago/CheckoutClient.tsx`
- Modify: `apps/web/src/app/checkout/mercadopago/CheckoutClient.module.css`
- Test: `apps/web/src/app/checkout/mercadopago/CheckoutClient.spec.tsx`

**Plan:**
1. Diferenciar mensajes:
- validación local
- rechazo de tarjeta
- error de credenciales/configuración
2. CTA explícitos:
- “Reintentar pago”
- “Volver a planes”
3. No mostrar IDs técnicos al usuario final salvo modo debug.

**Checks:**
- tests de rendering por tipo de error.

---

### Task 6: Validación manual integral (QA checklist)

**Checklist:**
1. Usuario sin suscripción ni período pago -> paga -> subscription activa + invoice paid + success screen.
2. Usuario con suscripción activa -> checkout inmediato bloqueado con mensaje de cambio programado.
3. Usuario con período pago vigente -> checkout inmediato bloqueado con mensaje de activación diferida.
4. Error MP simulado -> no queda invoice pending.
5. Perfil muestra acceso a factura y acción de cancelación.

**SQL de validación:**
- `users.status`
- `subscriptions.status/startDate/endDate/plan_id`
- `invoices.status/amount/subscription_id/user_id/createdAt`

