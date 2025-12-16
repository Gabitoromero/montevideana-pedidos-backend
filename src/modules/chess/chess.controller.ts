import { ChessService } from './chess.service.js';

export class ChessController {
  private chessService = new ChessService();

  async testConnection() {
    return await this.chessService.testConnection();
  }

  async getVentasDelDia(params?: {
    fechaDesde?: string;
    fechaHasta?: string;
    empresas?: string;
    detallado?: boolean;
    nroLote?: number;
  }) {
    // Si no se proporciona fechaDesde, usar HOY
    const fechaDesde = params?.fechaDesde || new Date().toISOString().split('T')[0];
    const fechaHasta = params?.fechaHasta;
    
    const ventas = await this.chessService.getVentasDelDia(
      fechaDesde,
      fechaHasta,
      {
        empresas: params?.empresas,
        detallado: params?.detallado,
        nroLote: params?.nroLote
      }
    );
    
    return ventas;
  }
}