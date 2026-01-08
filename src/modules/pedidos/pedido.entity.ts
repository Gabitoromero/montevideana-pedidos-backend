import { Entity, PrimaryKey, Property, OneToMany, Collection, ManyToOne, Index } from '@mikro-orm/core';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { Fletero } from '../fleteros/fletero.entity.js';

@Entity({ tableName: 'pedidos' })
@Index({ properties: ['fechaHora'] })
@Index({ properties: ['cobrado'] })
export class Pedido {
  @PrimaryKey({ type: 'string', length: 8 })
  idPedido!: string;

  @Property({ type: 'datetime' })
  fechaHora!: Date;

  @Property({ type: 'boolean', default: false })
  cobrado!: boolean;

  @Property({ type: 'integer', nullable: true })
  calificacion?: number;

  @ManyToOne(() => Fletero, { nullable: false })
  fletero!: Fletero;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.pedido)
  movimientos = new Collection<Movimiento>(this);
}