import { Router, Request, Response, NextFunction } from 'express';
import { FleterosController } from './fletero.controller.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new FleterosController();

// Todas las rutas requieren autenticación y permisos de admin
router.use(authMiddleware);
router.use(authorize('admin','CHESS'));

/**
 * GET /fleteros - Listar todos los fleteros
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await controller.findAll(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /fleteros/activos - Listar fleteros con seguimiento activo
 */
router.get('/activos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await controller.findActivos(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /fleteros/inactivos - Listar fleteros con seguimiento inactivo
 */
router.get('/inactivos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await controller.findInactivos(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /fleteros/:id - Obtener un fletero específico
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await controller.findOne(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /fleteros/:id - Actualizar campo seguimiento
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await controller.update(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
