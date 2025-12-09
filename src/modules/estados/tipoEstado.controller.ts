import { fork } from '../../shared/db/orm.js';
import { TipoEstado } from './tipoEstado.entity.js';
import { CreateTipoEstadoDTO, UpdateTipoEstadoDTO } from './tipoEstado.schema.js';
import { AppError } from '../../shared/errors/AppError.js';

export class TipoEstadoController {
  async create(data: CreateTipoEstadoDTO) {
    const em = fork();

    // Verificar si ya existe un estado con ese código
    const existingByCodigo = await em.findOne(TipoEstado, { codEstado: data.codEstado });
    if (existingByCodigo) {
      throw AppError.conflict(`Ya existe un estado con el código ${data.codEstado}`);
    }

    // Verificar si ya existe un estado con ese nombre
    const existingByNombre = await em.findOne(TipoEstado, { nombreEstado: data.nombreEstado });
    if (existingByNombre) {
      throw AppError.conflict(`Ya existe un estado con el nombre "${data.nombreEstado}"`);
    }

    const tipoEstado = em.create(TipoEstado, {
      codEstado: data.codEstado,
      nombreEstado: data.nombreEstado,
    });

    await em.persistAndFlush(tipoEstado);

    return {
      codEstado: tipoEstado.codEstado,
      nombreEstado: tipoEstado.nombreEstado,
    };
  }

  async findAll() {
    const em = fork();
    const estados = await em.find(TipoEstado, {}, { orderBy: { codEstado: 'ASC' } });

    return estados.map((e) => ({
      codEstado: e.codEstado,
      nombreEstado: e.nombreEstado,
    }));
  }

  async findByCodigo(codEstado: number) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { codEstado });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${codEstado} no encontrado`);
    }

    return {
      codEstado: estado.codEstado,
      nombreEstado: estado.nombreEstado,
    };
  }

  async update(codEstado: number, data: UpdateTipoEstadoDTO) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { codEstado });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${codEstado} no encontrado`);
    }

    // Verificar si el nuevo nombre ya existe en otro estado
    const existingByNombre = await em.findOne(TipoEstado, { 
      nombreEstado: data.nombreEstado,
      codEstado: { $ne: codEstado }
    });
    
    if (existingByNombre) {
      throw AppError.conflict(`Ya existe un estado con el nombre "${data.nombreEstado}"`);
    }

    estado.nombreEstado = data.nombreEstado;
    await em.flush();

    return {
      codEstado: estado.codEstado,
      nombreEstado: estado.nombreEstado,
    };
  }

  async delete(codEstado: number) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { codEstado });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${codEstado} no encontrado`);
    }

    await em.removeAndFlush(estado);

    return { message: 'Estado eliminado exitosamente' };
  }
}
