# Auth + Gitflow Roadmap

## Estado de implementación (actualizado)

Implementado en código:
- Endpoints `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/google`.
- Bloqueo de login local si el email no está verificado (`EMAIL_NOT_VERIFIED`).
- Emisión de JWT propio también en login con Google (`POST /auth/google` con `idToken`).

Pendiente para producción:
- Integrar proveedor de emails real (actualmente devuelve token en no-prod para pruebas).
- Reemplazar creación automática de DNI en Google por onboarding de datos obligatorios.

## 1) Auditoría del backend actual (estado real)

### JWT
- **Sí hay JWT implementado** con NestJS Passport/JWT:
  - `JwtModule` usa `JWT_SECRET` y expira en `1d`.
  - `LocalStrategy` valida email/password.
  - `JwtStrategy` valida token Bearer y resuelve usuario por `uuid` (`sub`).
- Observación de seguridad: el login actual **no bloquea cuentas no verificadas** porque todavía no existe flag de verificación de email en `User`.

### Endpoints de autenticación existentes
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile` (protegido por JWT)

## 2) Arquitectura recomendada (compatible con lo existente)

### Modelo de datos (extensión de `users`)
Agregar columnas:
- `emailVerifiedAt: Date | null`
- `emailVerificationTokenHash: string | null`
- `emailVerificationSentAt: Date | null`
- `provider: 'LOCAL' | 'GOOGLE'` (o tabla `auth_identities` para múltiples providers)
- `googleSub: string | null` (si se elige enfoque simple en la tabla users)
- `refreshTokenHash: string | null` (si se incorpora refresh token rotativo)

> Recomendado profesional: tabla separada `auth_identities` para escalar a Apple/Microsoft sin deuda.

### Endpoints nuevos sugeridos
- `POST /auth/register` (local) → crea usuario pendiente de verificación + envía mail.
- `POST /auth/verify-email` (token) → marca `emailVerifiedAt`.
- `POST /auth/resend-verification`.
- `POST /auth/login` (local) → solo permite login si `emailVerifiedAt != null`.
- `GET /auth/google` → inicia OAuth.
- `GET /auth/google/callback` → valida Google, crea/une cuenta y emite JWT propio.
- `POST /auth/logout` (si hay refresh tokens).

### Emisión de JWT propio
Incluso en OAuth Google, luego de validar identidad externa:
1. backend resuelve/crea usuario interno.
2. backend aplica política interna (`role`, `status`, acceso).
3. backend emite **JWT propio** con `sub=uuid`, `role`, `status`, `email_verified=true`.

Esto mantiene consistencia para ACL, pagos y acceso físico.

### Regla obligatoria de verificación
- Para usuarios `LOCAL`: `emailVerifiedAt` obligatorio antes de sesión activa.
- Para usuarios `GOOGLE`: considerar email como verificado si proveedor lo entrega verificado (`email_verified=true`).

## 3) Flujo completo de autenticación

### Registro local
1. Usuario envía firstName/lastName/email/password.
2. Backend normaliza email, hashea password (bcrypt).
3. Crea usuario con `emailVerifiedAt=null`.
4. Genera token de verificación (guardar hash + expiración).
5. Envía email con link.
6. Responde 201 sin iniciar sesión.

### Verificación de email
1. Usuario hace click en link.
2. Backend valida token/hash/expiración.
3. Marca `emailVerifiedAt=now`, limpia token temporal.
4. Opcional: redirige a `/auth?verified=1`.

### Login local
1. Usuario envía email/password.
2. Backend valida credenciales.
3. Si no verificado → `403 EMAIL_NOT_VERIFIED`.
4. Si verificado → emite JWT propio (y refresh opcional).

### Login/registro Google OAuth
1. Frontend redirige a `/auth/google`.
2. Callback recibe identidad Google.
3. Backend vincula cuenta (por `googleSub`, y fallback por email).
4. Si no existe, crea usuario nuevo.
5. Emite JWT propio y redirige a frontend con sesión.

## 4) Diseño UX Login/Register

## Objetivo visual
- Split vertical 50/50.
- Izquierda: imagen de gimnasio + overlay oscuro + mensaje de marca.
- Derecha: tarjeta/formulario (login/register) limpio, moderno y con buen contraste.

## Reglas UX
- CTA principal visible y único por contexto.
- Mensajes de error en línea (email inválido, password corta, etc.).
- Opción “Continuar con Google” destacada pero secundaria al flujo principal.
- En login, informar claramente cuando falta verificar email.

## 5) Gitflow propuesto (PRs pequeños)

1. **PR-0** `chore/gitflow-bootstrap` (base: `main` → `develop`)
   - crear `develop` desde `main`.
   - protección de ramas en remoto (sin pushes directos a main).

2. **PR-1** `feature/auth-domain-email-verification` (target: `develop`)
   - migración DB + entidad + servicio tokens + mailer.

3. **PR-2** `feature/auth-local-flows` (target: `develop`)
   - register/login/verify/resend con validaciones.

4. **PR-3** `feature/auth-google-oauth` (target: `develop`)
   - estrategia Google + callback + vinculación de cuenta.

5. **PR-4** `feature/web-auth-pages` (target: `develop`)
   - página Login/Register split + conexión con API.

6. **PR-5** `feature/auth-guards-policies` (target: `develop`)
   - guard que bloquee no verificados en endpoints sensibles.

7. **PR-6** `feature/auth-observability-hardening` (target: `develop`)
   - rate limiting auth, auditoría, métricas, alerts.

## 6) Criterios de seguridad (MVP sólido)
- Hash de passwords con bcrypt cost >= 10.
- Tokens de verificación guardados hasheados (no en claro).
- TTL corto para tokens de verificación.
- Rate limit en `/auth/login`, `/auth/register`, `/auth/resend-verification`.
- Mensajes de error sin filtrar existencia de usuario (anti-enumeración).
- Rotación de secretos y vencimiento razonable de JWT.
