import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Pedido } from '../pedidos/pedido.entity.js';

@Entity({ tableName: 'fleteros' })
export class Fletero {
  @PrimaryKey({ type: 'number' })
  idFletero!: number;

  @Property({ nullable: false, type: 'string' })
  dsFletero!: string;

  @Property({ nullable: false, type: 'boolean', default: true })
  seguimiento: boolean = true;

  @OneToMany(() => Pedido, (pedido) => pedido.fletero)
  pedidos = new Collection<Pedido>(this);
}
