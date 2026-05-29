import axios from 'axios';
import { normalizarTelefonoArgentina } from '../../shared/utils/telefono.js';

/**
 * Servicio para enviar mensajes de WhatsApp via WAHA (WhatsApp Web API).
 * WAHA corre como contenedor Docker en la misma máquina que el backend.
 *
 * La integración es siempre fire-and-forget: los errores se loguean pero
 * no se propagan, para que fallas de mensajería no interrumpan el flujo de negocio.
 */
export class WahaService {
  private readonly baseUrl: string;
  private readonly sessionName = 'default';
  private readonly apiKey: string | undefined;
  private readonly simularTyping: boolean;

  constructor() {
    this.baseUrl = process.env.WAHA_BASE_URL ?? 'http://localhost:3000';
    this.apiKey = process.env.WAHA_API_KEY;
    // Habilitar simulación de typing por defecto para protección anti-ban, configurable por env.
    this.simularTyping = process.env.WAHA_SIMULATE_TYPING !== 'false';
  }

  /**
   * Normaliza un número de teléfono al formato internacional de Argentina (549 + área + número)
   * y devuelve el chatId esperado por WAHA (ej: 5493415555555@c.us) utilizando la utilidad común.
   */
  private formatearChatId(telefono: string): string {
    return normalizarTelefonoArgentina(telefono);
  }

  /**
   * Espera un tiempo aleatorio entre minMs y maxMs milisegundos.
   * Simula comportamiento humano para reducir el riesgo de bloqueo por parte de WhatsApp.
   */
  private esperarDelayAleatorio(minMs: number = 1000, maxMs: number = 4000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    console.log(`[WAHA] ⏳ Esperando ${(delay / 1000).toFixed(1)}s antes de enviar (anti-ban)...`);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Cambia el estado de "escribiendo" en el chat.
   * Útil para simular comportamiento humano (anti-ban).
   */
  private async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    if (!this.simularTyping) return;

    const endpoint = isTyping ? '/api/startTyping' : '/api/stopTyping';
    try {
      await axios.post(
        `${this.baseUrl}${endpoint}`,
        {
          chatId,
          session: this.sessionName,
        },
        {
          headers: {
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
          },
        }
      );
    } catch (error) {
      // Errores de typing son menores, solo los ignoramos silenciosamente
      console.warn(`[WAHA] No se pudo cambiar estado typing para ${chatId}`);
    }
  }

  /**
   * Envía un mensaje de texto a un número de WhatsApp simulando ser un humano.
   * Si WAHA no está disponible o la sesión no está activa, loguea el error sin lanzarlo.
   *
   * @param telefono - Número en cualquier formato (se limpia internamente)
   * @param mensaje  - Texto a enviar (soporta markdown de WhatsApp: *negrita*, etc.)
   */
  async enviarMensaje(telefono: string, mensaje: string): Promise<void> {
    const chatId = this.formatearChatId(telefono);
    if (!chatId) {
      console.warn(`[WAHA] ⚠️ Número de teléfono inválido o vacío para envío: "${telefono}"`);
      return;
    }

    try {
      // 1. Mostrar "escribiendo..."
      await this.setTyping(chatId, true);

      // 2. Delay aleatorio proporcional simulando el tiempo de tipeo
      if (this.simularTyping) {
        await this.esperarDelayAleatorio();
      }

      // 3. Detener "escribiendo..."
      await this.setTyping(chatId, false);

      // 4. Enviar el mensaje real
      await axios.post(
        `${this.baseUrl}/api/sendText`,
        {
          chatId,
          text: mensaje,
          session: this.sessionName,
        },
        {
          headers: {
            ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
          },
        }
      );

      console.log(`[WAHA] ✅ Mensaje enviado exitosamente a ${chatId}`);
    } catch (error: any) {
      const detalle = error.response?.data ?? error.message;
      console.error(`[WAHA] ❌ Error al enviar mensaje a ${chatId}:`, detalle);
    }
  }


  /**
   * Obtiene el estado actual de la sesión desde WAHA.
   * @returns El estado de la sesión (ej: 'WORKING', 'SCAN_QR_CODE', 'STOPPED', etc.) o 'UNKNOWN' si falla.
   */
  async getSessionStatus(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/sessions`, {
        headers: {
          ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
        },
      });

      // WAHA devuelve un array de sesiones. Buscamos la nuestra.
      const sesiones = response.data;
      const miSesion = sesiones.find((s: any) => s.name === this.sessionName);

      return miSesion?.status ?? 'STOPPED';
    } catch (error: any) {
      console.error(`[WAHA] ❌ Error al obtener estado de sesión: ${error.message}`);
      return 'UNKNOWN';
    }
  }

  /**
   * Envía una notificación al teléfono del developer (TELEFONO_DEVELOPER en .env).
   * Útil para alertas internas del sistema que solo le interesan al administrador.
   * Si la variable de entorno no está configurada, loguea un warning y no hace nada.
   */
  async notificarDeveloper(mensaje: string): Promise<void> {
    const telefonoDeveloper = process.env.TELEFONO_DEVELOPER;

    if (!telefonoDeveloper) {
      console.warn('[WAHA] ⚠️ TELEFONO_DEVELOPER no configurado en .env, se omite la notificación');
      return;
    }

    await this.enviarMensaje(telefonoDeveloper, mensaje);
  }
}
