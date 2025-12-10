import { z } from 'zod';

export const createMovimientoSchema = z.object({
  usuarioId: z.number().int().positive('El ID de usuario debe ser un número positivo'),
  nroPedido: z.string().min(1, 'El número de pedido es requerido'),
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
  nroPedido: z.string().min(1, 'El número de pedido es requerido'),
});

export const movimientoQuerySchema = z.object({
  usuarioId: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoInicial: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoFinal: z.string().regex(/^\d+$/).transform(Number).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
});

export const inicializarChessSchema = z.object({
  nroPedido: z.string().min(1, 'El número de pedido es requerido'),
});

export type CreateMovimientoDTO = z.infer<typeof createMovimientoSchema>;
export type MovimientoIdDTO = z.infer<typeof movimientoIdSchema>;
export type MovimientoPorPedidoDTO = z.infer<typeof movimientoPorPedidoSchema>;
export type MovimientoQueryDTO = z.infer<typeof movimientoQuerySchema>;
export type InicializarChessDTO = z.infer<typeof inicializarChessSchema>;
