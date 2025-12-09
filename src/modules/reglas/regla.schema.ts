import { z } from 'zod';

export const createEstadoNecesarioSchema = z.object({
  idEstado: z.number().int().positive('El código de estado debe ser un número positivo'),
  idEstadoNecesario: z.number().int().positive('El código necesario debe ser un número positivo'),
}).refine(data => data.idEstado !== data.idEstadoNecesario, {
  message: 'Un estado no puede ser necesario para sí mismo'
});

export const estadoNecesarioIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número').transform(Number),
});

export const estadoByCodSchema = z.object({
  idEstado: z.string().regex(/^\d+$/, 'El código debe ser un número').transform(Number),
});



export type CreateEstadoNecesarioDTO = z.infer<typeof createEstadoNecesarioSchema>;
export type EstadoNecesarioIdDTO = z.infer<typeof estadoNecesarioIdSchema>;
export type EstadoByCodDTO = z.infer<typeof estadoByCodSchema>;
