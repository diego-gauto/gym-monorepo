# Rules - QR Check-in Gimnasio

## Objetivo
Implementar un flujo de ingreso por QR donde el usuario:
1. Escanea QR en el local.
2. Abre pantalla de check-in.
3. Selecciona actividad.
4. Confirma ingreso.

## Flujo funcional
1. El QR apunta a `/check-in?gym=<sede>`.
2. El usuario debe estar autenticado para registrar ingreso.
3. El backend valida elegibilidad antes de permitir check-in.
4. El check-in guarda usuario, fecha/hora, actividad y sede.

## Reglas de elegibilidad
Se permite ingreso solo si se cumplen **todas**:
1. Condición comercial válida:
   - Suscripción activa, en gracia o pendiente de cancelación.
   - O período pago único vigente (incluyendo gracia configurable).
2. Apto físico vigente:
   - Debe existir certificado médico válido a la fecha.

Si falla cualquier condición:
1. Se deniega el check-in.
2. Se devuelve motivo claro para mostrar al usuario.

## Reglas de actividades
1. La actividad debe pertenecer al catálogo habilitado.
2. No se aceptan actividades arbitrarias fuera de catálogo.

## Datos a persistir en asistencia
1. `user_id`
2. `check_in_at`
3. `activity_slug`
4. `gym_location`
5. `device_id` (opcional)

## API mínima
1. `GET /access/check-in/eligibility`
2. `GET /access/check-in/activities`
3. `POST /access/check-in`

Todos los endpoints requieren JWT.

## Seguridad
1. Validación de elegibilidad en backend (no confiar en frontend).
2. El frontend nunca decide por sí solo acceso permitido/restringido.
3. El QR puede ser estático por sede; la autorización real ocurre en backend.

## Alcance actual
1. Incluye check-in de suscripciones recurrentes.
2. Incluye preparación para período pago único mediante reglas de elegibilidad.
3. Excluye por ahora control de geolocalización y QR dinámico diario.
