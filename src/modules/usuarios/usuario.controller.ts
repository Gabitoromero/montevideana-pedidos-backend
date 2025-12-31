import { fork } from '../../shared/db/orm.js';
import { Usuario } from './usuario.entity.js';
import { CreateUsuarioDTO, UpdateUsuarioDTO } from './usuario.schema.js';
import { HashUtil } from '../../shared/utils/hash.js';
import { AppError } from '../../shared/errors/AppError.js';

export class UsuarioController {
  async create(data: CreateUsuarioDTO) {
    const em = fork();

    const passwordHash = await HashUtil.hash(data.password);

    const usuario = em.create(Usuario, {
      username: data.username,
      nombre: data.nombre,
      apellido: data.apellido,
      sector: data.sector,
      passwordHash,
      activo: true,
    });

    await em.persist(usuario).flush();

    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
      activo: usuario.activo,
    };
  }

  async findAll(page: number = 1, limit: number = 50) {
    const em = fork();
    
    const [usuarios, total] = await em.findAndCount(
      Usuario,
      {},
      {
        limit,
        offset: (page - 1) * limit,
        orderBy: { id: 'ASC' }
      }
    );
    
    if (total === 0) {
      throw AppError.notFound('No hay usuarios registrados');
    }

    return {
      data: usuarios.map((u: Usuario) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        sector: u.sector,
        activo: u.activo,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findActiveUsers(page: number = 1, limit: number = 50) {
    const em = fork();
    
    const [usuarios, total] = await em.findAndCount(
      Usuario,
      { activo: true },
      {
        limit,
        offset: (page - 1) * limit,
        orderBy: { id: 'ASC' }
      }
    );
    
    if (total === 0) {
      throw AppError.notFound('No hay usuarios activos');
    }

    return {
      data: usuarios.map((u: Usuario) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        sector: u.sector,
        activo: u.activo,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: number) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
      activo: usuario.activo,
    };
  }

  async update(id: number, data: UpdateUsuarioDTO) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    if (data.username) usuario.username = data.username;
    if (data.nombre) usuario.nombre = data.nombre;
    if (data.apellido) usuario.apellido = data.apellido;
    if (data.sector) usuario.sector = data.sector;
    if (data.password) {
      usuario.passwordHash = await HashUtil.hash(data.password);
    }

    await em.flush();

    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
    };
  }

  async delete(id: number) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id }, { populate: ['movimientos'] });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    // Eliminar todos los movimientos relacionados primero
    await em.nativeDelete('Movimiento', { usuario: id });

    // Ahora eliminar el usuario
    await em.remove(usuario).flush();

    return { message: 'Usuario eliminado exitosamente' };
  }

  async cambiarEstado(id: number) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    if (usuario.activo) {
      usuario.activo = false;
    } else {
      usuario.activo = true;
    }
    await em.flush();

    return { message: 'Usuario ' + (usuario.activo ? 'activado' : 'desactivado') + ' exitosamente' };
  }
}
