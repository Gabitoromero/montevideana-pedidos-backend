import { Router } from 'express';
import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';
import { RequestContext } from '@mikro-orm/core';
import { getORM } from '../../shared/db/orm.js';

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

// Rutas
router.get('/', (req, res, next) => getController().findAll(req, res, next));
router.get('/:fechaHora/:idPedido', (req, res, next) => getController().findOne(req, res, next));
router.post('/', (req, res, next) => getController().create(req, res, next));
router.delete('/:fechaHora/:idPedido', (req, res, next) => getController().delete(req, res, next));

export default router;

