import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'El username es requerido'),
  password: z.string().regex(/^\d{4,10}$/, 'La contraseña debe ser numérica y tener entre 4 y 10 dígitos'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;
