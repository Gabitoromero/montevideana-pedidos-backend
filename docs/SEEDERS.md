# Guía de Seeders - Base de Datos

## ¿Qué son los Seeders?

Los seeders son scripts que **inicializan la base de datos con datos esenciales** para que el sistema funcione correctamente. En este proyecto, los seeders crean:

1. **Estados de pedidos** (PENDIENTE, EN PREPARACIÓN, etc.)
2. **Usuario CHESS** (para sincronización automática)
3. **Usuario admin** (para administración del sistema)

## ✅ Ventajas de usar Seeders

- ✅ **Contraseñas hasheadas correctamente** con bcrypt
- ✅ **Idempotentes**: Puedes ejecutarlos múltiples veces sin duplicar datos
- ✅ **Funcionan en desarrollo y producción**
- ✅ **Código TypeScript** con validación de tipos
- ✅ **Fáciles de mantener** y extender

---

## 📋 Uso

### 1. Ejecutar Seeders

```bash
# Ejecutar todos los seeders
pnpm seed
```

### 2. ¿Cuándo ejecutar los seeders?

- **Primera vez** que configuras el proyecto
- **Después de resetear** la base de datos
- **En producción** después de crear la base de datos
- **Cuando agregues nuevos estados** o usuarios iniciales

---

## 🔐 Usuarios Creados

Los seeders crean estos usuarios con contraseñas **correctamente hasheadas**:

| Username | Password   | Sector | Descripción                           |
| -------- | ---------- | ------ | ------------------------------------- |
| `CHESS`  | `chess123` | CHESS  | Usuario para sincronización con CHESS |
| `admin`  | `admin123` | admin  | Usuario administrador del sistema     |

> [!IMPORTANT] > **En producción**, cambia estas contraseñas inmediatamente después del primer login.

---

## 📊 Estados Creados

Los seeders crean estos estados de pedidos:

| ID  | Nombre Estado  |
| --- | -------------- |
| 1   | PENDIENTE      |
| 2   | EN PREPARACIÓN |
| 3   | PREPARADO      |
| 4   | EN CAMINO      |
| 5   | ENTREGADO      |
| 6   | DESPACHADO     |
| 7   | CANCELADO      |

---

## 🔧 Cómo Funciona

### Estructura de Archivos

```
src/shared/db/
├── seeders/
│   ├── DatabaseSeeder.ts      # Orquestador principal
│   ├── TipoEstadoSeeder.ts    # Crea estados
│   └── UsuarioSeeder.ts       # Crea usuarios (con hash)
└── seed.ts                    # Script CLI
```

### Flujo de Ejecución

1. **Inicializa ORM** y conexión a base de datos
2. **Ejecuta TipoEstadoSeeder**:
   - Verifica si cada estado existe
   - Crea nuevos estados o actualiza existentes
3. **Ejecuta UsuarioSeeder**:
   - Verifica si cada usuario existe
   - **Hashea contraseñas** con bcrypt
   - Crea nuevos usuarios (no sobrescribe existentes)
4. **Cierra conexión** limpiamente

---

## 🛠️ Agregar Nuevos Seeders

### Ejemplo: Seeder de Fleteros

```typescript
// src/shared/db/seeders/FleteroSeeder.ts
import type { EntityManager } from "@mikro-orm/core";
import { Fletero } from "../../../modules/fleteros/fletero.entity.js";

export async function seedFleteros(em: EntityManager): Promise<void> {
  console.log("  🚚 Creando fleteros iniciales...");

  const fleteros = [
    { id: 1, nombre: "Fletero 1", activo: true, seguimiento: false },
    { id: 2, nombre: "Fletero 2", activo: true, seguimiento: false },
  ];

  for (const fleteroData of fleteros) {
    let fletero = await em.findOne(Fletero, { id: fleteroData.id });

    if (!fletero) {
      fletero = em.create(Fletero, fleteroData);
      await em.persistAndFlush(fletero);
      console.log(`    ✓ Fletero creado: ${fleteroData.nombre}`);
    } else {
      console.log(`    - Fletero ya existe: ${fleteroData.nombre}`);
    }
  }

  console.log("  ✅ Fleteros listos");
}
```

Luego agrégalo en `DatabaseSeeder.ts`:

```typescript
import { seedFleteros } from "./FleteroSeeder.js";

export async function runDatabaseSeeders(em: EntityManager): Promise<void> {
  console.log("🌱 Iniciando seeders...");

  await seedTipoEstados(em);
  await seedUsuarios(em);
  await seedFleteros(em); // ← Agregar aquí

  console.log("✅ Seeders completados exitosamente");
}
```

---

## 🔒 Seguridad de Contraseñas

### ¿Cómo se hashean las contraseñas?

```typescript
// En UsuarioSeeder.ts
const passwordHash = await HashUtil.hash(userData.password);

// HashUtil usa bcrypt con 10 salt rounds
// Resultado: $2a$10$randomsalt...hashedpassword
```

### ¿Por qué es seguro?

- ✅ **Nunca guardamos contraseñas en texto plano**
- ✅ **Bcrypt** es un algoritmo de hash seguro y lento (resistente a ataques)
- ✅ **Salt automático** previene ataques de rainbow tables
- ✅ **Compatible** con el sistema de autenticación existente

---

## 🚀 Producción

### Paso a paso en servidor Linux

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Pedidos-Backend

# 2. Instalar dependencias
pnpm install

# 3. Configurar .env
cp .env.example .env
nano .env  # Editar con valores de producción

# 4. Compilar TypeScript
pnpm build

# 5. Ejecutar seeders
pnpm seed

# 6. Iniciar aplicación
pnpm start:pm2
```

> [!WARNING] > **Cambia las contraseñas por defecto** inmediatamente después del primer login en producción.

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Causa**: TypeScript no compilado.

**Solución**:

```bash
pnpm build
pnpm seed
```

### Error: "ORM no inicializado"

**Causa**: Problema con conexión a base de datos.

**Solución**:

1. Verifica que MySQL esté corriendo
2. Verifica credenciales en `.env`
3. Verifica que la base de datos existe

### Error: "Duplicate entry"

**Causa**: Intentando crear un usuario/estado que ya existe.

**Solución**: Esto es normal y esperado. Los seeders son idempotentes y simplemente saltarán los registros existentes.

---

## 📝 Notas Adicionales

- Los seeders **NO eliminan datos existentes**
- Son **seguros de ejecutar múltiples veces**
- Útiles para **resetear datos de prueba** en desarrollo
- En producción, ejecutar **solo una vez** después de crear la BD
