import { Request, Response, NextFunction } from 'express';
import { PedidoService } from './pedido.service.js';

export class PedidoController {
  constructor(private readonly pedidoService: PedidoService) {}

  /**
   * GET /api/pedidos
   * Listar todos los pedidos o filtrar por fecha
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fecha } = req.query;

      const pedidos = await this.pedidoService.findAll(fecha as string | undefined);

      res.status(200).json({
        success: true,
        data: pedidos,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pedidos/:fechaHora/:idPedido
   * Obtener un pedido por clave compuesta
   */
  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fechaHora, idPedido } = req.params;
      
      const pedido = await this.pedidoService.findByCompositeKey(fechaHora, idPedido);

      if (!pedido) {
        res.status(404).json({
          success: false,
          message: 'Pedido no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/pedidos
   * Crear un nuevo pedido
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedido = await this.pedidoService.create(req.body);

      res.status(201).json({
        success: true,
        data: pedido,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/pedidos/:fechaHora/:idPedido
   * Eliminar un pedido
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fechaHora, idPedido } = req.params;

      await this.pedidoService.delete(fechaHora, idPedido);

      res.status(200).json({
        success: true,
        message: 'Pedido eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  };
}
