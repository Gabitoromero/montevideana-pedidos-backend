import type { EntityManager } from '@mikro-orm/core';
import { seedUsuarios } from './UsuarioSeeder.js';
import { seedTipoEstados } from './TipoEstadoSeeder.js';

/**
 * Seeder principal que ejecuta todos los seeders en orden
 */
export async function runDatabaseSeeders(em: EntityManager): Promise<void> {
  console.log('🌱 Iniciando seeders...');
  
  // Orden importante: primero estados, luego usuarios
  await seedTipoEstados(em);
  await seedUsuarios(em);
  
  console.log('✅ Seeders completados exitosamente');
}

