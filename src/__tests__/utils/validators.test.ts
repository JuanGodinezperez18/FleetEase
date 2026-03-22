/**
 * @fileoverview Tests para validadores de input
 */

import { validators, compose, sanitizeUserInput } from '@/lib/validators';

describe('Validators', () => {
  describe('email', () => {
    it('debería validar emails correctos', () => {
      expect(validators.email('test@example.com')).toBeNull();
      expect(validators.email('user.name@domain.org')).toBeNull();
      expect(validators.email('user+tag@example.co.uk')).toBeNull();
    });

    it('debería rechazar emails inválidos', () => {
      expect(validators.email('')).toBe('Email es requerido');
      expect(validators.email('invalid')).toBe('Email inválido');
      expect(validators.email('invalid@')).toBe('Email inválido');
      expect(validators.email('@example.com')).toBe('Email inválido');
      expect(validators.email('user@domain')).toBe('Email inválido');
    });
  });

  describe('phone', () => {
    it('debería validar teléfonos mexicanos de 10 dígitos', () => {
      expect(validators.phone('5512345678')).toBeNull();
      expect(validators.phone('55 1234 5678')).toBeNull();
      expect(validators.phone('55-12-34-56-78')).toBeNull();
      expect(validators.phone('(55) 1234 5678')).toBeNull();
    });

    it('debería rechazar teléfonos inválidos', () => {
      expect(validators.phone('')).toBe('Teléfono es requerido');
      expect(validators.phone('1234567')).toBe('Teléfono debe tener 10 dígitos');
      expect(validators.phone('12345678901')).toBe('Teléfono debe tener 10 dígitos');
      expect(validators.phone('abcdefghij')).toBe('Teléfono debe tener 10 dígitos');
    });
  });

  describe('plate', () => {
    it('debería validar placas mexicanas válidas', () => {
      expect(validators.plate('ABC-1234')).toBeNull();
      expect(validators.plate('AB-12345')).toBeNull();
      expect(validators.plate('ABC-12-34')).toBeNull();
      expect(validators.plate('abc-1234')).toBeNull(); // Debería funcionar en minúsculas
    });

    it('debería rechazar placas inválidas', () => {
      expect(validators.plate('')).toBe('Placa es requerida');
      const message = 'Formato de placa inválido (ej: ABC-1234)';
      expect(validators.plate('ABC1234')).toBe(message);
      expect(validators.plate('AB-1234')).toBe(message);
      expect(validators.plate('123-ABC')).toBe(message);
      expect(validators.plate('ABC-123')).toBe(message);
    });
  });

  describe('currency', () => {
    it('debería validar cantidades numéricas válidas', () => {
      expect(validators.currency(0)).toBeNull();
      expect(validators.currency(100)).toBeNull();
      expect(validators.currency(10000000)).toBeNull();
      expect(validators.currency('100')).toBeNull();
      expect(validators.currency('100.50')).toBeNull();
    });

    it('debería rechazar cantidades inválidas', () => {
      expect(validators.currency(-1)).toBe('No puede ser negativo');
      expect(validators.currency(10000001)).toBe('Cantidad demasiado alta');
      expect(validators.currency('abc')).toBe('Debe ser un número válido');
      expect(validators.currency(NaN)).toBe('Debe ser un número válido');
    });

    it('debería permitir valores opcionales', () => {
      expect(validators.currency(undefined)).toBeNull();
      expect(validators.currency(null as any)).toBeNull();
    });
  });

  describe('required', () => {
    it('debería validar valores requeridos', () => {
      expect(validators.required('value')).toBeNull();
      expect(validators.required(0)).toBeNull();
      expect(validators.required(false)).toBeNull();
    });

    it('debería rechazar valores vacíos', () => {
      expect(validators.required('')).toBe('Este campo es requerido');
      expect(validators.required('   ')).toBe('Este campo es requerido');
      expect(validators.required(null)).toBe('Este campo es requerido');
      expect(validators.required(undefined)).toBe('Este campo es requerido');
    });
  });

  describe('vin', () => {
    it('valida longitud correcta', () => {
      expect(validators.vin('1HGCM82633A004352')).toBeNull();
      expect(validators.vin('123')).toBe('VIN debe tener 17 caracteres');
    });
  });

  describe('minLength/maxLength', () => {
    it('aplica validaciones de longitud', () => {
      const min3 = validators.minLength(3);
      const max5 = validators.maxLength(5);
      expect(min3('ab')).toBe('Debe tener al menos 3 caracteres');
      expect(min3('abcd')).toBeNull();
      expect(max5('abcdef')).toBe('No debe exceder 5 caracteres');
      expect(max5('abc')).toBeNull();
    });
  });

  describe('sanitizeUserInput', () => {
    it('elimina etiquetas script y HTML', () => {
      const dirty = '<script>alert(1)</script><b>hola</b>';
      const clean = sanitizeUserInput(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<b>');
    });
  });

  describe('compose', () => {
    it('detiene en la primera validación con error', () => {
      const composed = compose(validators.required, validators.email);
      expect(composed('')).toBe('Este campo es requerido');
      expect(composed('bad-email')).toBe('Email inválido');
      expect(composed('valid@example.com')).toBeNull();
    });
  });
});
