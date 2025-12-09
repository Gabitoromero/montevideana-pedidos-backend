import { Router, Request, Response, NextFunction } from 'express';
import { MovimientoController } from './movimiento.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import {
  createMovimientoSchema,
  movimientoIdSchema,
  movimientoPorPedidoSchema,
  movimientoQuerySchema,
} from './movimiento.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new MovimientoController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear movimiento (transición de estado)
router.post(
  '/',
  validateSchema(createMovimientoSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const result = await controller.create(req.body);
      // res.status(201).json({ success: true, data: result });
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

// Obtener movimiento por ID
router.get(
  '/:id',
  validateSchema(movimientoIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findById(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener historial de movimientos de un pedido
router.get(
  '/pedido/:nroPedido',
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findByNroPedido(req.params.nroPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener estado actual de un pedido
router.get(
  '/pedido/:nroPedido/estado-actual',
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getEstadoActual(req.params.nroPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
