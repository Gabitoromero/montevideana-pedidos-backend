import { ChessService } from './chess.service.js';
import { Request, Response, NextFunction } from 'express';

export class ChessController {
  private chessService = new ChessService();

  async testConnection() {
    return await this.chessService.testConnection();
  }

  // Agrega esta función exportada:
  async getReporteRomina (req: Request, res: Response, next: NextFunction){
  try {
    // Si no pasan fecha, usamos HOY
    const fecha = (req.query.fecha as string) || new Date().toISOString().split('T')[0];

    const reporte = await this.chessService.getDiagnostico(fecha);

    res.status(200).json({
      ok: true,
      mensaje: "Reporte generado para validación con cliente",
      data: reporte
    });
  } catch (error) {
    next(error);
  }
};

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