import { Entity, PrimaryKey, ManyToOne } from '@mikro-orm/core';
import { TipoEstado } from '../estados/tipoEstado.entity.js';

@Entity({ tableName: 'estados_necesarios' })
export class EstadoNecesario {
  @PrimaryKey({ type: 'number', autoincrement: true })
  id!: number;
  // "Para pasar a ESTE estado..."
  @ManyToOne(() => TipoEstado, { nullable: false })
  idEstado!: TipoEstado;

  // "...necesitas haber pasado por ESTE estado antes"
  @ManyToOne(() => TipoEstado, { nullable: false })
  idEstadoNecesario!: TipoEstado;
}
