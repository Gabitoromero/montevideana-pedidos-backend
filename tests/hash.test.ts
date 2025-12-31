import { describe, it, expect } from 'vitest';
import { HashUtil } from '../src/shared/utils/hash.js';

describe('Password Hashing', () => {
  const testPassword = 'SecurePassword123!';

  describe('hash', () => {
    it('should hash a password', async () => {
      const hash = await HashUtil.hash(testPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword); // Hash no debe ser igual a la contraseña
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await HashUtil.hash(testPassword);
      const hash2 = await HashUtil.hash(testPassword);
      
      // Bcrypt usa salt aleatorio, por lo que los hashes serán diferentes
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const hash = await HashUtil.hash(testPassword);
      const isValid = await HashUtil.compare(testPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await HashUtil.hash(testPassword);
      const isValid = await HashUtil.compare('WrongPassword', hash);
      
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await HashUtil.hash(testPassword);
      const isValid = await HashUtil.compare('', hash);
      
      expect(isValid).toBe(false);
    });
  });
});
