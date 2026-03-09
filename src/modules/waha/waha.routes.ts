import { Router, Request, Response, NextFunction } from 'express';
import { WahaService } from './waha.service.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';
import { AppError } from '../../shared/errors/AppError.js';

const router = Router();
const wahaService = new WahaService();

// ============================================================
//  WEBHOOK (sin auth JWT — WAHA llama a este endpoint internamente)
// ============================================================

/**
 * POST /api/waha/webhook
 *
 * Endpoint que WAHA llama automáticamente cuando ocurre un evento en la sesión.
 * No requiere auth JWT porque el llamante es el propio contenedor Docker de WAHA
 * (comunicación interna), no un cliente externo.
 *
 * Eventos relevantes que maneja este webhook:
 *  - session.status: Cambio de estado de la sesión (WORKING, STOPPED, FAILED, SCAN_QR_CODE)
 *
 * Si la sesión se cae (STOPPED / FAILED), envía una alerta WhatsApp al developer
 * para que reescanee el QR antes de que los fleteros dejen de recibir notificaciones.
 */
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    // Siempre responder 200 rápido para que WAHA no reintente
    res.status(200).json({ received: true });

    const evento = req.body;

    // ── Log completo del payload recibido (útil para debugging) ──
    console.log(`\n[WAHA Webhook] 📨 Evento recibido: ${new Date().toLocaleString('es-AR')}`);
    console.log(`[WAHA Webhook] Tipo de evento: ${evento?.event ?? 'desconocido'}`);
    console.log(`[WAHA Webhook] Payload completo:`, JSON.stringify(evento, null, 2));

    // Solo procesamos eventos de cambio de estado de sesión
    if (evento?.event !== 'session.status') {
      console.log(`[WAHA Webhook] ℹ️  Evento ignorado (no es session.status)`);
      return;
    }

    const sesion = evento.session ?? 'default';
    const status = evento.payload?.status ?? evento.status ?? 'UNKNOWN';

    console.log(`[WAHA Webhook] 🔄 Estado de sesión "${sesion}": ${status}`);

    // Estados que requieren atención inmediata
    const estadosCriticos = ['STOPPED', 'FAILED'];
    const requiereEscanearQR = status === 'SCAN_QR_CODE';

    if (requiereEscanearQR) {
      const mensaje =
        `⚠️ *WAHA - QR Requerido*\n` +
        `La sesión de WhatsApp "_${sesion}_" requiere escanear el QR nuevamente.\n\n` +
        `Ingresá a la interfaz de WAHA y escaneá el código QR para restaurar la conexión.`;

      console.warn(`[WAHA Webhook] ⚠️  Sesión requiere QR. Notificando al developer...`);
      await wahaService.notificarDeveloper(mensaje);

    } else if (estadosCriticos.includes(status)) {
      const mensaje =
        `🚨 *WAHA - Sesión Caída*\n` +
        `La sesión de WhatsApp "_${sesion}_" cambió a estado *${status}*.\n\n` +
        `Los fleteros NO están recibiendo notificaciones. Revisá el servidor WAHA.`;

      console.error(`[WAHA Webhook] ❌ Sesión en estado crítico (${status}). Notificando al developer...`);
      await wahaService.notificarDeveloper(mensaje);

    } else if (status === 'WORKING') {
      console.log(`[WAHA Webhook] ✅ Sesión "${sesion}" operativa (WORKING)`);

    } else {
      console.log(`[WAHA Webhook] ℹ️  Estado "${status}" registrado sin acción requerida`);
    }
  }
);

// ============================================================
//  RUTAS PROTEGIDAS (requieren JWT)
// ============================================================

router.use(authMiddleware);

/**
 * POST /api/waha/notificar-developer
 * Envía un mensaje de WhatsApp al teléfono del developer (TELEFONO_DEVELOPER en .env).
 * Solo accesible para usuarios ADMIN y CHESS.
 *
 * Body: { mensaje: string }
 */
router.post(
  '/notificar-developer',
  //authorize('ADMIN', 'CHESS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mensaje } = req.body;

      if (!mensaje || typeof mensaje !== 'string' || mensaje.trim() === '') {
        throw AppError.badRequest('El campo "mensaje" es requerido y no puede estar vacío');
      }

      await wahaService.notificarDeveloper(mensaje.trim());

      res.status(200).json({
        success: true,
        data: { mensaje: 'Notificación enviada al developer' },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
