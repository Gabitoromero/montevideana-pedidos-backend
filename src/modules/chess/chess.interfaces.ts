export interface ChessVentaRaw {
  // --- Identificadores Clave (Composite Key) ---
  idEmpresa: number;
  idDocumento: string; // "FCVTA", "PR-21", etc.
  dsDocumento: string; // "FACTURA", "PRESUPUESTO", etc.
  letra: string;       // "A", "B", o vacío
  serie: number;       // Punto de venta
  nrodoc: number;      // Número correlativo (IMPORTANTE)
  
  // --- Estados y Metadatos ---
  anulado: "SI" | "NO";
  pickup: "SI" | "NO"; // ¿Quizás esto indica si lo busca el cliente?
  informado: "SI" | "NO"; // Estado fiscal AFIP probablemente
  
  // --- Fechas ---
  fechaComprobate: string; // "2025-12-16"
  fechaEntrega: string;    // ⚠️ CRÍTICO: Usar esta para ordenar la pantalla
  fechaAlta: string | null;
  
  // --- Relaciones ---
  idCliente: number;
  nombreCliente: string;
  dsDomicilioEntrega?: string; // A veces viene en domicilioCliente o aparte
  
  // --- Logística (Lo que nos importa) ---
  dsFleteroCarga: string; // Filtro clave: Si está vacío, ¿se muestra igual?
  dsVendedor: string;
  dsSucursal: string;
  dsDeposito: string;
  
  // --- Datos Financieros (Opcional mostrar en pantalla) ---
  subtotalFinal: number;
  
  // --- Enlace interno ---
  idPedido: number; // Si es > 0, viene de un pedido previo
}

// Interfaz para la respuesta paginada de CHESS
export interface ChessAPIResponse {
  cantComprobantesVentas: string; // Viene como string "Numero de lote..."
  ventas: ChessVentaRaw[];        // Ojo: validar si el array se llama 'ventas' o viene directo
}

// Esta es la respuesta completa de la API (por si viene envuelta en un objeto 'data' o 'result')
// export interface ChessAPIResponse {
//     data: ChessVentaRaw[];
//   // Si la API devuelve paginación u otros metadatos, irían aquí.
// }

export interface ResumenDocumento {
  tipo: string;         // Ej: "FCVTA", "PR-21"
  descripcion: string;  // Ej: "FACTURA", "PRESUPUESTO"
  cantidadTotal: number;
  conPedidoAsociado: number; // Cuántos tienen idPedido > 0
  anulados: number;
  montoTotal: number;   // Suma de subtotalFinal para ver volumen de dinero
  ejemploId: number;    // Un nrodoc de ejemplo para que Romina lo busque
}

export interface ReporteDiagnostico {
  fecha: string;
  totalRegistros: number;
  desglosePorTipo: ResumenDocumento[];
}