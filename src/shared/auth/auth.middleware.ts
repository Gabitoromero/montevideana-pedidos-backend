import { Request, Response, NextFunction } from 'express';
import { JwtUtil, CustomJwtPayload } from './jwt.js';
import { AppError } from '../errors/AppError.js';

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized('Token no proporcionado');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw AppError.unauthorized('Formato de token inválido');
    }

    const payload = JwtUtil.verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de autorización basado en sectores
 * Uso: authorize('admin', 'armado')
 */
export const authorize = (...allowedSectors: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Usuario no autenticado');
      }

      if (!allowedSectors.includes(req.user.sector)) {
        throw AppError.forbidden(`Acceso denegado. Se requiere uno de los siguientes sectores: ${allowedSectors.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
