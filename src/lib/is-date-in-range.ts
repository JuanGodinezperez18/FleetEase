import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

/**
 * Inclusive date-range check (same semantics as dashboard income/KPI filters).
 */
export function isDateInRange(
  value: string | Date | null | undefined,
  range: DateRange | undefined,
): boolean {
  if (!range?.from && !range?.to) return true;
  const d = infallibleNormalizeDate(value as string | Date | null | undefined);
  if (!d) return false;
  const t = d.getTime();
  if (range.from && t < startOfDay(range.from).getTime()) return false;
  if (range.to && t > endOfDay(range.to).getTime()) return false;
  return true;
}
