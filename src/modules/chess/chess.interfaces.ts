export interface ChessVentaRaw {
  idEmpresa: number;
  dsEmpresa: string;

  idDocumento: string;
  dsDocumento: string;
  letra?: string;
  serie?: number;
  nrodoc: number;

  anulado?: "SI" | "NO";

  fechaComprobante?: string;
  fechaEntrega?: string;
  fechaAlta?: string;

  nombreCliente?: string;
  idFleteroCarga?: number;
  dsFleteroCarga?: string | "";
  dsSucursal?: string;

  idPedido?: number;

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

// Resultado de la sincronización
export interface ChessSyncResult {
  success: boolean;
  timestamp: string;
  totalVentasObtenidas: number;
  totalVentasFiltradas: number;
  totalPedidosCreados: number;
  totalMovimientosCreados: number;
  lotesProcesados: number;
  errors: string[];
}

