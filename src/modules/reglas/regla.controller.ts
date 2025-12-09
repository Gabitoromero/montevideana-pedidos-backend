import { fork } from '../../shared/db/orm.js';
import { EstadoNecesario } from './regla.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { CreateEstadoNecesarioDTO } from './regla.schema.js';
import { AppError } from '../../shared/errors/AppError.js';

export class EstadoNecesarioController {
  
  async create(data: CreateEstadoNecesarioDTO) {
    const em = fork();

    // Verificar que ambos estados existen
    const estado = await em.findOne(TipoEstado, { id: data.idEstado });
    if (!estado) {
      throw AppError.notFound(`Estado ${data.idEstado} no encontrado`);
    }

    const estadoNecesario = await em.findOne(TipoEstado, { id: data.idEstadoNecesario });
    if (!estadoNecesario) {
      throw AppError.notFound(`Estado necesario ${data.idEstadoNecesario} no encontrado`);
    }

    // Verificar que la regla no existe ya
    const existe = await em.findOne(EstadoNecesario, {
      idEstado: data.idEstado,
      idEstadoNecesario: data.idEstadoNecesario
    });

    if (existe) {
      throw AppError.conflict(
        `Ya existe una regla que requiere el estado "${estadoNecesario.nombreEstado}" para "${estado.nombreEstado}"`
      );
    }

    const regla = em.create(EstadoNecesario, {
      idEstado: data.idEstado,
      idEstadoNecesario: data.idEstadoNecesario
    });

    await em.persist(regla).flush();

    return {
      id: regla.id,
      estado: {
        idEstado: estado.id,
        nombreEstado: estado.nombreEstado
      },
      estadoNecesario: {
        idEstado: estadoNecesario.id,
        nombreEstado: estadoNecesario.nombreEstado
      }
    };
  }

  async findAll() {
    const em = fork();
    const reglas = await em.find(EstadoNecesario, {}, {
      populate: ['idEstado', 'idEstadoNecesario']
    });

    return reglas.map(r => ({
      id: r.id,
      estado: {
        idEstado: r.idEstado.id,
        nombreEstado: r.idEstado.nombreEstado
      },
      estadoNecesario: {
        idEstado: r.idEstadoNecesario.id,
        nombreEstado: r.idEstadoNecesario.nombreEstado
      }
    }));
  }

  async findByEstado(idEstado: number) {
    const em = fork();
    
    const estado = await em.findOne(TipoEstado, { id: idEstado });
    if (!estado) {
      throw AppError.notFound(`Estado ${idEstado} no encontrado`);
    }

    const reglas = await em.find(EstadoNecesario, 
      { idEstado: estado.id },
      { populate: ['idEstadoNecesario'] }
    );

    return {
      estado: {
        idEstado: estado.id,
        nombreEstado: estado.nombreEstado
      },
      estadosNecesarios: reglas.map(r => ({
        idEstado: r.idEstadoNecesario.id,
        nombreEstado: r.idEstadoNecesario.nombreEstado
      }))
    };
  }

  async delete(id: number) {
    const em = fork();
    const regla = await em.findOne(EstadoNecesario, { id });

    if (!regla) {
      throw AppError.notFound(`Regla con ID ${id} no encontrada`);
    }

    await em.remove(regla).flush();
    return { message: 'Regla eliminada exitosamente' };
  }

  // Método para validar transición (usado en movimientos)
  async validarTransicion(idEstadoInicial: number, idEstadoFinal: number): Promise<boolean> {
    const em = fork();

    // Buscar si existe una regla para el estado final
    const estadoFinal = await em.findOne(TipoEstado, { id: idEstadoFinal });
    if (!estadoFinal) {
      throw AppError.notFound(`Estado final ${idEstadoFinal} no encontrado`);
    }

    const reglasEstadoFinal = await em.find(EstadoNecesario, 
      { idEstado: estadoFinal.id },
      { populate: ['idEstadoNecesario'] }
    );

    // Si no hay reglas para este estado, la transición es libre
    if (reglasEstadoFinal.length === 0) {
      return true;
    }

    // Verificar si el estado inicial está entre los necesarios
    const esValido = reglasEstadoFinal.some(
      regla => regla.idEstadoNecesario.id === idEstadoInicial
    );

    if (!esValido) {
      const nombresNecesarios = reglasEstadoFinal
        .map(r => r.idEstadoNecesario.nombreEstado)
        .join(', ');
      
      throw AppError.badRequest(
        `Para cambiar al estado "${estadoFinal.nombreEstado}" es necesario venir de: ${nombresNecesarios}`
      );
    }

    return true;
  }
}
