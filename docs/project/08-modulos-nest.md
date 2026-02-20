# 08 - Esquema de Modulos NestJS

## Modulo `AuthModule`
Responsabilidades:
- registro local
- login local
- login Google
- verificacion de email
- recuperacion/reset de contrasena
- bootstrap de admin seed

Componentes clave:
- `AuthController`
- `AuthService`
- `AuthEmailService`
- `LocalStrategy`, `JwtStrategy`
- `RolesGuard`

## Modulo `UsersModule`
Responsabilidades:
- perfil del usuario autenticado
- actualizacion de datos
- cambio de password local
- historial de asistencias/pagos
- overview de suscripcion

Componentes clave:
- `UsersController`
- `UsersService`

## Modulo `BillingModule`
Responsabilidades:
- checkout
- contexto de facturacion
- cambio/cancelacion de suscripcion
- webhook Mercado Pago
- procesos de cobro/renovacion

Componentes clave:
- `BillingController`
- `BillingService`
- `PaymentsService`
- `SubscriptionsService`
- `BillingCronService`

## Modulo `AccessModule`
Responsabilidades:
- QR de check-in por sede
- validacion de elegibilidad
- registro de asistencia

Componentes clave:
- `AccessController`
- `AccessService`

## Modulo `AdminModule`
Responsabilidades:
- ABM de contenido (sitio, profesores, actividades, beneficios, planes, sedes)
- estadisticas
- registro de pagos de mostrador

Componentes clave:
- `AdminContentController`
- `AdminContentService`
- `AdminBillingService`

## Dependencias cruzadas
- `AppModule` importa todos los modulos de dominio
- `AuthModule` exporta guards/servicios reutilizados
- `AdminModule` y `AccessModule` aplican guards JWT + roles
