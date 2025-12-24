import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';

/**
 * Scheduler para sincronización automática de ventas CHESS
 * Se ejecuta cada 10 minutos entre las 6:00 AM y 10:00 PM
 */
export class ChessScheduler {
  private orm: MikroORM;
  private task: ScheduledTask | null = null;

  constructor(orm: MikroORM) {
    this.orm = orm;
  }

  /**
   * Iniciar el scheduler
   */
  start() {
    // Expresión cron: cada 10 minutos, de 6:00 AM a 10:00 PM
    // */10 6-22 * * * = cada 10 minutos, entre las 6 y las 22 horas
    this.task = cron.schedule('*/10 6-22 * * *', async () => {
      console.log('\n🔄 ========== CRON: Iniciando sincronización automática ==========');
      
      // Crear un fork del EntityManager para esta ejecución
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        await chessService.syncVentas();
      } catch (error: any) {
        console.error('❌ Error en sincronización automática:', error.message);
        console.error(error);
      } finally {
        // Limpiar el EntityManager después de la ejecución
        await em.clear();
      }
    });

    console.log('✅ Scheduler CHESS iniciado: cada 10 minutos (6:00 AM - 10:00 PM)');
  }

  /**
   * Detener el scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Scheduler CHESS detenido');
    }
  }

  /**
   * Verificar si el scheduler está activo
   */
  isRunning(): boolean {
    return this.task !== null;
  }
}

/**
 * Inicializar y exportar el scheduler
 */
export async function initChessScheduler(orm: MikroORM): Promise<ChessScheduler> {
  const scheduler = new ChessScheduler(orm);
  scheduler.start();
  return scheduler;
}
