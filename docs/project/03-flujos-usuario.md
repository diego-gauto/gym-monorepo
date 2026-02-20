# 03 - Flujos de Uso del Sistema

## 1. Flujo de onboarding (registro local)
1. Usuario entra a `/register`.
2. Completa formulario con validaciones inline.
3. API crea usuario en `users` + `user_auth` (provider local, password hasheada).
4. API envia email de verificacion.
5. Usuario abre link `/verify-email?token=...`.
6. Cuenta queda verificada y habilitada para login.

## 2. Flujo login local
1. Usuario entra a `/login`.
2. Envia email/password.
3. API valida credenciales y que email este verificado.
4. API retorna JWT.
5. Front guarda sesion y redirige a:
   - checkout, si venia desde elegir plan
   - ruta `next`, si existe
   - home, en caso contrario

## 3. Flujo login Google
1. Front inicia OAuth con `state` y contexto.
2. Callback recibe `code`.
3. API intercambia `code` por `id_token` y valida Google.
4. API vincula cuenta existente por email/sub.
5. Emite JWT propio del sistema.

## 4. Flujo checkout
1. Usuario elige plan desde landing.
2. Si no esta autenticado -> login/register y vuelve al flujo.
3. En checkout se valida contexto de facturacion.
4. Si corresponde pago inmediato:
   - tokeniza tarjeta
   - crea/actualiza customer y card en MP
   - procesa pago
   - crea `invoice` y `subscription`
5. Redireccion a `/checkout/success`.

## 5. Flujo check-in QR
1. Admin obtiene QR por sede en dashboard.
2. Usuario escanea QR y abre `/check-in?gym=...&t=...`.
3. API valida token diario + horario.
4. API valida elegibilidad:
   - suscripcion activa o periodo pago vigente
   - apto medico vigente
   - geolocalizacion (si configurada)
5. Usuario elige actividad y confirma.
6. API registra asistencia en `attendance`.

## 6. Flujo perfil usuario
- Edicion de datos personales
- Cambio de password (solo cuentas locales)
- Consulta de suscripcion y solicitud de cambio/cancelacion
- Historial de asistencias por periodo
- Historial de facturas/pagos

## 7. Flujo admin
- Login con rol `ADMIN`
- Dashboard con tabs:
  - estadisticas
  - pagos mostrador
  - sitio/hero
  - profesores
  - actividades
  - beneficios
  - planes
  - sedes
  - QR check-in
- ABM de contenido persistido en DB
