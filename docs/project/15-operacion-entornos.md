# 15 - Operacion, Entornos y Configuracion

## Entornos
- Desarrollo local
- Produccion (objetivo)

## Desarrollo local
### 1. Base de datos
- Docker compose: `docker-compose.yml`
- Servicio: `postgres` (container `gym-postgres`)

### 2. Levantar app
- comando monorepo: `pnpm dev`
- web: puerto 3000
- api: puerto 3001

## Variables de entorno (backend)
Variables detectadas en codigo:
- DB: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Auth: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Email: `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL`
- MP: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_URL`
- Admin seed: `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_FIRST_NAME`, `ADMIN_SEED_LAST_NAME`
- Check-in: `CHECKIN_QR_SECRET`, `CHECKIN_TIMEZONE`, `CHECKIN_OPEN_TIME`, `CHECKIN_CLOSE_TIME`, `CHECKIN_REQUIRE_GEOLOCATION`, `CHECKIN_GYM_GEOFENCE_JSON`, `CHECKIN_MAIN_LAT`, `CHECKIN_MAIN_LNG`, `CHECKIN_MAIN_RADIUS_METERS`
- Access periods: `ACCESS_SINGLE_PERIOD_DAYS`, `ACCESS_SINGLE_GRACE_DAYS`
- App: `NODE_ENV`

## Variables de entorno (frontend)
- `NEXT_PUBLIC_API_URL`
- `INTERNAL_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `NODE_ENV`

## Notas operativas
- En desarrollo, backend usa `synchronize: true`.
- En produccion, usar migraciones y `synchronize: false`.
- Swagger disponible en `/api/docs`.
- Ver checklist de salida en `docs/release-checklist.md`.
