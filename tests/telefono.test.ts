import { describe, it, expect } from 'vitest';
import { normalizarTelefonoArgentina } from '../src/shared/utils/telefono.js';

describe('Normalización de Teléfonos en Argentina', () => {
  it('debe manejar el formato local estándar limpio', () => {
    // Rosario 341 + número de 7 dígitos
    const result = normalizarTelefonoArgentina('3415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe quitar el prefijo local de celulares "15" de Rosario', () => {
    // 341 + 15 + número de 7 dígitos (Rosario móvil habitual) = 12 dígitos
    const result = normalizarTelefonoArgentina('341155555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe quitar el prefijo local "15" para códigos de área de 2 dígitos (Buenos Aires)', () => {
    // 11 + 15 + número de 8 dígitos = 12 dígitos
    const result = normalizarTelefonoArgentina('111555555555');
    expect(result).toBe('5491155555555@c.us');
  });

  it('debe quitar el prefijo local "15" para códigos de área de 4 dígitos (San Lorenzo/otros)', () => {
    // 3476 + 15 + número de 6 dígitos = 12 dígitos
    const result = normalizarTelefonoArgentina('347615555555');
    expect(result).toBe('5493476555555@c.us');
  });

  it('debe quitar el "0" de larga distancia nacional', () => {
    // 0341 + número = 11 dígitos
    const result = normalizarTelefonoArgentina('03415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe quitar el "0" de larga distancia nacional y el prefijo de celular "15" juntos', () => {
    // 0341 + 15 + número = 13 dígitos
    const result = normalizarTelefonoArgentina('0341155555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe normalizar números internacionales incompletos (sin el 9 obligatorio)', () => {
    // 54 + área + número (ej. fijos o celulares guardados sin el 9)
    const result = normalizarTelefonoArgentina('543415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe normalizar números internacionales erróneos con el prefijo "15" de celular', () => {
    // 54 + 15 + área + número
    const result = normalizarTelefonoArgentina('54153415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe dejar intactos los números que ya están en el formato internacional correcto de celular', () => {
    // 549 + área + número
    const result = normalizarTelefonoArgentina('5493415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe limpiar caracteres especiales, guiones, símbolos + y espacios', () => {
    const result = normalizarTelefonoArgentina('+54 9 (341) 555-5555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe manejar números locales cargados con el 9 adelante pero sin el 54', () => {
    // 9 + área + número (11 dígitos en total)
    const result = normalizarTelefonoArgentina('93415555555');
    expect(result).toBe('5493415555555@c.us');
  });

  it('debe devolver vacío si recibe strings vacíos o sin dígitos', () => {
    expect(normalizarTelefonoArgentina('')).toBe('');
    expect(normalizarTelefonoArgentina('   ')).toBe('');
    expect(normalizarTelefonoArgentina('abc')).toBe('');
  });
});
