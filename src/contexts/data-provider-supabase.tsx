/**
 * @fileoverview Data Provider con Supabase
 *
 * Provee el modelo de dominio (camelCase) a la UI adaptando las filas
 * snake_case que devuelve Supabase. La UI consume @/types (dominio).
 */

"use client";

// TEMPORARY PLACEHOLDER - full restore in progress
export function DataProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function useData() {
  throw new Error("DataProvider not restored");
}
