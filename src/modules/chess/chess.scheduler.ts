import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';

/**
 * Scheduler para sincronización automática con CHESS.
 * Un único cron job que ejecuta syncConChess() cada 1 minuto, 24/7.
 * Dentro de syncConChess se ejecutan los 2 subprocesos:
 *   1. Detección de nuevos pedidos
 *   2. Seguimiento de pendientes de liquidación
 */
export class ChessScheduler {
  private orm: MikroORM;
  private taskSync: ScheduledTask | null = null;
  private isRunningYet = false;
  private failureCount = 0;
  private readonly MAX_FAILURES = 10;
  private readonly DISCORD_USER_ID = '368473961190916113';

  constructor(orm: MikroORM) {
    this.orm = orm;
  }

  /**
   * Clasificar tipo de error para manejo específico
   */
  private classifyError(error: any): 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'CHESS_ERROR' | 'UNKNOWN' {
    // Errores de red/timeout
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return 'NETWORK_ERROR';
    }
    
    // Errores de base de datos
    if (error.name === 'DatabaseError' || error.message?.includes('database') || error.message?.includes('SQL')) {
      return 'DATABASE_ERROR';
    }
    
    // Errores específicos de CHESS
    if (error.message?.includes('CHESS') || error.response?.status) {
      return 'CHESS_ERROR';
    }
    
    return 'UNKNOWN';
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
        content: `<@${this.DISCORD_USER_ID}>`,
        username: 'Montevideana Scheduler',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2099/2099190.png',
        embeds: [{
          title: '🚨 ERROR: Fallos en Sincronización CHESS',
          description: `Se detectaron **${this.failureCount} fallos consecutivos** al sincronizar con CHESS.\n\n**Acción requerida:** Revisar logs del servidor y conexión con CHESS.`,
          color: 15158332,
          fields: [
            {
              name: '❌ Mensaje de Error',
              value: `\`\`\`${error.message.substring(0, 1000)}\`\`\``,
              inline: false
            },
            {
              name: '📅 Fecha y Hora',
              value: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
              inline: true
            },
            {
              name: '🔢 Intentos Fallidos',
              value: `${this.failureCount} de ${this.MAX_FAILURES}`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Sistema de Pedidos Montevideana'
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
   * Iniciar el scheduler — un único cron job cada 1 minuto, 24/7
   */
  start() {
    this.taskSync = cron.schedule('*/1 * * * *', async () => {
      if (this.isRunningYet) {
        console.log('⏭️ Sincronización anterior aún en progreso, omitiendo...');
        return;
      }

      this.isRunningYet = true;
      console.log(`\n🔄 ========== CRON: Sincronización CHESS ==========`);
      
      // Crear un fork del EntityManager para esta ejecución
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        await chessService.syncConChess();
        this.failureCount = 0; 
      } catch (error: any) {
        const errorType = this.classifyError(error);
        
        console.error(`❌ Error en sincronización (${errorType}):`, error.message);
        
        if (errorType === 'CHESS_ERROR' || errorType === 'UNKNOWN') {
          this.failureCount++;
          
          if (this.failureCount >= this.MAX_FAILURES) {
            console.error('🚨 ALERTA: Múltiples fallos consecutivos en sincronización CHESS');
            await this.sendDiscordAlert(error);
          }
        } else if (errorType === 'DATABASE_ERROR') {
          console.error('🚨 ERROR CRÍTICO: Problema con la base de datos. Deteniendo scheduler.');
          this.stop();
        } else {
          // Errores de red no incrementan el contador
          console.log('⏭️  Error transitorio de red, se reintentará en el próximo ciclo');
        }
      } finally {
        await em.clear();
        this.isRunningYet = false;
      }
    }, {
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('✅ Scheduler CHESS iniciado:');
    console.log('   - Sincronización: cada 1 minuto, 24/7');
    console.log('   - Subproceso 1: Detección de nuevos pedidos');
    console.log('   - Subproceso 2: Seguimiento de pendientes de liquidación');
  }

  /**
   * Detener el scheduler
   */
  stop() {
    if (this.taskSync) {
      this.taskSync.stop();
    }
    console.log('🛑 Scheduler CHESS detenido');
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
