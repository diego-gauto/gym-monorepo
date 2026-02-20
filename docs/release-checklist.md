# Release Checklist

## 1. Pre-release (obligatorio)
- Confirmar rama objetivo (`develop` para staging, `main` para producción).
- Verificar CI en verde:
  - `lint`
  - `test:cov` API (con threshold)
  - `test` web
- Validar variables de entorno críticas:
  - `JWT_SECRET`
  - `DATABASE_URL` / conexión Postgres
  - credenciales Mercado Pago (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`)
  - proveedor email (Resend/SMTP)
  - Google OAuth (`GOOGLE_CLIENT_ID`)
- Respaldar base de datos antes del deploy (dump consistente).
- Revisar migraciones/synchronize:
  - producción sin `synchronize: true`
  - migraciones aplicadas y versionadas.

## 2. Smoke checklist funcional
- Registro local:
  - crea usuario
  - email de verificación enviado
  - activación correcta
- Login local y login Google.
- Recuperación de contraseña vía email.
- Checkout:
  - pago aprobado -> suscripción + invoice
  - pago fallido -> feedback y reintento
- Check-in QR:
  - validación de elegibilidad
  - registro de asistencia y actividad
- Perfil USER:
  - edición de datos
  - historial de asistencias e invoices
- Dashboard ADMIN:
  - ABM contenido
  - estadísticas
  - registro de pagos de mostrador

## 3. Deploy
- Poner la app en modo mantenimiento solo si hay cambios de alto riesgo.
- Ejecutar deploy backend.
- Ejecutar deploy frontend.
- Validar healthcheck de API.
- Verificar conectividad con servicios externos:
  - Mercado Pago
  - email provider
  - OAuth Google

## 4. Post-deploy inmediato (15-30 min)
- Revisar logs de API y frontend (errores 4xx/5xx inusuales).
- Confirmar webhooks de pagos activos y respondiendo 2xx.
- Verificar métricas:
  - tasa de login exitoso
  - tasa de pago aprobado/rechazado
  - latencia endpoints críticos (`/api/auth/*`, `/api/billing/*`, `/api/access/*`)
- Validar que no hubo corrupción de sesiones/tokens.

## 5. Rollback plan
- Criterios de rollback:
  - errores críticos de auth/pagos/check-in
  - caída prolongada de API
- Acciones:
  - revertir release a tag/commit anterior
  - restaurar DB snapshot si hubo cambios incompatibles
  - invalidar sesiones comprometidas si aplica
- Comunicación:
  - registrar incidente
  - documentar causa raíz y plan preventivo.

## 6. Hardening continuo
- Subir progresivamente el threshold de cobertura.
- Mantener E2E de flujos críticos al día.
- Revisar dependencias obsoletas y CVEs en cada release.
- Ejecutar revisión semestral de permisos y secretos.
