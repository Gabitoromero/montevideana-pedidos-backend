import { z } from 'zod';

export const createMovimientoSchema = z.object({
  username: z.string().min(1, 'El username es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  idPedido: z.string().regex(/^\d{8}$/, 'El ID de pedido debe ser un string de 8 dígitos'),
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
  idPedido: z.string().regex(/^\d{8}$/, 'El ID de pedido debe ser un string de 8 dígitos'),
});

export const movimientoQuerySchema = z.object({
  usuarioId: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoInicial: z.string().regex(/^\d+$/).transform(Number).optional(),
  estadoFinal: z.string().regex(/^\d+$/).transform(Number).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
});

export const inicializarChessSchema = z.object({
  idPedido: z.string().regex(/^\d{8}$/, 'El ID de pedido debe ser un string de 8 dígitos'),
  fechaHora: z.string().datetime('La fecha y hora deben estar en formato ISO 8601'),
  idFleteroCarga: z.number().int().positive('El ID del fletero debe ser un número positivo'),
});

// Schema para validar params de usuario
export const movimientosByUsuarioParamsSchema = z.object({
  idUsuario: z.string().regex(/^\d+$/, 'El ID de usuario debe ser un número').transform(Number),
});

// Schema para validar query de búsqueda por usuario
export const movimientosByUsuarioQuerySchema = z.object({
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de inicio debe tener el formato YYYY-MM-DD'),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de fin debe tener el formato YYYY-MM-DD').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Schema para validar params de estado
export const movimientosByEstadoParamsSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN PREPARACION', 'PREPARADO', 'TESORERIA', 'ENTREGADO'], {
    errorMap: () => ({ message: 'El estado debe ser uno de: PENDIENTE, EN PREPARACION, PREPARADO, TESORERIA, ENTREGADO' })
  }),
});

// Schema para validar query de búsqueda por estado
export const movimientosByEstadoQuerySchema = z.object({
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de inicio debe tener el formato YYYY-MM-DD'),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de fin debe tener el formato YYYY-MM-DD').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateMovimientoDTO = z.infer<typeof createMovimientoSchema>;
export type MovimientoIdDTO = z.infer<typeof movimientoIdSchema>;
export type MovimientoPorPedidoDTO = z.infer<typeof movimientoPorPedidoSchema>;
export type MovimientoQueryDTO = z.infer<typeof movimientoQuerySchema>;
export type InicializarChessDTO = z.infer<typeof inicializarChessSchema>;
export type MovimientosByUsuarioParamsDTO = z.infer<typeof movimientosByUsuarioParamsSchema>;
export type MovimientosByUsuarioQueryDTO = z.infer<typeof movimientosByUsuarioQuerySchema>;
export type MovimientosByEstadoParamsDTO = z.infer<typeof movimientosByEstadoParamsSchema>;
export type MovimientosByEstadoQueryDTO = z.infer<typeof movimientosByEstadoQuerySchema>;
