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
  exportMovimientosQuerySchema,
  busquedaDinamicaQuerySchema,
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

// Búsqueda dinámica de movimientos (nueva funcionalidad)
router.get(
  '/buscar',
  validateSchema(busquedaDinamicaQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.buscarDinamico(req.query as any);
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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
      const fechaHoraParam = Array.isArray(req.params.fechaHora) ? req.params.fechaHora[0] : req.params.fechaHora;
      const fechaHora = new Date(fechaHoraParam);

      if (isNaN(fechaHora.getTime())) {
        throw new Error('Invalid date format');
      }

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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
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
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
      const result = await controller.getEstadoActual(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener historial completo de movimientos de un pedido
router.get(
  '/pedido/:idPedido/historial',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedido = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
      const result = await controller.findMovimientosByPedido(idPedido);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener movimientos por usuario con rango de fechas
router.get(
  '/usuario/:idUsuario',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  validateSchema(movimientosByUsuarioParamsSchema, 'params'),
  validateSchema(movimientosByUsuarioQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idUsuarioParam = Array.isArray(req.params.idUsuario) ? req.params.idUsuario[0] : req.params.idUsuario;
      const idUsuario = parseInt(idUsuarioParam, 10);

      if (isNaN(idUsuario)) {
        throw new Error('Invalid user ID');
      }

      const { fechaInicio, fechaFin, page } = req.query as any;
      const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
      const fechaFinStr = Array.isArray(fechaFin) ? fechaFin[0] : fechaFin;
      const pageNum = Array.isArray(page) ? parseInt(page[0], 10) : parseInt(page, 10) || 1;

      const result = await controller.findMovimientosByUsuario(
        idUsuario,
        fechaInicioStr,
        fechaFinStr,
        pageNum
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener movimientos por estado con rango de fechas
router.get(
  '/estado/:estado',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  validateSchema(movimientosByEstadoParamsSchema, 'params'),
  validateSchema(movimientosByEstadoQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estadoParam = Array.isArray(req.params.estado) ? req.params.estado[0] : req.params.estado;
      const { fechaInicio, fechaFin, page } = req.query as any;
      const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
      const fechaFinStr = Array.isArray(fechaFin) ? fechaFin[0] : fechaFin;
      const pageNum = Array.isArray(page) ? parseInt(page[0], 10) : parseInt(page, 10) || 1;

      if (typeof fechaInicioStr !== 'string' || typeof fechaFinStr !== 'string') {
        throw new Error('Invalid date range');
      }

      const result = await controller.findMovimientosByEstado(
        estadoParam,
        fechaInicioStr,
        fechaFinStr,
        pageNum
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Exportar movimientos a Excel
router.get(
  '/export',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  validateSchema(exportMovimientosQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const excelBuffer = await controller.exportMovimientos(req.query as any);
      
      // Configurar headers para descarga de Excel
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="movimientos_${req.query.fechaDesde}_${req.query.fechaHasta}.xlsx"`);
      res.status(200).send(excelBuffer);
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
/*

// Obtener movimiento por pedido y estado final
router.get(
  '/pedido/:idPedido/estado-final/:idEstadoFinal',
  validateSchema(movimientoPorPedidoSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idPedidoParam = Array.isArray(req.params.idPedido) ? req.params.idPedido[0] : req.params.idPedido;
      const idEstadoFinalParam = Array.isArray(req.params.idEstadoFinal) ? req.params.idEstadoFinal[0] : req.params.idEstadoFinal;
      const idEstadoFinal = parseInt(idEstadoFinalParam, 10);

      if (isNaN(idEstadoFinal)) {
        throw new Error('Invalid final state ID');
      }

      const result = await controller.findByPedidoAndEstadoFinal(idPedidoParam, idEstadoFinal);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);
*/
export default router;
