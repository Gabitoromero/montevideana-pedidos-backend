import { Entity, Property, ManyToOne, Rel, Index } from '@mikro-orm/core';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { Pedido } from '../pedidos/pedido.entity.js';

@Entity({ tableName: 'movimientos' })
@Index({ properties: ['fechaHora'], name: 'idx_movimientos_fecha_hora' }) 
export class Movimiento {
  @Property({ type: 'datetime' })
  fechaHora!: Date;

  @ManyToOne(() => Pedido, { nullable: false, primary: true })
  pedido!: Rel<Pedido>;
  
  @ManyToOne(() => TipoEstado, { nullable: false, primary: true })
  estadoFinal!: Rel<TipoEstado>;

  @ManyToOne(() => TipoEstado, { nullable: false })
  estadoInicial!: Rel<TipoEstado>;

  @ManyToOne(() => Usuario, { nullable: false })
  usuario!: Rel<Usuario>;

  @Property({ type: 'text', nullable: true })
  motivoAnulacion?: string;
}