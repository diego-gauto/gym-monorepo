# Manual de Administracion (Rol ADMIN)

## 1. Acceso al dashboard
1. Iniciar sesion con cuenta admin.
2. Ir a `Admin` desde navbar.
3. Se abre `/admin/dashboard`.

Si la sesion no es admin, el sistema bloquea acceso.

## 2. Estructura del dashboard
Tabs disponibles:
- Estadisticas
- Pagos mostrador
- Sitio y Hero
- Profesores
- Actividades
- Beneficios
- Planes
- Sedes
- QR Check-in

## 3. Estadisticas
Muestra:
- usuarios totales
- usuarios activos
- suscripciones activas
- pagos unicos
- distribucion por plan
- metricas de periodo (`snapshot`, semana, mes, trimestre, ano)

## 4. Pagos mostrador
Objetivo: registrar pagos presenciales para alumnos existentes.

### Flujo
1. Buscar alumno por nombre, email o telefono.
2. Seleccionar alumno.
3. Elegir plan (`MONTHLY`, `QUARTERLY`, `YEARLY`).
4. Elegir medio (`CASH`, `POSTNET`, `QR`, `BANK_TRANSFER`).
5. Confirmar registro.

Resultado:
- se crea invoice en estado pagado
- usuario queda habilitado segun reglas de acceso

## 5. Sitio y Hero
Permite editar contenido institucional:
- badge, titulo, subtitulo
- imagen de fondo
- nombre y contacto del gimnasio

## 6. Profesores
ABM completo:
- crear
- editar
- eliminar

Campos:
- nombre
- bio
- avatar
- estado activo

## 7. Actividades
ABM completo:
- crear
- editar
- eliminar

Campos:
- nombre/slug (slug derivado del nombre)
- descripcion corta y larga
- imagen
- nivel, duracion
- beneficios/schedule/success criteria
- asignacion de profesores

## 8. Beneficios
ABM completo con:
- titulo
- descripcion
- clave de icono
- estado activo

## 9. Planes
ABM de planes con:
- id (`MONTHLY|QUARTERLY|YEARLY`)
- nombre/descripcion
- precio y moneda
- features
- highlight + badge
- estado activo

## 10. Sedes
ABM de sucursales:
- codigo unico
- nombre
- direccion
- estado activo

## 11. QR Check-in
1. Seleccionar sede.
2. Obtener QR del dia.
3. Compartir/mostrar QR en recepcion.

El QR incluye token diario y se invalida por fecha/horario.

## 12. Cierre de sesion
Disponible en dashboard para salir de cuenta admin.

## 13. Buenas practicas operativas
- no registrar pagos duplicados para el mismo alumno
- verificar sede correcta antes de generar QR
- mantener actividades y planes actualizados
- revisar estadisticas periodicamente para detectar caidas de pago
