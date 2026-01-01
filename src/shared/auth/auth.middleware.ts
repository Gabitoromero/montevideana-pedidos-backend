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
    let token: string | undefined;

    // Prioridad 1: Intentar leer token desde cookie (método seguro)
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Prioridad 2: Fallback a Authorization header (compatibilidad temporal)
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const [bearer, headerToken] = authHeader.split(' ');
      
      if (bearer === 'Bearer' && headerToken) {
        token = headerToken;
      }
    }

    // Si no hay token en ninguno de los dos lugares
    if (!token) {
      throw AppError.unauthorized('Token no proporcionado');
    }

    // Verificar y decodificar token
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
