import cron, { ScheduledTask } from 'node-cron';
import { WahaService } from './waha.service.js';
import { sendDiscordAlert } from '../../shared/utils/discord.js';

/**
 * Scheduler para monitorear la salud de la sesión de WhatsApp (WAHA).
 * Ejecuta un health check cada 10 minutos.
 * Si la sesión no está en estado 'WORKING', envía una alerta a Discord.
 */
export class WahaScheduler {
  private taskHealth: ScheduledTask | null = null;
  private wahaService: WahaService;
  private lastAlertedStatus: string | null = null;

  constructor() {
    this.wahaService = new WahaService();
  }

  /**
   * Inicia el scheduler de monitoreo de WAHA.
   */
  start() {
    // Configurado cada 10 minutos
    this.taskHealth = cron.schedule('*/10 * * * *', async () => {
      console.log('🔄 [WAHA Scheduler] Ejecutando health check de sesión...');
      
      try {
        const status = await this.wahaService.getSessionStatus();
        
        if (status === 'WORKING') {
          // Si volvió a la normalidad después de un error, avisamos o reseteamos
          if (this.lastAlertedStatus && this.lastAlertedStatus !== 'WORKING') {
            console.log('✅ [WAHA Scheduler] La sesión volvió a estado WORKING');
            this.lastAlertedStatus = 'WORKING';
            const mensaje = `La sesión de WhatsApp volvió a estado WORKING`;
            await sendDiscordAlert(mensaje, 'INFO');
            await this.wahaService.notificarDeveloper(mensaje);
          }
          return;
        }

        // Si el estado no es WORKING y es distinto al último que avisamos (para no spamear)
        if (status !== this.lastAlertedStatus) {
            console.warn(`🚨 [WAHA Scheduler] Sesión en estado anómalo: ${status}`);
            
            const mensaje = `La sesión de WhatsApp no está operativa.\n` +
                          `Estado actual: **${status}**\n\n` +
                          `Acción sugerida: Revisar el contenedor WAHA y reescanear el código QR si es necesario.`;
            
            await sendDiscordAlert(mensaje, 'CRITICO');
            this.lastAlertedStatus = status;
        }

      } catch (error: any) {
        console.error('❌ [WAHA Scheduler] Error al procesar health check:', error.message);
      }
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('✅ WahaScheduler iniciado (chequeo cada 10 min)');
  }

  /**
   * Detiene el scheduler.
   */
  stop() {
    if (this.taskHealth) {
      this.taskHealth.stop();
    }
    console.log('🛑 WahaScheduler detenido');
  }
}

/**
 * Inicializa y arranca el scheduler.
 */
export function initWahaScheduler(): WahaScheduler {
  const scheduler = new WahaScheduler();
  scheduler.start();
  return scheduler;
}
