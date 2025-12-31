import { Entity, PrimaryKey, ManyToOne, Rel, Index } from '@mikro-orm/core';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';

@Entity({ tableName: 'movimientos' })
@Index({ properties: ['fechaHora'] })
export class Movimiento {
  @PrimaryKey({ type: 'datetime' })
  fechaHora!: Date;

  @ManyToOne(() => TipoEstado, { nullable: false })
  estadoInicial!: Rel<TipoEstado>;

  @ManyToOne(() => TipoEstado, { nullable: false })
  estadoFinal!: Rel<TipoEstado>;

  @ManyToOne(() => Usuario, { nullable: false })
  usuario!: Rel<Usuario>;

  @ManyToOne(() => Pedido, { nullable: false, primary: true })
  pedido!: Rel<Pedido>;
}
