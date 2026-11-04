
import DOMPurify from 'dompurify';
import { useState, useCallback } from 'react';
import { vinSchema } from '@/lib/schemas/vin';
import { currencySchema, emailSchema, phoneSchema, plateSchema, requiredValueSchema } from '@/lib/schemas/fields';

/**
 * Validadores de input en tiempo real
 */
export const validators = {
  email: (value: string): string | null => {
    const result = emailSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'Email inválido';
  },

  phone: (value: string): string | null => {
    const result = phoneSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'Teléfono inválido';
  },

  plate: (value: string): string | null => {
    const result = plateSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'Formato de placa inválido';
  },

  vin: (value: string): string | null => {
    if (!value) return null; // Opcional
    const result = vinSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'VIN inválido.';
  },

  currency: (value: string | number | undefined): string | null => {
    const result = currencySchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'Debe ser un número válido';
  },

  required: (value: any): string | null => {
    const result = requiredValueSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message || 'Este campo es requerido';
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
