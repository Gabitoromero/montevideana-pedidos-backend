import { Router } from 'express';
import { PedidoController } from './pedido.controller.js';
import { PedidoService } from './pedido.service.js';
import { RequestContext } from '@mikro-orm/core';
import { initORM } from '../../shared/db/orm.js';

const router = Router();

// Inicializar servicio y controlador
const orm = await initORM();
const pedidoService = new PedidoService(orm.em);
const pedidoController = new PedidoController(pedidoService);

// Middleware para crear un contexto de EntityManager por request
router.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

// Rutas
router.get('/', pedidoController.findAll);
router.get('/:fechaHora/:idPedido', pedidoController.findOne);
router.post('/', pedidoController.create);
router.delete('/:fechaHora/:idPedido', pedidoController.delete);

export default router;
