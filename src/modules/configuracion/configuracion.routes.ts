import { Router } from 'express';
import { authMiddleware, authorize } from '../../shared/auth/auth.middleware.js';
import { getConfiguracion, updateConfiguracion } from './configuracion.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', getConfiguracion);
router.put('/', updateConfiguracion);

export default router;
