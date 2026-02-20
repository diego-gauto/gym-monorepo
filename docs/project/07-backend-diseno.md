# 07 - Diseno de Backend

## Stack backend
- NestJS 10
- TypeORM 0.3
- PostgreSQL 15
- JWT + Passport
- class-validator / class-transformer

## Bootstrap y middlewares globales
Configurado en `apps/api/src/main.ts`:
- `app.setGlobalPrefix('api')`
- CORS habilitado
- `ValidationPipe` global:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

## Organizacion por capas
- `controller`: contrato HTTP y seguridad por endpoint
- `service`: logica de negocio
- `dto`: validacion de entrada
- `entities`: mapeo ORM
- `guards/strategies`: autenticacion/autorizacion

## Servicios de dominio principales
- `AuthService`: registro/login/Google/verificacion/recovery
- `UsersService`: perfil, password, historial de asistencias y pagos
- `BillingService`: checkout, contexto de facturacion, cambios de plan
- `PaymentsService`: integracion Mercado Pago
- `AccessService`: elegibilidad y check-in QR
- `AdminContentService`: ABM de contenido publico
- `AdminBillingService`: estadisticas y pagos mostrador

## Integraciones
- Email: `AuthEmailService` (Resend)
- Pagos: `PaymentsService` (Mercado Pago)
- OAuth: validacion de tokens/codigo de Google en `AuthService`

## Seguridad y reglas
- Guard JWT para endpoints autenticados
- Guard de roles para endpoints admin
- Bloqueo de login local sin email verificado
- Validacion de reglas de elegibilidad antes de check-in

## Persistencia
- Auto-load entities
- `synchronize: true` solo en desarrollo (`NODE_ENV != production`)
- soporte de `DATABASE_URL` y configuracion host/port/user/password
