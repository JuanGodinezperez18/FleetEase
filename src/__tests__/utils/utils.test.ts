/**
 * @fileoverview Tests para utilidades de formato
 */

import { formatCurrency, formatNumber, cn, sanitizeAndFormatData, getStatusVariant, formatTime, infallibleNormalizeDate } from '@/lib/utils';

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('debería formatear cantidades como moneda mexicana', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(100.5)).toBe('$100.50');
      expect(formatCurrency(1000.99)).toBe('$1,000.99');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('debería manejar valores negativos', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
      expect(formatCurrency(-50.25)).toBe('-$50.25');
    });

    it('debería retornar $0.00 para valores inválidos', () => {
      expect(formatCurrency(NaN)).toBe('$0.00');
      expect(formatCurrency(Infinity)).toBe('$0.00');
      expect(formatCurrency(null as any)).toBe('$0.00');
      expect(formatCurrency(undefined as any)).toBe('$0.00');
      expect(formatCurrency('invalid' as any)).toBe('$0.00');
    });
  });

  describe('formatNumber', () => {
    it('debería formatear números con separadores de miles', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('debería retornar "0" para valores inválidos', () => {
      expect(formatNumber(NaN)).toBe('0');
      expect(formatNumber(Infinity)).toBe('0');
      expect(formatNumber(null as any)).toBe('0');
      expect(formatNumber(undefined as any)).toBe('0');
    });
  });

  describe('cn (classNames)', () => {
    it('debería combinar clases correctamente', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
      expect(cn('foo', null, 'bar')).toBe('foo bar');
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });

    it('debería manejar objetos condicionales', () => {
      expect(cn('foo', { bar: true })).toContain('foo');
      expect(cn('foo', { bar: true })).toContain('bar');
      expect(cn('foo', { bar: false })).not.toContain('bar');
    });

    it('debería manejar arrays', () => {
      expect(cn(['foo', 'bar'])).toContain('foo');
      expect(cn(['foo', 'bar'])).toContain('bar');
    });

    it('debería retornar string vacío para sin entradas', () => {
      expect(cn()).toBe('');
      expect(cn(null, undefined, false)).toBe('');
    });
  });

  describe('sanitizeAndFormatData', () => {
    it('remueve undefined y convierte strings vacíos en null', () => {
      const result = sanitizeAndFormatData({ a: 'value', b: undefined, c: '' });
      expect(result).toEqual({ a: 'value', c: null });
    });
  });

  describe('getStatusVariant', () => {
    it('devuelve variante según estado', () => {
      expect(getStatusVariant('active')).toBe('default');
      expect(getStatusVariant('maintenance')).toBe('secondary');
      expect(getStatusVariant('sold')).toBe('destructive');
      expect(getStatusVariant('unknown' as any)).toBe('outline');
    });
  });

  describe('formatTime', () => {
    it('convierte ms a mm:ss', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(1500)).toBe('00:02');
      expect(formatTime(61_000)).toBe('01:01');
    });
  });

  describe('infallibleNormalizeDate', () => {
    it('normaliza fechas válidas y devuelve null en inválidas', () => {
      const date = new Date('2024-01-01');
      expect(infallibleNormalizeDate(date)).toEqual(date);
      expect(infallibleNormalizeDate(date.getTime())?.getTime()).toBe(date.getTime());
      expect(infallibleNormalizeDate('01/02/2024')).not.toBeNull();
      expect(infallibleNormalizeDate('invalid')).toBeNull();
    });
  });
});
