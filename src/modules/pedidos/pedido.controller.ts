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
      const fecha = req.query.fecha as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const { items, total } = await this.pedidoService.findAll(fecha, page, limit);

      res.status(200).json({
        success: true,
        data: {
          data: items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
      
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
      const idEstado = Array.isArray(req.params.idEstado) ? req.params.idEstado[0] : req.params.idEstado;
      const idEstadoNum = parseInt(idEstado, 10);
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const sortBy = (req.query.sortBy as string) || 'm.fecha_hora';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'ASC';

      if (isNaN(idEstadoNum)) {
        res.status(400).json({
          success: false,
          message: 'El ID del estado debe ser un número válido',
        });
        return;
      }

      const { items, total } = await this.pedidoService.findByEstadoFinal(idEstadoNum, page, limit, sortBy, sortOrder);

      res.status(200).json({
        success: true,
        data: {
          data: items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
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
      const idEstado = Array.isArray(req.params.idEstado) ? req.params.idEstado[0] : req.params.idEstado;
      const idEstadoNum = parseInt(idEstado, 10);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const sortBy = (req.query.sortBy as string) || 'p.idPedido';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'ASC';

      if (isNaN(idEstadoNum)) {
        res.status(400).json({
          success: false,
          message: 'El ID del estado debe ser un número válido',
        });
        return;
      }

      const { items, total } = await this.pedidoService.findByEstadoFinalOrderedByIdPedido(idEstadoNum, page, limit, sortBy, sortOrder);

      res.status(200).json({
        success: true,
        data: {
          data: items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;

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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
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

  /**
   * GET /api/pedidos/anulados
   * Obtener todos los pedidos anulados
   * Requiere permisos de ADMIN, CHESS o EXPEDICION
   */
  findAnulados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const sortBy = (req.query.sortBy as string) || 'm.fecha_hora';
      const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

      const { items, total } = await this.pedidoService.findAnulados(page, limit, sortBy, sortOrder);

      res.status(200).json({
        success: true,
        data: {
          data: items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
