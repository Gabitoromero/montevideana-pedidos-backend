import { describe, it, expect } from 'vitest';
import { 
  ESTADO_IDS, 
  ESTADO_NOMBRES, 
  SECTORES,
  esEstadoTesoreria,
  puedeRealizarMovimientoCamara,
  puedeRealizarMovimientoExpedicion,
  esEstadoDeCamara,
  esEstadoDeExpedicion
} from '../src/shared/constants/estados.js';

describe('Estado Constants', () => {
  describe('ESTADO_IDS', () => {
    it('should have correct state IDs', () => {
      expect(ESTADO_IDS.CHESS).toBe(1);
      expect(ESTADO_IDS.PENDIENTE).toBe(2);
      expect(ESTADO_IDS.EN_PREPARACION).toBe(3);
      expect(ESTADO_IDS.PREPARADO).toBe(4);
      expect(ESTADO_IDS.TESORERIA).toBe(5);
      expect(ESTADO_IDS.ENTREGADO).toBe(6);
    });
  });

  describe('esEstadoTesoreria', () => {
    it('should return true for TESORERIA state', () => {
      expect(esEstadoTesoreria(ESTADO_IDS.TESORERIA)).toBe(true);
    });

    it('should return false for other states', () => {
      expect(esEstadoTesoreria(ESTADO_IDS.CHESS)).toBe(false);
      expect(esEstadoTesoreria(ESTADO_IDS.PENDIENTE)).toBe(false);
      expect(esEstadoTesoreria(ESTADO_IDS.EN_PREPARACION)).toBe(false);
      expect(esEstadoTesoreria(ESTADO_IDS.PREPARADO)).toBe(false);
      expect(esEstadoTesoreria(ESTADO_IDS.ENTREGADO)).toBe(false);
    });
  });

  describe('puedeRealizarMovimientoCamara', () => {
    it('should return true for camara sector', () => {
      expect(puedeRealizarMovimientoCamara(SECTORES.CAMARA)).toBe(true);
    });

    it('should return true for admin sector', () => {
      expect(puedeRealizarMovimientoCamara(SECTORES.ADMIN)).toBe(true);
    });

    it('should return true for CHESS sector', () => {
      expect(puedeRealizarMovimientoCamara(SECTORES.CHESS)).toBe(true);
    });

    it('should return false for expedicion sector', () => {
      expect(puedeRealizarMovimientoCamara(SECTORES.EXPEDICION)).toBe(false);
    });
  });

  describe('puedeRealizarMovimientoExpedicion', () => {
    it('should return true for expedicion sector', () => {
      expect(puedeRealizarMovimientoExpedicion(SECTORES.EXPEDICION)).toBe(true);
    });

    it('should return true for admin sector', () => {
      expect(puedeRealizarMovimientoExpedicion(SECTORES.ADMIN)).toBe(true);
    });

    it('should return true for CHESS sector', () => {
      expect(puedeRealizarMovimientoExpedicion(SECTORES.CHESS)).toBe(true);
    });

    it('should return false for camara sector', () => {
      expect(puedeRealizarMovimientoExpedicion(SECTORES.CAMARA)).toBe(false);
    });
  });

  describe('esEstadoDeCamara', () => {
    it('should return true for camara states', () => {
      expect(esEstadoDeCamara(ESTADO_IDS.EN_PREPARACION)).toBe(true);
      expect(esEstadoDeCamara(ESTADO_IDS.PREPARADO)).toBe(true);
    });

    it('should return false for non-camara states', () => {
      expect(esEstadoDeCamara(ESTADO_IDS.CHESS)).toBe(false);
      expect(esEstadoDeCamara(ESTADO_IDS.PENDIENTE)).toBe(false);
      expect(esEstadoDeCamara(ESTADO_IDS.TESORERIA)).toBe(false);
      expect(esEstadoDeCamara(ESTADO_IDS.ENTREGADO)).toBe(false);
    });
  });

  describe('esEstadoDeExpedicion', () => {
    it('should return true for expedicion states', () => {
      expect(esEstadoDeExpedicion(ESTADO_IDS.TESORERIA)).toBe(true);
      expect(esEstadoDeExpedicion(ESTADO_IDS.ENTREGADO)).toBe(true);
    });

    it('should return false for non-expedicion states', () => {
      expect(esEstadoDeExpedicion(ESTADO_IDS.CHESS)).toBe(false);
      expect(esEstadoDeExpedicion(ESTADO_IDS.PENDIENTE)).toBe(false);
      expect(esEstadoDeExpedicion(ESTADO_IDS.EN_PREPARACION)).toBe(false);
      expect(esEstadoDeExpedicion(ESTADO_IDS.PREPARADO)).toBe(false);
    });
  });
});
