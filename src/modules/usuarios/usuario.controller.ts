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
      nombre: data.nombre,
      apellido: data.apellido,
      sector: data.sector,
      passwordHash
    });

    await em.persist(usuario).flush();

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
    };
  }

  async findAll() {
    const em = fork();
    const usuarios = await em.find(Usuario, {});
    
    if (usuarios.length === 0) {
      throw AppError.notFound('No hay usuarios registrados');
    }

    return usuarios.map((u: Usuario) => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      sector: u.sector,
    }));
  }

  async findById(id: number) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
    };
  }

  async update(id: number, data: UpdateUsuarioDTO) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    if (data.nombre) usuario.nombre = data.nombre;
    if (data.apellido) usuario.apellido = data.apellido;
    if (data.sector) usuario.sector = data.sector;
    if (data.password) {
      usuario.passwordHash = await HashUtil.hash(data.password);
    }

    await em.flush();

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
    };
  }

  async delete(id: number) {
    const em = fork();
    const usuario = await em.findOne(Usuario, { id });

    if (!usuario) {
      throw AppError.notFound(`Usuario con ID ${id} no encontrado`);
    }

    await em.removeAndFlush(usuario);

    return { message: 'Usuario eliminado exitosamente' };
  }
}
