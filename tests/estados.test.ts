import { describe, it, expect } from 'vitest';
import { 
  ESTADO_IDS, 
  ESTADO_NOMBRES, 
  SECTORES,
  esEstadoPagado,
  puedeRealizarMovimientoArmado,
  puedeRealizarMovimientoFacturacion,
  esEstadoDeArmado
} from '../src/shared/constants/estados.js';

describe('Estado Constants', () => {
  describe('ESTADO_IDS', () => {
    it('should have correct state IDs', () => {
      expect(ESTADO_IDS.CHESS).toBe(1);
      expect(ESTADO_IDS.PENDIENTE).toBe(2);
      expect(ESTADO_IDS.EN_PREPARACION).toBe(3);
      expect(ESTADO_IDS.PREPARADO).toBe(4);
      expect(ESTADO_IDS.PAGADO).toBe(5);
      expect(ESTADO_IDS.ENTREGADO).toBe(6);
    });
  });

  describe('esEstadoPagado', () => {
    it('should return true for PAGADO state', () => {
      expect(esEstadoPagado(ESTADO_IDS.PAGADO)).toBe(true);
    });

    it('should return false for other states', () => {
      expect(esEstadoPagado(ESTADO_IDS.CHESS)).toBe(false);
      expect(esEstadoPagado(ESTADO_IDS.PENDIENTE)).toBe(false);
      expect(esEstadoPagado(ESTADO_IDS.EN_PREPARACION)).toBe(false);
      expect(esEstadoPagado(ESTADO_IDS.PREPARADO)).toBe(false);
      expect(esEstadoPagado(ESTADO_IDS.ENTREGADO)).toBe(false);
    });
  });

  describe('puedeRealizarMovimientoArmado', () => {
    it('should return true for armado sector', () => {
      expect(puedeRealizarMovimientoArmado(SECTORES.ARMADO)).toBe(true);
    });

    it('should return true for admin sector', () => {
      expect(puedeRealizarMovimientoArmado(SECTORES.ADMIN)).toBe(true);
    });

    it('should return true for CHESS sector', () => {
      expect(puedeRealizarMovimientoArmado(SECTORES.CHESS)).toBe(true);
    });

    it('should return false for facturacion sector', () => {
      expect(puedeRealizarMovimientoArmado(SECTORES.FACTURACION)).toBe(false);
    });
  });

  describe('puedeRealizarMovimientoFacturacion', () => {
    it('should return true for facturacion sector', () => {
      expect(puedeRealizarMovimientoFacturacion(SECTORES.FACTURACION)).toBe(true);
    });

    it('should return true for admin sector', () => {
      expect(puedeRealizarMovimientoFacturacion(SECTORES.ADMIN)).toBe(true);
    });

    it('should return true for CHESS sector', () => {
      expect(puedeRealizarMovimientoFacturacion(SECTORES.CHESS)).toBe(true);
    });

    it('should return false for armado sector', () => {
      expect(puedeRealizarMovimientoFacturacion(SECTORES.ARMADO)).toBe(false);
    });
  });

  describe('esEstadoDeArmado', () => {
    it('should return true for armado states', () => {
      expect(esEstadoDeArmado(ESTADO_IDS.EN_PREPARACION)).toBe(true);
      expect(esEstadoDeArmado(ESTADO_IDS.PREPARADO)).toBe(true);
      expect(esEstadoDeArmado(ESTADO_IDS.ENTREGADO)).toBe(true);
    });

    it('should return false for non-armado states', () => {
      expect(esEstadoDeArmado(ESTADO_IDS.CHESS)).toBe(false);
      expect(esEstadoDeArmado(ESTADO_IDS.PENDIENTE)).toBe(false);
      expect(esEstadoDeArmado(ESTADO_IDS.PAGADO)).toBe(false);
    });
  });
});
