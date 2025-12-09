import { z } from 'zod';

export const createEstadoNecesarioSchema = z.object({
  codEstado: z.number().int().positive('El código de estado debe ser un número positivo'),
  codNecesario: z.number().int().positive('El código necesario debe ser un número positivo'),
});

export const estadoNecesarioIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número').transform(Number),
});

export const estadoByCodSchema = z.object({
  codEstado: z.string().regex(/^\d+$/, 'El código debe ser un número').transform(Number),
});

export type CreateEstadoNecesarioDTO = z.infer<typeof createEstadoNecesarioSchema>;
export type EstadoNecesarioIdDTO = z.infer<typeof estadoNecesarioIdSchema>;
export type EstadoByCodDTO = z.infer<typeof estadoByCodSchema>;
