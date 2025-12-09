import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { TipoEstado } from '../estados/tipoEstado.entity.js';

@Entity({ tableName: 'estados_necesarios' })
export class EstadoNecesario {
  @PrimaryKey( {type: 'number'} )
  id!: number;

  @ManyToOne(() => TipoEstado)
  estado!: TipoEstado;

  @ManyToOne(() => TipoEstado)
  necesario!: TipoEstado;

  // @Property({ onCreate: () => new Date() })
  // createdAt: Date = new Date();

  // @Property({ onUpdate: () => new Date() })
  // updatedAt: Date = new Date();
}
