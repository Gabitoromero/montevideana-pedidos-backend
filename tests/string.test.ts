import { describe, it, expect } from 'vitest';
import { StringUtil } from '../src/shared/utils/string.js';

describe('String Utilities', () => {
  describe('sanitize', () => {
    it('should remove special characters', () => {
      const input = 'test<script>alert("xss")</script>';
      const result = StringUtil.sanitize(input);
      
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
    });

    it('should keep alphanumeric characters', () => {
      const input = 'abc123XYZ';
      const result = StringUtil.sanitize(input);
      
      expect(result).toBe('abc123XYZ');
    });

    it('should keep spaces, hyphens and underscores', () => {
      const input = 'test-value_123 abc';
      const result = StringUtil.sanitize(input);
      
      expect(result).toBe('test-value_123 abc');
    });

    it('should handle non-string input', () => {
      const result = StringUtil.sanitize(123 as any);
      expect(result).toBe('123');
    });
  });

  describe('sanitizePedidoId', () => {
    it('should sanitize pedido ID', () => {
      const input = '0001 - 00123456<script>';
      const result = StringUtil.sanitizePedidoId(input);
      
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const input = 'a'.repeat(200);
      const result = StringUtil.truncate(input, 100);
      
      expect(result.length).toBe(103); // 100 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const input = 'short string';
      const result = StringUtil.truncate(input, 100);
      
      expect(result).toBe(input);
    });
  });
});
