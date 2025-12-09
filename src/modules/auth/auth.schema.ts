import { z } from 'zod';

export const loginSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;
