import { fork } from '../../shared/db/orm.js';
import { Regla } from './regla.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { CreateReglaDTO } from './regla.schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { Movimiento } from '../movimientos/movimiento.entity.js';

export class ReglaController {
  
  async create(data: CreateReglaDTO) {
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
    const existe = await em.findOne(Regla, {
      idEstado: data.idEstado,
      idEstadoNecesario: data.idEstadoNecesario
    });

    if (existe) {
      throw AppError.conflict(
        `Ya existe una regla que requiere el estado "${estadoNecesario.nombreEstado}" para "${estado.nombreEstado}"`
      );
    }

    const regla = em.create(Regla, {
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
    const reglas = await em.find(Regla, {}, {
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

    const reglas = await em.find(Regla, 
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
    const regla = await em.findOne(Regla, { id });

    if (!regla) {
      throw AppError.notFound(`Regla con ID ${id} no encontrada`);
    }

    await em.remove(regla).flush();
    return { message: 'Regla eliminada exitosamente' };
  }

  // Método para validar transición (usado en movimientos)
  // Valida que el pedido haya pasado por los estados necesarios según las reglas
  async validarTransicion(idPedido: string, idEstadoInicial: number, idEstadoFinal: number): Promise<boolean> {
    const em = fork();

    // Buscar si existe una regla para el estado final
    const estadoFinal = await em.findOne(TipoEstado, { id: idEstadoFinal });
    if (!estadoFinal) {
      throw AppError.notFound(`Estado final ${idEstadoFinal} no encontrado`);
    }

    const reglasEstadoFinal = await em.find(Regla, 
      { idEstado: estadoFinal.id },
      { populate: ['idEstadoNecesario'] }
    );

    // Si no hay reglas para este estado, la transición es libre
    if (reglasEstadoFinal.length === 0) {
      return true;
    }

    // Obtener todos los movimientos anteriores del pedido
    // Nota: pedido es una relación ManyToOne, se busca por la clave foránea
    const movimientosAnteriores = await em.find(Movimiento, 
      { pedido: { idPedido: idPedido } },
      { populate: ['estadoFinal'] }
    );

    // Construir conjunto de estados por los que ha pasado el pedido
    // Incluye: el estado inicial del nuevo movimiento + todos los estados finales anteriores
    const estadosPorLosQuePaso = new Set<number>();
    estadosPorLosQuePaso.add(idEstadoInicial); // Estado actual del pedido
    
    movimientosAnteriores.forEach(mov => {
      estadosPorLosQuePaso.add(mov.estadoFinal.id);
    });

    // Verificar que todos los estados necesarios están en el historial
    const estadosNecesariosFaltantes = reglasEstadoFinal.filter(
      regla => !estadosPorLosQuePaso.has(regla.idEstadoNecesario.id)
    );

    if (estadosNecesariosFaltantes.length > 0) {
      const nombresFaltantes = estadosNecesariosFaltantes
        .map(r => r.idEstadoNecesario.nombreEstado)
        .join(', ');
      
      throw AppError.badRequest(
        `Para estar en el estado "${estadoFinal.nombreEstado}", el pedido debe haber pasado por: ${nombresFaltantes}`
      );
    }

    return true;
  }
}
