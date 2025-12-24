import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Movimiento } from '../movimientos/movimiento.entity.js';

@Entity({ tableName: 'usuarios' })
export class Usuario {
  @PrimaryKey({type: 'number'})
  id!: number;

  @Property({ nullable: false, unique: true, type: 'string' })
  username!: string;

  @Property({ nullable: false, unique: false, type: 'string' })
  nombre!: string;

  @Property({ nullable: false, unique: false, type: 'string' })
  apellido!: string;

  @Property({ nullable: false, unique: false, type: 'string' })
  sector!: string;

  @Property({ nullable: false, unique: false, type: 'string' })
  passwordHash!: string;

  @Property({ nullable: false, unique: false, type: 'bool' })
  activo!: boolean;

  @OneToMany(() => Movimiento, (movimiento) => movimiento.usuario)
  movimientos = new Collection<Movimiento>(this);



}
