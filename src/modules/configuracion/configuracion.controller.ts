import { Request, Response, NextFunction } from 'express';
import { fork } from '../../shared/db/orm.js';
import { Configuracion } from './configuracion.entity.js';
import { updateConfiguracionSchema } from './configuracion.schema.js';

export const getConfiguracion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const em = fork();
    const repo = em.getRepository(Configuracion);
    
    let config = await repo.findOne({ id: 1 });
    if (!config) {
      config = repo.create({ 
        id: 1, 
        horaConsultaPreventaManana: '13:00',
        lastTriggeredDate: '',
        queriesRemaining: 0
      });
      await em.persist(config);
      await em.flush();
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
    const em = fork();
    const repo = em.getRepository(Configuracion);
    
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
    
    await em.persist(config);
    await em.flush();
    
    res.json({
      success: true,
      data: config,
      message: 'Configuración actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
