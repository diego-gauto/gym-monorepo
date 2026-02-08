# Tech Stack Rules

> [!IMPORTANT]
> Estas reglas definen el stack tecnológico base y son de cumplimiento **OBLIGATORIO** para mantener la coherencia del proyecto.

## Reglas

### [OBLIGATORIO] Regla 1: Frontend - Next.js App Router

**Descripción:**
Todo el desarrollo frontend debe realizarse utilizando la **última versión estable de Next.js** con **App Router**. No se permite el uso de Pages Router.

**Razón:**
Garantizar el uso de las últimas optimizaciones de React (Server Components), mejorar el SEO y asegurar la longevidad del código base.

**Detección:**
- `package.json` debe tener `next: "latest"`.
- Estructura de carpetas debe ser `src/app`.

---

### [OBLIGATORIO] Regla 2: Backend - NestJS Modular

**Descripción:**
El backend debe construirse sobre **NestJS** siguiendo estrictamente una **arquitectura modular**. Cada dominio (Auth, Users, Billing) debe ser un módulo independiente.

**Razón:**
Mantener la separación de responsabilidades, facilitar el testing y permitir la escalabilidad del sistema sin acoplamiento.

**Ejemplo Correcto:**
```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

### [OBLIGATORIO] Regla 3: Package Manager - pnpm

**Descripción:**
El único gestor de paquetes permitido es **pnpm**.

**Razón:**
Eficiencia en espacio de disco, velocidad de instalación y manejo estricto de dependencias (evita phantom dependencies).

**Detección:**
- Existencia de `pnpm-lock.yaml`.
- Ausencia de `package-lock.json` o `yarn.lock`.

---

### [OBLIGATORIO] Regla 4: Compartición de Tipos

**Descripción:**
Se debe crear una carpeta `packages/shared` para definir interfaces de TypeScript, Enums y DTOs que sean consumidos tanto por `apps/web` como por `apps/api`. **Prohibido duplicar definiciones de tipos**.

**Razón:**
Evitar discrepancias entre frontend y backend, asegurando que ambos sistemas operen sobre las mismas estructuras de datos y contratos.

**Detección:**
- Existencia de la carpeta `packages/shared`.
- Ausencia de tipos idénticos re-definidos manualamente en ambos proyectos.

---

### [OBLIGATORIO] Regla 5: Estándar de Errores

**Descripción:**
Todas las respuestas de la API deben seguir un formato JSON unificado:
`{ "success": boolean, "data": any, "error": { "code": string, "message": string } | null }`.

**Razón:**
Facilitar el consumo de la API y el manejo de errores en el cliente mediante una estructura predecible.

**Ejemplo Correcto:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_001",
    "message": "Token expired"
  }
}
```

---

### [CRÍTICO] Regla 6: Sincronización Arquitectónica Total

**Descripción:**
Ante cualquier cambio en la estructura de una entidad (agregar, eliminar o modificar campos), es **OBLIGATORIO** sincronizar todos los niveles de la arquitectura en el mismo paso de trabajo:
1.  **Shared Interface**: Actualizar la interfaz en `packages/shared/src/interfaces`.
2.  **API Entity**: Reflejar el cambio en la entidad de TypeORM en `apps/api`.
3.  **Lógica de Negocio**: Actualizar servicios, DTOs y mapeadores que consuman dicha entidad.
4.  **Validación**: Ejecutar `pnpm build` para asegurar que el Frontend y Backend sigan siendo concordantes.

**Razón:**
Evitar discrepancias de datos que causen fallos en runtime en el Frontend o errores de compilación desfasados, manteniendo la integridad del contrato de datos en el monorepo.
