import { Usuario } from "../../modules/usuarios/usuario.entity.js";
import { HashUtil } from "./hash.js";

/**
 * LRU Cache para usuarios que realizan movimientos.
 * Mantiene en memoria los últimos usuarios autenticados para evitar 
 * búsquedas costosas de Bcrypt sobre toda la base de datos.
 */
export class UserCache {
  private static instance: UserCache;
  private buffer: Usuario[] = [];
  private readonly MAX_SIZE = 10;

  private constructor() {}

  public static getInstance(): UserCache {
    if (!UserCache.instance) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  /**
   * Intenta encontrar un usuario en el buffer probando el PIN 
   * contra sus hashes de Bcrypt.
   */
  async findInCache(pin: string): Promise<Usuario | null> {
    for (const user of this.buffer) {
      // Usamos el passwordHash (Bcrypt) del usuario guardado
      const isMatch = await HashUtil.compare(pin, user.passwordHash);
      if (isMatch) {
        // Mover al principio por ser el más reciente
        this.markAsRecent(user);
        return user;
      }
    }
    return null;
  }

  /**
   * Agrega un usuario al principio del buffer o lo actualiza si ya existe.
   */
  addToCache(user: Usuario) {
    this.markAsRecent(user);
    if (this.buffer.length > this.MAX_SIZE) {
      this.buffer.pop(); // Eliminar el menos usado recientemente
    }
  }

  private markAsRecent(user: Usuario) {
    // Filtramos el usuario si ya existe y lo ponemos al inicio
    this.buffer = [user, ...this.buffer.filter(u => u.id !== user.id)];
  }

  /**
   * Limpia el cache (útil para tests o reinicios de seguridad)
   */
  clear() {
    this.buffer = [];
  }
}
