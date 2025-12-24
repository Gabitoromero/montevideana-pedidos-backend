import { EntityManager } from '@mikro-orm/core';
import { Pedido } from './pedido.entity.js';
import { AppError } from '../../shared/errors/AppError.js';

export class PedidoService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Crear un nuevo pedido
   */
  async create(data: {
    fechaHora: Date | string;
    idPedido: number | string;
    dsFletero: string;
  }): Promise<Pedido> {
    const pedido = this.em.create(Pedido, {
      fechaHora: typeof data.fechaHora === 'string' ? new Date(data.fechaHora) : data.fechaHora,
      idPedido: typeof data.idPedido === 'string' ? parseInt(data.idPedido) : data.idPedido,
      dsFletero: data.dsFletero,
    });
    await this.em.persist(pedido).flush();
    return pedido;
  }

  /**
   * Buscar pedido por clave compuesta
   */
  async findByCompositeKey(fechaHora: Date | string, idPedido: number | string): Promise<Pedido | null> {
    const fecha = typeof fechaHora === 'string' ? new Date(fechaHora) : fechaHora;
    const id = typeof idPedido === 'string' ? parseInt(idPedido) : idPedido;
    
    return this.em.findOne(Pedido, { fechaHora: fecha, idPedido: id });
  }

  /**
   * Verificar si existe un pedido por idPedido en una fecha específica
   */
  async existsByIdPedido(idPedido: number, fecha: Date): Promise<boolean> {
    // Buscar pedidos con el mismo idPedido en el día especificado
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.em.count(Pedido, {
      idPedido,
      fechaHora: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    return count > 0;
  }

  /**
   * Listar todos los pedidos o filtrar por fecha
   */
  async findAll(fecha?: string): Promise<Pedido[]> {
    if (fecha) {
      return this.findByDate(new Date(fecha));
    }
    return this.em.find(Pedido, {}, { populate: ['movimientos'] });
  }

  /**
   * Buscar pedidos por fecha
   */
  async findByDate(fecha: Date): Promise<Pedido[]> {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    return this.em.find(
      Pedido,
      {
        fechaHora: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      { populate: ['movimientos'] }
    );
  }

  /**
   * Eliminar un pedido
   */
  async delete(fechaHora: Date | string, idPedido: number | string): Promise<void> {
    const pedido = await this.findByCompositeKey(fechaHora, idPedido);
    if (!pedido) {
      throw new AppError('Pedido no encontrado', 404);
    }
    await this.em.removeAndFlush(pedido);
  }
}
