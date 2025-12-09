import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export class HashUtil {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
