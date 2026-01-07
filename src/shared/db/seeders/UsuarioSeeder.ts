import type { EntityManager } from '@mikro-orm/core';
import { Usuario } from '../../../modules/usuarios/usuario.entity.js';
import { HashUtil } from '../../utils/hash.js';

/**
 * Seeder para crear usuarios iniciales del sistema
 * IMPORTANTE: Las contraseñas se hashean correctamente con bcrypt
 */
export async function seedUsuarios(em: EntityManager): Promise<void> {
  console.log('  👤 Creando usuarios iniciales...');

  const usuarios = [
    {
      username: 'CHESS',
      nombre: 'Sistema',
      apellido: 'Automatico',
      sector: 'CHESS',
      password: '52937', 
      activo: true,
    },
    {
      username: 'peter',
      nombre: 'Peter',
      apellido: 'Parker',
      sector: 'CAMARA',
      password: '1111', 
      activo: true,
    },
    {
      username: 'marce',
      nombre: 'Marcela',
      apellido: 'Macia',
      sector: 'EXPEDICION',
      password: '2222', 
      activo: true,
    }
  ];

  for (const userData of usuarios) {
    // Buscar si ya existe el usuario
    let usuario = await em.findOne(Usuario, { username: userData.username });

    if (!usuario) {
      // Hashear la contraseña antes de crear el usuario
      const passwordHash = await HashUtil.hash(userData.password);

      // Crear nuevo usuario
      usuario = em.create(Usuario, {
        username: userData.username,
        nombre: userData.nombre,
        apellido: userData.apellido,
        sector: userData.sector,
        passwordHash: passwordHash,
        activo: userData.activo,
      });

      await em.persist(usuario).flush();
      console.log(`✓ Usuario creado: ${userData.username} (password: ${userData.password})`);
    } else {
      console.log(`- Usuario ya existe: ${userData.username}`);
    }
  }

  console.log('✅ Usuarios listos');
}

