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
    idPedido: string;
    fletero: any; // Fletero entity or reference
  }): Promise<Pedido> {
    const pedido = this.em.create(Pedido, {
      fechaHora: typeof data.fechaHora === 'string' ? new Date(data.fechaHora) : data.fechaHora,
      idPedido: data.idPedido,
      fletero: data.fletero,
    });
    await this.em.persist(pedido).flush();
    return pedido;
  }

  /**
   * Buscar pedido por clave compuesta
   */
  async findByCompositeKey(fechaHora: Date | string, idPedido: string): Promise<Pedido | null> {
    const fecha = typeof fechaHora === 'string' ? new Date(fechaHora) : fechaHora;
    
    return this.em.findOne(Pedido, { fechaHora: fecha, idPedido: idPedido });
  }

  /**
   * Verificar si existe un pedido por idPedido en una fecha específica
   */
  async existsByIdPedido(idPedido: string, fecha: Date): Promise<boolean> {
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
    return this.em.find(Pedido, {}, { populate: ['movimientos', 'fletero'] });
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
      { populate: ['movimientos', 'fletero'] }
    );
  }

  /**
   * Buscar pedidos del día de hoy cuyo último movimiento tenga un estado final específico
   */
  async findByEstadoFinal(idEstado: number): Promise<any[]> {
    const hoy = new Date();
    const startOfDay = new Date(hoy);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(hoy);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar todos los pedidos de hoy con sus movimientos y fletero
    const pedidos = await this.em.find(
      Pedido,
      {
        fechaHora: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      { 
        populate: ['movimientos', 'movimientos.estadoFinal', 'movimientos.estadoInicial', 'movimientos.usuario', 'fletero'],
        orderBy: { fechaHora: 'DESC' }
      }
    );

    // Filtrar pedidos cuyo último movimiento tenga el estado final buscado
    const resultado = pedidos
      .map(pedido => {
        // Obtener todos los movimientos del pedido ordenados por fecha DESC
        const movimientos = pedido.movimientos.getItems().sort((a, b) => 
          b.fechaHora.getTime() - a.fechaHora.getTime()
        );

        // Si no hay movimientos, no incluir este pedido
        if (movimientos.length === 0) {
          return null;
        }

        const ultimoMovimiento = movimientos[0];

        // Verificar si el estado final del último movimiento coincide
        if (ultimoMovimiento.estadoFinal.id !== idEstado) {
          return null;
        }

        // Retornar la información del pedido con su último movimiento y fletero
        return {
          pedido: {
            fechaHora: pedido.fechaHora,
            idPedido: pedido.idPedido,
            fletero: {
              idFletero: pedido.fletero.idFletero,
              dsFletero: pedido.fletero.dsFletero,
              seguimiento: pedido.fletero.seguimiento,
            },
          },
          ultimoMovimiento: {
            fechaHora: ultimoMovimiento.fechaHora,
            estadoInicial: {
              id: ultimoMovimiento.estadoInicial.id,
              nombreEstado: ultimoMovimiento.estadoInicial.nombreEstado,
            },
            estadoFinal: {
              id: ultimoMovimiento.estadoFinal.id,
              nombreEstado: ultimoMovimiento.estadoFinal.nombreEstado,
            },
            usuario: {
              id: ultimoMovimiento.usuario.id,
              nombre: ultimoMovimiento.usuario.nombre,
              apellido: ultimoMovimiento.usuario.apellido,
            },
          },
        };
      })
      .filter(item => item !== null) // Eliminar nulls
      .sort((a, b) => b!.ultimoMovimiento.fechaHora.getTime() - a!.ultimoMovimiento.fechaHora.getTime()); // Ordenar por fecha más reciente

    return resultado as any[];
  }

  /**
   * Eliminar un pedido
   */
  async delete(fechaHora: Date | string, idPedido: string): Promise<void> {
    const pedido = await this.findByCompositeKey(fechaHora, idPedido);
    if (!pedido) {
      throw new AppError('Pedido no encontrado', 404);
    }
    await this.em.remove(pedido).flush();
  }
}
