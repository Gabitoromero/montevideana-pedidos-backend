import { Router, Request, Response, NextFunction } from 'express';
import { ChessController } from './chess.controller.js';
import { RequestContext } from '@mikro-orm/core';
import { getORM } from '../../shared/db/orm.js';

const router = Router();

// Lazy initialization
let controller: ChessController;

const getController = () => {
  if (!controller) {
    controller = new ChessController(getORM().em);
  }
  return controller;
};

// Middleware para crear un contexto de EntityManager por request
router.use((req, res, next) => {
  RequestContext.create(getORM().em, next);
});

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

// Test de conexión a CHESS (temporal - para validar autenticación)
router.post(
  '/test-connection',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getController().testConnection();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Sincronización manual de ventas CHESS
router.post(
  '/sync',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getController().sync(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Sincronización de ventas del día anterior
router.post(
  '/sync-dia-anterior',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getController().syncDiaAnterior(req, res, next);
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
      
      const result = await getController().getVentasDelDia({
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

// Test Discord webhook alert - solo para pruebas
router.get(
  '/test-discord-alert',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ChessScheduler } = await import('./chess.scheduler.js');
      const scheduler = new ChessScheduler(getORM());
      
      const testError = new Error('Test de alerta Discord - Esta es una prueba manual del sistema de notificaciones');
      await (scheduler as any).sendDiscordAlert(testError);
      
      res.status(200).json({ 
        success: true, 
        message: 'Alerta de prueba enviada a Discord. Revisa el canal configurado.' 
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
