// Constantes de Estados del Sistema
// IDs de estados según la base de datos

export const ESTADO_IDS = {
  CHESS: 1,
  PENDIENTE: 2,
  EN_PREPARACION: 3,
  PREPARADO: 4,
  PAGADO: 5,
  ENTREGADO: 6,
} as const;

export const ESTADO_NOMBRES = {
  CHESS: 'CHESS',
  PENDIENTE: 'PENDIENTE',
  EN_PREPARACION: 'EN PREPARACIÓN',
  PREPARADO: 'PREPARADO',
  PAGADO: 'PAGADO',
  ENTREGADO: 'ENTREGADO',
} as const;

// Sectores de usuarios
export const SECTORES = {
  CHESS: 'CHESS',
  ADMIN: 'admin',
  ARMADO: 'armado',
  FACTURACION: 'facturacion',
} as const;

// Helper para validar si un estado permite marcar como cobrado
export function esEstadoPagado(estadoId: number): boolean {
  return estadoId === ESTADO_IDS.PAGADO;
}

// Helper para validar permisos de armado
export function puedeRealizarMovimientoArmado(sector: string): boolean {
  return sector === SECTORES.ARMADO || 
         sector === SECTORES.CHESS || 
         sector === SECTORES.ADMIN;
}

// Helper para validar permisos de facturación
export function puedeRealizarMovimientoFacturacion(sector: string): boolean {
  return sector === SECTORES.FACTURACION || 
         sector === SECTORES.ADMIN || 
         sector === SECTORES.CHESS;
}

// Helper para validar si un estado es de armado
export function esEstadoDeArmado(estadoId: number): boolean {
  return estadoId === ESTADO_IDS.EN_PREPARACION || 
         estadoId === ESTADO_IDS.PREPARADO || 
         estadoId === ESTADO_IDS.ENTREGADO;
}
