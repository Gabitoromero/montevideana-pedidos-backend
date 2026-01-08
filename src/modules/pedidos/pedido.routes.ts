import { Router } from 'express';
import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';
import { RequestContext } from '@mikro-orm/core';
import { getORM } from '../../shared/db/orm.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';
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

// Middleware para validar sector en ruta de calificación
const validarSectorCalificacion = (req: any, res: any, next: any) => {
  const usuario = req.user;
  const sectoresPermitidos = ['ADMIN', 'CHESS', 'EXPEDICION'];
  
  if (!sectoresPermitidos.includes(usuario.sector)) {
    throw new AppError('No tienes permisos para calificar pedidos', 403);
  }
  
  next();
};

// Rutas
router.get('/', (req, res, next) => getController().findAll(req, res, next));
router.get('/estado/:idEstado', (req, res, next) => getController().findByEstadoFinal(req, res, next));
router.get('/:idPedido', (req, res, next) => getController().findOne(req, res, next));
router.post('/', (req, res, next) => getController().create(req, res, next));
router.delete('/:idPedido', (req, res, next) => getController().delete(req, res, next));

// Ruta para actualizar calificación
router.patch(
  '/:idPedido/evaluacion',
  validarSectorCalificacion,
  validateSchema(actualizarCalificacionSchema),
  (req, res, next) => getController().actualizarCalificacion(req, res, next)
);

export default router;

