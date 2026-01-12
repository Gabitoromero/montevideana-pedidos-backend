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
        orderBy: { fechaHora: 'ASC' }
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

        // Buscar el último movimiento que NO sea "Pagado" (id: 5)
        const ultimoMovimiento = movimientos.find(mov => mov.estadoFinal.id !== 5);

        // Si todos los movimientos son "Pagado", no incluir este pedido
        if (!ultimoMovimiento) {
          return null;
        }

        // Verificar si el estado final del último movimiento coincide
        if (ultimoMovimiento.estadoFinal.id !== idEstado) {
          return null;
        }

        // Retornar la información del pedido con su último movimiento y fletero
        return {
          pedido: {
            fechaHora: pedido.fechaHora,
            idPedido: pedido.idPedido,
            cobrado: pedido.cobrado,
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
      .sort((a, b) => a!.ultimoMovimiento.fechaHora.getTime() - b!.ultimoMovimiento.fechaHora.getTime()); // Ordenar por fecha más antigua primero (ASC)

    return resultado as any[];
  }

  /**
   * Buscar pedidos del día de hoy cuyo último movimiento tenga un estado final específico
   * Ordenados por idPedido (ASC)
   */
  async findByEstadoFinalOrderedByIdPedido(idEstado: number): Promise<any[]> {
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
        orderBy: { idPedido: 'ASC' }
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

        // Buscar el último movimiento que NO sea "Pagado" (id: 5)
        const ultimoMovimiento = movimientos.find(mov => mov.estadoFinal.id !== 5);

        // Si todos los movimientos son "Pagado", no incluir este pedido
        if (!ultimoMovimiento) {
          return null;
        }

        // Verificar si el estado final del último movimiento coincide
        if (ultimoMovimiento.estadoFinal.id !== idEstado) {
          return null;
        }

        // Retornar la información del pedido con su último movimiento y fletero
        return {
          pedido: {
            fechaHora: pedido.fechaHora,
            idPedido: pedido.idPedido,
            cobrado: pedido.cobrado,
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
      .filter(item => item !== null); // Eliminar nulls (ya está ordenado por idPedido desde la query)

    return resultado as any[];
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

    // Buscar todos los usuarios activos y verificar PIN
    const Usuario = (await import('../usuarios/usuario.entity.js')).Usuario;
    const { HashUtil } = await import('../../shared/utils/hash.js');
    
    const usuariosActivos = await this.em.find(Usuario, { activo: true });
    
    let usuarioAutenticado = null;
    for (const usuario of usuariosActivos) {
      const pinValido = await HashUtil.compare(pin, usuario.passwordHash);
      if (pinValido) {
        usuarioAutenticado = usuario;
        break;
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
    const movimientos = pedido.movimientos.getItems().sort((a, b) => 
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
}
