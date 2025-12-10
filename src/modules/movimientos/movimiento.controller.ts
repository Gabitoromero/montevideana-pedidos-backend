import { fork } from '../../shared/db/orm.js';
import { Movimiento } from './movimiento.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { ReglaController } from '../reglas/regla.controller.js';
import { CreateMovimientoDTO, MovimientoQueryDTO } from './movimiento.schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { DateUtil } from '../../shared/utils/date.js';

export class MovimientoController {
  private reglaController = new ReglaController();

  /*
  async create(data: CreateMovimientoDTO) {
    const em = fork();

    // 1. Validar que el usuario existe
    const usuario = await em.findOne(Usuario, { id: data.usuarioId });
    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${data.usuarioId} no encontrado`);
    }

    // 2. Validar que ambos estados existen
    const estadoInicial = await em.findOne(TipoEstado, { codEstado: data.estadoInicial });
    if (!estadoInicial) {
      throw AppError.notFound(`Estado inicial con código ${data.estadoInicial} no encontrado`);
    }

    const estadoFinal = await em.findOne(TipoEstado, { codEstado: data.estadoFinal });
    if (!estadoFinal) {
      throw AppError.notFound(`Estado final con código ${data.estadoFinal} no encontrado`);
    }

    // 3. Validar que la transición es legal según las reglas de EstadoNecesario
    const esTransicionLegal = await this.estadoNecesarioController.validateTransition(
      data.nroPedido,
      data.estadoFinal
    );

    if (!esTransicionLegal) {
      throw AppError.badRequest(
        `Transición ilegal: El pedido ${data.nroPedido} no puede pasar al estado "${estadoFinal.nombreEstado}" porque no ha pasado por los estados necesarios previos`
      );
    }

    // 4. Crear el movimiento
    const movimiento = em.create(Movimiento, {
      fechaHora: DateUtil.now(),
      nroPedido: data.nroPedido,
      estadoInicial: data.estadoInicial,
      estadoFinal: data.estadoFinal,
      estadoInicialRef: estadoInicial,
      estadoFinalRef: estadoFinal,
      usuario,
    });

    await em.persistAndFlush(movimiento);

    return {
      id: movimiento.id,
      fechaHora: movimiento.fechaHora,
      nroPedido: movimiento.nroPedido,
      estadoInicial: movimiento.estadoInicial,
      estadoFinal: movimiento.estadoFinal,
      nombreEstadoInicial: estadoInicial.nombreEstado,
      nombreEstadoFinal: estadoFinal.nombreEstado,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        sector: usuario.sector,
      },
    };
  }
    */

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
        populate: ['usuario', 'estadoInicial', 'estadoFinal'],
        orderBy: { fechaHora: 'DESC' },
      }
    );

    return movimientos.map((m) => ({
      id: m.id,
      fechaHora: m.fechaHora,
      nroPedido: m.nroPedido,
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

  async findById(id: number) {
    const em = fork();
    const movimiento = await em.findOne(
      Movimiento,
      { id },
      { populate: ['usuario', 'estadoInicial', 'estadoFinal'] }
    );

    if (!movimiento) {
      throw AppError.notFound(`Movimiento con ID ${id} no encontrado`);
    }

    return {
      id: movimiento.id,
      fechaHora: movimiento.fechaHora,
      nroPedido: movimiento.nroPedido,
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

  async findByNroPedido(nroPedido: string) {
    const em = fork();
    const movimientos = await em.find(
      Movimiento,
      { nroPedido },
      {
        populate: ['usuario', 'estadoInicial', 'estadoFinal'],
        orderBy: { fechaHora: 'ASC' },
      }
    );

    return movimientos.map((m) => ({
      id: m.id,
      fechaHora: m.fechaHora,
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

  async getEstadoActual(nroPedido: string) {
    const em = fork();
    const ultimoMovimiento = await em.findOne(
      Movimiento,
      { nroPedido },
      {
        populate: ['estadoFinal'],
        orderBy: { fechaHora: 'DESC' },
      }
    );

    if (!ultimoMovimiento) {
      throw AppError.notFound(`No se encontraron movimientos para el pedido ${nroPedido}`);
    }

    return {
      nroPedido,
      estadoActual: ultimoMovimiento.estadoFinal,
      nombreEstadoActual: ultimoMovimiento.estadoFinal.nombreEstado,
      fechaUltimoMovimiento: ultimoMovimiento.fechaHora,
    };
  }
}
