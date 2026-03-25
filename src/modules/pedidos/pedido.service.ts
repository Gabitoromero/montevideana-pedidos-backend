import { EntityManager } from '@mikro-orm/mysql';
import { Pedido } from './pedido.entity.js';
import { AppError } from '../../shared/errors/AppError.js';
import { SECTORES } from "../../shared/constants/estados.js";

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
      cobrado: false,
    });
    await this.em.persist(pedido).flush();
    return pedido;
  }

  /**
   * Buscar pedido por idPedido
   */
  async findByIdPedidoSimple(idPedido: string): Promise<Pedido | null> {
    return this.em.findOne(Pedido, { idPedido }, { populate: ['movimientos', 'fletero'] });
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
  async findAll(fecha?: string, page = 1, limit = 50): Promise<{ items: any[], total: number }> {
    if (fecha) {
      return this.findByDate(new Date(fecha), page, limit);
    }
    // Optimización: No cargamos movimientos por defecto para evitar performance pobre en listas grandes
    const [items, total] = await this.em.findAndCount(
      Pedido, 
      {}, 
      { 
        populate: ['fletero'], 
        orderBy: { idPedido: 'ASC' },
        limit,
        offset: (page - 1) * limit
      }
    );
    return { items, total };
  }

  /**
   * Buscar pedidos por fecha
   */
  async findByDate(fecha: Date, page = 1, limit = 50): Promise<{ items: any[], total: number }> {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const [items, total] = await this.em.findAndCount(
      Pedido,
      {
        fechaHora: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      { 
        populate: ['fletero'], 
        orderBy: { idPedido: 'ASC' },
        limit,
        offset: (page - 1) * limit
      }
    );
    return { items, total };
  }

  /**
   * Buscar todos los pedidos cuyo último movimiento tenga un estado final específico
   * Soporta paginación
   */
  async findByEstadoFinal(idEstado: number, page = 1, limit = 50, sortBy = 'm.fechaHora', sortOrder: 'ASC' | 'DESC' = 'ASC'): Promise<{ items: any[], total: number }> {
    const offset = (page - 1) * limit;

    const qb = this.em.createQueryBuilder(Pedido, 'p');
    
    // Solo seleccionamos los campos necesarios para evitar overhead de datos
    qb.select('p.*')
    .innerJoinAndSelect('p.fletero', 'f')
    .innerJoinAndSelect('p.movimientos', 'm')
    .innerJoinAndSelect('m.estadoFinal', 'ef')
    .innerJoinAndSelect('m.estadoInicial', 'ei')
    .innerJoinAndSelect('m.usuario', 'u')
    .where({ 'ef.id': idEstado })
    // Subconsulta para asegurar que el movimiento 'm' es el último del pedido (excluyendo estado 5 - PAGADO)
    .andWhere('m.fecha_hora = (SELECT MAX(m2.fecha_hora) FROM movimientos m2 WHERE m2.pedido_id_pedido = p.id_pedido AND m2.estado_final_id != 5)')
    .orderBy({ [sortBy]: sortOrder })
    .limit(limit)
    .offset(offset);

    const [pedidosRaw, total] = await qb.getResultAndCount();

    const result = pedidosRaw.map((p: any) => ({
      pedido: {
        fechaHora: (p as any).fechaHora,
        idPedido: p.idPedido,
        cobrado: p.cobrado,
        fletero: {
          idFletero: (p as any).fletero.idFletero,
          dsFletero: (p as any).fletero.dsFletero,
          seguimiento: (p as any).fletero.seguimiento,
        },
      },
      ultimoMovimiento: (() => {
        const movimientosList = Array.isArray(p.movimientos) ? p.movimientos : (p.movimientos?.getItems ? (p.movimientos as any).getItems() : []);
        const movimientosValidos = movimientosList.filter((m: any) => m.estadoFinal?.id !== 5);
        const sorted = movimientosValidos.sort((a: any, b: any) => 
          new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
        );
        const last = sorted[0] || (movimientosList.length > 0 ? movimientosList[0] : null);
        if (!last) throw new Error("No movement found for pedido " + p.idPedido);
        return {
          fechaHora: last.fechaHora,
          estadoInicial: {
            id: last.estadoInicial.id,
            nombreEstado: last.estadoInicial.nombreEstado,
          },
          estadoFinal: {
            id: last.estadoFinal.id,
            nombreEstado: last.estadoFinal.nombreEstado,
          },
          usuario: {
            id: last.usuario.id,
            nombre: last.usuario.nombre,
            apellido: last.usuario.apellido,
          },
        };
      })(),
    }));

    return { items: result, total };
  }

  /**
   * Buscar todos los pedidos cuyo último movimiento tenga un estado final específico
   * Ordenados por idPedido (ASC)
   * Soporta paginación
   */
  async findByEstadoFinalOrderedByIdPedido(idEstado: number, page = 1, limit = 50, sortBy = 'p.idPedido', sortOrder: 'ASC' | 'DESC' = 'ASC'): Promise<{ items: any[], total: number }> {
    const offset = (page - 1) * limit;

    const qb = this.em.createQueryBuilder(Pedido, 'p');
    
    qb.select('p.*')
    .innerJoinAndSelect('p.fletero', 'f')
    .innerJoinAndSelect('p.movimientos', 'm')
    .innerJoinAndSelect('m.estadoFinal', 'ef')
    .innerJoinAndSelect('m.estadoInicial', 'ei')
    .innerJoinAndSelect('m.usuario', 'u')
    .where({ 'ef.id': idEstado })
    .andWhere('m.fecha_hora = (SELECT MAX(m2.fecha_hora) FROM movimientos m2 WHERE m2.pedido_id_pedido = p.id_pedido AND m2.estado_final_id != 5)')
    .orderBy({ [sortBy]: sortOrder })
    .limit(limit)
    .offset(offset);

    const [pedidosRaw, total] = await qb.getResultAndCount();

    const result = pedidosRaw.map((p: any) => ({
      pedido: {
        fechaHora: (p as any).fechaHora,
        idPedido: p.idPedido,
        cobrado: p.cobrado,
        fletero: {
          idFletero: (p as any).fletero.idFletero,
          dsFletero: (p as any).fletero.dsFletero,
          seguimiento: (p as any).fletero.seguimiento,
        },
      },
      ultimoMovimiento: (() => {
        const movimientosList = Array.isArray(p.movimientos) ? p.movimientos : (p.movimientos?.getItems ? (p.movimientos as any).getItems() : []);
        const movimientosValidos = movimientosList.filter((m: any) => m.estadoFinal?.id !== 5);
        const sorted = movimientosValidos.sort((a: any, b: any) => 
          new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
        );
        const last = sorted[0] || (movimientosList.length > 0 ? movimientosList[0] : null);
        if (!last) throw new Error("No movement found for pedido " + p.idPedido);
        return {
          fechaHora: last.fechaHora,
          estadoInicial: {
            id: last.estadoInicial.id,
            nombreEstado: last.estadoInicial.nombreEstado,
          },
          estadoFinal: {
            id: last.estadoFinal.id,
            nombreEstado: last.estadoFinal.nombreEstado,
          },
          usuario: {
            id: last.usuario.id,
            nombre: last.usuario.nombre,
            apellido: last.usuario.apellido,
          },
        };
      })(),
    }));

    return { items: result, total };
  }

  /**
   * Eliminar un pedido
   */
  async delete(idPedido: string): Promise<void> {
    const pedido = await this.findByIdPedidoSimple(idPedido);
    if (!pedido) {
      throw new AppError('Pedido no encontrado', 404);
    }
    await this.em.remove(pedido).flush();
  }

  /**
   * Actualizar la calificación de un pedido
   * Solo se puede calificar si el pedido está en estado ENTREGADO
   * Valida que el usuario autenticado con PIN sea de sector ADMIN, CHESS o EXPEDICION
   */
  async actualizarCalificacion(idPedido: string, calificacion: number, pin: string): Promise<Pedido> {
    // Validar rango de calificación
    if (calificacion < 1 || calificacion > 5) {
      throw new AppError('La calificación debe estar entre 1 y 5', 400);
    }

    // Importar UserCache dinámicamente o arriba. Dado que es un service, mejor arriba si es posible.
    // Pero como el archivo ya usa imports dinámicos en esta función, seguiré la convención.
    const { UserCache } = await import('../../shared/utils/userCache.js');
    const Usuario = (await import('../usuarios/usuario.entity.js')).Usuario;
    const { HashUtil } = await import('../../shared/utils/hash.js')
    const userCache = UserCache.getInstance();
    
    // 1. Intentar encontrar al usuario en el buffer de memoria
    let usuarioAutenticado = await userCache.findInCache(pin);

    // 2. Si no está en el buffer, buscar en la base de datos (Bcrypt)
    if (!usuarioAutenticado) {
      const usuariosActivos = await this.em.find(Usuario, { activo: true , sector: {
                $in: [
                  SECTORES.EXPEDICION,
                  SECTORES.ADMIN,
                  SECTORES.CHESS,
                ],
              } });
      for (const u of usuariosActivos) {
        if (await HashUtil.compare(pin, u.passwordHash)) {
          usuarioAutenticado = u;
          userCache.addToCache(usuarioAutenticado);
          break;
        }
      }
    }

    if (!usuarioAutenticado) {
      throw new AppError('PIN incorrecto o usuario inactivo', 401);
    }

    // Verificar que el usuario sea de sector permitido
    const sectoresPermitidos = ['ADMIN', 'CHESS', 'EXPEDICION'];
    if (!sectoresPermitidos.includes(usuarioAutenticado.sector)) {
      throw new AppError(
        `El usuario ${usuarioAutenticado.username} (${usuarioAutenticado.sector}) no tiene permisos para calificar pedidos`,
        403
      );
    }

    // Buscar pedido con movimientos
    const pedido = await this.em.findOne(
      Pedido,
      { idPedido },
      { populate: ['movimientos', 'movimientos.estadoFinal', 'fletero'] }
    );

    if (!pedido) {
      throw new AppError('Pedido no encontrado', 404);
    }

    // Obtener último movimiento
    const movimientos = pedido.movimientos.getItems().sort((a: any, b: any) => 
      b.fechaHora.getTime() - a.fechaHora.getTime()
    );

    if (movimientos.length === 0) {
      throw new AppError('El pedido no tiene movimientos', 400);
    }

    const ultimoMovimiento = movimientos[0];

    // Verificar que esté en estado ENTREGADO (ID: 6)
    if (ultimoMovimiento.estadoFinal.id !== 6) {
      throw new AppError(
        `Solo se puede calificar pedidos en estado ENTREGADO. Estado actual: ${ultimoMovimiento.estadoFinal.nombreEstado}`,
        400
      );
    }

    // Actualizar calificación
    pedido.calificacion = calificacion;
    await this.em.flush();

    return pedido;
  }

  /**
   * Obtener todos los pedidos anulados
   * Retorna pedidos cuyo último movimiento tenga estado final ANULADO (7)
   * Soporta paginación
   */
  async findAnulados(page = 1, limit = 50, sortBy = 'm.fechaHora', sortOrder: 'ASC' | 'DESC' = 'DESC'): Promise<{ items: any[], total: number }> {
    const offset = (page - 1) * limit;

    const qb = this.em.createQueryBuilder(Pedido, 'p');
    
    qb.select('p.*')
    .innerJoinAndSelect('p.fletero', 'f')
    .innerJoinAndSelect('p.movimientos', 'm')
    .innerJoinAndSelect('m.estadoFinal', 'ef')
    .innerJoinAndSelect('m.estadoInicial', 'ei')
    .innerJoinAndSelect('m.usuario', 'u')
    .where({ 'ef.id': 7 })
    // Para anulados, el último movimiento DEBE ser el 7 (no aplicamos la exclusión del 5 aquí ya que buscamos específicamente el 7 como final)
    .andWhere('m.fecha_hora = (SELECT MAX(m2.fecha_hora) FROM movimientos m2 WHERE m2.pedido_id_pedido = p.id_pedido)')
    .orderBy({ [sortBy]: sortOrder })
    .limit(limit)
    .offset(offset);

    const [pedidosRaw, total] = await qb.getResultAndCount();

    const result = pedidosRaw.map((p: any) => {
      const movimientosList = Array.isArray(p.movimientos) ? p.movimientos : (p.movimientos?.getItems ? (p.movimientos as any).getItems() : []);
      const sorted = movimientosList.sort((a: any, b: any) => 
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
      );
      const lastMov = sorted[0];

      if (!lastMov) return null;

      return {
        pedido: {
          fechaHora: p.fechaHora,
          idPedido: p.idPedido,
          cobrado: p.cobrado,
          fletero: {
            idFletero: p.fletero.idFletero,
            dsFletero: p.fletero.dsFletero,
            seguimiento: p.fletero.seguimiento,
          },
        },
        ultimoMovimiento: {
          fechaHora: lastMov.fechaHora,
          estadoInicial: {
            id: lastMov.estadoInicial.id,
            nombreEstado: lastMov.estadoInicial.nombreEstado,
          },
          estadoFinal: {
            id: lastMov.estadoFinal.id,
            nombreEstado: lastMov.estadoFinal.nombreEstado,
          },
          usuario: {
            id: lastMov.usuario.id,
            nombre: lastMov.usuario.nombre,
            apellido: lastMov.usuario.apellido,
          },
          motivoAnulacion: lastMov.motivoAnulacion,
        },
      };
    }).filter(Boolean);

    return { items: result, total };
  }
}
