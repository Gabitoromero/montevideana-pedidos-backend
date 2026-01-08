import type { EntityManager } from '@mikro-orm/core';
import { TipoEstado } from '../../../modules/estados/tipoEstado.entity.js';
import { Regla } from '../../../modules/reglas/regla.entity.js';

/**
 * Seeder para crear los tipos de estado y las reglas de transición iniciales
 * Replica la lógica de scripts/init-sistema.sql
 */
export async function seedTipoEstados(em: EntityManager): Promise<void> {
  // 1. Crear Tipos de Estado
  console.log('  📊 Creando tipos de estado...');

  const estados = [
    { id: 1, nombreEstado: 'CHESS' },
    { id: 2, nombreEstado: 'PENDIENTE' },
    { id: 3, nombreEstado: 'EN PREPARACION' },
    { id: 4, nombreEstado: 'PREPARADO' },
    { id: 5, nombreEstado: 'TESORERIA' },
    { id: 6, nombreEstado: 'ENTREGADO' }
  ];

  for (const estadoData of estados) {
    let estado = await em.findOne(TipoEstado, { id: estadoData.id });

    if (!estado) {
      estado = em.create(TipoEstado, estadoData);
      await em.persist(estado).flush();
      console.log(`✓ Estado creado: ${estadoData.nombreEstado}`);
    } else {
      if (estado.nombreEstado !== estadoData.nombreEstado) {
        estado.nombreEstado = estadoData.nombreEstado;
        await em.flush();
        console.log(`↻ Estado actualizado: ${estadoData.nombreEstado}`);
      } else {
        console.log(`- Estado ya existe: ${estadoData.nombreEstado}`);
      }
    }
  }

  // 2. Crear Reglas de Transición (Estados Necesarios)
  console.log('  🔗 Creando reglas de transición (estados necesarios)...');
  
  // Reglas extraídas de scripts/init-sistema.sql
  const reglas = [
    { idEstado: 3, idEstadoNecesario: 2 }, // EN PREPARACION necesita PENDIENTE
    { idEstado: 4, idEstadoNecesario: 2 }, // PREPARADO necesita PENDIENTE
    { idEstado: 4, idEstadoNecesario: 3 }, // PREPARADO necesita EN PREPARACION
    { idEstado: 6, idEstadoNecesario: 2 }, // ENTREGADO necesita PENDIENTE
    { idEstado: 6, idEstadoNecesario: 3 }, // ENTREGADO necesita EN PREPARACION
    { idEstado: 6, idEstadoNecesario: 4 }, // ENTREGADO necesita PREPARADO
    { idEstado: 6, idEstadoNecesario: 5 }, // ENTREGADO necesita TESORERIA
  ];

  for (const reglaData of reglas) {
    // Buscar si ya existe la regla
    const existingRegla = await em.findOne(Regla, {
      idEstado: reglaData.idEstado,
      idEstadoNecesario: reglaData.idEstadoNecesario
    });

    if (!existingRegla) {
      const regla = em.create(Regla, {
        idEstado: em.getReference(TipoEstado, reglaData.idEstado),
        idEstadoNecesario: em.getReference(TipoEstado, reglaData.idEstadoNecesario)
      });
      
      await em.persist(regla).flush();
      console.log(`✓ Regla creada: Estado ${reglaData.idEstado} requiere ${reglaData.idEstadoNecesario}`);
    } else {
      console.log(`- Regla ya existe: Estado ${reglaData.idEstado} requiere ${reglaData.idEstadoNecesario}`);
    }
  }

  console.log('  ✅ Tipos de estado y reglas listos');
}



