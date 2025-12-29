import { z } from 'zod';

export const createMovimientoSchema = z.object({
  username: z.string().min(1, 'El username es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  idPedido: z.string().min(1, 'El ID de pedido no puede estar vacío').regex(/^\d{4} - \d{8}$/, 'El ID de pedido debe tener el formato "XXXX - XXXXXXXX"'),
  estadoInicial: z.number().int().positive('El estado inicial debe ser un número positivo'),
  estadoFinal: z.number().int().positive('El estado final debe ser un número positivo'),
}).refine((data) => data.estadoInicial !== data.estadoFinal, {
  message: 'El estado inicial y final no pueden ser iguales',
  path: ['estadoFinal'],
});

export const movimientoIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número').transform(Number),
});

export const movimientoPorPedidoSchema = z.object({
  idPedido: z.string().min(1, 'El ID de pedido no puede estar vacío'),
});

export const movimientoQuerySchema = z.object({
  usuarioId: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoInicial: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoFinal: z.string().regex(/^\d+$/).transform(Number).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
});

export const inicializarChessSchema = z.object({
  idPedido: z.string().min(1, 'El ID de pedido no puede estar vacío').regex(/^\d{4} - \d{8}$/, 'El ID de pedido debe tener el formato "XXXX - XXXXXXXX"'),
  fechaHora: z.string().datetime('La fecha y hora deben estar en formato ISO 8601'),
  idFleteroCarga: z.number().int().positive('El ID del fletero debe ser un número positivo'),
});

export type CreateMovimientoDTO = z.infer<typeof createMovimientoSchema>;
export type MovimientoIdDTO = z.infer<typeof movimientoIdSchema>;
export type MovimientoPorPedidoDTO = z.infer<typeof movimientoPorPedidoSchema>;
export type MovimientoQueryDTO = z.infer<typeof movimientoQuerySchema>;
export type InicializarChessDTO = z.infer<typeof inicializarChessSchema>;
