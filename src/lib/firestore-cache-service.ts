/**
 * 🚀 SERVICIO DE CACHÉ OPTIMIZADO PARA FIRESTORE
 *
 * Este servicio proporciona una capa de caché en memoria para reducir
 * lecturas de Firestore y mejorar el rendimiento de la aplicación.
 *
 * Características:
 * - Caché en memoria con TTL configurable
 * - Invalidación manual y automática
 * - Soporte para datos por usuario y globales
 * - Prefetching y warming
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en milliseconds
}

class FirestoreCacheService {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();

    // Limpieza automática cada 5 minutos
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
    }
  }

  /**
   * Obtener dato del caché
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si expiró
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Guardar dato en caché
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Verificar si existe en caché y está vigente
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidar (eliminar) entrada específica
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidar múltiples entradas por patrón
   * Ejemplo: invalidatePattern('user-123-*') elimina todas las claves que empiecen con 'user-123-'
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ [Cache] Invalidadas ${keysToDelete.length} entradas con patrón: ${pattern}`);
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 [Cache] Limpiadas ${cleaned} entradas expiradas`);
    }
  }

  /**
   * Limpiar todo el caché
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [Cache] Limpiado todo el caché (${size} entradas)`);
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats(): { total: number; expired: number; valid: number } {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      total: this.cache.size,
      expired,
      valid,
    };
  }

  /**
   * Obtener o cargar dato (get-or-fetch pattern)
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Intentar obtener del caché
    const cached = this.get<T>(key);
    if (cached !== null) {
      console.log(`📦 [Cache] Hit: ${key}`);
      return cached;
    }

    // Si no está en caché, cargar
    console.log(`🔄 [Cache] Miss: ${key} - Cargando...`);
    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }
}

// ✅ TTL Recomendados por tipo de dato
export const CACHE_TTL = {
  // Datos MUY estables (cambian raramente)
  FINANCIAL_CATEGORIES: 60 * 60 * 1000, // 1 hora
  COMPANIES: 30 * 60 * 1000, // 30 minutos
  SYSTEM_SETTINGS: 60 * 60 * 1000, // 1 hora

  // Datos ESTABLES (cambian ocasionalmente)
  USER_PROFILE: 10 * 60 * 1000, // 10 minutos
  PARTNERS: 10 * 60 * 1000, // 10 minutos
  VEHICLES: 5 * 60 * 1000, // 5 minutos

  // Datos DINÁMICOS (cambian frecuentemente)
  CLIENTS: 2 * 60 * 1000, // 2 minutos
  CREDITS: 2 * 60 * 1000, // 2 minutos
  FINANCIAL_RECORDS: 2 * 60 * 1000, // 2 minutos

  // Datos CRÍTICOS (necesitan estar frescos)
  NOTIFICATIONS: 1 * 60 * 1000, // 1 minuto
  DASHBOARD_CONFIG: 5 * 60 * 1000, // 5 minutos

  // Consultas específicas
  ANALYTICS: 5 * 60 * 1000, // 5 minutos
  REPORTS: 10 * 60 * 1000, // 10 minutos
  HISTORY_LOGS: 2 * 60 * 1000, // 2 minutos
} as const;

// ✅ Helpers para generar claves de caché consistentes
export const cacheKeys = {
  userProfile: (userId: string) => `user-profile-${userId}`,
  userDashboard: (userId: string) => `user-dashboard-${userId}`,

  clients: (companyId: string | null) => `clients-${companyId || 'all'}`,
  vehicles: (companyId: string | null) => `vehicles-${companyId || 'all'}`,
  partners: (companyId: string | null) => `partners-${companyId || 'all'}`,
  credits: (companyId: string | null) => `credits-${companyId || 'all'}`,

  financialCategories: (companyId: string | null) => `financial-categories-${companyId || 'global'}`,
  companies: () => 'companies-all',

  clientHistory: (clientId: string) => `client-history-${clientId}`,
  companyHistory: (companyId: string) => `company-history-${companyId}`,
  generatedReports: (companyId: string) => `generated-reports-${companyId}`,

  analytics: (type: string, companyId: string | null, dateRange: string) =>
    `analytics-${type}-${companyId || 'all'}-${dateRange}`,
};

// Singleton instance
export const firestoreCacheService = new FirestoreCacheService();

/**
 * Hook de React para integrar con React Query
 * Uso: Invalidar caché cuando se modifica dato
 */
export function useInvalidateCache() {
  const invalidate = (key: string) => {
    firestoreCacheService.invalidate(key);
  };

  const invalidatePattern = (pattern: string) => {
    firestoreCacheService.invalidatePattern(pattern);
  };

  return { invalidate, invalidatePattern };
}

/**
 * Ejemplo de uso en componente:
 *
 * ```typescript
 * import { firestoreCacheService, cacheKeys, CACHE_TTL } from '@/lib/firestore-cache-service';
 *
 * // En fetch de datos
 * const clients = await firestoreCacheService.getOrFetch(
 *   cacheKeys.clients(companyId),
 *   async () => {
 *     const q = query(collection(db, 'clients'), where('companyId', '==', companyId));
 *     const snapshot = await getDocs(q);
 *     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 *   },
 *   CACHE_TTL.CLIENTS
 * );
 *
 * // Al actualizar un cliente
 * await updateClient(clientId, data);
 * firestoreCacheService.invalidatePattern(`clients-*`); // Invalidar todos los caché de clientes
 * ```
 */
