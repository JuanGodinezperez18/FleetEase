import { z } from 'zod';

/**
 * VINs contain exactly 17 uppercase letters/digits, excluding I, O and Q.
 * Whitespace is ignored; valid characters (including S) are never removed.
 */
export const vinSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, '').toUpperCase())
  .refine(
    (value) => /^[A-HJ-NPR-Z0-9]{17}$/.test(value),
    'VIN inválido. Debe contener 17 caracteres y no incluir I, O ni Q.',
  );
