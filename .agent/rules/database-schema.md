# Database Schema & Data Modeling Rules

> [!IMPORTANT]
> Define la estructura de datos crítica para la integridad del sistema. Cualquier cambio en estas reglas requiere aprobación explícita.

## Reglas

### [OBLIGATORIO] Regla 1: Estrategia de IDs Híbrida

**Descripción:**
Se debe aplicar estrictamente la siguiente estrategia de Identificadores Primarios (PK):
- **UUIDs**: Para entidades expuestas públicamente o sensibles (`User`, `Subscription`, `Invoice`).
- **BigInt Auto-increment**: Para tablas internas de alto volumen o logs (`Attendance`, `AuditLogs`).

**Razón:**
- **Seguridad**: Evita la enumeración de usuarios/facturas (ID enumeration attack).
- **Performance**: Los índices enteros (`BigInt`) son más eficientes para tablas masivas como el registro de asistencia.

**Ejemplo Correcto:**
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Público
}

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string; // Interno, massive scale
}
```

---

### [OBLIGATORIO] Regla 2: Relaciones del ERD

**Descripción:**
El esquema de base de datos debe reflejar exactamente las relaciones definidas en el PRD:
- `User` 1:N `Subscription` (Historial)
- `User` 1:N `Invoice`
- `User` 1:N `Attendance`
- `User` 1:N `MedicalCertificate`

**Razón:**
Mantener la consistencia con la lógica de negocio aprobada.

---

### [OBLIGATORIO] Regla 3: Auditoría

**Descripción:**
Todas las entidades clave deben incluir campos `createdAt` y `updatedAt`.

---

### [OBLIGATORIO] Regla 4: Schema de Invoice

**Descripción:**
Asegurar que la tabla `INVOICE` tenga:
- `idempotency_key` (string/unique): Para prevenir duplicados.
- `status`: Para soportar la lógica de reintentos y controlar el ciclo de vida de la factura.

**Razón:**
Soporte fundamental a nivel de base de datos para las garantías de idempotencia y máquinas de estado de pagos.
