import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 intentos
  message: 'Demasiados intentos de login. Por favor, intenta de nuevo en 5 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 requests por minuto por usuario/IP
  message: 'Demasiadas peticiones. Por favor, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Desactivar validación IPv6 porque usamos authorization como clave primaria
  // Si tiene token (usuario logueado), usamos el token como identificador
  // Si no tiene token (login, assets, o error de auth), usamos la IP
  // Esto permite que múltiples dispositivos en la misma WiFi (IP compartida) tengan sus propios límites si están logueados
  keyGenerator: (req) => req.headers.authorization || req.ip || 'unknown',
});

export const createApp = (): Application => {
  const app = express();

  // Necesario porque estás detrás de Nginx. Sin esto, req.ip siempre es 127.0.0.1 y las cookies secure no funcionan bien nativamente.
  app.set('trust proxy', 1);

  // Configurar Helmet para headers de seguridad
  app.use(helmet({
    // Desactivar CSP en desarrollo para evitar bloqueos
    // En producción, configurar con las URLs específicas necesarias
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          "https://montheladoturnero.com",
          "https://www.montheladoturnero.com",
        ],
      },
    } : false, // Desactivado en desarrollo
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny' // Prevenir clickjacking
    },
    noSniff: true, // Prevenir MIME type sniffing
    xssFilter: true, // Activar filtro XSS del navegador
  }));

  // Middlewares
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

  app.use(cors({
    origin: (origin, callback) => {
      // En desarrollo, permitir requests sin origin (Postman, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError(`CORS: Origen ${origin} no permitido`));
      }
    },
    credentials: true // Importante para headers de autorización y cookies
  }));
  
  // Cookie parser con secret para firmar cookies
  const cookieSecret = process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production';
  app.use(cookieParser(cookieSecret));
  
  // Limitar tamaño de payload para prevenir DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health check detallado
  app.get('/api/health', async (req: Request, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: 'unknown',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    try {
      // Verificar conexión a base de datos
      const { getORM } = await import('./shared/db/orm.js');
      const orm = getORM();
      await orm.em.getConnection().execute('SELECT 1');
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // API Routes with rate limiting
  app.use('/api/auth/login', authLimiter); // Rate limit específico para login
  app.use('/api/', apiLimiter); // Rate limit general para toda la API
  
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