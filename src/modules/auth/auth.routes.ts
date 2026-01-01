import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';
import {
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../../shared/config/cookie.config.js';

const router = Router();
const controller = new AuthController();

// Login (no requiere autenticación)
router.post(
  '/login',
  validateSchema(loginSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.login(req.body);
      
      // Setear tokens como cookies HTTP-only
      res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
      res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());
      
      // Retornar solo datos del usuario (sin tokens en JSON)
      res.status(200).json({ 
        success: true, 
        data: {
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token (lee refresh token desde cookie)
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Leer refresh token desde cookie
      const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      
      if (!refreshToken) {
        res.status(401).json({ 
          success: false, 
          message: 'Refresh token no proporcionado' 
        });
        return;
      }
      
      const result = await controller.refresh({ refreshToken });
      
      // Setear nuevo access token como cookie
      res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
      
      // Retornar datos del usuario
      res.status(200).json({ 
        success: true, 
        data: {
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Logout (limpia cookies)
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Limpiar cookies de autenticación
      res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions());
      res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions());
      
      res.status(200).json({ 
        success: true, 
        message: 'Sesión cerrada correctamente' 
      });
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
