import { Router, Request, Response, NextFunction } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { createUsuarioSchema, updateUsuarioSchema, usuarioIdSchema } from './usuario.schema.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new UsuarioController();

// Crear usuario (sin autenticación para permitir registro)
router.post(
  '/',
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

// Obtener todos los usuarios (requiere autenticación)
router.get(
  '/',
  authMiddleware,
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
  authMiddleware,
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

// Actualizar usuario
router.patch(
  '/:id',
  authMiddleware,
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
  authMiddleware,
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

export default router;
