import { getBusinessDateKey } from '@/lib/vehicle-assignment';

/** Returns true only for a valid YYYY-MM-DD date that is not after today. */
export function isFinancialDateNotInFuture(date: string, today?: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return false;
  }

  const todayKey = today ?? getBusinessDateKey(new Date());

  return /^\d{4}-\d{2}-\d{2}$/.test(todayKey) && date <= todayKey;
}
