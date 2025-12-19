import { Router, Request, Response, NextFunction } from 'express';
import { ChessController } from './chess.controller.js';
import { authMiddleware } from '../../shared/auth/auth.middleware.js';

const router = Router();
const controller = new ChessController();

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

// Test de conexión a CHESS (temporal - para validar autenticación)
router.post(
  '/test-connection',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.testConnection();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener ventas desde CHESS con filtros
router.get(
  '/ventas',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fechaDesde, fechaHasta, empresas, detallado, nroLote } = req.query;
      
      const result = await controller.getVentasDelDia({
        fechaDesde: fechaDesde as string,
        fechaHasta: fechaHasta as string,
        empresas: empresas as string || undefined,
        detallado: detallado === 'true',
        nroLote: nroLote ? parseInt(nroLote as string) : undefined
      });
      
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/diagnostico', (req: Request, res: Response, next: NextFunction) => controller.getReporteRomina(req, res, next));

// // Obtener pedido por número desde CHESS
// router.get(
//   '/pedidos/:nroPedido',
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const result = await controller.getPedido(req.params.nroPedido);
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// // Obtener todos los pedidos desde CHESS con filtros
// router.get(
//   '/pedidos',
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { desde, hasta, cliente } = req.query;
//       const result = await controller.getAllPedidos({
//         desde: desde as string,
//         hasta: hasta as string,
//         cliente: cliente as string,
//       });
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

// // Buscar pedidos en CHESS
// router.get(
//   '/pedidos/search',
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { q } = req.query;
//       if (!q || typeof q !== 'string') {
//         res.status(400).json({ success: false, message: 'Parámetro de búsqueda requerido' });
//         return;
//       }
//       const result = await controller.searchPedidos(q);
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

export default router;
