# 01 - Idea Inicial y Objetivo del Producto

## Problema que resuelve
Los gimnasios pequeños y medianos suelen operar con procesos manuales para:
- altas de socios
- cobros y renovaciones
- control de acceso
- gestion de contenido comercial (actividades, beneficios, planes)

Eso provoca errores de registro, morosidad, poco control operativo y mala experiencia para el cliente.

## Idea inicial
Construir una plataforma integral para gimnasio con dos caras:
- experiencia de alumno (sitio publico, registro/login, checkout, perfil, check-in por QR)
- experiencia de administracion (dashboard para contenido, estadisticas, pagos de mostrador, QR por sede)

## Objetivo de negocio
- mejorar conversion de visitantes a socios
- reducir friccion en pago/renovacion
- controlar acceso segun reglas reales (suscripcion, periodo pago, apto medico)
- dar autonomia operativa al admin sin tocar codigo

## Alcance funcional implementado (estado actual)
- Landing dinamica (sitio, beneficios, actividades, planes desde API)
- Registro/login local y login Google
- Verificacion de email y recuperacion de contrasena por correo
- Checkout con Mercado Pago para alta de suscripcion
- Perfil de usuario (datos, password local, suscripcion, asistencias, facturas)
- Check-in QR con validaciones de elegibilidad y geolocalizacion opcional
- Dashboard admin para ABM de:
  - sitio/hero
  - profesores
  - actividades
  - beneficios
  - planes
  - sedes
- Registro manual de pagos de mostrador (efectivo/posnet/qr/transferencia)

## Roles del sistema
- `USER`: alumno/socio
- `ADMIN`: operador/dueno del gimnasio

## Entregables principales del producto
- `apps/web`: frontend Next.js
- `apps/api`: backend NestJS
- `packages/shared`: enums e interfaces compartidas
- `docs/`: documentacion tecnica, funcional y manuales
