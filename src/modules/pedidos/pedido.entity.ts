import { Entity, PrimaryKey, Property, OneToMany, Collection, ManyToOne } from '@mikro-orm/core';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { Fletero } from '../fleteros/fletero.entity.js';

@Entity({ tableName: 'pedidos' })
export class Pedido {
  @PrimaryKey({ type: 'datetime' })
  fechaHora!: Date;

  @PrimaryKey({ type: 'string', length: 15 })
  idPedido!: string;

  @ManyToOne(() => Fletero, { nullable: false })
  fletero!: Fletero;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.pedido)
  movimientos = new Collection<Movimiento>(this);
}