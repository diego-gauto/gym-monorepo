# 09 - Modelo de Dominio de Datos

## Agregado Usuario
Entidades:
- `users`
- `user_auth` (1:1)
- `user_billing_profiles` (1:1)

Objetivo:
- separar identidad, autenticacion y datos de tarjeta tokenizada.

## Agregado Suscripcion y Facturacion
Entidades:
- `plans`
- `subscriptions`
- `subscription_change_requests`
- `invoices`

Objetivo:
- soportar suscripcion recurrente, pagos unicos y cambios programados.

## Agregado Acceso Fisico
Entidades:
- `attendance`
- `medical_certificates`

Objetivo:
- registrar ingreso a sede con actividad
- validar apto medico vigente

## Agregado Contenido Admin
Entidades:
- `gym_site_settings`
- `benefits`
- `trainers`
- `activities`
- `activity_trainers` (join many-to-many)
- `gym_branches`

Objetivo:
- administrar contenido visual/comercial desde dashboard.

## Entidad legacy
- `admin_content`

Uso actual:
- compatibilidad/migracion inicial de contenido historico.

## Estados clave en dominio
- `MembershipStatus`: estado del usuario/suscripcion
- `InvoiceStatus`: estado de factura
- `PaymentMethod`: canal de pago
- `PlanType`: mensual/trimestral/anual
- `AuthProvider`: local/google
- `UserRole`: admin/user

## Relaciones principales
- `User 1 - N Subscription`
- `User 1 - N Invoice`
- `User 1 - N Attendance`
- `User 1 - 1 UserAuth`
- `User 1 - 1 UserBillingProfile`
- `Subscription N - 1 Plan`
- `Invoice N - 1 Subscription (opcional)`
- `Activity N - N Trainer`
