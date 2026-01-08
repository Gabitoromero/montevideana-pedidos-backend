// Constantes de Estados del Sistema
// IDs de estados según la base de datos

export const ESTADO_IDS = {
  CHESS: 1,
  PENDIENTE: 2,
  EN_PREPARACION: 3,
  PREPARADO: 4,
  TESORERIA: 5,
  ENTREGADO: 6,
} as const;

export const ESTADO_NOMBRES = {
  CHESS: 'CHESS',
  PENDIENTE: 'PENDIENTE',
  EN_PREPARACION: 'EN PREPARACIÓN',
  PREPARADO: 'PREPARADO',
  TESORERIA: 'TESORERIA',
  ENTREGADO: 'ENTREGADO',
} as const;

// Sectores de usuarios
export const SECTORES = {
  CHESS: 'CHESS',
  ADMIN: 'ADMIN',
  CAMARA: 'CAMARA',
  EXPEDICION: 'EXPEDICION',
} as const;

// Helper para validar si un estado permite marcar como cobrado
export function esEstadoTesoreria(estadoId: number): boolean {
  return estadoId === ESTADO_IDS.TESORERIA;
}

// Helper para validar permisos de cámara
export function puedeRealizarMovimientoCamara(sector: string): boolean {
  return sector === SECTORES.CAMARA || 
         sector === SECTORES.CHESS || 
         sector === SECTORES.ADMIN;
}

// Helper para validar permisos de expedición
export function puedeRealizarMovimientoExpedicion(sector: string): boolean {
  return sector === SECTORES.EXPEDICION || 
         sector === SECTORES.ADMIN || 
         sector === SECTORES.CHESS;
}

// Helper para validar si un estado es de cámara
export function esEstadoDeCamara(estadoId: number): boolean {
  return estadoId === ESTADO_IDS.EN_PREPARACION || 
         estadoId === ESTADO_IDS.PREPARADO;
}

// Helper para validar si un estado es de expedición
export function esEstadoDeExpedicion(estadoId: number): boolean {
  return estadoId === ESTADO_IDS.TESORERIA || 
         estadoId === ESTADO_IDS.ENTREGADO;
}
