import { z } from 'zod';

export const updateConfiguracionSchema = z.object({
  horaConsultaPreventaManana: z.string().optional(),
  lastTriggeredDate: z.string().optional(),
  queriesRemaining: z.number().int().optional(),
});

export type UpdateConfiguracionDto = z.infer<typeof updateConfiguracionSchema>;
