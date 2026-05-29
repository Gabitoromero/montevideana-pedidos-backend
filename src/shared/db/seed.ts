#!/usr/bin/env node
/**
 * Script para ejecutar los seeders de la base de datos
 * Uso: pnpm seed
 */

import 'dotenv/config';
import 'reflect-metadata';
import { initORM, closeORM } from './orm.js';
import { runDatabaseSeeders } from './seeders/DatabaseSeeder.js';

async function runSeeders() {
  console.log('🌱 Iniciando proceso de seeding...\n');

  try {
    // Inicializar ORM
    const orm = await initORM();
    const em = orm.em.fork();

    // Ejecutar seeders
    await runDatabaseSeeders(em);

    console.log('\n✅ Proceso de seeding completado exitosamente');
  } catch (error) {
    console.error('\n❌ Error durante el seeding:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await closeORM();
  }
}

// Ejecutar
runSeeders();

