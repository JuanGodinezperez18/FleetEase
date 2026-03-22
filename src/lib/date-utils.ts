
import { isValid, parse, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

/**
 * A more robust date normalization function that handles multiple formats,
 * ensuring consistency across timezones by treating date-only strings as local time.
 * @param date The date value to normalize.
 * @returns A valid Date object or null if parsing fails.
 */
export const normalizeDate = (date: unknown): Date | null => {
  if (!date) return null;

  if (typeof (date as { toDate?: () => Date })?.toDate === 'function') {
    return (date as { toDate: () => Date }).toDate();
  }
  
  if (typeof date === 'object' && date !== null && 'seconds' in date && 'nanoseconds' in date) {
    const ts = date as { seconds: number; nanoseconds: number };
    if (typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
      return new Timestamp(ts.seconds, ts.nanoseconds).toDate();
    }
  }

  if (date instanceof Date && isValid(date)) {
    return date;
  }

  if (typeof date === 'number') {
    const numericDate = new Date(date);
    if (isValid(numericDate)) return numericDate;
  }

  if (typeof date === 'string') {
    // For "YYYY-MM-DD" format, add time to prevent UTC conversion issues.
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const localDate = new Date(`${date}T00:00:00`);
      if (isValid(localDate)) return localDate;
    }
    
    const directParse = new Date(date);
    if (isValid(directParse)) {
      return directParse;
    }

    const formatsToTry = [
      'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd',
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    ];
    for (const fmt of formatsToTry) {
      const parsedDate = parse(date, fmt, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
  }

  return null;
};

/**
 * A lenient date normalization function that tries multiple parsing strategies.
 * Returns a valid Date object or null if all attempts fail.
 * This is "infallible" in the sense that it won't throw an error.
 */
export function infallibleNormalizeDate(dateInput: unknown): Date | null {
  const normalized = normalizeDate(dateInput);
  if (normalized) return normalized;

  // Additional fallback strategies for less common formats
  if (typeof dateInput === 'string') {
    const fallbackFormats = [
        "dd-MM-yyyy", "MM-dd-yyyy", "yyyy/MM/dd", "M/d/yyyy", "M/dd/yyyy",
        "MM/d/yyyy", "d/M/yyyy", "dd/M/yyyy", "d/MM/yyyy"
    ];
    for (const fmt of fallbackFormats) {
        const parsedDate = parse(dateInput, fmt, new Date());
        if (isValid(parsedDate)) return parsedDate;
    }
    try {
        const isoDate = parseISO(dateInput);
        if (isValid(isoDate)) return isoDate;
    } catch { /* Ignore parsing errors */ }
  }

  if (typeof dateInput === 'number') {
    try {
        const tsDate = new Date(dateInput);
        if (isValid(tsDate)) return tsDate;
    } catch { /* Ignore */ }
  }
  
  return null;
}

export const formatDate = (date: unknown): string => {
    const normalizedDate = infallibleNormalizeDate(date);
    if (!normalizedDate) return 'N/A';
    try {
        // Using native toLocaleDateString for robustness in SSR/SSG environments
        return normalizedDate.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return 'Fecha inválida';
    }
};

export const parseDateForInput = (date: unknown): string => {
  const normalized = normalizeDate(date);
  if (!normalized) return "";
  // Format to YYYY-MM-DD for input[type="date"]
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
