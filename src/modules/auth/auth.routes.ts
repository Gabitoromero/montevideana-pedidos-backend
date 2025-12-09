import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new AuthController();

// Login (no requiere autenticación)
router.post(
  '/login',
  validateSchema(loginSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.login(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token (no requiere autenticación del access token)
router.post(
  '/refresh',
  validateSchema(refreshTokenSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.refresh(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener información del usuario autenticado
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.me(req.user!.sub);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
