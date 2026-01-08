import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo CSV
const csvPath = path.join(__dirname, '..', 'choferesMonthelado.csv');

console.log(`📂 Leyendo archivo: ${csvPath}`);

// Verificar que el archivo existe
if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: El archivo no existe en la ruta: ${csvPath}`);
    process.exit(1);
}

// Leer el archivo CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log(`📄 Tamaño del archivo: ${csvContent.length} caracteres`);

// Dividir en líneas y filtrar vacías
const allLines = csvContent.split(/\r?\n/);
console.log(`📊 Total de líneas en el archivo: ${allLines.length}`);

// Mostrar las primeras 5 líneas para debug
console.log(`\n🔍 Primeras 5 líneas del CSV:`);
allLines.slice(0, 5).forEach((line, idx) => {
    console.log(`  ${idx + 1}: "${line}"`);
});

// Filtrar líneas vacías
const lines = allLines.filter(line => line.trim() !== '');
console.log(`\n✅ Líneas no vacías: ${lines.length}`);

// Detectar delimitador (coma, punto y coma, tab)
const firstLine = lines[0] || '';
let delimiter = ',';
if (firstLine.includes(';')) delimiter = ';';
else if (firstLine.includes('\t')) delimiter = '\t';

console.log(`🔧 Delimitador detectado: "${delimiter}"`);

// Generar los VALUES
const values = lines.map((line, index) => {
    // Dividir por el delimitador
    const parts = line.split(delimiter);
    
    if (parts.length < 2) {
        console.log(`⚠️  Línea ${index + 1} ignorada (menos de 2 campos): "${line}"`);
        return null;
    }
    
    const id = parts[0].trim();
    const descripcion = parts.slice(1).join(delimiter).trim(); // Por si la descripción tiene el delimitador
    
    // Validar que el ID sea un número
    if (!/^\d+$/.test(id)) {
        console.log(`⚠️  Línea ${index + 1} ignorada (ID no numérico): "${line}"`);
        return null;
    }
    
    // Escapar comillas simples en la descripción
    const escapedDescripcion = descripcion.replace(/'/g, "''");
    
    return `    (${id}, '${escapedDescripcion}', 0)`;
}).filter(v => v !== null);

console.log(`\n✅ Registros válidos procesados: ${values.length}`);

if (values.length === 0) {
    console.error(`\n❌ Error: No se encontraron registros válidos para procesar.`);
    console.error(`   Verifica que el CSV tenga el formato correcto: ID,DESCRIPCION`);
    process.exit(1);
}

// Generar los SELECT para la consulta alternativa con UNION ALL
const selectStatements = values.map((value, index) => {
    // Extraer id, descripcion del value
    const match = value.match(/\((\d+), '(.+)', 0\)/);
    if (!match) return null;
    
    const [, id, descripcion] = match;
    const prefix = index === 0 ? 'SELECT' : 'UNION ALL SELECT';
    return `    ${prefix} ${id} AS id, '${descripcion}' AS descripcion, 0 AS seguimiento`;
}).filter(v => v !== null);

// Generar la consulta SQL completa
const sqlQuery = `-- Consulta generada automáticamente para insertar choferes sin duplicados
-- Total de choferes en el CSV: ${values.length}
-- Fecha de generación: ${new Date().toLocaleString('es-UY')}

-- OPCIÓN 1: Usando INSERT IGNORE (Recomendado - Más simple y rápido)
INSERT IGNORE INTO fleteros (id_fletero, ds_fletero, seguimiento)
VALUES
${values.join(',\n')};

-- OPCIÓN 2: Usando NOT EXISTS (Más explícita, muestra qué registros se están evaluando)
/*
INSERT INTO fleteros (id_fletero, ds_fletero, seguimiento)
SELECT csv.id, csv.descripcion, csv.seguimiento
FROM (
${selectStatements.join('\n')}
) AS csv
WHERE NOT EXISTS (
    SELECT 1 
    FROM fleteros f 
    WHERE f.id_fletero = csv.id
);
*/

-- OPCIÓN 3: Usando tabla temporal (Útil para debugging)
/*
-- Paso 1: Crear tabla temporal
CREATE TEMPORARY TABLE IF NOT EXISTS temp_choferes (
    id_fletero INT,
    ds_fletero VARCHAR(255),
    seguimiento TINYINT
);

-- Paso 2: Insertar datos en tabla temporal
INSERT INTO temp_choferes (id_fletero, ds_fletero, seguimiento)
VALUES
${values.join(',\n')};

-- Paso 3: Insertar solo los que no existen
INSERT INTO fleteros (id_fletero, ds_fletero, seguimiento)
SELECT t.id_fletero, t.ds_fletero, t.seguimiento
FROM temp_choferes t
WHERE NOT EXISTS (
    SELECT 1 
    FROM fleteros f 
    WHERE f.id_fletero = t.id_fletero
);

-- Paso 4: Ver cuántos se insertaron
SELECT ROW_COUNT() AS registros_insertados;

-- Paso 5: Limpiar tabla temporal
DROP TEMPORARY TABLE IF EXISTS temp_choferes;
*/
`;

// Guardar la consulta SQL en un archivo
const outputPath = path.join(__dirname, 'insert-choferes.sql');
fs.writeFileSync(outputPath, sqlQuery, 'utf-8');

console.log(`\n✅ Consulta SQL generada exitosamente!`);
console.log(`📁 Archivo guardado en: ${outputPath}`);
console.log(`📊 Total de choferes procesados: ${values.length}`);
console.log(`\n🔍 Primeras 3 líneas SQL de ejemplo:`);
console.log(values.slice(0, 3).join('\n'));
