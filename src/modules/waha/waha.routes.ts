import { Router, Request, Response, NextFunction } from 'express';
import { WahaService } from './waha.service.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';
import { AppError } from '../../shared/errors/AppError.js';

const router = Router();
const wahaService = new WahaService();

//router.use(authMiddleware);

/**
 * POST /api/waha/notificar-developer
 * Envía un mensaje de WhatsApp al teléfono del developer (TELEFONO_DEVELOPER en .env).
 * Solo accesible para ADMIN y CHESS.
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
