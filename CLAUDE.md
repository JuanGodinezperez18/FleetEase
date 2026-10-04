# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FleetEase Manager** is a vehicle fleet profitability management system for rental businesses in Mexico. It tracks income, expenses, and calculates real-time profitability per vehicle.

## Tech Stack

- **Framework**: Next.js 16.0.10 with App Router
- **UI**: React 19.2.1, TypeScript 5.9.3, Tailwind CSS 3.4, Shadcn/ui
- **Database**: Supabase (PostgreSQL) - migrating from Firebase/Firestore
- **Auth**: Supabase Auth with role-based access
- **State**: TanStack Query 5.51.1
- **Testing**: Jest 30 + React Testing Library

## Common Commands

```bash
# Development
npm run dev                 # Start dev server (uses Turbopack)

# Build & Deploy
npm run build               # Production build with Turbopack
npm run start               # Start production server

# Code Quality
npm run lint                # ESLint (config: .eslintrc.json)
npm run type-check          # TypeScript strict checking

# Testing
npm test                    # Run tests in watch mode
npm run test:ci             # Run tests once (for CI)
npm run test:coverage       # Run tests with coverage report

# Supabase Migration
npm run test:supabase-connection    # Test Supabase connection
npm run migrate:supabase            # Migrate data from Firebase to Supabase
npm run migrate:check               # Verify migration completeness
```

## Architecture

### Role-Based Portals

The app uses role-based routing with three main portals:

- `/dashboard/*` - Admin/Editor/SuperAdmin (full access)
- `/partner/*` - Partners (vehicle owners, see their vehicles only)
- `/client/*` - Clients (see their assigned vehicle only)

### Authentication Flow

1. **Middleware** (`middleware.ts`): Validates session via Supabase SSR client
2. **Auth Provider** (`src/contexts/auth-provider-supabase.tsx`): Manages auth state
3. **Data Provider** (`src/contexts/data-provider-supabase.tsx`): Fetches role-specific data

Roles: `admin`, `editor`, `viewer`, `super_admin`, `partner`, `client`

### Database Layer

**Migration in Progress**: Firebase → Supabase

- **Supabase Client**: `src/lib/supabase.ts`
- **Services**: `src/lib/supabase-services.ts` (CRUD operations)
- **Auth Utils**: `src/lib/auth.ts` (signIn, signOut, etc.)
- **Types**: `src/types/supabase.ts` (auto-generated from schema)

Key tables: `users`, `companies`, `vehicles`, `clients`, `transactions`, `expenses`, `maintenance`, `inspections`

### Component Organization

```
src/components/
├── ui/              # Shadcn/ui base components
├── common/          # Shared components (GlobalLoader, etc.)
├── dashboard/       # Dashboard-specific widgets
├── forms/           # Reusable form components
├── layout/          # Navigation, sidebar
├── upload/          # File upload components
└── vehicles/        # Vehicle-related components
```

## Environment Variables

Create `.env.local` from `.env.local.template`:

```bash
# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Temporary: Firebase (for migration)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# ⚠️ Solo desarrollo local (desactiva la protección de sesión). Prohibido en producción.
# NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true
```

## Testing

- **Unit Tests**: `src/__tests__/` - Components, hooks, utilities
- **Coverage Thresholds**: 60% (branches, functions, lines, statements)
- **Pattern**: `**/__tests__/**/*.test.[jt]s?(x)` or `**/*.test.[jt]s?(x)`

## Key Patterns

### Data Fetching with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['vehicles', companyId],
  queryFn: () => vehicleService.getByCompany(companyId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Role-Based Access in Components

```typescript
const { currentUser } = useAuth();
const isAdmin = ['admin', 'super_admin'].includes(currentUser?.role);
```

### Supabase RLS

Row Level Security is enforced. All queries automatically filter by:
- `company_id` for multi-tenant isolation
- `is_deleted = false` for soft deletes

## Migration Notes

The project is transitioning from Firebase to Supabase:

- **Old**: `src/lib/firebase.ts`, `src/contexts/auth-provider.tsx`, `src/contexts/data-provider.tsx`
- **New**: `src/lib/supabase.ts`, `src/contexts/auth-provider-supabase.tsx`, `src/contexts/data-provider-supabase.tsx`

Use the Supabase versions for new code. Migration scripts are in `scripts/`.

## Important Constraints

1. **Never modify calculation formulas** (profitability, ROI, etc.) without explicit approval
2. **Company isolation**: Always filter queries by `company_id`
3. **Soft deletes**: Use `is_deleted = false` filters; never hard delete
4. **Role restrictions**: Respect portal boundaries (dashboard vs partner vs client)
5. **Firebase references remain** for gradual migration - check which service is active
