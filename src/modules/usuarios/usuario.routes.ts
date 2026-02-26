import { Router, Request, Response, NextFunction } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { createUsuarioSchema, updateUsuarioSchema, usuarioIdSchema } from './usuario.schema.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new UsuarioController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ========== RUTAS DE LECTURA (ADMIN, CHESS, EXPEDICION) ==========

// Obtener todos los usuarios
router.get(
  '/',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findAll();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener usuario por ID
router.get(
  '/:id',
  authorize('ADMIN', 'CHESS', 'EXPEDICION'),
  validateSchema(usuarioIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.findById(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ========== RUTAS DE ESCRITURA (SOLO ADMIN Y CHESS) ==========

// Crear usuario
router.post(
  '/',
  authorize('ADMIN', 'CHESS'),
  validateSchema(createUsuarioSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Actualizar usuario
router.put(
  '/:id',
  authorize('ADMIN', 'CHESS'),
  validateSchema(usuarioIdSchema, 'params'),
  validateSchema(updateUsuarioSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.update(req.params.id as unknown as number, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Eliminar usuario
router.delete(
  '/:id',
  authorize('ADMIN', 'CHESS'),
  validateSchema(usuarioIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.delete(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Cambiar estado usuario (activar/desactivar)
router.patch(
  '/:id/activar',
  authorize('ADMIN', 'CHESS'),
  validateSchema(usuarioIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.cambiarEstado(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
