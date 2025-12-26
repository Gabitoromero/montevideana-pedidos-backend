import { Request, Response } from 'express';
import { FleterosService } from './fletero.service.js';
import { fork } from '../../shared/db/orm.js';

export class FleterosController {
  /**
   * GET /fleteros - Listar todos los fleteros
   */
  async findAll(req: Request, res: Response): Promise<void> {
    const em = fork();
    const service = new FleterosService(em);
    const fleteros = await service.findAll();
    res.json({ success: true, data: fleteros });
  }

  /**
   * GET /fleteros/activos - Listar fleteros con seguimiento activo
   */
  async findActivos(req: Request, res: Response): Promise<void> {
    const em = fork();
    const service = new FleterosService(em);
    const fleteros = await service.findActivos();
    res.json({ success: true, data: fleteros });
  }

  /**
   * GET /fleteros/:id - Obtener un fletero específico
   */
  async findOne(req: Request, res: Response): Promise<void> {
    const em = fork();
    const service = new FleterosService(em);
    const id = parseInt(req.params.id);
    const fletero = await service.findOne(id);
    res.json({ success: true, data: fletero });
  }

  /**
   * PATCH /fleteros/:id - Actualizar campo seguimiento
   */
  async update(req: Request, res: Response): Promise<void> {
    const em = fork();
    const service = new FleterosService(em);
    const id = parseInt(req.params.id);
    const { seguimiento } = req.body;
    
    const fletero = await service.update(id, seguimiento);
    res.json({ success: true, data: fletero });
  }
}

