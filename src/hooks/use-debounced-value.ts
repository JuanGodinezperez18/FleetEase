
import { useEffect, useState } from 'react';

/**
 * Hook para debounce de valores
 * 
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 300)
 * @returns Valor con debounce aplicado
 * 
 * @example
 * '''
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebouncedValue(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // Ejecuta búsqueda con el valor debounced
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * '''
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
