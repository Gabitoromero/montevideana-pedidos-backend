import { Migration } from '@mikro-orm/migrations';

export class Migration20260716153008 extends Migration {

  override async up(): Promise<void> {
    this.addSql('create table `configuracion` (`id` int unsigned not null auto_increment primary key, `hora_consulta_preventa_manana` varchar(255) null, `last_triggered_date` varchar(255) null, `queries_remaining` int null) default character set utf8mb4 engine = InnoDB;');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `configuracion`;');
  }

}
