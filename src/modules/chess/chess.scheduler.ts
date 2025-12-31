import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';

/**
 * Scheduler para sincronización automática de ventas CHESS
 * Se ejecuta cada 10 minutos entre las 6:00 AM y 9:00 PM
 */
export class ChessScheduler {
  private orm: MikroORM;
  private task: ScheduledTask | null = null;
  private isRunningYet = false;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;

  constructor(orm: MikroORM) {
    this.orm = orm;
  }

  /**
   * Enviar alerta a Discord
   */
  private async sendDiscordAlert(error: Error): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️ DISCORD_WEBHOOK_URL no configurado en .env');
      return;
    }

    try {
      const message = {
        username: 'Alertas Sistema',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2099/2099190.png',
        embeds: [{
          title: '🚨 ALERTA: Fallos consecutivos en sincronización CHESS',
          description: `Se han detectado **${this.failureCount}** fallos consecutivos en la sincronización con CHESS.`,
          color: 15158332,
          fields: [
            {
              name: '❌ Error',
              value: `\`\`\`${error.message}\`\`\``,
              inline: false
            },
            {
              name: '📅 Fecha',
              value: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
              inline: true
            },
            {
              name: '🔢 Intentos fallidos',
              value: `${this.failureCount}/${this.MAX_FAILURES}`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Sistema de Pedidos - Montevideana'
          }
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        console.error('❌ Error al enviar alerta a Discord:', response.statusText);
      } else {
        console.log('✅ Alerta enviada a Discord exitosamente');
      }
    } catch (fetchError: any) {
      console.error('❌ Error al conectar con Discord:', fetchError.message);
    }
  }

  /**
   * Iniciar el scheduler
   */
  start() {
    // Expresión cron: cada 10 minutos, de 6:00 AM a 9:00 PM
    // */10 6-20 * * * = cada 10 minutos, entre las 6 y las 20 horas (última ejecución a las 8:50 PM)
    this.task = cron.schedule('*/10 6-20 * * *', async () => {
      if (this.isRunningYet) {
        console.log('⏭️ Sincronización anterior aún en progreso, omitiendo...');
        return;
      }

      this.isRunningYet = true;
      console.log('\n🔄 ========== CRON: Iniciando sincronización automática ==========');
      
      // Crear un fork del EntityManager para esta ejecución
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        await chessService.syncVentas();
        this.failureCount = 0; 
      } catch (error: any) {
        this.failureCount++;
        console.error(`❌ Error (${this.failureCount}/${this.MAX_FAILURES}):`, error);
        
        if (this.failureCount >= this.MAX_FAILURES) {
          console.error('🚨 ALERTA: Múltiples fallos consecutivos en sincronización CHESS');
          await this.sendDiscordAlert(error);
        }
      } finally {
        // Limpiar el EntityManager después de la ejecución
        await em.clear();
        this.isRunningYet = false;
      }
    });

    console.log('✅ Scheduler CHESS iniciado: cada 10 minutos (6:00 AM - 9:00 PM)');
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
  // isRunning(): boolean {
  //   return this.task !== null;
  // }
}

/**
 * Inicializar y exportar el scheduler
 */
export async function initChessScheduler(orm: MikroORM): Promise<ChessScheduler> {
  const scheduler = new ChessScheduler(orm);
  scheduler.start();
  return scheduler;
}
