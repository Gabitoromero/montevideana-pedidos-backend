import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { initORM } from '../../shared/db/orm.js';

/**
 * Scheduler para sincronización automática de ventas CHESS
 * Se ejecuta cada 10 minutos entre las 6:00 AM y 10:00 PM
 */
export class ChessScheduler {
  private chessService: ChessService;
  private task: ScheduledTask | null = null;

  constructor(chessService: ChessService) {
    this.chessService = chessService;
  }

  /**
   * Iniciar el scheduler
   */
  start() {
    // Expresión cron: cada 10 minutos, de 6:00 AM a 10:00 PM
    // */10 6-22 * * * = cada 10 minutos, entre las 6 y las 22 horas
    this.task = cron.schedule('*/10 6-22 * * *', async () => {
      console.log('\n🔄 ========== CRON: Iniciando sincronización automática ==========');
      try {
        await this.chessService.syncVentas();
      } catch (error: any) {
        console.error('❌ Error en sincronización automática:', error.message);
        console.error(error);
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
export async function initChessScheduler(): Promise<ChessScheduler> {
  const orm = await initORM();
  const chessService = new ChessService(orm.em);
  const scheduler = new ChessScheduler(chessService);
  scheduler.start();
  return scheduler;
}
