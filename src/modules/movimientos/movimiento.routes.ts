import { Router, Request, Response, NextFunction } from 'express';
import { MovimientoController } from './movimiento.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import {
  createMovimientoSchema,
  movimientoIdSchema,
  movimientoPorPedidoSchema,
  movimientoQuerySchema,
  inicializarChessSchema,
} from './movimiento.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new MovimientoController();

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

// Crear movimiento (transición de estado)
router.post(
  '/',
  validateSchema(createMovimientoSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener todos los movimientos con filtros opcionales
router.get(
  '/',
  validateSchema(movimientoQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findAll(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener movimiento por pedido y fecha
router.get(
  '/pedido/:idPedido/fecha/:fechaHora',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedido = parseInt(req.params.idPedido, 10);
      const fechaHora = new Date(req.params.fechaHora);
      const result = await controller.findByPedidoAndFecha(idPedido, fechaHora);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener historial de movimientos de un pedido
router.get(
  '/pedido/:idPedido',
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedido = parseInt(req.params.idPedido, 10);
      const result = await controller.findByIdPedido(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener estado actual de un pedido
router.get(
  '/pedido/:idPedido/estado-actual',
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedido = parseInt(req.params.idPedido, 10);
      const result = await controller.getEstadoActual(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Inicializar pedido desde CHESS (Usuario Sistema)
router.post(
  '/inicializar-chess',
  validateSchema(inicializarChessSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.inicializarDesdeChess(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
