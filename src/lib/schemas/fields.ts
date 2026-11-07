import { z } from 'zod';

const mexicanPhoneDigitsSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 10, 'Teléfono debe tener 10 dígitos');

export const emailSchema = z
  .string()
  .min(1, 'Email es requerido')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido');

export const phoneSchema = z
  .string()
  .min(1, 'Teléfono es requerido')
  .pipe(mexicanPhoneDigitsSchema);

export const plateSchema = z
  .string()
  .trim()
  .transform(value => value.toUpperCase())
  .refine(
    value => /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value) && /^[A-Z0-9]{3,10}$/.test(value.replace(/-/g, '')),
    'La placa debe contener de 3 a 10 letras o números, con guiones opcionales.',
  );

export const currencySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return value;
    return typeof value === 'string' ? Number.parseFloat(value) : value;
  },
  z
    .number({ error: 'Debe ser un número válido' })
    .finite('Debe ser un número válido')
    .min(0, 'No puede ser negativo')
    .max(10_000_000, 'Cantidad demasiado alta')
    .nullable()
    .optional(),
);

export const requiredValueSchema = z.unknown().refine(
  (value) => value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === ''),
  'Este campo es requerido',
);
