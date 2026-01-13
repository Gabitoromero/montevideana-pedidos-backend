import { Router } from 'express';
import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';
import { RequestContext } from '@mikro-orm/core';
import { getORM } from '../../shared/db/orm.js';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';
import { validateSchema } from '../../shared/middlewares/validateSchema.js';
import { actualizarCalificacionSchema } from './pedido.schema.js';
import { AppError } from '../../shared/errors/AppError.js';

const router = Router();

// Lazy initialization
let pedidoController: PedidoController;

const getController = () => {
  if (!pedidoController) {
    const orm = getORM();
    const pedidoService = new PedidoService(orm.em);
    pedidoController = new PedidoController(pedidoService);
  }
  return pedidoController;
};

// Middleware para crear un contexto de EntityManager por request
router.use((req, res, next) => {
  RequestContext.create(getORM().em, next);
});

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de lectura - permitidas para todos los sectores incluyendo TELEVISOR
router.get('/', authorize('ADMIN', 'CHESS', 'CAMARA', 'EXPEDICION', 'TELEVISOR'), (req, res, next) => getController().findAll(req, res, next));
router.get('/estado/:idEstado/ordered', authorize('ADMIN', 'CHESS', 'CAMARA', 'EXPEDICION', 'TELEVISOR'), (req, res, next) => getController().findByEstadoFinalOrdered(req, res, next));
router.get('/estado/:idEstado', authorize('ADMIN', 'CHESS', 'CAMARA', 'EXPEDICION', 'TELEVISOR'), (req, res, next) => getController().findByEstadoFinal(req, res, next));
router.get('/:idPedido', authorize('ADMIN', 'CHESS', 'CAMARA', 'EXPEDICION', 'TELEVISOR'), (req, res, next) => getController().findOne(req, res, next));

// Rutas de modificación - solo ADMIN y CHESS
router.post('/', authorize('ADMIN', 'CHESS'), (req, res, next) => getController().create(req, res, next));
router.delete('/:idPedido', authorize('ADMIN', 'CHESS'), (req, res, next) => getController().delete(req, res, next));

// Ruta para actualizar calificación (validación por PIN en service layer) - solo ADMIN y CHESS
router.patch(
  '/:idPedido/evaluacion',
  validateSchema(actualizarCalificacionSchema),
  authorize('ADMIN', 'CHESS','EXPEDICION'),
  (req, res, next) => getController().actualizarCalificacion(req, res, next)
);

export default router;

