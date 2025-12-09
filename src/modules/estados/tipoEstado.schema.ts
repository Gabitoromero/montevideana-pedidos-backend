import { z } from 'zod';

export const createTipoEstadoSchema = z.object({
  nombreEstado: z.string().min(5, 'El nombre del estado debe tener al menos 5 caracteres'),
});

export const updateTipoEstadoSchema = z.object({
  nombreEstado: z.string().min(5, 'El nombre del estado debe tener al menos 5 caracteres'),
});

export const tipoEstadoIdSchema = z.object({
  idEstado: z.string().regex(/^\d+$/, 'El código debe ser un número').transform(Number),
});

export type CreateTipoEstadoDTO = z.infer<typeof createTipoEstadoSchema>;
export type UpdateTipoEstadoDTO = z.infer<typeof updateTipoEstadoSchema>;
export type TipoEstadoIdDTO = z.infer<typeof tipoEstadoIdSchema>;
