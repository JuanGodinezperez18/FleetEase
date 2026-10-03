/**
 * Validación de entradas con Zod para las API routes de FleetEase.
 *
 * Uso:
 * ```typescript
 * const parsed = await parseJsonBody(request, z.object({ email: emailSchema }));
 * if (!parsed.ok) return parsed.response;
 * const { email } = parsed.data;
 * ```
 */

import { z, type ZodTypeAny, type ZodError } from 'zod';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { validationError, type ApiErrorBody } from './api-error';

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/** Límite de tamaño para bodies JSON (protección contra payloads gigantes). */
const MAX_JSON_BYTES = 1_000_000; // 1 MB

/**
 * Parsea y valida el body JSON de la request. Devuelve un error 400 opaco
 * si el JSON está malformado o no cumple el esquema.
 */
export async function parseJsonBody<T extends ZodTypeAny>(
  request: NextRequest,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return { ok: false, response: validationError('Cuerpo de la solicitud demasiado grande.') };
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: validationError('Cuerpo JSON inválido o vacío.') };
  }

  return parseValue(raw, schema);
}

/** Valida un valor ya obtenido (query params, body parseado a mano, etc.). */
export function parseValue<T extends ZodTypeAny>(
  raw: unknown,
  schema: T,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: validationError(result.error as ZodError) };
  }
  return { ok: true, data: result.data as z.infer<T> };
}

/**
 * Extrae campos string de FormData y los valida con un esquema Zod.
 * Los campos ausentes quedan como `undefined` (usar `.optional()` en el schema).
 */
export function parseFormFields<T extends ZodTypeAny>(
  formData: FormData,
  schema: T,
  keys: string[],
): ParseResult<z.infer<T>> {
  const raw: Record<string, unknown> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (value === null) continue;
    // Solo strings de formulario; File se valida aparte.
    if (typeof value === 'string') raw[key] = value;
  }
  return parseValue(raw, schema);
}

// ---------------------------------------------------------------------------
// Esquemas reutilizables
// ---------------------------------------------------------------------------

export const idSchema = z.string().uuid('Identificador inválido.');
export const emailSchema = z.string().trim().toLowerCase().email('Email inválido.').max(254);
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede exceder 128 caracteres.');
export const nameSchema = z.string().trim().min(1, 'Campo requerido.').max(120);
export const optionalNameSchema = z.string().trim().max(120).optional();
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Teléfono inválido.')
  .optional();
export const roleSchema = z.enum(['super_admin', 'admin', 'manager', 'user', 'driver', 'viewer']);
export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD).');
export const urlSchema = z.string().trim().url('URL inválida.').max(2048);
export const uuidOrEmptySchema = z.union([idSchema, z.literal('')]);

/** Cualquier string de texto corto saneado (sin HTML, longitud acotada). */
export const shortTextSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !/[<>]/.test(v), 'Caracteres no permitidos.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Campos comunes de uploads de imagen por vehículo. */
export const vehicleUploadFieldsSchema = z.object({
  vehicleId: idSchema,
  view: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Vista inválida.'),
});

export const uploadFolderSchema = z.enum([
  'vehicle_images',
  'driver_documents',
  'financial_receipts',
  'general_documents',
  'contract_templates',
  'company_logos',
]);

export const generalUploadFieldsSchema = z.object({
  folder: uploadFolderSchema,
  entityId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v && v !== 'unassigned' ? v : undefined)),
  originalName: z.string().trim().max(255).optional(),
});

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/jpg',
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Valida File de FormData (tipo + tamaño). */
export function validateUploadFile(
  file: FormDataEntryValue | null,
  allowedMimes: readonly string[] = IMAGE_MIME_TYPES,
  maxBytes: number = MAX_UPLOAD_BYTES,
): ParseResult<File> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, response: validationError('No se encontró archivo en la solicitud.') };
  }
  if (file.size > maxBytes) {
    return { ok: false, response: validationError('Archivo demasiado grande. Límite: 10MB') };
  }
  const type = file.type || guessMimeFromName(file.name);
  if (!allowedMimes.includes(type) && !allowedMimes.includes(file.type)) {
    return {
      ok: false,
      response: validationError(
        `Tipo de archivo no permitido. Permitidos: ${allowedMimes.join(', ')}`,
      ),
    };
  }
  return { ok: true, data: file };
}

function guessMimeFromName(name: string): string {
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.heic$/i.test(name)) return 'image/heic';
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  return '';
}
