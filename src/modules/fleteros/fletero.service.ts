import { EntityManager } from '@mikro-orm/core';
import { Fletero } from './fletero.entity.js';
import { AppError } from '../../shared/errors/AppError.js';
import { Pedido } from '../pedidos/pedido.entity.js';

export class FleterosService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Listar todos los fleteros
   */
  async findAll(): Promise<Fletero[]> {
    return this.em.find(Fletero, {}, { orderBy: { dsFletero: 'ASC' } });
  }

  /**
   * Obtener un fletero específico por ID
   */
  async findOne(id: number): Promise<Fletero> {
    const fletero = await this.em.findOne(Fletero, { idFletero: id });
    if (!fletero) {
      throw new AppError('Fletero no encontrado', 404);
    }
    return fletero;
  }

  /**
   * Listar fleteros con seguimiento activo
   */
  async findActivos(): Promise<Fletero[]> {
    return this.em.find(Fletero, { seguimiento: true }, { orderBy: { dsFletero: 'ASC' } });
  }

  /**
   * Listar fleteros con seguimiento inactivo
   */
  async findInactivos(): Promise<Fletero[]> {
    return this.em.find(Fletero, { seguimiento: false }, { orderBy: { dsFletero: 'ASC' } });
  }

  /**
   * Actualizar el campo seguimiento de un fletero
   * Si cambia a false, elimina todos los pedidos históricos de ese fletero
   */
  async update(id: number, seguimiento: boolean): Promise<Fletero> {
    const fletero = await this.findOne(id);
    
    const seguimientoAnterior = fletero.seguimiento;
    fletero.seguimiento = seguimiento;

    // Si cambió de true a false, eliminar todos los pedidos de este fletero
    if (seguimientoAnterior === true && seguimiento === false) {
      console.log(`🗑️  Fletero ${fletero.dsFletero} cambió a seguimiento=false. Eliminando pedidos...`);
      
      const pedidos = await this.em.find(Pedido, { fletero: fletero });
      console.log(`🗑️  Se eliminarán ${pedidos.length} pedidos del fletero ${fletero.dsFletero}`);
      
      // Los movimientos se eliminarán en cascada por la relación
      await this.em.remove(pedidos).flush();
      
      console.log(`✅ Pedidos del fletero ${fletero.dsFletero} eliminados exitosamente`);
    }

    await this.em.persist(fletero).flush();
    return fletero;
  }

  /**
   * Sincronizar fleteros desde Chess (optimizado para grandes volúmenes)
   * @param fleteros Array de [idFletero, dsFletero]
   * @returns { created: number, updated: number }
   */
  async syncFromChess(fleteros: Array<[number, string]>): Promise<{ created: number; updated: number }> {
    console.log(`🔄 Sincronizando ${fleteros.length} fleteros únicos desde Chess...`);
    
    // 1. Cargar todos los fleteros existentes en un Map para acceso O(1)
    const fleterosExistentes = await this.em.find(Fletero, {});
    const mapFleteros = new Map<number, Fletero>();
    fleterosExistentes.forEach(f => mapFleteros.set(f.idFletero, f));
    
    let created = 0;
    let updated = 0;
    const toCreate: Fletero[] = [];
    const toUpdate: Fletero[] = [];

    // 2. Procesar cada fletero de Chess
    for (const [idFletero, dsFletero] of fleteros) {
      const existente = mapFleteros.get(idFletero);
      
      if (existente) {
        // Verificar si cambió el nombre
        if (existente.dsFletero !== dsFletero) {
          console.log(`📝 Actualizando nombre de fletero ${idFletero}: "${existente.dsFletero}" → "${dsFletero}"`);
          existente.dsFletero = dsFletero;
          toUpdate.push(existente);
          updated++;
        }
      } else {
        // Crear nuevo fletero con seguimiento = true por defecto
        const nuevoFletero = this.em.create(Fletero, {
          idFletero,
          dsFletero,
          seguimiento: true,
        });
        toCreate.push(nuevoFletero);
        created++;
      }
    }

    // 3. Persistir todos los cambios en una sola operación
    if (toCreate.length > 0 || toUpdate.length > 0) {
      await this.em.persist([...toCreate, ...toUpdate]).flush();
    }

    console.log(`✅ Fleteros sincronizados: ${created} creados, ${updated} actualizados`);
    return { created, updated };
  }
}
