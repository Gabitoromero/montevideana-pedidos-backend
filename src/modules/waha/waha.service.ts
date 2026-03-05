import axios from 'axios';

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

  constructor() {
    this.baseUrl = process.env.WAHA_BASE_URL ?? 'http://localhost:3000';
    this.apiKey = process.env.WAHA_API_KEY;
  }

  /**
   * Formatea un número de teléfono al chatId que espera WAHA.
   * Elimina cualquier caracter no numérico y agrega el sufijo @c.us.
   * Ejemplo: "+54 9 341-300-3003" → "5493413003003@c.us"
   */
  private formatearChatId(telefono: string): string {
    const soloNumeros = telefono.replace(/\D/g, '');
    return `${soloNumeros}@c.us`;
  }

  /**
   * Envía un mensaje de texto a un número de WhatsApp.
   * Si WAHA no está disponible o la sesión no está activa, loguea el error sin lanzarlo.
   *
   * @param telefono - Número en cualquier formato (se limpia internamente)
   * @param mensaje  - Texto a enviar (soporta markdown de WhatsApp: *negrita*, etc.)
   */
  async enviarMensaje(telefono: string, mensaje: string): Promise<void> {
    const chatId = this.formatearChatId(telefono);

    try {
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

      console.log(`[WAHA] ✅ Mensaje enviado a ${chatId}`);
    } catch (error: any) {
      const detalle = error.response?.data ?? error.message;
      console.error(`[WAHA] ❌ Error al enviar mensaje a ${chatId}:`, detalle);
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
