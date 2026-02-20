# 04 - Decisiones Tecnicas y Justificacion

## D-01: Monorepo con pnpm workspaces
- Decision: unificar web + api + shared en un solo repo.
- Justificacion: versionado coordinado, tipados compartidos y CI unico.

## D-02: NestJS + TypeORM para backend
- Decision: arquitectura modular NestJS y ORM relacional TypeORM.
- Justificacion: separacion por dominios, DI nativa, velocidad de desarrollo.

## D-03: Next.js App Router para frontend
- Decision: usar Next.js con componentes cliente/servidor.
- Justificacion: buen equilibrio entre SEO, DX y performance para landing + paneles.

## D-04: Contratos en `packages/shared`
- Decision: centralizar enums/interfaces (roles, estados, planes, metodos de pago).
- Justificacion: elimina inconsistencias FE/BE y reduce errores de mapeo.

## D-05: Identificadores hibridos
- Decision: `id` bigint interno + `uuid` publico en entidades sensibles.
- Justificacion: joins eficientes en DB y exposicion segura de IDs externos.

## D-06: Separacion de `user_auth` y `user_billing_profiles`
- Decision: separar autenticacion y datos de facturacion de `users`.
- Justificacion: mejor normalizacion, menos nulls, menor acoplamiento.

## D-07: Autenticacion mixta (local + Google)
- Decision: soportar provider local y federado en el mismo modelo.
- Justificacion: onboarding flexible y menor friccion de acceso.

## D-08: Verificacion de email solo para provider local
- Decision: exigir verificacion en login local; Google se considera verificado por proveedor.
- Justificacion: seguridad sin duplicar pasos cuando el proveedor ya verifico identidad.

## D-09: Checkout directo con backend propio
- Decision: orquestar pago en backend (tokenizacion, customer/card, pago, invoice, subscription).
- Justificacion: control total del flujo de negocio y consistencia transaccional.

## D-10: QR diario firmado para check-in
- Decision: token HMAC diario por sede/fecha y validacion por horario.
- Justificacion: evita reutilizacion simple del QR y mejora control presencial.

## D-11: Persistencia de contenido de negocio en tablas normalizadas
- Decision: mover contenido admin de bucket JSON legacy a tablas (`activities`, `trainers`, etc.).
- Justificacion: ABM consistente, consultas mas simples y evolucion del dominio.

## D-12: CI obligatorio en GitHub Actions
- Decision: gate de calidad con lint + tests + cobertura API.
- Justificacion: reduce regresiones y estandariza merges en `develop/main`.
