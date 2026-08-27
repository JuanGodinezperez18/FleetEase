# AGENTS.md - FleetEase Manager

## Project Overview
**FleetEase Manager** - Vehicle fleet profitability management for rental businesses in Mexico. Tracks income, expenses, real-time profitability per vehicle.

## Tech Stack
- **Framework**: Next.js 16.0.10 (App Router, Turbopack)
- **UI**: React 19.2.1, TypeScript 5.9.3, Tailwind CSS 3.4, Shadcn/ui
- **Database**: Supabase (PostgreSQL) — migrating from Firebase/Firestore
- **Auth**: Supabase Auth with role-based access
- **State**: TanStack Query 5.51.1
- **Testing**: Jest 30 + React Testing Library

## Essential Commands
```bash
# Development
npm run dev                 # Start dev server (Turbopack)

# Build & Deploy
npm run build               # Production build
npm run start               # Start production server

# Code Quality
npm run lint                # ESLint (extends next)
npm run type-check          # TypeScript strict checking

# Testing
npm test                    # Watch mode
npm run test:ci             # Single run (CI)
npm run test:coverage       # With coverage (thresholds: 60% all)

# Supabase Migration
npm run test:supabase-connection
npm run migrate:supabase
npm run migrate:check
```

## Architecture — Key Facts

### Role-Based Portals (Middleware enforced)
| Portal | Path | Allowed Roles |
|--------|------|---------------|
| Dashboard | `/dashboard/*` | admin, editor, super_admin |
| Partner | `/partner/*` | partner |
| Client | `/client/*` | client |

### Auth Flow
1. `middleware.ts` validates session via Supabase SSR client
2. `src/contexts/auth-provider-supabase.tsx` manages auth state
3. `src/contexts/data-provider-supabase.tsx` fetches role-specific data

### Database Layer (Supabase)
- **Client**: `src/lib/supabase.ts` — typed client with `Database` interface
- **Services**: `src/lib/supabase-services.ts` — CRUD via `SupabaseService<T>` base class
- **Types**: `src/types/supabase.ts` — auto-generated from schema
- **Key Tables**: `users`, `companies`, `vehicles`, `clients`, `transactions`, `expenses`, `maintenance`, `inspections`, `credits`, `multas`, `financial_records`, `mileage_logs`

### RLS & Multi-tenancy
- All tables have RLS enabled
- Queries **must** filter by `company_id` for tenant isolation
- Soft deletes: `is_deleted = false` filter on every query
- Never hard delete — use `update({ is_deleted: true })`

### Domain ↔ Persistence Mapping
- DB uses `snake_case`, UI uses `camelCase`
- Mappers in `src/lib/domain-mappers.ts`: `toDomain*` / `toSb*`
- Data Provider (`data-provider-supabase.tsx`) handles conversion

## Critical Constraints
1. **Never modify calculation formulas** (profitability, ROI, kmToNextMaintenance) without explicit approval
2. **Company isolation**: Every query must include `.eq('company_id', companyId)`
3. **Soft deletes only**: Filter `is_deleted = false`; never hard delete
4. **Role boundaries**: Respect portal separation (dashboard/partner/client)
5. **Firebase remnants exist** — check which service is active before adding code

## Testing
- Unit tests: `src/__tests__/` (components, hooks, utils)
- Coverage thresholds: 60% branches/functions/lines/statements
- Pattern: `**/__tests__/**/*.test.[jt]s?(x)` or `**/*.test.[jt]s?(x)`
- Mocks in `jest.setup.js`: Firebase, next/navigation, localStorage, matchMedia

## Common Patterns

### Data Fetching (TanStack Query)
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['vehicles', companyId],
  queryFn: () => vehicleService.getByCompany(companyId),
  staleTime: 5 * 60 * 1000,
});
```

### Role Check in Components
```typescript
const { currentUser } = useAuth();
const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role);
```

### Supabase Service Usage
```typescript
import { vehicleService } from '@/lib/supabase-services';
const vehicles = await vehicleService.getByCompany(companyId);
```

## Environment Variables
Create `.env.local` from `.env.local.template`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Temporary (Firebase migration)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Dev bypass
NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true
```

## File Structure Highlights
```
src/
├── app/
│   ├── dashboard/*     # Admin/Editor/SuperAdmin pages
│   ├── partner/*       # Partner portal
│   ├── client/*        # Client portal
│   └── api/            # API routes (cron jobs in vercel.json)
├── components/
│   ├── ui/             # Shadcn/ui base
│   ├── common/         # Shared (GlobalLoader, etc.)
│   ├── dashboard/      # Dashboard widgets
│   ├── forms/          # Reusable forms
│   ├── layout/         # Navigation, sidebar
│   └── vehicles/       # Vehicle components
├── contexts/
│   ├── auth-provider-supabase.tsx
│   └── data-provider-supabase.tsx
├── lib/
│   ├── supabase.ts
│   ├── supabase-services.ts
│   ├── auth.ts
│   ├── vehicle-calculations.ts  # ← DO NOT MODIFY
│   ├── financial-metrics.ts     # ← DO NOT MODIFY
│   └── domain-mappers.ts
└── types/
    ├── supabase.ts   # DB types (snake_case)
    └── index.ts      # Domain types (camelCase)
```

## Migration Scripts
Located in `scripts/`:
- `migrate-to-supabase.ts` — main migration
- `migrate-check.ts` — verify completeness
- `migrate-final.ts` — final cleanup
- `check-supabase.ts` — connection test

## Deployment
- Vercel (configured in `vercel.json`)
- Cron jobs: inspection-cleanup, maintenance-check, insurance-check, license-check

## Review Focus Areas (per user request)
When reviewing code, prioritize:
1. **UX/UI** — Component structure, accessibility, Shadcn/ui usage, responsive design
2. **Security** — RLS policies, role checks in middleware, input validation, auth flow
3. **Database** — Indexes, RLS, soft delete patterns, company_id filtering, migration status
4. **Module-by-module** — Each portal (dashboard/partner/client), financial calculations, credits, multas, GPS tracking, notifications