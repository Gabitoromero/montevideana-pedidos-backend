import { fork } from '../../shared/db/orm.js';
import { EstadoNecesario } from './estadoNecesario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { CreateEstadoNecesarioDTO } from './estadoNecesario.schema.js';
import { AppError } from '../../shared/errors/AppError.js';

export class EstadoNecesarioController {
  async create(data: CreateEstadoNecesarioDTO) {
    const em = fork();

    // Verificar que ambos estados existan
    const estado = await em.findOne(TipoEstado, { id: data.codEstado });
    if (!estado) {
      throw AppError.notFound(`Estado con código ${data.codEstado} no encontrado`);
    }

    const necesario = await em.findOne(TipoEstado, { id: data.codNecesario });
    if (!necesario) {
      throw AppError.notFound(`Estado necesario con código ${data.codNecesario} no encontrado`);
    }

  //   // Verificar que no exista ya esta regla
  //   const existente = await em.findOne(EstadoNecesario, {
  //     estado: data.codEstado,
  //     necesario: data.codNecesario
  //   });

  //   if (existente) {
  //     throw AppError.conflict(
  //       `Ya existe una regla que indica que para ir al estado ${data.codEstado} se necesita haber pasado por el estado ${data.codNecesario}`
  //     );
  //   }

  //   const estadoNecesario = em.create(EstadoNecesario, {
  //     codEstado: data.codEstado,
  //     codNecesario: data.codNecesario,
  //     estadoRef: estado,
  //     necesarioRef: necesario
  //   });

  //   await em.persistAndFlush(estadoNecesario);

  //   return {
  //     id: estadoNecesario.id,
  //     codEstado: estadoNecesario.codEstado,
  //     codNecesario: estadoNecesario.codNecesario,
  //     nombreEstado: estado.nombreEstado,
  //     nombreNecesario: necesario.nombreEstado,
  //   };
  // }

  // async findAll() {
  //   const em = fork();
  //   const reglas = await em.find(
  //     EstadoNecesario,
  //     {},
  //     { populate: ['estadoRef', 'necesarioRef'], orderBy: { codEstado: 'ASC' } }
  //   );

  //   return reglas.map((r) => ({
  //     id: r.id,
  //     codEstado: r.codEstado,
  //     codNecesario: r.codNecesario,
  //     nombreEstado: r.estadoRef.nombreEstado,
  //     nombreNecesario: r.necesarioRef.nombreEstado,
  //   }));
  // }

  // async findByCodEstado(codEstado: number) {
  //   const em = fork();
  //   const reglas = await em.find(
  //     EstadoNecesario,
  //     { codEstado },
  //     { populate: ['estadoRef', 'necesarioRef'] }
  //   );

  //   return reglas.map((r) => ({
  //     id: r.id,
  //     codEstado: r.codEstado,
  //     codNecesario: r.codNecesario,
  //     nombreEstado: r.estadoRef.nombreEstado,
  //     nombreNecesario: r.necesarioRef.nombreEstado,
  //   }));
  // }

  // async delete(id: number) {
  //   const em = fork();
  //   const regla = await em.findOne(EstadoNecesario, { id });

  //   if (!regla) {
  //     throw AppError.notFound(`Regla de estado necesario con ID ${id} no encontrada`);
  //   }

  //   await em.removeAndFlush(regla);

  //   return { message: 'Regla eliminada exitosamente' };
  // }

  // /**
  //  * Valida si una transición de estado es legal según las reglas definidas
  //  * @param nroPedido - Número de pedido
  //  * @param estadoFinal - Estado al que se quiere transicionar
  //  * @returns boolean - true si la transición es legal
  //  */
  // async validateTransition(nroPedido: string, estadoFinal: number): Promise<boolean> {
  //   const em = fork();

  //   // Buscar reglas necesarias para el estado final
  //   const reglasNecesarias = await em.find(EstadoNecesario, { codEstado: estadoFinal });

  //   if (reglasNecesarias.length === 0) {
  //     // No hay reglas, la transición es legal
  //     return true;
  //   }

  //   // Importar dinámicamente para evitar dependencia circular
  //   const { Movimiento } = await import('../movimientos/movimiento.entity.js');

  //   // Obtener todos los movimientos previos del pedido
  //   const movimientos = await em.find(
  //     Movimiento,
  //     { nroPedido },
  //     { orderBy: { fechaHora: 'ASC' } }
  //   );

  //   // Extraer todos los estados por los que ha pasado el pedido
  //   const estadosPrevios = new Set<number>();
  //   movimientos.forEach((m) => {
  //     estadosPrevios.add(m.estadoInicial);
  //     estadosPrevios.add(m.estadoFinal);
  //   });

  //   // Verificar que todos los estados necesarios hayan sido visitados
  //   for (const regla of reglasNecesarias) {
  //     if (!estadosPrevios.has(regla.codNecesario)) {
  //       return false;
  //     }
  //   }

    return true;
  }
}
