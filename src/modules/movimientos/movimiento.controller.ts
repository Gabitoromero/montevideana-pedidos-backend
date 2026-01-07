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
import { HashUtil } from '../../shared/utils/hash.js';
import { StringUtil } from '../../shared/utils/string.js';
import { 
  ESTADO_IDS, 
  SECTORES,
  esEstadoTesoreria, 
  puedeRealizarMovimientoCamara, 
  puedeRealizarMovimientoExpedicion 
} from '../../shared/constants/estados.js';

export class MovimientoController {
  private reglaController = new ReglaController();

  
  async create(data: CreateMovimientoDTO) { 
    const em = fork();

    // 1. Buscar TODOS los usuarios activos de sectores CAMARA y EXPEDICION
    const usuariosOperativos = await em.find(Usuario, { 
      sector: { $in: [SECTORES.CAMARA, SECTORES.EXPEDICION] },
      activo: true 
    });

    if (usuariosOperativos.length === 0) {
      throw AppError.badRequest('No hay usuarios activos en los sectores operativos');
    }

    // 2. Buscar el usuario cuyo password hasheado coincida con el PIN
    let usuario: Usuario | null = null;
    for (const u of usuariosOperativos) {
      const pinValido = await HashUtil.compare(data.pin, u.passwordHash);
      if (pinValido) {
        usuario = u;
        break;
      }
    }

    // 3. Si no se encontró usuario con ese PIN
    if (!usuario) {
      throw AppError.badRequest('Usuario no perteneciente a los sectores operativos');
    }

    // 4. Validar que el usuario está activo (redundante pero por seguridad)
    if (!usuario.activo) {
      throw AppError.badRequest('Lo siento, el usuario está inactivo. No se puede realizar el movimiento');
    }

    // 5. Validar permisos según sector y estado final
    // CAMARA: puede crear movimientos con estado final EN_PREPARACION (3) o PREPARADO (4)
    if (usuario.sector === SECTORES.CAMARA) {
      if (data.estadoFinal !== ESTADO_IDS.EN_PREPARACION && 
          data.estadoFinal !== ESTADO_IDS.PREPARADO) {
        throw AppError.badRequest(
          `El usuario del sector CAMARA solo puede realizar movimientos con estado final EN PREPARACIÓN o PREPARADO`
        );
      }
    }

    // EXPEDICION: puede crear movimientos con estado final TESORERIA (5) o ENTREGADO (6)
    if (usuario.sector === SECTORES.EXPEDICION) {
      if (data.estadoFinal !== ESTADO_IDS.TESORERIA && 
          data.estadoFinal !== ESTADO_IDS.ENTREGADO) {
        throw AppError.badRequest(
          `El usuario del sector EXPEDICION solo puede realizar movimientos con estado final TESORERIA o ENTREGADO`
        );
      }
    }

    // 5. Validar que el pedido existe
    const pedido = await em.findOne(Pedido, { idPedido: data.idPedido }, { populate: ['fletero'] });
    if (!pedido) {
      const sanitizedId = StringUtil.sanitizePedidoId(data.idPedido);
      throw AppError.notFound(`Pedido con ID ${sanitizedId} no encontrado`);
    }

    // 6. Validar que ambos estados existen
    const estadoInicial = await em.findOne(TipoEstado, { id: data.estadoInicial });
    if (!estadoInicial) {
      throw AppError.notFound(`Estado inicial con código ${data.estadoInicial} no encontrado`);
    }

    const estadoFinal = await em.findOne(TipoEstado, { id: data.estadoFinal });
    if (!estadoFinal) {
      throw AppError.notFound(`Estado final con código ${data.estadoFinal} no encontrado`);
    }

    // 7. Validar que la transición es legal según las reglas de EstadoNecesario
    const esTransicionLegal = await this.reglaController.validarTransicion(
      data.idPedido,
      data.estadoInicial,
      data.estadoFinal
    );

    if (!esTransicionLegal) {
      const sanitizedId = StringUtil.sanitizePedidoId(data.idPedido);
      throw AppError.badRequest(
        `Transición ilegal: El pedido ${sanitizedId} no puede pasar al estado "${estadoFinal.nombreEstado}" porque no ha pasado por los estados necesarios previos`
      );
    }

    // 8. Si el estado final es "Pagado" (id: 5), marcar el pedido como cobrado
    // 9. Crear el movimiento
    // Usar transacción para garantizar atomicidad
    const movimiento = await em.transactional(async (transactionalEm) => {
      if (esEstadoTesoreria(data.estadoFinal)) {
        pedido.cobrado = true;
      }

      const nuevoMovimiento = transactionalEm.create(Movimiento, {
        fechaHora: new Date(),
        pedido: pedido,
        estadoInicial: estadoInicial,
        estadoFinal: estadoFinal,
        usuario: usuario
      });

      await transactionalEm.persist(nuevoMovimiento).flush();
      
      return nuevoMovimiento;
    });

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
    

  async findAll(filters?: MovimientoQueryDTO, page: number = 1, limit: number = 50) {
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

    const [movimientos, total] = await em.findAndCount(
      Movimiento,
      where,
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido', 'pedido.fletero'],
        orderBy: { fechaHora: 'DESC' },
        limit,
        offset: (page - 1) * limit
      }
    );

    if (total === 0) {
      throw AppError.notFound(`No se encontraron movimientos que coincidan con los filtros proporcionados`);
    }

    return {
      data: movimientos.map((m) => ({
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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
   * Estado 1 (CHESS) → Estado 2 (Pendiente)
   */
  async inicializarDesdeChess(data: { idPedido: string; fechaHora: string; idFleteroCarga: number }) {
    const em = fork();
    const USUARIO_SISTEMA_ID = 1; // ID del usuario "Sistema"

    // 1. Verificar que el usuario Sistema existe
    const usuarioSistema = await em.findOne(Usuario, { id: USUARIO_SISTEMA_ID });
    if (!usuarioSistema) {
      throw AppError.internal(
        'Usuario Sistema no encontrado. Debe existir un usuario con ID 1 para inicializar pedidos desde CHESS.'
      );
    }

    // 2. Verificar que los estados existen
    const estadoChess = await em.findOne(TipoEstado, { id: ESTADO_IDS.CHESS });
    if (!estadoChess) {
      throw AppError.internal(
        'Estado CHESS (1) no encontrado. Debe existir en la base de datos.'
      );
    }

    const estadoPendiente = await em.findOne(TipoEstado, { id: ESTADO_IDS.PENDIENTE });
    if (!estadoPendiente) {
      throw AppError.internal(
        'Estado PENDIENTE (2) no encontrado. Debe existir en la base de datos.'
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
      fletero: fletero,
      cobrado: false,
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

  /**
   * Obtiene todos los movimientos de un pedido específico
   * Ordenados por fecha más reciente primero
   */
  async findMovimientosByPedido(idPedido: string) {
    const em = fork();
    
    const pedido = await em.findOne(Pedido, { idPedido });
    if (!pedido) {
      throw AppError.notFound(`Pedido con ID ${idPedido} no encontrado`);
    }

    const movimientos = await em.find(
      Movimiento,
      { pedido },
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido'],
        orderBy: { fechaHora: 'DESC' },
      }
    );

    if (movimientos.length === 0) {
      throw AppError.notFound(`No se encontraron movimientos para el pedido ${idPedido}`);
    }

    return movimientos.map((m) => ({
      fechaHora: m.fechaHora,
      idPedido: m.pedido.idPedido,
      estadoInicial: m.estadoInicial.nombreEstado,
      estadoFinal: m.estadoFinal.nombreEstado,
      usuario: {
        nombre: m.usuario.nombre,
        apellido: m.usuario.apellido,
      },
    }));
  }

  /**
   * Obtiene movimientos realizados por un usuario en un rango de fechas
   * Con paginación de 50 registros por página
   */
  async findMovimientosByUsuario(
    idUsuario: number,
    fechaInicio: string,
    fechaFin?: string,
    page: number = 1
  ) {
    const em = fork();
    const limit = 50;

    // Verificar que el usuario existe
    const usuario = await em.findOne(Usuario, { id: idUsuario });
    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${idUsuario} no encontrado`);
    }

    // Parsear fechas
    const fechaInicioDate = new Date(fechaInicio + 'T00:00:00');
    const fechaFinDate = fechaFin 
      ? new Date(fechaFin + 'T23:59:59.999')
      : new Date(fechaInicio + 'T23:59:59.999');

    // Validar que las fechas sean válidas
    if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
      throw AppError.badRequest('Formato de fecha inválido');
    }

    const [movimientos, total] = await em.findAndCount(
      Movimiento,
      {
        usuario: { id: idUsuario },
        fechaHora: {
          $gte: fechaInicioDate,
          $lte: fechaFinDate,
        },
      },
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido'],
        orderBy: { fechaHora: 'DESC' },
        limit,
        offset: (page - 1) * limit,
      }
    );

    if (total === 0) {
      throw AppError.notFound(
        `No se encontraron movimientos para el usuario ${usuario.nombre} ${usuario.apellido} en el rango de fechas especificado`
      );
    }

    return {
      data: movimientos.map((m) => ({
        fechaHora: m.fechaHora,
        idPedido: m.pedido.idPedido,
        estadoInicial: m.estadoInicial.nombreEstado,
        estadoFinal: m.estadoFinal.nombreEstado,
        usuario: {
          nombre: m.usuario.nombre,
          apellido: m.usuario.apellido,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene movimientos por estado final en un rango de fechas
   * Con paginación de 50 registros por página
   */
  async findMovimientosByEstado(
    estado: string,
    fechaInicio: string,
    fechaFin?: string,
    page: number = 1
  ) {
    const em = fork();
    const limit = 50;

    // Mapear nombre de estado a ID
    const estadoMap: Record<string, number> = {
      'PENDIENTE': ESTADO_IDS.PENDIENTE,
      'EN PREPARACION': ESTADO_IDS.EN_PREPARACION,
      'PREPARADO': ESTADO_IDS.PREPARADO,
      'TESORERIA': ESTADO_IDS.TESORERIA,
      'ENTREGADO': ESTADO_IDS.ENTREGADO,
    };

    const estadoId = estadoMap[estado];
    if (!estadoId) {
      throw AppError.badRequest(`Estado ${estado} no es válido`);
    }

    // Verificar que el estado existe
    const estadoEntity = await em.findOne(TipoEstado, { id: estadoId });
    if (!estadoEntity) {
      throw AppError.notFound(`Estado ${estado} no encontrado en la base de datos`);
    }

    // Parsear fechas
    const fechaInicioDate = new Date(fechaInicio + 'T00:00:00');
    const fechaFinDate = fechaFin 
      ? new Date(fechaFin + 'T23:59:59.999')
      : new Date(fechaInicio + 'T23:59:59.999');

    // Validar que las fechas sean válidas
    if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
      throw AppError.badRequest('Formato de fecha inválido');
    }

    const [movimientos, total] = await em.findAndCount(
      Movimiento,
      {
        estadoFinal: { id: estadoId },
        fechaHora: {
          $gte: fechaInicioDate,
          $lte: fechaFinDate,
        },
      },
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal', 'pedido'],
        orderBy: { fechaHora: 'DESC' },
        limit,
        offset: (page - 1) * limit,
      }
    );

    if (total === 0) {
      throw AppError.notFound(
        `No se encontraron movimientos con estado final ${estado} en el rango de fechas especificado`
      );
    }

    return {
      data: movimientos.map((m) => ({
        fechaHora: m.fechaHora,
        idPedido: m.pedido.idPedido,
        estadoInicial: m.estadoInicial.nombreEstado,
        estadoFinal: m.estadoFinal.nombreEstado,
        usuario: {
          nombre: m.usuario.nombre,
          apellido: m.usuario.apellido,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}

