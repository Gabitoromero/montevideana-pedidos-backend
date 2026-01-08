import { Router, Request, Response, NextFunction } from 'express';
import { MovimientoController } from './movimiento.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import {
  createMovimientoSchema,
  movimientoIdSchema,
  movimientoPorPedidoSchema,
  movimientoQuerySchema,
  inicializarChessSchema,
  movimientosByUsuarioParamsSchema,
  movimientosByUsuarioQuerySchema,
  movimientosByEstadoParamsSchema,
  movimientosByEstadoQuerySchema,
} from './movimiento.schema.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new MovimientoController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear movimiento (transición de estado)
// La validación de permisos está dentro del controller según el tipo de movimiento
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
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await controller.findAll(req.query as any, page, limit);
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
      const idPedido = req.params.idPedido;
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
      const idPedido = req.params.idPedido;
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
      const idPedido = req.params.idPedido;
      const result = await controller.getEstadoActual(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener historial completo de movimientos de un pedido (solo admin y CHESS)
router.get(
  '/pedido/:idPedido/historial',
  authorize('ADMIN', 'CHESS'),
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedido = req.params.idPedido;
      const result = await controller.findMovimientosByPedido(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener movimientos por usuario con rango de fechas (solo admin y CHESS)
router.get(
  '/usuario/:idUsuario',
  authorize('ADMIN', 'CHESS'),
  validateSchema(movimientosByUsuarioParamsSchema, 'params'),
  validateSchema(movimientosByUsuarioQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idUsuario = parseInt(req.params.idUsuario);
      const { fechaInicio, fechaFin, page } = req.query as any;
      const result = await controller.findMovimientosByUsuario(
        idUsuario,
        fechaInicio,
        fechaFin,
        page || 1
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener movimientos por estado con rango de fechas (solo admin y CHESS)
router.get(
  '/estado/:estado',
  authorize('ADMIN', 'CHESS'),
  validateSchema(movimientosByEstadoParamsSchema, 'params'),
  validateSchema(movimientosByEstadoQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { estado } = req.params;
      const { fechaInicio, fechaFin, page } = req.query as any;
      const result = await controller.findMovimientosByEstado(
        estado,
        fechaInicio,
        fechaFin,
        page || 1
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Inicializar pedido desde CHESS (Usuario Sistema)
// Esta ruta es interna, no requiere autenticación JWT (usa credenciales en el body)
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
