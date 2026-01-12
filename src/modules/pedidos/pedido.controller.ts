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
   * GET /api/pedidos/:idPedido
   * Obtener un pedido por idPedido
   */
  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idPedido } = req.params;
      
      const pedido = await this.pedidoService.findByIdPedidoSimple(idPedido);

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
   * GET /api/pedidos/estado/:idEstado
   * Obtener pedidos del día de hoy cuyo último movimiento tenga un estado final específico
   */
  findByEstadoFinal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idEstado } = req.params;
      const idEstadoNum = parseInt(idEstado, 10);

      if (isNaN(idEstadoNum)) {
        res.status(400).json({
          success: false,
          message: 'El ID del estado debe ser un número válido',
        });
        return;
      }

      const pedidos = await this.pedidoService.findByEstadoFinal(idEstadoNum);

      res.status(200).json({
        success: true,
        data: pedidos,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/pedidos/estado/:idEstado/ordered
   * Obtener pedidos del día de hoy cuyo último movimiento tenga un estado final específico
   * Ordenados por idPedido (ASC)
   */
  findByEstadoFinalOrdered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idEstado } = req.params;
      const idEstadoNum = parseInt(idEstado, 10);

      if (isNaN(idEstadoNum)) {
        res.status(400).json({
          success: false,
          message: 'El ID del estado debe ser un número válido',
        });
        return;
      }

      const pedidos = await this.pedidoService.findByEstadoFinalOrderedByIdPedido(idEstadoNum);

      res.status(200).json({
        success: true,
        data: pedidos,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/pedidos/:idPedido
   * Eliminar un pedido
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idPedido } = req.params;

      await this.pedidoService.delete(idPedido);

      res.status(200).json({
        success: true,
        message: 'Pedido eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/pedidos/:idPedido/evaluacion
   * Actualizar la calificación de un pedido
   * Requiere PIN de usuario con sector ADMIN, CHESS, o EXPEDICION
   */
  actualizarCalificacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { idPedido } = req.params;
      const { calificacion, pin } = req.body;

      const pedidoActualizado = await this.pedidoService.actualizarCalificacion(idPedido, calificacion, pin);

      res.status(200).json({
        success: true,
        message: 'Calificación actualizada correctamente',
        data: pedidoActualizado,
      });
    } catch (error) {
      next(error);
    }
  };
}
