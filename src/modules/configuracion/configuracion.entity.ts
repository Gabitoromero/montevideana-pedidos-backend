import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'configuracion' })
export class Configuracion {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ nullable: true, type: 'string' })
  horaConsultaPreventaManana!: string;

  @Property({ nullable: true, type: 'string' })
  lastTriggeredDate!: string;

  @Property({ nullable: true, type: 'number' })
  queriesRemaining!: number;
}
