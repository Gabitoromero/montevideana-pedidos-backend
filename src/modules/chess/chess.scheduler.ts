import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';

/**
 * Scheduler para sincronización automática de ventas CHESS
 * - Sincroniza día anterior a las 6:00 AM
 * - Sincroniza día actual cada 5 minutos entre las 6:00 AM y 11:00 PM
 */
export class ChessScheduler {
  private orm: MikroORM;
  private taskDiaActual: ScheduledTask | null = null;
  private taskDiaAnterior: ScheduledTask | null = null;
  private isRunningYet = false;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;

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
    // Cron 1: Sincronizar día anterior a las 6:00 AM
    this.taskDiaAnterior = cron.schedule('0 6 * * *', async () => {
      console.log('\n🌅 ========== CRON: Sincronizando pedidos del DÍA ANTERIOR ==========');
      
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        await chessService.syncVentas(ayer);
        console.log('✅ Sincronización del día anterior completada');
      } catch (error: any) {
        console.error('❌ Error en sincronización del día anterior:', error.message);
      } finally {
        await em.clear();
      }
    });

    // Cron 2: Sincronizar día actual cada 5 minutos (6 AM - 11 PM)
    // */5 6-23 * * * = cada 5 minutos, entre las 6 y las 23 horas
    this.taskDiaActual = cron.schedule('*/5 6-23 * * *', async () => {
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
        // Diferenciar tipos de error
        const errorType = this.classifyError(error);
        
        console.error(`❌ Error en sincronización (${errorType}):`, error.message);
        
        // Solo incrementar contador para errores de CHESS, no para errores transitorios
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
        // Limpiar el EntityManager después de la ejecución
        await em.clear();
        this.isRunningYet = false;
      }
    });

    console.log('✅ Scheduler CHESS iniciado:');
    console.log('   - Día anterior: 6:00 AM');
    console.log('   - Día actual: cada 5 minutos (6:00 AM - 11:00 PM)');
  }

  /**
   * Detener el scheduler
   */
  stop() {
    if (this.taskDiaActual) {
      this.taskDiaActual.stop();
    }
    if (this.taskDiaAnterior) {
      this.taskDiaAnterior.stop();
    }
    console.log('🛑 Scheduler CHESS detenido');
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
