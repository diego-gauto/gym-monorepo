# 12 - API REST (Resumen Funcional)

Prefijo global: `/api`

## Auth (`/api/auth`)
- `POST /register`
- `POST /verify-email`
- `POST /resend-verification`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /login`
- `POST /google`
- `POST /google/code`
- `GET /profile` (JWT)

## Users (`/api/users`) [JWT]
- `GET /me`
- `PATCH /me`
- `POST /me/password`
- `GET /me/attendance?range=week|month|quarter|year`
- `GET /me/payments`
- `GET /me/subscription`

## Billing (`/api/billing`)
- `POST /webhook/mp`
- `POST /card` (JWT)
- `POST /cancel` (JWT)
- `GET /context` (JWT)
- `POST /plan-request` (JWT)
- `POST /checkout/pay` (JWT)

## Access (`/api/access`) [JWT]
- `GET /check-in/activities?gym=&token=`
- `GET /check-in/eligibility?gym=&token=`
- `POST /check-in`
- `GET /check-in/admin/qr?gym=&baseUrl=` (ADMIN)

## Public content
- `GET /api/content/home`
- `GET /api/content/activities`
- `GET /api/content/activities/:slug`

## Admin content y operacion (`/api/admin`) [ADMIN]
- `GET /stats?range=snapshot|week|month|quarter|year`
- `GET /payments/students?q=...`
- `POST /payments/one-time`
- `GET /content/site`
- `PATCH /content/site`
- `GET/POST/PATCH/DELETE /content/trainers`
- `GET/POST/PATCH/DELETE /content/activities`
- `GET/POST/PATCH/DELETE /content/benefits`
- `GET/POST/DELETE /content/plans`
- `GET/POST/PATCH/DELETE /content/branches`

## Documentacion OpenAPI
Con Swagger:
- UI: `/api/docs`
- JSON: `/api/docs-json`

Ver contratos completos en la UI Swagger en runtime.
