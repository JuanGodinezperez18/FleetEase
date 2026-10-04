import { format } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

/**
 * Returns true if the client existed on or before the given date (yyyy-MM-dd).
 * Inclusive of the same day (matches income form behaviour).
 */
export function isClientCreatedOnOrBefore(
  createdAt: string | Date | null | undefined,
  dateKey: string | null | undefined,
): boolean {
  if (!dateKey) return true;
  const clientCreatedDate = infallibleNormalizeDate(createdAt as string | Date | null | undefined);
  if (!clientCreatedDate) return false;
  const clientCreatedDateKey = format(clientCreatedDate, 'yyyy-MM-dd');
  return clientCreatedDateKey <= dateKey;
}
