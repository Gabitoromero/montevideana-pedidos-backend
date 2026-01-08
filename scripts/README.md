# Script de Importación de Fleteros

Este script permite importar fleteros desde un archivo Excel a la base de datos, detectando automáticamente duplicados.

## 📋 Requisitos

### Variables de Entorno

El script usa las mismas variables de entorno que tu proyecto. Asegúrate de tener un archivo `.env` en la raíz del proyecto con:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=montevideana_pedidos
```

### Formato del Excel

- Archivo Excel con las siguientes columnas:
  - **ENTFLE**: ID del fletero (número)
  - **CAM_FLETE**: Nombre del fletero (texto)

## 🚀 Uso

### 1. Coloca tu archivo Excel en la raíz del proyecto

```bash
# Ejemplo: fleteros.xlsx
```

### 2. Ejecuta el script

```bash
pnpm tsx scripts/importar-fleteros.ts ./fleteros.xlsx
```

O con ruta completa:

```bash
pnpm tsx scripts/importar-fleteros.ts "C:\Users\tu-usuario\Desktop\fleteros.xlsx"
```

## 📊 Qué hace el script

1. ✅ **Lee el archivo Excel** y valida que exista
2. ✅ **Parsea los datos** de las columnas ENTFLE y CAM_FLETE
3. ✅ **Conecta a la base de datos** usando MikroORM
4. ✅ **Detecta duplicados** por ID y por nombre
5. ✅ **Inserta solo los fleteros nuevos**
6. ✅ **Genera un reporte detallado** con:
   - Total de fleteros en el Excel
   - Fleteros insertados
   - Fleteros duplicados (no insertados)
   - Errores (si los hay)

## 🔍 Detección de Duplicados

El script verifica duplicados de dos formas:

- **Por ID**: Si el `idFletero` ya existe en la base de datos
- **Por Nombre**: Si el `dsFletero` ya existe (ignora mayúsculas/minúsculas y espacios)

Los fleteros duplicados **NO se insertan** y se reportan al final.

## 📝 Ejemplo de Salida

```
🚀 ========== IMPORTACIÓN DE FLETEROS ==========

📂 Archivo: fleteros.xlsx
📍 Ruta completa: C:\...\fleteros.xlsx

📖 Leyendo archivo Excel...
✅ Archivo leído correctamente
📊 Total de filas en Excel: 25

🔍 Parseando datos del Excel...
✅ Datos parseados: 25 fleteros válidos

🔌 Conectando a la base de datos...
✅ Conexión establecida

🔍 Verificando fleteros existentes en la base de datos...
📊 Fleteros en base de datos: 10
   - IDs existentes: 10
   - Nombres únicos: 10

🔄 Procesando fleteros...

✅ INSERTADO: 9 - VARELA HUGO - DIRECTA
✅ INSERTADO: 10 - LEIVA LEONARDO - DIRECTA
⏭️  DUPLICADO (ID): 3 - DIEGO DIAZ - DIRECTA
✅ INSERTADO: 12 - PILAR - BALVEN
...

📊 ========== REPORTE DE IMPORTACIÓN ==========

📥 Total en Excel:           25
✅ Insertados:               15
⏭️  Duplicados por ID:        8
⏭️  Duplicados por Nombre:    2
❌ Errores:                  0

✅ Fleteros insertados:
   - 9: VARELA HUGO - DIRECTA
   - 10: LEIVA LEONARDO - DIRECTA
   - 12: PILAR - BALVEN
   ...

⏭️  Fleteros duplicados (no insertados):
   - 3: DIEGO DIAZ - DIRECTA
   - 5: FACUNDO AVILA - BS AS
   ...

✅ Importación completada exitosamente

🔌 Conexión a base de datos cerrada
```

## ⚠️ Notas Importantes

- El script **NO modifica** fleteros existentes, solo inserta nuevos
- Todos los fleteros insertados tienen `seguimiento = true` por defecto
- Si hay errores de lectura en el Excel, se reportan pero no detienen la importación
- La base de datos se cierra automáticamente al finalizar

## 🛠️ Solución de Problemas

### Error: "El archivo no existe"

- Verifica que la ruta al archivo sea correcta
- Usa comillas si la ruta tiene espacios: `"C:\Mi Carpeta\fleteros.xlsx"`

### Error: "Falta ID o Nombre"

- Verifica que las columnas del Excel se llamen exactamente `ENTFLE` y `CAM_FLETE`
- Asegúrate de que no haya filas vacías en el Excel

### Error de conexión a la base de datos

- Verifica que el servidor MySQL esté corriendo
- Verifica las credenciales en tu archivo `.env`
