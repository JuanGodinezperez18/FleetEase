/**
 * @deprecated Dead code — 0 imports in the app.
 * Canonical KPI surfaces:
 *   - src/components/dashboard/draggrable-metric-card.tsx (dashboard grid)
 *   - src/components/dashboard/components/MetricCard.tsx
 *
 * This file previously used non-existent classes (hover-lift, glass-premium)
 * and generic SaaS gradients. Kept as a thin re-export so any external
 * reference fails loudly at type level rather than rendering broken UI.
 */
export { DraggableMetricCard as KPICard } from '@/components/dashboard/draggrable-metric-card';
