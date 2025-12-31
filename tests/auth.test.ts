import { describe, it, expect } from 'vitest';
import { JwtUtil } from '../src/shared/auth/jwt.js';
import { AppError } from '../src/shared/errors/AppError.js';

describe('JWT Authentication', () => {
  const testPayload = {
    sub: 1,
    username: 'testuser',
    sector: 'admin'
  };

  describe('Access Token', () => {
    it('should generate a valid access token', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT tiene 3 partes
    });

    it('should verify a valid access token', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      const decoded = JwtUtil.verifyAccessToken(token);
      
      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.username).toBe(testPayload.username);
      expect(decoded.sector).toBe(testPayload.sector);
    });

    it('should throw error for invalid access token', () => {
      expect(() => {
        JwtUtil.verifyAccessToken('invalid.token.here');
      }).toThrow(AppError);
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        JwtUtil.verifyAccessToken('not-a-jwt');
      }).toThrow(AppError);
    });
  });

  describe('Refresh Token', () => {
    it('should generate a valid refresh token', () => {
      const token = JwtUtil.generateRefreshToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should verify a valid refresh token', () => {
      const token = JwtUtil.generateRefreshToken(testPayload);
      const decoded = JwtUtil.verifyRefreshToken(token);
      
      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.username).toBe(testPayload.username);
      expect(decoded.sector).toBe(testPayload.sector);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JwtUtil.verifyRefreshToken('invalid.token.here');
      }).toThrow(AppError);
    });
  });

  describe('Token Decode', () => {
    it('should decode token without verification', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      const decoded = JwtUtil.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(testPayload.sub);
    });

    it('should return null for invalid token', () => {
      const decoded = JwtUtil.decodeToken('not-a-valid-token');
      expect(decoded).toBeNull();
    });
  });
});
