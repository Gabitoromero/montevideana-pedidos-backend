import { Router, Request, Response, NextFunction } from 'express';
import { FleterosController } from './fletero.controller.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new FleterosController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ========== RUTAS DE LECTURA (ADMIN, CHESS, EXPEDICION) ==========

/**
 * GET /fleteros - Listar todos los fleteros
 */
router.get(
  '/',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.findAll(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /fleteros/activos - Listar fleteros con seguimiento activo
 */
router.get(
  '/activos',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.findActivos(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /fleteros/inactivos - Listar fleteros con seguimiento inactivo
 */
router.get(
  '/inactivos',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.findInactivos(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /fleteros/:id - Obtener un fletero específico
 */
router.get(
  '/:id',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.findOne(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ========== RUTAS DE ESCRITURA (SOLO ADMIN Y CHESS) ==========

/**
 * PATCH /fleteros/:id/liquidacion - Actualizar campo liquidacion
 */
router.patch(
  '/:id/liquidacion',
  authorize('ADMIN', 'CHESS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.updateLiquidacion(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /fleteros/:id - Actualizar campo seguimiento
 */
router.patch(
  '/:id',
  authorize('ADMIN', 'CHESS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller.update(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
