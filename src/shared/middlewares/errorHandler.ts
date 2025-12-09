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

  // Log unexpected errors
  console.error('Unexpected error:', error);

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    statusCode: 500,
  });
};
