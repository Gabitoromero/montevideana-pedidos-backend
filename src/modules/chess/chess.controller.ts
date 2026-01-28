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

  /**
   * Endpoint para verificar liquidaciones
   * Compara CHESS vs base de datos para detectar inconsistencias
   */
  async verificarLiquidaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha } = req.query;
      
      let fechaVerificar: Date;
      if (fecha) {
        fechaVerificar = new Date(fecha as string);
      } else {
        // Por defecto, verificar ayer
        fechaVerificar = new Date();
        fechaVerificar.setDate(fechaVerificar.getDate() - 1);
      }
      
      const result = await this.chessService.verificarLiquidaciones(fechaVerificar);
      
      res.status(200).json({
        success: true,
        data: result,
        fecha: fechaVerificar.toISOString().split('T')[0],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint de TEST para probar alertas de Discord
   * Simula el envío de una alerta de verificación de liquidaciones
   */
  async testDiscordVerificacion(req: Request, res: Response, next: NextFunction) {
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      
      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          error: 'DISCORD_WEBHOOK_URL no está configurado en las variables de entorno'
        });
      }

      // Simular inconsistencias de ejemplo
      const inconsistenciasEjemplo = [
        { idPedido: '00287573', fechaLiquidacion: '2026-01-27', estadoActual: 'PREPARADO' },
        { idPedido: '00287574', fechaLiquidacion: '2026-01-27', estadoActual: 'EN PREPARACION' },
        { idPedido: '00287575', fechaLiquidacion: '2026-01-27', estadoActual: 'PENDIENTE' },
      ];

      const tuIdDiscord = '368473961190916113';

      const mensaje = 
        `🚨 <@${tuIdDiscord}> **ALERTA DE TEST**: Verificación de Liquidaciones\n\n` +
        `Se encontraron ${inconsistenciasEjemplo.length} pedidos con liquidación no procesada\n\n` +
        `Fecha verificada: ${new Date().toLocaleDateString('es-AR')}\n` +
        `Primeros 5 pedidos:\n${inconsistenciasEjemplo.map(i => 
          `- Pedido ${i.idPedido}: liquidación ${i.fechaLiquidacion}, estado ${i.estadoActual}`
        ).join('\n')}`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: mensaje,
          username: 'Montevideana Scheduler',
          avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        })
      });

      if (!response.ok) {
        throw new Error(`Discord webhook falló: ${response.status} ${response.statusText}`);
      }

      res.status(200).json({
        success: true,
        message: 'Alerta de test enviada a Discord correctamente',
        inconsistenciasSimuladas: inconsistenciasEjemplo.length
      });
    } catch (error) {
      next(error);
    }
  }
}