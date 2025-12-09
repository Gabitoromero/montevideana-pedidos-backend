import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';

@Entity({ tableName: 'movimientos' })
export class Movimiento {
  @PrimaryKey( {type: 'number'} )
  id!: number;

  @Property({ nullable: false, unique: false, type: 'Date' })
  fechaHora: Date = new Date();

  @Property({ nullable: false, unique: false, type: 'string' })
  nroPedido!: string;

  @ManyToOne(() => TipoEstado, { nullable: false })
  estadoInicial!: Rel<TipoEstado>;

  @ManyToOne(() => TipoEstado, { nullable: false })
  estadoFinal!: Rel<TipoEstado>;

  @ManyToOne(() => Usuario, { nullable: false })
  usuario!: Rel<Usuario>;

  // @Property({ onCreate: () => new Date() })
  // createdAt: Date = new Date();
}
