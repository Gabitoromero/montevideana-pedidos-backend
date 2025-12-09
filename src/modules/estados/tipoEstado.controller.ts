import { fork } from '../../shared/db/orm.js';
import { TipoEstado } from './tipoEstado.entity.js';
import { CreateTipoEstadoDTO, UpdateTipoEstadoDTO } from './tipoEstado.schema.js';
import { AppError } from '../../shared/errors/AppError.js';

export class TipoEstadoController {

  async create(data: CreateTipoEstadoDTO) {
    const em = fork();

    // Verificar si ya existe un estado con ese nombre
    const existingByNombre = await em.findOne(TipoEstado, { nombreEstado: data.nombreEstado });
    if (existingByNombre) {
      throw AppError.conflict(`Ya existe un estado con el nombre "${data.nombreEstado}"`);
    }

    const tipoEstado = em.create(TipoEstado, { nombreEstado: data.nombreEstado });

    await em.persist(tipoEstado).flush();

    return {
      idEstado: tipoEstado.id,
      nombreEstado: tipoEstado.nombreEstado,
    };
  }

  async findAll() {
    const em = fork();
    const estados = await em.find(TipoEstado, {}, { orderBy: { id: 'ASC' } });

    return estados.map((e) => ({
      codEstado: e.id,
      nombreEstado: e.nombreEstado,
    }));
  }

  async findByCodigo(id: number) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { id });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${id} no encontrado`);
    }

    return {
      codEstado: estado.id,
      nombreEstado: estado.nombreEstado,
    };
  }

  async update(id: number, data: UpdateTipoEstadoDTO) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { id });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${id} no encontrado`);
    }

    // Verificar si el nuevo nombre ya existe en otro estado
    const existingByNombre = await em.findOne(TipoEstado, { 
      nombreEstado: data.nombreEstado,
      id: { $ne: id }
    });
    
    if (existingByNombre) {
      throw AppError.conflict(`Ya existe un estado con el nombre "${data.nombreEstado}"`);
    }

    estado.nombreEstado = data.nombreEstado;
    await em.flush();

    return {
      codEstado: estado.id,
      nombreEstado: estado.nombreEstado,
    };
  }

  async delete(id: number) {
    const em = fork();
    const estado = await em.findOne(TipoEstado, { id });

    if (!estado) {
      throw AppError.notFound(`Estado con código ${id} no encontrado`);
    }

    await em.remove(estado).flush();

    return { message: 'Estado eliminado exitosamente' };
  }
}
