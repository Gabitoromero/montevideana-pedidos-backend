import { Router, Request, Response, NextFunction } from 'express';
import { ReglaController } from './regla.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import {
  createReglaSchema,
  reglaIdSchema,
  estadoByCodSchema,
} from './regla.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new ReglaController();

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

// Crear regla de estado necesario
router.post(
  '/',
  validateSchema(createReglaSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener todas las reglas
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

// Obtener reglas por código de estado
router.get(
  '/estado/:idEstado',
  validateSchema(estadoByCodSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findByEstado(req.params.idEstado as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);


// Eliminar regla
router.delete(
  '/:id',
  validateSchema(reglaIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.delete(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
