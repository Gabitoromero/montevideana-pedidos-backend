import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JwtPayload {
  sub: number;
  nombre: string;
  sector: string;
  iat?: number;
  exp?: number;
}

export class JwtUtil {
  
  // static generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  //   return jwt.sign(payload, JWT_SECRET, {
  //     expiresIn: JWT_EXPIRES_IN,
  //   });
  // }

  // static generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  //   return jwt.sign(payload, JWT_REFRESH_SECRET, {
  //     expiresIn: JWT_REFRESH_EXPIRES_IN,
  //   });
  // }

  // static verifyAccessToken(token: string): JwtPayload {
  //   try {
  //     return jwt.verify(token, JWT_SECRET) as JwtPayload;
  //   } catch (error) {
  //     if (error instanceof jwt.TokenExpiredError) {
  //       throw AppError.unauthorized('Token expirado');
  //     }
  //     if (error instanceof jwt.JsonWebTokenError) {
  //       throw AppError.unauthorized('Token inválido');
  //     }
  //     throw AppError.unauthorized('Error al verificar token');
  //   }
  // }

  // static verifyRefreshToken(token: string): JwtPayload {
  //   try {
  //     return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  //   } catch (error) {
  //     if (error instanceof jwt.TokenExpiredError) {
  //       throw AppError.unauthorized('Refresh token expirado');
  //     }
  //     if (error instanceof jwt.JsonWebTokenError) {
  //       throw AppError.unauthorized('Refresh token inválido');
  //     }
  //     throw AppError.unauthorized('Error al verificar refresh token');
  //   }
  // }

  // static decodeToken(token: string): JwtPayload | null {
  //   return jwt.decode(token) as JwtPayload | null;
  // }
    
}
