# 11 - Diseno Frontend

## Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- CSS Modules
- react-hook-form

## Estructura de rutas principales
- Publicas:
  - `/`
  - `/actividades`
  - `/actividades/[slug]`
- Auth:
  - `/login`
  - `/register`
  - `/auth/google/callback`
  - `/verify-email`
  - `/recover-password`
- Usuario:
  - `/profile`
  - `/checkout/mercadopago`
  - `/checkout/success`
  - `/check-in`
- Admin:
  - `/admin/dashboard`

## Biblioteca de cliente API
Archivo principal: `apps/web/src/lib/auth-flow.ts`

Responsabilidades:
- manejo de sesion localStorage
- wrappers HTTP autenticados/no autenticados
- funciones de negocio para auth, billing, access, users, admin

## Contenido publico
`apps/web/src/lib/public-content.ts`:
- obtiene `site`, `benefits`, `activities`, `plans` desde API
- desacopla componentes de la fuente de datos

## Layout comun
- `Navbar` y `Footer` compartidos
- navegacion contextual segun sesion (`Ingresar` / `Mi perfil` / `Admin`)

## Formularios y validaciones
- `login` y `register` usan react-hook-form
- errores inline por campo
- estados visuales de submit/carga

## Paginas complejas
- `CheckoutClient`: incluye validaciones de tarjeta, modos de flujo y manejo de errores
- `CheckInClient`: control de estado multi-fase con elegibilidad + actividades + confirmacion
- `ProfileClient`: dashboard de usuario con secciones, cache local por rango para asistencias
- `AdminDashboardClient`: dashboard tabulado con ABM y estadisticas

## Estrategia visual
- identidad oscura con acento verde
- UI unificada entre landing, perfil y admin
- responsive orientado mobile-first en pantallas criticas
