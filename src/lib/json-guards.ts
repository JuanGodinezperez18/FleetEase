import type { Json } from '@/lib/supabase-browser';

export function isJsonObject(value: Json | null | undefined): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value).every(item => item === undefined || isJsonValue(item));
}

/** Serializes an RPC payload through JSON and verifies the result is an object. */
export function toJsonObject(value: Record<string, unknown>): { [key: string]: Json | undefined } {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('El payload RPC debe ser un objeto JSON.');
  const parsed: unknown = JSON.parse(serialized);
  if (!isJsonValue(parsed) || parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new TypeError('El payload RPC debe ser un objeto JSON.');
  }
  return parsed;
}
