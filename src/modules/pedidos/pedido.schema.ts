import { z } from 'zod';

/**
 * Schema para actualizar la calificación de un pedido
 */
export const actualizarCalificacionSchema = z.object({
  calificacion: z.number()
    .int('La calificación debe ser un número entero')
    .min(1, 'La calificación mínima es 1')
    .max(5, 'La calificación máxima es 5'),
  pin: z.string()
    .length(4, 'El PIN debe tener 4 dígitos')
    .regex(/^\d+$/, 'El PIN debe contener solo números'),
});

export type ActualizarCalificacionDTO = z.infer<typeof actualizarCalificacionSchema>;

