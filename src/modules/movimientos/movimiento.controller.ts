import { fork } from '../../shared/db/orm.js';
import { Movimiento } from './movimiento.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Fletero } from '../fleteros/fletero.entity.js';
import { ReglaController } from '../reglas/regla.controller.js';
import { CreateMovimientoDTO, MovimientoQueryDTO } from './movimiento.schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { DateUtil } from '../../shared/utils/date.js';

export class MovimientoController {
  private reglaController = new ReglaController();

  
  async create(data: CreateMovimientoDTO) {
    const em = fork();

    // 1. Validar que el usuario existe
    const usuario = await em.findOne(Usuario, { id: data.usuarioId });
    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${data.usuarioId} no encontrado`);
    }

    // 2. Validar que el pedido existe
    const pedido = await em.findOne(Pedido, { idPedido: data.idPedido }, { populate: ['fletero'] });
    if (!pedido) {
      throw AppError.notFound(`Pedido con ID ${data.idPedido} no encontrado`);
    }

    // 3. Validar que ambos estados existen
    const estadoInicial = await em.findOne(TipoEstado, { id: data.estadoInicial });
    if (!estadoInicial) {
      throw AppError.notFound(`Estado inicial con código ${data.estadoInicial} no encontrado`);
    }

    const estadoFinal = await em.findOne(TipoEstado, { id: data.estadoFinal });
    if (!estadoFinal) {
      throw AppError.notFound(`Estado final con código ${data.estadoFinal} no encontrado`);
    }

    // 4. Validar que la transición es legal según las reglas de EstadoNecesario
    const esTransicionLegal = await this.reglaController.validarTransicion(
      data.estadoInicial,
      data.estadoFinal
    );

    if (!esTransicionLegal) {
      throw AppError.badRequest(
        `Transición ilegal: El pedido ${data.idPedido} no puede pasar al estado "${estadoFinal.nombreEstado}" porque no ha pasado por los estados necesarios previos`
      );
    }

    // 5. Crear el movimiento
    const movimiento = em.create(Movimiento, {
      fechaHora: new Date(),
      pedido: pedido,
      estadoInicial: estadoInicial,
      estadoFinal: estadoFinal,
      usuario: usuario
    });

    await em.persist(movimiento).flush();

    return {
      fechaHora: movimiento.fechaHora,
      pedido: {
        idPedido: pedido.idPedido,
        fechaHora: pedido.fechaHora,
        fletero: {
          idFletero: pedido.fletero.idFletero,
          dsFletero: pedido.fletero.dsFletero,
          seguimiento: pedido.fletero.seguimiento
        }
      },
      estadoInicial: {
        idEstado: estadoInicial.id,
        nombreEstado: estadoInicial.nombreEstado
      },
      estadoFinal: {
        idEstado: estadoFinal.id,
        nombreEstado: estadoFinal.nombreEstado
      },
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        sector: usuario.sector,
      },
    };
  }
    

  async findAll(filters?: MovimientoQueryDTO) {
    const em = fork();
    const where: any = {};

    if (filters) {
      if (filters.usuarioId) {
        where.usuario = { id: filters.usuarioId };
      }
      if (filters.estadoInicial) {
        where.estadoInicial = filters.estadoInicial;
      }
      if (filters.estadoFinal) {
        where.estadoFinal = filters.estadoFinal;
      }
      if (filters.desde || filters.hasta) {
        where.fechaHora = {};
        if (filters.desde) {
          where.fechaHora.$gte = new Date(filters.desde);
        }
        if (filters.hasta) {
          where.fechaHora.$lte = new Date(filters.hasta);
        }
      }
    }

    const movimientos = await em.find(
      Movimiento,
      where,
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido', 'pedido.fletero'],
        orderBy: { fechaHora: 'DESC' },
      }
    );

    if (!movimientos || movimientos.length === 0) {
      throw AppError.notFound(`No se encontraron movimientos que coincidan con los filtros proporcionados`);
    }

    return movimientos.map((m) => ({
      fechaHora: m.fechaHora,
      pedido: {
        idPedido: m.pedido.idPedido,
        fechaHora: m.pedido.fechaHora,
        fletero: {
          idFletero: m.pedido.fletero.idFletero,
          dsFletero: m.pedido.fletero.dsFletero,
          seguimiento: m.pedido.fletero.seguimiento
        }
      },
      estadoInicial: m.estadoInicial,
      estadoFinal: m.estadoFinal,
      nombreEstadoInicial: m.estadoInicial.nombreEstado,
      nombreEstadoFinal: m.estadoFinal.nombreEstado,
      usuario: {
        id: m.usuario.id,
        nombre: m.usuario.nombre,
        apellido: m.usuario.apellido,
        sector: m.usuario.sector,
      },
    }));
  }

  async findByPedidoAndFecha(idPedido: string, fechaHora: Date) {
    const em = fork();
    const pedido = await em.findOne(Pedido, { idPedido });
    if (!pedido) {
      throw AppError.notFound(`Pedido con ID ${idPedido} no encontrado`);
    }

    const movimiento = await em.findOne(
      Movimiento,
      { pedido, fechaHora },
      { populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido', 'pedido.fletero'] }
    );

    if (!movimiento) {
      throw AppError.notFound(`Movimiento no encontrado para el pedido ${idPedido} en la fecha ${fechaHora}`);
    }

    return {
      fechaHora: movimiento.fechaHora,
      pedido: {
        idPedido: movimiento.pedido.idPedido,
        fechaHora: movimiento.pedido.fechaHora,
        fletero: {
          idFletero: movimiento.pedido.fletero.idFletero,
          dsFletero: movimiento.pedido.fletero.dsFletero,
          seguimiento: movimiento.pedido.fletero.seguimiento
        }
      },
      estadoInicial: movimiento.estadoInicial,
      estadoFinal: movimiento.estadoFinal,
      nombreEstadoInicial: movimiento.estadoInicial.nombreEstado,
      nombreEstadoFinal: movimiento.estadoFinal.nombreEstado,
      usuario: {
        id: movimiento.usuario.id,
        nombre: movimiento.usuario.nombre,
        apellido: movimiento.usuario.apellido,
        sector: movimiento.usuario.sector,
      },
    };
  }

  async findByIdPedido(idPedido: string) {
    const em = fork();
    const pedido = await em.findOne(Pedido, { idPedido });
    if (!pedido) {
      throw AppError.notFound(`Pedido con ID ${idPedido} no encontrado`);
    }

    const movimientos = await em.find(
      Movimiento,
      { pedido },
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido', 'pedido.fletero'],
        orderBy: { fechaHora: 'ASC' },
      }
    );

    return movimientos.map((m) => ({
      fechaHora: m.fechaHora,
      pedido: {
        idPedido: m.pedido.idPedido,
        fechaHora: m.pedido.fechaHora,
        fletero: {
          idFletero: m.pedido.fletero.idFletero,
          dsFletero: m.pedido.fletero.dsFletero,
          seguimiento: m.pedido.fletero.seguimiento
        }
      },
      estadoInicial: m.estadoInicial,
      estadoFinal: m.estadoFinal,
      nombreEstadoInicial: m.estadoInicial.nombreEstado,
      nombreEstadoFinal: m.estadoFinal.nombreEstado,
      usuario: {
        id: m.usuario.id,
        nombre: m.usuario.nombre,
        apellido: m.usuario.apellido,
        sector: m.usuario.sector,
      },
    }));
  }

  // async getEstadoActual(nroPedido: string) {
  //   const em = fork();
  //   const ultimoMovimiento = await em.find(
  //     Movimiento,
  //     { nroPedido },
  //     {
  //       populate: ['estadoFinal'],
  //       orderBy: { fechaHora: 'DESC' },
  //       limit: 1
  //     }
  //   );

  //   if (!ultimoMovimiento) {
  //     throw AppError.notFound(`No se encontraron movimientos para el pedido ${nroPedido}`);
  //   }

  //   return {
  //     nroPedido,
  //     estadoActual: ultimoMovimiento.estadoFinal,
  //     nombreEstadoActual: ultimoMovimiento.estadoFinal.nombreEstado,
  //     fechaUltimoMovimiento: ultimoMovimiento.fechaHora,
  //   };
  // }
  async getEstadoActual(idPedido: string) {
    const em = fork();
    
    const pedido = await em.findOne(Pedido, { idPedido });
    if (!pedido) {
      throw AppError.notFound(`Pedido con ID ${idPedido} no encontrado`);
    }

    // Buscar TODOS los movimientos del pedido, ordenados DESC
    const movimientos = await em.find(
      Movimiento,
      { pedido },
      {
        populate: ['estadoFinal', 'pedido', 'pedido.fletero'],
        orderBy: { fechaHora: 'DESC' },
        limit: 1  // Solo traer el primero (el más reciente)
      }
    );

    if (!movimientos || movimientos.length === 0) {
      throw AppError.notFound(`No se encontraron movimientos para el pedido ${idPedido}`);
    }

    const ultimoMovimiento = movimientos[0];

    return {
      pedido: {
        idPedido: ultimoMovimiento.pedido.idPedido,
        fechaHora: ultimoMovimiento.pedido.fechaHora,
        fletero: {
          idFletero: ultimoMovimiento.pedido.fletero.idFletero,
          dsFletero: ultimoMovimiento.pedido.fletero.dsFletero,
          seguimiento: ultimoMovimiento.pedido.fletero.seguimiento
        }
      },
      estadoActual: {
        idEstado: ultimoMovimiento.estadoFinal.id,
        nombreEstado: ultimoMovimiento.estadoFinal.nombreEstado
      },
      fechaUltimoMovimiento: ultimoMovimiento.fechaHora,
    };
  }

  /**
   * Inicializa un pedido desde CHESS con el usuario Sistema
   * Estado 6 (CHESS) → Estado 1 (Pendiente)
   */
  async inicializarDesdeChess(data: { idPedido: string; fechaHora: string; idFleteroCarga: number }) {
    const em = fork();
    const USUARIO_SISTEMA_ID = 1; // ID del usuario "Sistema"
    const ESTADO_CHESS_ID = 6;     // Estado inicial de CHESS
    const ESTADO_PENDIENTE_ID = 1; // Estado Pendiente

    // 1. Verificar que el usuario Sistema existe
    const usuarioSistema = await em.findOne(Usuario, { id: USUARIO_SISTEMA_ID });
    if (!usuarioSistema) {
      throw AppError.internal(
        'Usuario Sistema no encontrado. Debe existir un usuario con ID 1 para inicializar pedidos desde CHESS.'
      );
    }

    // 2. Verificar que los estados existen
    const estadoChess = await em.findOne(TipoEstado, { id: ESTADO_CHESS_ID });
    if (!estadoChess) {
      throw AppError.internal(
        'Estado CHESS (6) no encontrado. Debe existir en la base de datos.'
      );
    }

    const estadoPendiente = await em.findOne(TipoEstado, { id: ESTADO_PENDIENTE_ID });
    if (!estadoPendiente) {
      throw AppError.internal(
        'Estado PENDIENTE (1) no encontrado. Debe existir en la base de datos.'
      );
    }

    // 3. Verificar que el pedido no existe ya
    const pedidoExistente = await em.findOne(Pedido, { idPedido: data.idPedido });
    if (pedidoExistente) {
      throw AppError.conflict(
        `El pedido ${data.idPedido} ya existe en el sistema. No se puede inicializar nuevamente.`
      );
    }

    // 3. Verificar que el fletero existe
    const fletero = await em.findOne(Fletero, { idFletero: data.idFleteroCarga });
    if (!fletero) {
      throw AppError.internal(
        `Fletero con ID ${data.idFleteroCarga} no encontrado. Debe existir en la base de datos.`
      );
    }

    // 4. Crear el pedido primero
    const pedido = em.create(Pedido, {
      idPedido: data.idPedido,
      fechaHora: new Date(data.fechaHora),
      fletero: fletero
    });

    // 5. Crear el movimiento inicial (sin validar reglas porque es automático)
    const movimiento = em.create(Movimiento, {
      fechaHora: new Date(),
      pedido: pedido,
      estadoInicial: estadoChess,
      estadoFinal: estadoPendiente,
      usuario: usuarioSistema
    });

    await em.persist([pedido, movimiento]).flush();

    return {
      fechaHora: movimiento.fechaHora,
      pedido: {
        idPedido: pedido.idPedido,
        fechaHora: pedido.fechaHora,
        fletero: {
          idFletero: pedido.fletero.idFletero,
          dsFletero: pedido.fletero.dsFletero,
          seguimiento: pedido.fletero.seguimiento
        }
      },
      estadoInicial: {
        idEstado: estadoChess.id,
        nombreEstado: estadoChess.nombreEstado
      },
      estadoFinal: {
        idEstado: estadoPendiente.id,
        nombreEstado: estadoPendiente.nombreEstado
      },
      usuario: {
        id: usuarioSistema.id,
        nombre: usuarioSistema.nombre
      },
      mensaje: 'Pedido inicializado desde CHESS correctamente'
    };
  }

}

