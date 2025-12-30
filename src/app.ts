import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middlewares/errorHandler.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import usuarioRoutes from './modules/usuarios/usuario.routes.js';
import tipoEstadoRoutes from './modules/estados/tipoEstado.routes.js';
import reglaRoutes from './modules/reglas/regla.routes.js';
import movimientoRoutes from './modules/movimientos/movimiento.routes.js';
import chessRoutes from './modules/chess/chess.routes.js';
import pedidoRoutes from './modules/pedidos/pedido.routes.js';
import fleteroRoutes from './modules/fleteros/fletero.routes.js';
import { AppError } from './shared/errors/AppError.js';

export const createApp = (): Application => {
  const app = express();

  // Middlewares
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError('CORS no permitido'));
      }
    },
    credentials: true // Importante para headers de autorización
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuarioRoutes);
  app.use('/api/estados', tipoEstadoRoutes);
  app.use('/api/reglas', reglaRoutes);
  app.use('/api/movimientos', movimientoRoutes);
  app.use('/api/chess', chessRoutes);
  app.use('/api/pedidos', pedidoRoutes);
  app.use('/api/fleteros', fleteroRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Ruta no encontrada',
      statusCode: 404,
    });
  });

  // Error Handler (debe ir al final)
  app.use(errorHandler);

  return app;
};