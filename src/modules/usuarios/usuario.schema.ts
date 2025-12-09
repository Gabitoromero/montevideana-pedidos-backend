import { z } from 'zod';

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  sector: z.string().min(2, 'El sector debe tener al menos 2 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  sector: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
});

export const usuarioIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número').transform(Number),
});

export type CreateUsuarioDTO = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDTO = z.infer<typeof updateUsuarioSchema>;
export type UsuarioIdDTO = z.infer<typeof usuarioIdSchema>;
