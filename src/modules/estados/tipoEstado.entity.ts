import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Movimiento } from '../movimientos/movimiento.entity.js';

@Entity({ tableName: 'tipos_estado' })
export class TipoEstado {
  @PrimaryKey({type: 'number'})
  id!: number;

  @Property({ nullable: false, unique: true, type: 'string' })
  nombreEstado!: string;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.estadoInicial)
  movimientosInicio = new Collection<Movimiento>(this);

  @OneToMany(() => Movimiento, (movimiento) => movimiento.estadoFinal)
  movimientosFin = new Collection<Movimiento>(this);

  // @Property({ onCreate: () => new Date() })
  // createdAt: Date = new Date();

  // @Property({ onUpdate: () => new Date() })
  // updatedAt: Date = new Date();
}
