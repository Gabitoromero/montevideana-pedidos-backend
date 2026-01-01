/**
 * Configuración de cookies seguras para autenticación
 * 
 * Implementa cookies HTTP-only con flags de seguridad para proteger
 * contra ataques XSS y CSRF
 */

import { CookieOptions } from 'express';

/**
 * Nombres de las cookies de autenticación
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * Duración de las cookies (en milisegundos)
 */
export const COOKIE_MAX_AGE = {
  ACCESS_TOKEN: 15 * 60 * 1000,        // 15 minutos
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 días
} as const;

/**
 * Configuración base de cookies con flags de seguridad
 */
const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,                    // No accesible desde JavaScript (protección XSS)
  secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
  sameSite: 'strict',                // Protección CSRF
  path: '/',                         // Disponible en toda la aplicación
});

/**
 * Configuración específica para access token
 */
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
});

/**
 * Configuración específica para refresh token
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
});

/**
 * Configuración para limpiar cookies (logout)
 */
export const getClearCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: 0,
});
