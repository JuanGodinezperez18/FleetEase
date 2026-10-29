# FleetEase Security Audit Remediation — Implementation Plan

> **For agentic workers:** Follow Superpowers test-driven development and verification-before-completion. Work only on `security/audit-remediation-2026-10-30`; do not merge or deploy.

**Goal:** Close the confirmed version-controlled RLS gap for supplier finance tables and remove misleading example credentials, while documenting items that require live provider access.

**Architecture:** Add an idempotent SQL migration that explicitly enables RLS and applies tenant-scoped policies to the four supplier-finance tables. Keep the existing browser-based Supabase Auth flow unchanged until provider limits and the intended auth architecture are verified. Do not change production schema or rotate external keys from this repository workflow.

**Tech Stack:** PostgreSQL/Supabase migrations, Next.js, GitHub Actions.

**Spec:** `docs/audits/audit-30-findings-2026-10-15.md` and the 2026-10-30 audit supplied by the project owner.

## Global Constraints

- Preserve FleetEase business logic, financial calculations, and multi-company access rules.
- Never change `master` or deploy production as part of this task.
- Database changes must be committed as migrations.
- Do not claim production RLS state or credential rotation without live verification.
- Keep `service_role` behavior governed by Supabase; RLS policies target `authenticated`.
- Keep fixes narrow and independently reviewable.

## Review Focus

- A user cannot select or mutate another company's supplier purchases or accounts payable.
- Supplier purchase items inherit authorization from their parent purchase.
- Allocations cannot associate a purchase and financial record belonging to different companies.
- Super-admin access remains compatible with the existing `auth_user_role()` / `auth_user_company_id()` helpers.
- Public documentation contains no realistic-looking API key that might be mistaken for a real credential.

## Tasks

### Task 1: Version the missing tenant RLS policies

**Files:** Create `supabase/migrations/20261030120000_supplier_finance_tenant_rls.sql`.

- Enable RLS on all four tables.
- Revoke table privileges from `anon`; grant the required CRUD privileges to `authenticated`, still subject to RLS.
- Add SELECT/INSERT/UPDATE/DELETE policies scoped by company.
- For `supplier_purchase_items`, derive company scope through the parent purchase.
- For `supplier_purchase_allocations`, validate both the purchase and linked financial record belong to the declared company.
- Test/verification: inspect the complete migration, compare policy patterns with existing migrations, and run the repository's SQL/static and CI checks if an executable workspace is available. Live two-tenant verification remains required before release.

### Task 2: Remove a misleading credential example

**Files:** Modify `GOOGLE_MAPS_SETUP.md`.

- Replace the example that looks like a usable Google API key with a neutral placeholder.
- Do not change environment variable names or application behavior.

### Task 3: Record verification limits and next steps

- Review the final diff and CI results.
- External actions still required: rotate historical Google Maps keys in Google Cloud; inspect production RLS/policies and test with two tenant accounts; verify Supabase Auth limits and leaked-password protection.
- Open a draft PR targeting `master`; do not merge.
