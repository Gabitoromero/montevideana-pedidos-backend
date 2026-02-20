import cron, { ScheduledTask } from 'node-cron';
import { ChessService } from './chess.service.js';
import { MikroORM } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Scheduler para sincronización automática de ventas CHESS
 * - Sincroniza día anterior a las 6:00 AM
 * - Sincroniza día actual cada 1 minuto entre las 6:00 AM y 11:00 PM
 */
export class ChessScheduler {
  private orm: MikroORM;
  private taskDiaActual: ScheduledTask | null = null;
  private taskDiaAnterior: ScheduledTask | null = null;
  private taskVerificacion: ScheduledTask | null = null;
  private isRunningYet = false;
  private failureCount = 0;
  private syncCounter = 0; // Contador para re-sync del día anterior
  private readonly MAX_FAILURES = 10;
  private readonly SYNC_INTERVAL_FOR_YESTERDAY = 15; // Cada 15 syncs, re-sincronizar ayer
  private readonly DISCORD_USER_ID = '368473961190916113';
  private readonly COUNTER_FILE = join('/tmp', 'chess-sync-counter.json');

  constructor(orm: MikroORM) {
    this.orm = orm;
    this.syncCounter = this.loadCounter();
  }

  /**
   * Cargar el contador de sincronizaciones desde el archivo persistido
   */
  private loadCounter(): number {
    try {
      const data = readFileSync(this.COUNTER_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const value = Number(parsed.syncCounter);
      if (!isNaN(value) && value >= 0) {
        console.log(`🔄 Contador de sincronizaciones recuperado: ${value}/${this.SYNC_INTERVAL_FOR_YESTERDAY}`);
        return value;
      }
    } catch {
      // Si el archivo no existe o está corrupto, empezar desde 0
    }
    return 0;
  }

  /**
   * Persistir el contador de sincronizaciones en disco
   */
  private saveCounter(): void {
    try {
      writeFileSync(this.COUNTER_FILE, JSON.stringify({ syncCounter: this.syncCounter }), 'utf-8');
    } catch (err: any) {
      console.warn(`⚠️ No se pudo persistir el contador de sync: ${err.message}`);
    }
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
   * Enviar alerta de verificación de liquidaciones a Discord
   */
  private async sendDiscordVerificacionAlert(resultado: any, fecha: Date): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️ DISCORD_WEBHOOK_URL no configurado en .env');
      return;
    }

    try {
      const primeros5 = resultado.inconsistencias.slice(0, 5);
      const pedidosTexto = primeros5.map((i: any) => 
        `• **${i.idPedido}** - Liquidación: ${i.fechaLiquidacion} - Estado: ${i.estadoActual || 'N/A'}`
      ).join('\n');

      const message = {
        content: `<@${this.DISCORD_USER_ID}>`,
        username: 'Montevideana Scheduler',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        embeds: [{
          title: '⚠️ INCONSISTENCIAS: Liquidaciones No Procesadas',
          description: `Se encontraron **${resultado.totalInconsistencias} pedidos** con liquidación en CHESS que no están cobrados en el sistema.\n\n**Acción requerida:** Revisar y procesar manualmente estos pedidos.`,
          color: 16776960, // Amarillo
          fields: [
            {
              name: '📅 Fecha Verificada',
              value: fecha.toLocaleDateString('es-AR'),
              inline: true
            },
            {
              name: '🔢 Total Inconsistencias',
              value: `${resultado.totalInconsistencias} pedidos`,
              inline: true
            },
            {
              name: '📦 Primeros 5 Pedidos',
              value: pedidosTexto || 'No hay detalles disponibles',
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Verificación Diaria de Liquidaciones'
          }
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        console.error('❌ Error al enviar alerta de verificación a Discord:', response.statusText);
      } else {
        console.log('✅ Alerta de verificación enviada a Discord exitosamente');
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
    // Si es lunes, sincroniza desde el viernes (3 días atrás)
    // Si es otro día, sincroniza solo el día anterior
    this.taskDiaAnterior = cron.schedule('0 6 * * *', async () => {
      const hoy = new Date();
      const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes, 2=Martes, etc.
      const esLunes = diaSemana === 1;
      
      // Si es lunes, leer desde el viernes (3 días atrás)
      // Si es otro día, leer solo el día anterior
      const diasAtras = esLunes ? 3 : 1;
      
      console.log(`\n🌅 ========== CRON: Sincronizando pedidos de ${esLunes ? 'VIERNES (3 días atrás)' : 'DÍA ANTERIOR'} ==========`);
      console.log(`📅 Hoy es ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]}`);
      
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        const fechaDesde = new Date();
        fechaDesde.setDate(fechaDesde.getDate() - diasAtras);
        
        console.log(`🔍 Sincronizando desde: ${fechaDesde.toLocaleDateString('es-AR')}`);
        
        await chessService.syncVentas(fechaDesde);
        console.log(`✅ Sincronización de ${diasAtras} día(s) atrás completada`);
      } catch (error: any) {
        console.error('❌ Error en sincronización del día anterior:', error.message);
      } finally {
        await em.clear();
      }
    }, {
        timezone: "America/Argentina/Buenos_Aires" 
    });

    // Cron 2: Sincronizar últimos 2 días cada 1 minuto (6 AM - 11 PM)
    // */1 6-23 * * * = cada 1 minuto, entre las 6 y las 23 horas
    // Sincroniza AYER y HOY para capturar liquidaciones agregadas con retraso
    this.taskDiaActual = cron.schedule('*/1 6-23 * * *', async () => {
      if (this.isRunningYet) {
        console.log('⏭️ Sincronización anterior aún en progreso, omitiendo...');
        return;
      }

      this.isRunningYet = true;
      
      // Incrementar y persistir contador de sincronizaciones
      this.syncCounter++;
      this.saveCounter();
      
      // Determinar si toca re-sincronizar el día anterior
      const shouldSyncYesterday = this.syncCounter % this.SYNC_INTERVAL_FOR_YESTERDAY === 0;
      
      if (shouldSyncYesterday) {
        console.log(`\n🔄 ========== CRON: Re-sincronización del DÍA ANTERIOR (sync #${this.syncCounter}) ==========`);
      } else {
        console.log(`\n🔄 ========== CRON: Sincronización automática (hoy y mañana) [${this.syncCounter}/${this.SYNC_INTERVAL_FOR_YESTERDAY}] ==========`);
      }
      
      // Crear un fork del EntityManager para esta ejecución
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        if (shouldSyncYesterday) {
          // Cada 15 sincronizaciones, re-sincronizar el día anterior
          const ayer = new Date();
          ayer.setDate(ayer.getDate() - 1);
          console.log(`📅 Re-sincronizando día anterior: ${ayer.toLocaleDateString('es-AR')}`);
          console.log(`💡 Motivo: Detectar liquidaciones agregadas tardíamente`);
          await chessService.syncVentas(ayer);
        } else {
          // Sincronización normal: HOY y MAÑANA
          // Sincronizar DÍA ACTUAL (hoy)
          console.log(`📅 Sincronizando día actual: ${new Date().toLocaleDateString('es-AR')}`);
          await chessService.syncVentas();
          
          // Sincronizar DÍA SIGUIENTE (mañana)
          const mañana = new Date();
          mañana.setDate(mañana.getDate() + 1);
          console.log(`📅 Sincronizando día siguiente: ${mañana.toLocaleDateString('es-AR')}`);
          await chessService.syncVentas(mañana);
        }
        
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
    }, {
        timezone: "America/Argentina/Buenos_Aires" // <--- Agrega esto en tu código
    });

    // Cron de verificación de liquidaciones (11:30 PM todos los días)
    this.taskVerificacion = cron.schedule('30 23 * * *', async () => {
      console.log('\n🔍 ========== VERIFICACIÓN DE LIQUIDACIONES ==========');
      console.log(`⏰ Hora: ${new Date().toLocaleString('es-AR')}`);
      
      const em = this.orm.em.fork();
      const chessService = new ChessService(em);
      
      try {
        // Verificar liquidaciones de ayer
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        
        const resultado = await chessService.verificarLiquidaciones(ayer);
        
        if (resultado.totalInconsistencias > 0) {
          console.log(`⚠️  Se encontraron ${resultado.totalInconsistencias} inconsistencias`);
          
          // Enviar alerta a Discord
          await this.sendDiscordVerificacionAlert(resultado, ayer);
        } else {
          console.log('✅ No se encontraron inconsistencias');
        }
      } catch (error: any) {
        console.error('❌ Error en verificación de liquidaciones:', error.message);
        await this.sendDiscordAlert(error);
      } finally {
        await em.clear();
      }
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('✅ Scheduler CHESS iniciado:');
    console.log('   - Día anterior: 6:00 AM (inicial)');
    console.log('   - Hoy y mañana: cada 1 minuto (6:00 AM - 11:00 PM)');
    console.log(`   - Re-sync día anterior: cada ${this.SYNC_INTERVAL_FOR_YESTERDAY} sincronizaciones (~${this.SYNC_INTERVAL_FOR_YESTERDAY} min)`);
    console.log('   - Verificación de liquidaciones: 11:30 PM');
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
    if (this.taskVerificacion) {
      this.taskVerificacion.stop();
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
