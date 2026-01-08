import { z } from 'zod';

/**
 * Schema para actualizar la calificación de un pedido
 */
export const actualizarCalificacionSchema = z.object({
  calificacion: z.number()
    .int('La calificación debe ser un número entero')
    .min(1, 'La calificación mínima es 1')
    .max(5, 'La calificación máxima es 5'),
});

export type ActualizarCalificacionDTO = z.infer<typeof actualizarCalificacionSchema>;
