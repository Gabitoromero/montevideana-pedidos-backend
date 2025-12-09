import { Request, Response, NextFunction } from 'express';
import { JwtUtil, JwtPayload } from './jwt.js';
import { AppError } from '../errors/AppError.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // try {
  //   const authHeader = req.headers.authorization;

  //   if (!authHeader) {
  //     throw AppError.unauthorized('Token no proporcionado');
  //   }

  //   const [bearer, token] = authHeader.split(' ');

  //   if (bearer !== 'Bearer' || !token) {
  //     throw AppError.unauthorized('Formato de token inválido');
  //   }

  //   const payload = JwtUtil.verifyAccessToken(token);
  //   req.user = payload;

  //   next();
  // } catch (error) {
  //   next(error);
  // }
};
