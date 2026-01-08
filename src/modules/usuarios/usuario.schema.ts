import { z } from 'zod';

export const createUsuarioSchema = z.object({
  username: z.string().min(3, 'El username debe tener al menos 3 caracteres'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  apellido: z.string().min(3, 'El apellido debe tener al menos 3 caracteres'),
  sector: z.string().min(3, 'El sector debe tener al menos 3 caracteres'),
  password: z.string().regex(/^\d{4,10}$/, 'La contraseña debe ser numérica y tener entre 4 y 10 dígitos'),
});

export const updateUsuarioSchema = z.object({
  username: z.string().min(3).optional(),
  nombre: z.string().min(3).optional(),
  apellido: z.string().min(3).optional(),
  sector: z.string().min(3).optional(),
  password: z.string().regex(/^\d{4,10}$/, 'La contraseña debe ser numérica y tener entre 4 y 10 dígitos').optional(),
});

export const usuarioIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número').transform(Number),
});

export type CreateUsuarioDTO = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDTO = z.infer<typeof updateUsuarioSchema>;
export type UsuarioIdDTO = z.infer<typeof usuarioIdSchema>;
