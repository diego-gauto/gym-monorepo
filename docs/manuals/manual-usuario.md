# Manual de Usuario (Rol USER)

## 1. Registro y acceso

### Registro local
1. Ir a `Ingresar` desde navbar.
2. Seleccionar `Registrate`.
3. Completar:
   - nombre
   - apellido
   - email
   - telefono
   - contrasena
   - confirmar contrasena
4. Confirmar `Crear cuenta`.
5. Revisar email y abrir el link de verificacion.
6. Iniciar sesion en `/login`.

### Login local
1. Ir a `/login`.
2. Ingresar email y contrasena.
3. Si todo es correcto, se inicia sesion y redirige segun contexto.

### Login Google
1. En login/register presionar `Continuar con Google`.
2. Autorizar cuenta.
3. El sistema valida y crea sesion.

## 2. Recuperar contrasena
1. Ir a `/recover-password` o link `Olvidaste tu contrasena`.
2. Enviar email.
3. Abrir link recibido.
4. Definir nueva contrasena.

## 3. Elegir plan y pagar
1. En landing, seleccionar plan.
2. Si no hay sesion, el sistema redirige a login/register y luego vuelve al checkout.
3. Completar datos de pago y aceptar terminos de debito recurrente.
4. Confirmar pago.
5. En caso exitoso, ver pantalla de confirmacion.

## 4. Perfil de usuario (`/profile`)
Secciones principales:
- Mis datos
- Suscripcion
- Asistencias
- Facturas
- Baja

### Mis datos
- editar nombre, apellido y contacto
- cargar/cambiar avatar
- cambiar contrasena (solo cuentas locales)

### Suscripcion
- ver plan actual y estado
- solicitar cambio de plan
- cancelar suscripcion

### Asistencias
- filtrar por semana/mes/trimestre/ano
- revisar actividad y fecha de cada ingreso

### Facturas
- historial de pagos
- estado de cada factura

### Cerrar sesion
- boton disponible en menu lateral

## 5. Check-in por QR
1. Escanear QR del gimnasio.
2. Si no hay sesion, iniciar sesion/registrarse.
3. El sistema valida:
   - estado de membresia/periodo pago
   - apto medico vigente
   - QR vigente
4. Elegir actividad.
5. Confirmar check-in.

## 6. Mensajes frecuentes
- `Debes verificar tu email`: falta activar cuenta local.
- `No tenes suscripcion activa o periodo pago vigente`: se requiere regularizar pago.
- `Necesitas apto fisico vigente`: subir/actualizar certificado.
