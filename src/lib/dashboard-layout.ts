import type { DashboardWidget } from '@/types/dashboard';

/** Fill each row in saved order; only its last card grows into unused columns. */
export function getDashboardSpans(widgets: DashboardWidget[], columns: 1 | 2 | 3 | 4): number[] {
  const spans: number[] = [];
  let used = 0;

  widgets.forEach(widget => {
    const size = widget.size ?? (widget.id === 'unread-notifications' ? 'large' : widget.type === 'chart' ? 'medium' : 'small');
    const preferred = size === 'large' ? columns : size === 'medium' ? 2 : 1;
    const span = Math.min(preferred, columns);

    if (used > 0 && used + span > columns) {
      spans[spans.length - 1] += columns - used;
      used = 0;
    }

    spans.push(span);
    used = (used + span) % columns;
  });

  if (used > 0) spans[spans.length - 1] += columns - used;
  return spans;
}
