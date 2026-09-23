---
name: nextjs-architecture
description: Maintain FleetEase's Next.js 16 App Router architecture, performance and loading behavior without disturbing business logic.
---

# Next.js Architecture

Preserve working business logic; do not refactor for style alone.

Use Server Components by default where appropriate. Use Client Components only when interactivity or browser APIs require them. Keep data access in the existing service/provider/query layer.

Avoid duplicate fetches and waterfalls. Reuse established TanStack Query keys, services, cache and invalidation behavior. Do not create a second source of truth.

Distinguish application startup splash, route/module skeleton, empty state, retryable error and permission error. A startup splash must not become a generic route-change loader.

Every async mutation needs clear pending, success and error states. Never report success before persistence completes.

When fixing navigation/rendering issues, verify refresh, direct navigation and navigation from another module in the actual runtime.

Prefer the smallest architectural change that fixes the root cause.
