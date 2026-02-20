# E2E tests (Playwright)

## Install
```bash
pnpm -C apps/web add -D @playwright/test
pnpm -C apps/web exec playwright install chromium
```

## Run
```bash
pnpm -C apps/web test:e2e
```

## Current critical coverage
- login con contexto `elegir_plan` redirige a checkout
- register muestra mensaje de verificación y acción de reenvío
