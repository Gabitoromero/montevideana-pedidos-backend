import { Router, Request, Response, NextFunction } from 'express';
import { TipoEstadoController } from './tipoEstado.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { createTipoEstadoSchema, updateTipoEstadoSchema, tipoEstadoIdSchema } from './tipoEstado.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new TipoEstadoController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear tipo de estado
router.post(
  '/',
  validateSchema(createTipoEstadoSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener todos los tipos de estado
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findAll();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener tipo de estado por código
router.get(
  '/:codEstado',
  validateSchema(tipoEstadoIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findByCodigo(req.params.codEstado as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Actualizar tipo de estado
router.patch(
  '/:codEstado',
  validateSchema(tipoEstadoIdSchema, 'params'),
  validateSchema(updateTipoEstadoSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.update(req.params.codEstado as unknown as number, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Eliminar tipo de estado
router.delete(
  '/:codEstado',
  validateSchema(tipoEstadoIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.delete(req.params.codEstado as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
