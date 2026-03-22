
import DOMPurify from 'dompurify';
import { useState, useCallback } from 'react';

/**
 * Validadores de input en tiempo real
 */
export const validators = {
  email: (value: string): string | null => {
    if (!value) return "Email es requerido";
    // RFC 5322 compliant email regex (simplified)
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? null : "Email inválido";
  },

  phone: (value: string): string | null => {
    if (!value) return "Teléfono es requerido";
    const cleaned = value.replace(/\D/g, ''); // \D = non-digit characters
    if (cleaned.length !== 10) return "Teléfono debe tener 10 dígitos";
    return null;
  },

  plate: (value: string): string | null => {
    if (!value) return "Placa es requerida";
    // Formatos mexicanos: ABC-1234, AB-12345, ABC-12-34
    const patterns = [
      /^[A-Z]{3}-\d{4}$/,      // ABC-1234
      /^[A-Z]{2}-\d{5}$/,      // AB-12345
      /^[A-Z]{3}-\d{2}-\d{2}$/  // ABC-12-34
    ];
    const isValid = patterns.some(pattern => pattern.test(value.toUpperCase()));
    return isValid ? null : "Formato de placa inválido (ej: ABC-1234)";
  },

  vin: (value: string): string | null => {
    if (!value) return null; // Opcional
    const cleaned = value.replace(/s/g, '');
    if (cleaned.length !== 17) return "VIN debe tener 17 caracteres";
    return null;
  },

  currency: (value: string | number | undefined): string | null => {
    if (value === undefined || value === null) return null; // Allow optional
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "Debe ser un número válido";
    if (num < 0) return "No puede ser negativo";
    if (num > 10000000) return "Cantidad demasiado alta";
    return null;
  },

  required: (value: any): string | null => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return "Este campo es requerido";
    }
    return null;
  },

  minLength: (min: number) => (value: string): string | null => {
    if (!value || value.length < min) {
      return `Debe tener al menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string): string | null => {
    if (value && value.length > max) {
      return `No debe exceder ${max} caracteres`;
    }
    return null;
  }
};

/**
 * Sanitización de contenido de usuario
 */
export const sanitizeUserInput = (input: string): string => {
  if (typeof window !== 'undefined') {
    // En el cliente
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML allowed
      ALLOWED_ATTR: []
    });
  }
  // En el servidor, sanitización básica
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * Validador compuesto que ejecuta múltiples validaciones
 */
export function compose(...validators: Array<(value: any) => string | null>) {
  return (value: any): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}

/**
 * Hook para validación de formularios
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: Record<keyof T, (value: any) => string | null>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback((field: keyof T, value: any) => {
    const validator = validators[field];
    if (validator) {
      const error = validator(value);
      setErrors(prev => ({ ...prev, [field]: error }));
      return error;
    }
    return null;
  }, [validators]);

  const setValue = useCallback((field: keyof T, value: any) => {
    // Sanitizar si es string
    const sanitizedValue = typeof value === 'string' 
      ? value // No sanitizar aquí, dejar que react-hook-form/zod lo haga
      : value;
    
    setValues(prev => ({ ...prev, [field]: sanitizedValue }));
    validate(field, sanitizedValue);
  }, [validate]);

  const handleSetTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field of Object.keys(validators)) {
      const error = validate(field as keyof T, values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validate, validators]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched: handleSetTouched,
    validateAll,
    isValid: Object.keys(errors).length === 0 && Object.values(errors).every(e => !e)
  };
}
