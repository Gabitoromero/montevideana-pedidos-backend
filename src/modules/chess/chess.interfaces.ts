export interface ChessVentaRaw {
  idEmpresa: number;
  dsEmpresa: string;

  idDocumento: string;
  dsDocumento: string;
  letra?: string;
  serie?: number;
  nrodoc: number;

  anulado?: "SI" | "NO";

  fechaComprobate?: string;
  fechaEntrega?: string;
  fechaAlta?: string;
  idDeposito?: number;
  idLiquidacion?: number;
  fechaLiquidacion?: string;

  nombreCliente?: string;
  idFleteroCarga?: number;
  dsFleteroCarga?: string | "";
  dsSucursal?: string;

  idPedido?: number;
  planillaCarga?: string;
  

  subtotalFinal?: number;

  // Campos adicionales que pueden venir en la respuesta
  [key: string]: unknown;
}

// Respuesta de la API de CHESS
export interface ChessAPIResponse {
  dsReporteComprobantesApi: {
    VentasResumen: ChessVentaRaw[];
  };
  cantComprobantesVentas: string; // "Numero de lote obtenido: 1/21. Cantidad de comprobantes totales: 20989"
}

// Resultado parcial de cada subproceso
export interface SubprocesoResult {
  pedidosCreados: number;
  movimientosCreados: number;
  movimientosTesoreriaCreados: number;
  errors: string[];
}

// Resultado completo de la sincronización (ambos subprocesos)
export interface ChessSyncResult {
  success: boolean;
  timestamp: string;

  // Subproceso 1: Detección de nuevos pedidos
  totalVentasObtenidas: number;
  totalVentasFiltradas: number;
  totalFleterosCreados: number;
  totalFleterosActualizados: number;
  totalPedidosDescartadosPorSeguimiento: number;
  totalDuplicadosEliminados: number;
  totalPedidosCreados: number;
  totalMovimientosCreados: number;
  totalMovimientosTesoreriaCreados: number;
  lotesProcesados: number;

  // Subproceso 2: Seguimiento de pendientes de liquidación
  totalPendientesLiquidacion: number;
  totalPendientesLiquidacionProcesados: number;
  totalPendientesLiquidacionRestantes: number;
  totalFechasConsultadas: number;

  errors: string[];
}
