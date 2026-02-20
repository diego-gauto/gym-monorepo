# 13 - Seguridad y Autenticacion

## Autenticacion
- JWT Bearer para sesiones API
- claim principal `sub` = `user.uuid`
- expiracion JWT: 1 dia

## Providers de acceso
- `LOCAL`: email + password hasheada (bcrypt)
- `GOOGLE`: OAuth con validacion de token/code

## Verificacion y recovery
- Verificacion email (LOCAL):
  - token random
  - hash SHA-256 en DB
  - expiracion por TTL configurable
- Recuperacion password (LOCAL):
  - token random
  - hash en DB
  - expiracion por TTL configurable

## Autorizacion
- Guard JWT para endpoints protegidos
- Guard de roles con decorator `@Roles(UserRole.ADMIN)` para admin

## Validacion de entrada
- DTOs con `class-validator`
- `ValidationPipe` global con whitelist + forbidNonWhitelisted

## Check-in seguro
- QR diario firmado con HMAC (sede + fecha)
- validacion de horario operativo
- geocerca configurable por variables de entorno

## Consideraciones de hardening recomendadas
- agregar rate limit dedicado en endpoints de auth
- rotacion periodica de `JWT_SECRET`
- forzar HTTPS en produccion
- auditoria centralizada de eventos de seguridad
