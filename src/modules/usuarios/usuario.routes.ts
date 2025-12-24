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
router.get( '/', async (req: Request, res: Response, next: NextFunction) => {
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
router.put(
  '/:id',
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

// dar de baja usuario
router.delete(
  '/:id',
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

// dar de alta usuario
router.patch(
  '/:id/activar',
  validateSchema(usuarioIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.darAlta(req.params.id as unknown as number);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
