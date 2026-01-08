import { ChessService } from './chess.service.js';
import { Request, Response, NextFunction } from 'express';
import { EntityManager } from '@mikro-orm/core';

export class ChessController {
  private chessService: ChessService;

  constructor(em: EntityManager) {
    this.chessService = new ChessService(em);
  }

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

  /**
   * Endpoint manual para sincronizar ventas de CHESS
   */
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.chessService.syncVentas();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint para sincronizar ventas del día anterior
   * Se ejecuta automáticamente a las 6:00 AM vía cron
   */
  async syncDiaAnterior(req: Request, res: Response, next: NextFunction) {
    try {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      
      const result = await this.chessService.syncVentas(ayer);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}