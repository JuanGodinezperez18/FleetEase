import { getDashboardSpans } from '@/lib/dashboard-layout';
import type { DashboardWidget } from '@/types/dashboard';
import { OPERATION_DASHBOARD_WIDGETS } from '@/types/dashboard';

const widget = (id: string, size: DashboardWidget['size'], type: DashboardWidget['type'] = 'metric') =>
  ({ id, size, type } as DashboardWidget);

describe('dashboard row packing', () => {
  it('offers the twelve requested indicators plus active vehicles as an explicit thirteen-card preset', () => {
    const widgets = OPERATION_DASHBOARD_WIDGETS;
    expect(widgets.map(w => w.id)).toEqual([
      'unread-notifications', 'cash-flow-month', 'income-month', 'expenses-month', 'total-vehicles',
      'finance-summary-chart', 'fleet-status-chart', 'vehicle-gross-profitability',
      'maintenance-chart', 'credit-portfolio-chart', 'licenses-expiring', 'fines-chart', 'client-risk-chart',
    ]);
    expect(widgets.every(w => w.enabled)).toBe(true);
    expect(new Set(widgets.map(w => w.id)).size).toBe(13);
  });
  it('fills a residual column without moving a later card ahead of the saved order', () => {
    expect(getDashboardSpans([
      widget('first', 'medium'), widget('second', 'medium'), widget('third', 'small'),
    ], 3)).toEqual([3, 2, 1]);
  });

  it('fills the final row', () => {
    expect(getDashboardSpans([widget('a', 'small'), widget('b', 'small')], 3)).toEqual([1, 2]);
  });

  it('distinguishes manual S, M and L sizes when they fit', () => {
    expect(getDashboardSpans([
      widget('a', 'small'), widget('b', 'medium'), widget('c', 'small'), widget('d', 'large'),
    ], 4)).toEqual([1, 2, 1, 4]);
  });

  it('uses chart defaults and clamps wide cards on mobile', () => {
    const widgets = [widget('a', undefined, 'chart'), widget('b', 'large')];
    expect(getDashboardSpans(widgets, 1)).toEqual([1, 1]);
    expect(getDashboardSpans(widgets, 4)).toEqual([4, 4]);
    expect(getDashboardSpans([], 4)).toEqual([]);
  });

  it.each([1, 2, 3, 4] as const)('leaves no empty cells across size combinations at %i columns', columns => {
    const sizes = ['small', 'medium', 'large'] as const;
    for (let combination = 0; combination < 243; combination++) {
      let seed = combination;
      const widgets = Array.from({ length: 5 }, (_, i) => {
        const size = sizes[seed % 3];
        seed = Math.floor(seed / 3);
        return widget(String(i), size);
      });
      const spans = getDashboardSpans(widgets, columns);
      let row = 0;
      spans.forEach(span => {
        expect(span).toBeGreaterThan(0);
        row += span;
        expect(row).toBeLessThanOrEqual(columns);
        if (row === columns) row = 0;
      });
      expect(row).toBe(0);
    }
  });
});
