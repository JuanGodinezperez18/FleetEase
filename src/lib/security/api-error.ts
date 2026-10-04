/**
 * Respuestas de error opacas para las API routes de FleetEase.
 *
 * Regla: nunca enviar al cliente mensajes internos (errores de Postgres,
 * Supabase, stack traces, SQL). El detalle se registra SIEMPRE en el servidor
 * con un `requestId` para poder correlacionar soporte ↔ logs.
 */

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export type ApiErrorBody = {
  success: false;
  message: string;
  requestId?: string;
  /** Detalles de validación seguros (solo rutas de campo + código). */
  issues?: Array<{ path: string; message: string; code: string }>;
};

export function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Registra el error real en el servidor y devuelve un requestId correlacionable.
 * El mensaje interno NUNCA sale hacia el cliente.
 */
export function logServerError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): string {
  const requestId = newRequestId();
  const safeError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
  console.error(`[${scope}]`, JSON.stringify({ requestId, ...context, error: safeError }));
  return requestId;
}

export function apiError(
  status: number,
  message: string,
  extra?: { requestId?: string; issues?: ApiErrorBody['issues'] },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { success: false, message };
  if (extra?.requestId) body.requestId = extra.requestId;
  if (extra?.issues?.length) body.issues = extra.issues;
  return NextResponse.json(body, { status });
}

/** 500 opaco: registra el detalle real, responde mensaje genérico. */
export function internalError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  const requestId = logServerError(scope, error, context);
  return apiError(500, 'Error interno del servidor', { requestId });
}

/** 400 por validación. Solo expone rutas de campo y mensajes del esquema. */
export function validationError(
  error: ZodError | string,
): NextResponse<ApiErrorBody> {
  if (typeof error === 'string') {
    return apiError(400, error);
  }
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
  return apiError(400, 'Datos de entrada inválidos', { issues });
}

export function unauthorized(message = 'No autenticado.'): NextResponse<ApiErrorBody> {
  return apiError(401, message);
}

export function forbidden(message = 'No tienes permisos para esta acción.'): NextResponse<ApiErrorBody> {
  return apiError(403, message);
}

export function notFound(message = 'Recurso no encontrado.'): NextResponse<ApiErrorBody> {
  return apiError(404, message);
}

export function tooManyRequests(retryAfterSeconds = 60): NextResponse<ApiErrorBody> {
  const response = apiError(429, 'Demasiadas solicitudes. Intenta más tarde.');
  response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}

export function badRequest(message: string): NextResponse<ApiErrorBody> {
  return apiError(400, message);
}

// ---------------------------------------------------------------------------
// Mapeo seguro de errores de autenticación
// ---------------------------------------------------------------------------

const AUTH_MESSAGE_MAP: Record<string, string> = {
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  invalid_credentials: 'Credenciales inválidas.',
  weak_password: 'La contraseña no cumple los requisitos de seguridad.',
  validation_failed: 'Datos de entrada inválidos.',
  user_not_found: 'No se encontró la cuenta.',
  over_email_send_rate_limit: 'Demasiados correos enviados. Intenta más tarde.',
  over_request_rate_limit: 'Demasiadas solicitudes. Intenta más tarde.',
  phone_exists: 'Ya existe una cuenta con ese teléfono.',
};

/**
 * Traduce códigos de error de Auth a mensajes amigables y seguros.
 * Cualquier código desconocido cae en el fallback opaco: nunca se filtra
 * `error.message` crudo al cliente.
 */
export function authErrorMessage(
  error: { code?: string | undefined; message?: string | undefined } | null | undefined,
  fallback: string,
): string {
  const code = error?.code ?? '';
  return AUTH_MESSAGE_MAP[code] ?? fallback;
}
