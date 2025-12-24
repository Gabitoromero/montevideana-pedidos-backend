import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Movimiento } from '../movimientos/movimiento.entity.js';

@Entity({ tableName: 'pedidos' })
export class Pedido {
  @PrimaryKey({ type: 'datetime' })
  fechaHora!: Date;

  @PrimaryKey({ type: 'number' })
  idPedido!: number;

  @Property({ nullable: false, type: 'string' })
  dsFletero!: string;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.pedido)
  movimientos = new Collection<Movimiento>(this);
}