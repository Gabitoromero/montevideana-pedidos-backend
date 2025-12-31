import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  // Log completo solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unexpected error:', error);
  } else {
    // En producción, log estructurado sin stack trace
    console.error(JSON.stringify({
      type: 'UnexpectedError',
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      ip: req.ip
    }));
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    statusCode: 500,
  });
};
