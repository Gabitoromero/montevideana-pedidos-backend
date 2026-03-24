import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;

export class HashUtil {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Genera un hash rápido (sha256 + HMAC) para PINs de operarios.
   * Optimizado para búsqueda O(1) en base de datos.
   */
  static fastHash(text: string): string {
    const salt = process.env.PIN_HASH_SALT;
    if (!salt) {
      throw new Error('PIN_HASH_SALT no configurado en el entorno');
    }
    return crypto
      .createHmac('sha256', salt)
      .update(text)
      .digest('hex');
  }
}
