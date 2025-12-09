import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

type ValidationTarget = 'body' | 'params' | 'query';

export const validateSchema = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const validated = schema.parse(dataToValidate);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(AppError.badRequest(`Errores de validación: ${messages.join(', ')}`));
      } else {
        next(error);
      }
    }
  };
};
