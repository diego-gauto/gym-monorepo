# 06 - Estructura de Archivos

## Vista resumida del monorepo

```text
.
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── app.module.ts
│   │       ├── main.ts
│   │       └── modules/
│   │           ├── auth/
│   │           ├── users/
│   │           ├── billing/
│   │           ├── access/
│   │           └── admin/
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── page.tsx
│           │   ├── login/
│           │   ├── register/
│           │   ├── checkout/
│           │   ├── check-in/
│           │   ├── profile/
│           │   └── admin/dashboard/
│           ├── components/
│           └── lib/
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts
│           └── interfaces/
├── docs/
├── .github/workflows/ci.yml
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Convenciones relevantes
- Backend por modulo de dominio en `apps/api/src/modules/*`
- Frontend por ruta en `apps/web/src/app/*`
- Tipos compartidos en `packages/shared`
- Documentacion separada por tema en `docs/project` y `docs/manuals`

## Archivos clave de bootstrap
- API bootstrap: `apps/api/src/main.ts`
- API root module: `apps/api/src/app.module.ts`
- Web root layout: `apps/web/src/app/layout.tsx`
- CI pipeline: `.github/workflows/ci.yml`

## Assets estaticos
- `apps/web/public/*` contiene imagenes/recursos visuales del sitio.
