import { EntityManager } from '@mikro-orm/core';
import { Fletero } from './fletero.entity.js';
import { AppError } from '../../shared/errors/AppError.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';

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
      console.log(`🗑️  Fletero ${fletero.dsFletero} cambió a seguimiento=false. Eliminando pedidos y movimientos...`);
      
      const pedidos = await this.em.find(Pedido, { fletero: fletero }, { populate: ['movimientos'] });
      console.log(`🗑️  Se eliminarán ${pedidos.length} pedidos del fletero ${fletero.dsFletero}`);
      
      // Primero eliminar todos los movimientos de cada pedido
      let totalMovimientos = 0;
      for (const pedido of pedidos) {
        const movimientos = pedido.movimientos.getItems();
        totalMovimientos += movimientos.length;
        await this.em.remove(movimientos);
      }
      console.log(`🗑️  Se eliminarán ${totalMovimientos} movimientos asociados`);
      
      // Luego eliminar los pedidos
      await this.em.remove(pedidos);
      
      // Hacer flush de todos los cambios
      await this.em.flush();
      
      console.log(`✅ ${pedidos.length} pedidos y ${totalMovimientos} movimientos del fletero ${fletero.dsFletero} eliminados exitosamente`);
    }

    await this.em.persist(fletero).flush();
    return fletero;
  }

  /**
   * Actualizar el campo liquidacion_manual de un fletero
   * Si cambia a false (automática), procesa pedidos pendientes
   */
  async updateLiquidacion(id: number, liquidacion: boolean): Promise<Fletero> {
    const fletero = await this.em.findOne(Fletero, { idFletero: id });
    if (!fletero) throw AppError.notFound(`Fletero con ID ${id} no encontrado`);
    
    const liquidacionAnterior = fletero.liquidacion;
    fletero.liquidacion = liquidacion;
    await this.em.flush();
    
    console.log(`✅ Fletero ${fletero.dsFletero} actualizado: liquidacion = ${liquidacion}`);
    
    // Si cambió de manual (true) a automática (false), procesar pedidos pendientes
    if (liquidacionAnterior === true && liquidacion === false) {
      const procesados = await this.procesarPedidosPendientes(fletero);
      console.log(`🎯 Total de pedidos procesados automáticamente: ${procesados}`);
    }
    
    return fletero;
  }

  /**
   * Actualizar teléfonos de un fletero
   */
  async updateTelefonos(id: number, telefono1?: string, telefono2?: string): Promise<Fletero> {
    const fletero = await this.em.findOne(Fletero, { idFletero: id });
    if (!fletero) throw AppError.notFound(`Fletero con ID ${id} no encontrado`);
    
    // Actualizar teléfonos (pueden ser undefined para limpiar)
    fletero.telefono1 = telefono1 || undefined;
    fletero.telefono2 = telefono2 || undefined;
    
    await this.em.flush();
    
    console.log(`✅ Fletero ${fletero.dsFletero} actualizado: telefono1 = ${telefono1 || 'NULL'}, telefono2 = ${telefono2 || 'NULL'}`);
    
    return fletero;
  }

  /**
   * Procesar pedidos pendientes cuando un fletero cambia a liquidacion automática
   * Crea movimientos a TESORERIA para todos los pedidos con cobrado = false
   */
  async procesarPedidosPendientes(fletero: Fletero): Promise<number> {
    console.log(`🔄 Procesando pedidos pendientes del fletero ${fletero.dsFletero}...`);
    
    // Obtener todos los pedidos del fletero que no están cobrados
    const pedidosPendientes = await this.em.find(
      Pedido, 
      { 
        fletero: fletero,
        cobrado: false 
      },
      { populate: ['movimientos', 'movimientos.estadoFinal'] }
    );
    
    if (pedidosPendientes.length === 0) {
      console.log(`✅ No hay pedidos pendientes para procesar`);
      return 0;
    }
    
    console.log(`📦 Se procesarán ${pedidosPendientes.length} pedidos pendientes`);
    
    // Obtener entidades necesarias
    const estadoTesoreria = await this.em.findOne(TipoEstado, { nombreEstado: 'TESORERIA' });
    const usuarioSistema = await this.em.findOne(Usuario, { username: 'sistema' });
    
    if (!estadoTesoreria || !usuarioSistema) {
      throw new AppError('No se encontraron entidades requeridas (TESORERIA o usuario sistema)', 500);
    }
    
    let procesados = 0;
    
    for (const pedido of pedidosPendientes) {
      // Obtener el último movimiento para determinar el estado actual
      const movimientos = pedido.movimientos.getItems();
      if (movimientos.length === 0) continue;
      
      const ultimoMovimiento = movimientos.reduce((prev, current) => 
        current.fechaHora > prev.fechaHora ? current : prev
      );
      
      const estadoActual = ultimoMovimiento.estadoFinal as TipoEstado;
      
      // Crear movimiento a TESORERIA
      const movimientoTesoreria = this.em.create(Movimiento, {
        fechaHora: new Date(),
        estadoInicial: estadoActual,
        estadoFinal: estadoTesoreria,
        usuario: usuarioSistema,
        pedido: pedido,
      });
      
      pedido.cobrado = true;
      
      await this.em.persist(movimientoTesoreria);
      procesados++;
      
      console.log(`✅ Pedido ${pedido.idPedido}: ${estadoActual.nombreEstado} → TESORERIA`);
    }
    
    await this.em.flush();
    
    console.log(`✅ ${procesados} pedidos procesados exitosamente`);
    return procesados;
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
        // Crear nuevo fletero con seguimiento = false por defecto
        // El cliente activará manualmente los fleteros que necesite seguir
        const nuevoFletero = this.em.create(Fletero, {
          idFletero,
          dsFletero,
          seguimiento: false,
          liquidacion: false,
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
