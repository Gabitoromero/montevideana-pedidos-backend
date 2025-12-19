import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface CustomJwtPayload {
  sub: number;
  username: string;
  sector: string;
  iat?: number;
  exp?: number;
}

export class JwtUtil {
  
  static generateAccessToken(payload: Omit<CustomJwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      payload as object, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  static generateRefreshToken(payload: Omit<CustomJwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      payload as object, 
      JWT_REFRESH_SECRET, 
      { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );
  }

  static verifyAccessToken(token: string): CustomJwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded as unknown as CustomJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Token expirado');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Token inválido');
      }
      throw AppError.unauthorized('Error al verificar token');
    }
  }

  static verifyRefreshToken(token: string): CustomJwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      return decoded as unknown as CustomJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token expirado');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Refresh token inválido');
      }
      throw AppError.unauthorized('Error al verificar refresh token');
    }
  }

  static decodeToken(token: string): CustomJwtPayload | null {
    const decoded = jwt.decode(token);
    return decoded as CustomJwtPayload | null;
  }
    
}
