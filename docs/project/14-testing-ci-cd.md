# 14 - Testing, Calidad y CI/CD

## Cobertura de testing actual

### Backend (`apps/api`)
- Unit tests de servicios de dominio
- Integration tests de auth y billing
- comando cobertura: `pnpm -C apps/api test:cov`

### Frontend (`apps/web`)
- Unit/integration tests con Vitest + RTL
- E2E criticos con Playwright
  - registro + verificacion
  - login + redireccion a checkout desde elegir plan

## Comandos utiles
- Todo el workspace:
  - `pnpm lint`
  - `pnpm test`
- API:
  - `pnpm -C apps/api test`
  - `pnpm -C apps/api test:cov`
- Web:
  - `pnpm -C apps/web test`
  - `pnpm -C apps/web test:e2e`

## Pipeline CI
Archivo: `.github/workflows/ci.yml`

Se ejecuta en push/PR a `develop` y `main`:
1. install (`pnpm install --frozen-lockfile`)
2. build shared
3. lint
4. test coverage API
5. test web

## Criterio de merge recomendado
- CI verde obligatorio
- sin fallos de lint
- tests relevantes del cambio en verde
- para cambios criticos de auth/pagos/check-in, incluir evidencia de prueba manual

## Proximos pasos de calidad recomendados
- ampliar E2E de admin dashboard (ABM completo)
- ampliar pruebas de webhook y renovaciones cron
- snapshot/regression visual en pantallas clave
