import { z } from 'zod';

const telefonoRegex = /^\d{10,15}$/;
const telefonoMensaje = 'El teléfono debe contener entre 10 y 15 dígitos numéricos';

export const fleteroIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID del fletero debe ser numérico').transform(Number),
});

export const updateTelefonosSchema = z.object({
  telefono1: z.string()
    .regex(telefonoRegex, telefonoMensaje)
    .optional()
    .nullable()
    .or(z.literal('')),
  telefono2: z.string()
    .regex(telefonoRegex, telefonoMensaje)
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const updateLiquidacionSchema = z.object({
  liquidacion: z.boolean({
    required_error: 'El campo liquidacion es requerido',
    invalid_type_error: 'El campo liquidacion debe ser un booleano',
  }),
});

export const updateSeguimientoSchema = z.object({
  seguimiento: z.boolean({
    required_error: 'El campo seguimiento es requerido',
    invalid_type_error: 'El campo seguimiento debe ser un booleano',
  }),
});

export type FleteroIdDTO = z.infer<typeof fleteroIdSchema>;
export type UpdateTelefonosDTO = z.infer<typeof updateTelefonosSchema>;
export type UpdateLiquidacionDTO = z.infer<typeof updateLiquidacionSchema>;
export type UpdateSeguimientoDTO = z.infer<typeof updateSeguimientoSchema>;
