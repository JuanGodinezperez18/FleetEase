# FleetEase Agent Skills

FleetEase uses a small, curated skill layer. It includes FleetEase-specific rules plus selected ECC engineering workflows adapted to this repository.

## FleetEase-specific skills
- fleetease-financial-integrity: single source of truth for financial facts and derived metrics.
- supabase-architecture: Supabase/Postgres/RLS/migrations/security.
- nextjs-architecture: Next.js 16 App Router, data fetching and loading behavior.
- ui-ux-product-design: distinctive product UI, accessibility, responsive behavior and states.
- landing-page-design: FleetEase marketing site and conversion-oriented landing pages.
- testing-review: regression, exploratory, integration and runtime verification.

## ECC-aligned skills
- tdd-workflow: test-first implementation and regression evidence.
- security-review: security gates for auth, RLS, inputs, uploads, secrets and financial operations.
- verification-loop: build, type, test, security and architecture verification before completion.

The ECC skills are adapted rather than copied wholesale so they respect FleetEase's existing architecture, financial source-of-truth rules, Supabase conventions and user requirements.

## Priority
1. Existing FleetEase behavior and explicit user requirements.
2. Financial integrity and data ownership.
3. Supabase/database/security constraints.
4. ECC security and verification practices.
5. Next.js architecture.
6. UI/UX and landing-page direction.
7. Testing/review.

Never redesign or refactor working business logic merely to satisfy a skill. FleetEase must remain recognizably FleetEase; improvements should refine its identity rather than replace it with generic AI SaaS UI.
