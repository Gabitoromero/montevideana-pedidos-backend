import XLSX from 'xlsx';
import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { Fletero } from '../src/modules/fleteros/fletero.entity.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para importar fleteros desde un archivo Excel
 * 
 * Uso:
 *   pnpm tsx scripts/importar-fleteros.ts <ruta-al-archivo.xlsx>
 * 
 * Ejemplo:
 *   pnpm tsx scripts/importar-fleteros.ts ./fleteros.xlsx
 */

interface FleteroDatos {
  id: number;
  nombre: string;
  seguimiento: boolean;
}

interface ReporteImportacion {
  totalEnExcel: number;
  duplicadosPorId: number;
  duplicadosPorNombre: number;
  insertados: number;
  errores: number;
  fleteros: {
    insertados: FleteroDatos[];
    duplicados: FleteroDatos[];
    errores: { datos: FleteroDatos; error: string }[];
  };
}

async function importarFleteros(rutaArchivo: string): Promise<void> {
  let orm: MikroORM | null = null;

  try {
    console.log('\n🚀 ========== IMPORTACIÓN DE FLETEROS ==========\n');

    // 1. Validar que el archivo existe
    if (!fs.existsSync(rutaArchivo)) {
      throw new Error(`❌ El archivo no existe: ${rutaArchivo}`);
    }

    console.log(`📂 Archivo: ${path.basename(rutaArchivo)}`);
    console.log(`📍 Ruta completa: ${path.resolve(rutaArchivo)}\n`);

    // 2. Leer el archivo Excel
    console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(rutaArchivo);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet);

    console.log(`✅ Archivo leído correctamente`);
    console.log(`📊 Total de filas en Excel: ${data.length}\n`);

    // 3. Parsear los datos del Excel
    console.log('🔍 Parseando datos del Excel...');
    const fleterosDatos: FleteroDatos[] = [];
    const erroresLectura: { fila: number; error: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      const numeroFila = i + 2; // +2 porque Excel empieza en 1 y tiene header

      try {
        // Obtener ID, nombre y seguimiento del Excel
        // Columnas: ID, Descripción, Seguimiento
        const id = fila['ID'] || fila['ENTFLE'] || fila['idFletero'];
        const nombre = fila['Descripción'] || fila['CAM_FLETE'] || fila['dsFletero'] || fila['Nombre'];
        const seguimientoTexto = fila['Seguimiento'];

        if (!id || !nombre) {
          erroresLectura.push({
            fila: numeroFila,
            error: `Falta ID o Nombre (ID: ${id}, Nombre: ${nombre})`
          });
          continue;
        }

        // Determinar si tiene seguimiento activo
        // "Siguiendo" = true, "No siguiendo" = false
        const seguimiento = seguimientoTexto && 
                           String(seguimientoTexto).toLowerCase().includes('siguiendo') &&
                           !String(seguimientoTexto).toLowerCase().includes('no');

        fleterosDatos.push({
          id: Number(id),
          nombre: String(nombre).trim(),
          seguimiento: seguimiento
        });
      } catch (error) {
        erroresLectura.push({
          fila: numeroFila,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`✅ Datos parseados: ${fleterosDatos.length} fleteros válidos`);
    if (erroresLectura.length > 0) {
      console.log(`⚠️  Errores de lectura: ${erroresLectura.length} filas`);
      erroresLectura.forEach(e => {
        console.log(`   - Fila ${e.fila}: ${e.error}`);
      });
    }
    console.log('');

    // 4. Conectar a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    orm = await MikroORM.init<MySqlDriver>({
      driver: MySqlDriver,
      highlighter: new SqlHighlighter(),
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      dbName: process.env.DB_NAME || 'montevideana_pedidos',
      entities: ['dist/**/*.entity.js'],
      entitiesTs: ['src/**/*.entity.ts'],
      debug: false, // Sin logs para el script
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });
    const em = orm.em.fork();
    console.log('✅ Conexión establecida\n');

    // 5. Obtener fleteros existentes
    console.log('🔍 Verificando fleteros existentes en la base de datos...');
    const fleterosExistentes = await em.find(Fletero, {});
    const idsExistentes = new Set(fleterosExistentes.map(f => f.idFletero));
    const nombresExistentes = new Set(
      fleterosExistentes.map(f => f.dsFletero.toLowerCase().trim())
    );

    console.log(`📊 Fleteros en base de datos: ${fleterosExistentes.length}`);
    console.log(`   - IDs existentes: ${idsExistentes.size}`);
    console.log(`   - Nombres únicos: ${nombresExistentes.size}\n`);

    // 6. Filtrar duplicados y preparar reporte
    const reporte: ReporteImportacion = {
      totalEnExcel: fleterosDatos.length,
      duplicadosPorId: 0,
      duplicadosPorNombre: 0,
      insertados: 0,
      errores: 0,
      fleteros: {
        insertados: [],
        duplicados: [],
        errores: []
      }
    };

    console.log('🔄 Procesando fleteros...\n');

    for (const datos of fleterosDatos) {
      try {
        // Verificar duplicado por ID
        if (idsExistentes.has(datos.id)) {
          reporte.duplicadosPorId++;
          reporte.fleteros.duplicados.push(datos);
          console.log(`⏭️  DUPLICADO (ID): ${datos.id} - ${datos.nombre}`);
          continue;
        }

        // Verificar duplicado por nombre
        if (nombresExistentes.has(datos.nombre.toLowerCase().trim())) {
          reporte.duplicadosPorNombre++;
          reporte.fleteros.duplicados.push(datos);
          console.log(`⏭️  DUPLICADO (Nombre): ${datos.id} - ${datos.nombre}`);
          continue;
        }

        // Crear nuevo fletero
        const nuevoFletero = em.create(Fletero, {
          idFletero: datos.id,
          dsFletero: datos.nombre,
          seguimiento: datos.seguimiento // Usar el valor del Excel
        });

        await em.persist(nuevoFletero).flush();

        reporte.insertados++;
        reporte.fleteros.insertados.push(datos);
        console.log(`✅ INSERTADO: ${datos.id} - ${datos.nombre}`);

        // Actualizar sets para evitar duplicados en el mismo lote
        idsExistentes.add(datos.id);
        nombresExistentes.add(datos.nombre.toLowerCase().trim());

      } catch (error) {
        reporte.errores++;
        const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
        reporte.fleteros.errores.push({ datos, error: mensajeError });
        console.log(`❌ ERROR: ${datos.id} - ${datos.nombre} | ${mensajeError}`);
      }
    }

    // 7. Mostrar reporte final
    console.log('\n\n📊 ========== REPORTE DE IMPORTACIÓN ==========\n');
    console.log(`📥 Total en Excel:           ${reporte.totalEnExcel}`);
    console.log(`✅ Insertados:               ${reporte.insertados}`);
    console.log(`⏭️  Duplicados por ID:        ${reporte.duplicadosPorId}`);
    console.log(`⏭️  Duplicados por Nombre:    ${reporte.duplicadosPorNombre}`);
    console.log(`❌ Errores:                  ${reporte.errores}`);
    console.log('');

    if (reporte.fleteros.insertados.length > 0) {
      console.log('✅ Fleteros insertados:');
      reporte.fleteros.insertados.forEach(f => {
        console.log(`   - ${f.id}: ${f.nombre}`);
      });
      console.log('');
    }

    if (reporte.fleteros.duplicados.length > 0) {
      console.log('⏭️  Fleteros duplicados (no insertados):');
      reporte.fleteros.duplicados.slice(0, 10).forEach(f => {
        console.log(`   - ${f.id}: ${f.nombre}`);
      });
      if (reporte.fleteros.duplicados.length > 10) {
        console.log(`   ... y ${reporte.fleteros.duplicados.length - 10} más`);
      }
      console.log('');
    }

    if (reporte.fleteros.errores.length > 0) {
      console.log('❌ Errores:');
      reporte.fleteros.errores.forEach(e => {
        console.log(`   - ${e.datos.id}: ${e.datos.nombre} | ${e.error}`);
      });
      console.log('');
    }

    console.log('✅ Importación completada exitosamente\n');

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (orm) {
      await orm.close();
      console.log('🔌 Conexión a base de datos cerrada\n');
    }
  }
}

// Ejecutar el script
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('\n❌ Error: Debes proporcionar la ruta al archivo Excel\n');
  console.log('Uso:');
  console.log('  pnpm tsx scripts/importar-fleteros.ts <ruta-al-archivo.xlsx>\n');
  console.log('Ejemplo:');
  console.log('  pnpm tsx scripts/importar-fleteros.ts ./fleteros.xlsx\n');
  process.exit(1);
}

const rutaArchivo = args[0];
importarFleteros(rutaArchivo);
