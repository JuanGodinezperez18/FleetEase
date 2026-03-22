// lib/analytics-cache.ts
/**
 * Sistema de caché en memoria para analytics
 * Complementa React Query con un caché de segundo nivel
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Máximo número de entradas

  /**
   * Guarda datos en el caché
   */
  set<T>(key: string, data: T, ttlMinutes: number = 10): void {
    // Limpiar caché si está lleno
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    });
  }

  /**
   * Obtiene datos del caché si están vigentes
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Invalida una entrada del caché
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida todas las entradas que coincidan con un patrón
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Limpia entradas expiradas del caché
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Ordenar por timestamp (más antiguas primero)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Eliminar las más antiguas o expiradas hasta tener espacio
    const toDelete = Math.ceil(this.maxSize * 0.2); // Eliminar 20%

    for (let i = 0; i < toDelete && i < entries.length; i++) {
      const [key, entry] = entries[i];
      const isExpired = now - entry.timestamp > entry.ttl;

      if (isExpired || i < toDelete) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna estadísticas del caché
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const valid = entries.filter(e => now - e.timestamp <= e.ttl).length;
    const expired = entries.length - valid;

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
    };
  }
}

// Instancia singleton
export const analyticsCache = new AnalyticsCache();

/**
 * Hook helper para usar el caché de analytics
 */
export function getCached<T>(
  key: string,
  computeFn: () => T,
  ttlMinutes: number = 10
): T {
  // Intentar obtener del caché
  const cached = analyticsCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Calcular y guardar
  const result = computeFn();
  analyticsCache.set(key, result, ttlMinutes);

  return result;
}

/**
 * Invalidar caché cuando cambien datos relevantes
 */
export function invalidateAnalyticsCache(category?: string) {
  if (category) {
    analyticsCache.invalidatePattern(category);
  } else {
    analyticsCache.clear();
  }
}
