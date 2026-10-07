import { format } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

/**
 * Returns true if the entity existed on or before the given date (yyyy-MM-dd).
 * Inclusive of the same day.
 */
export function isCreatedOnOrBefore(
  createdAt: string | Date | null | undefined,
  dateKey: string | null | undefined,
): boolean {
  if (!dateKey) return true;
  const createdDate = infallibleNormalizeDate(createdAt as string | Date | null | undefined);
  if (!createdDate) return false;
  const createdDateKey = format(createdDate, 'yyyy-MM-dd');
  return createdDateKey <= dateKey;
}

/** @deprecated use isCreatedOnOrBefore */
export function isClientCreatedOnOrBefore(
  createdAt: string | Date | null | undefined,
  dateKey: string | null | undefined,
): boolean {
  return isCreatedOnOrBefore(createdAt, dateKey);
}

export function isVehicleCreatedOnOrBefore(
  createdAt: string | Date | null | undefined,
  dateKey: string | null | undefined,
): boolean {
  return isCreatedOnOrBefore(createdAt, dateKey);
}
