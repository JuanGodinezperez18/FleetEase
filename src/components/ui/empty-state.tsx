/**
 * Phase 2 consolidation: canonical EmptyState lives in
 * `@/components/common/empty-state`. Re-exported here so existing
 * `@/components/ui/empty-state` imports keep working.
 */
export { EmptyState, type EmptyStateProps } from '@/components/common/empty-state';
