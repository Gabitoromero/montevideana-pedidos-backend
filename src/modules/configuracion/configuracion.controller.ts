import { Request, Response, NextFunction } from 'express';
import { getORM } from '../../shared/db/orm.js';
import { Configuracion } from './configuracion.entity.js';
import { updateConfiguracionSchema } from './configuracion.schema.js';

export const getConfiguracion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orm = getORM();
    const repo = orm.em.getRepository(Configuracion);
    
    let config = await repo.findOne({ id: 1 });
    if (!config) {
      config = repo.create({ 
        id: 1, 
        horaConsultaPreventaManana: '13:00',
        lastTriggeredDate: '',
        queriesRemaining: 0
      });
      await orm.em.persistAndFlush(config);
    }
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateConfiguracion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orm = getORM();
    const repo = orm.em.getRepository(Configuracion);
    
    const validatedData = updateConfiguracionSchema.parse(req.body);
    
    let config = await repo.findOne({ id: 1 });
    if (!config) {
      config = repo.create({ 
        id: 1, 
        horaConsultaPreventaManana: '13:00',
        lastTriggeredDate: '',
        queriesRemaining: 0,
        ...validatedData 
      });
    } else {
      repo.assign(config, validatedData);
    }
    
    await orm.em.persistAndFlush(config);
    
    res.json({
      success: true,
      data: config,
      message: 'Configuración actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
