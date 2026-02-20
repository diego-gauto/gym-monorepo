# 05 - Esquema de Componentes

## 1. Componentes frontend (macro)

```mermaid
flowchart TB
  Layout[app/layout.tsx] --> Navbar
  Layout --> Footer

  Home[app/page.tsx] --> Hero
  Home --> Benefits
  Home --> Disciplines
  Home --> Plans
  Home --> Contact

  Auth[app/login + app/register] --> AuthFlow[lib/auth-flow.ts]
  Profile[app/profile] --> AuthFlow
  Checkout[app/checkout/mercadopago] --> AuthFlow
  CheckIn[app/check-in] --> AuthFlow
  AdminDashboard[app/admin/dashboard] --> AuthFlow

  AuthFlow --> API[(Nest API /api)]
```

## 2. Componentes backend (macro)

```mermaid
flowchart TB
  AppModule --> AuthModule
  AppModule --> UsersModule
  AppModule --> BillingModule
  AppModule --> AccessModule
  AppModule --> AdminModule

  AuthModule --> UserAuth[(user_auth)]
  UsersModule --> Users[(users)]
  BillingModule --> Invoices[(invoices)]
  BillingModule --> Subs[(subscriptions)]
  AccessModule --> Attendance[(attendance)]
  AccessModule --> Medical[(medical_certificates)]
  AdminModule --> Content[(activities/trainers/benefits/plans/site)]
```

## 3. Mapa de integraciones
- `AuthService` <-> Google OAuth
- `AuthEmailService` <-> Resend
- `PaymentsService` / `BillingService` <-> Mercado Pago
- `AccessService` <-> QR signed token + reglas de elegibilidad

## 4. Estados relevantes de UI
- Auth: `idle/loading/success/error`
- Checkout: `session-check`, `mode`, `submitting`, `result`
- Check-in: `loading/auth/blocked/ready/submitting/success/error`
- Admin dashboard: `boot loading`, `tab state`, `saving`, `notice/error`
