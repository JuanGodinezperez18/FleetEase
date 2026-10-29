# FleetEase audit 2026-10-30 — repository and live metadata cross-check

**Repository commit reviewed:** `093be10261f54934c9da1f0e451ff1179eaaeb5f`  
**Remediation branch:** `security/audit-remediation-2026-10-30`  
**Live project:** FleetEase Supabase project `qettktslcbjjuyejcpqy`  
**Method:** GitHub source/migration inspection plus read-only Supabase catalog queries and Security Advisor. No schema changes were applied to production.

## Findings compared with evidence

| Audit item | Status after verification | Evidence / action |
|---|---|---|
| C1 — Four supplier-finance tables missing RLS | **Not an active exposure demonstrated by current production metadata; migration drift confirmed.** | Live PostgreSQL reports RLS enabled and company-scoped policies on all four tables. Supabase migration history includes `20260918160303 secure_supplier_purchases_and_payables_rls`, but the corresponding migration file is absent from the audited Git commit. The repo's `20261003225000_block_b_revoke_anon_and_storage_tenant_policies.sql` says RLS already exists and only revokes `anon`. Added an idempotent, versioned migration to reproduce the production policies for fresh/rebuilt environments and scope them to `authenticated`. Still requires a two-tenant behavior test before release. |
| A1 — Google Maps keys in Git history | **Current HEAD does not contain a real key in the setup guide; historical exposure requires operational rotation.** | The old `GOOGLE_MAPS_SETUP.md` used a realistic-looking `AIza…` sample; replaced it with a neutral placeholder and improved rotation guidance. Removing historical blobs is not a substitute for rotating keys. Rotation cannot be completed from this repository change; perform it in Google Cloud Console, verify restrictions and usage, then revoke old keys. |
| A2 — `authLimiter` unused | **Confirmed in repository; effective provider controls need live configuration.** | Code search finds the limiter definition but no call site; `signIn` invokes `supabase.auth.signInWithPassword` directly from the client. Do not add a server route that merely appears to rate-limit while leaving the public Supabase Auth endpoint reachable. Review Supabase Auth limits and add telemetry/mitigations through a design that actually covers the provider endpoint. |
| Supabase leaked-password protection | **Live Security Advisor warning.** | Security Advisor currently reports `auth_leaked_password_protection` as disabled. Enable in Supabase Auth settings and validate with a controlled test; this is a dashboard operation, not a code-only fix. |
| Supabase RLS Advisor | **One informational warning; not automatically a vulnerability.** | Advisor reports `public.shared_links` has RLS enabled and no policies. This may be intentional deny-by-default because access is mediated by token-validated server routes. Verify intended API/service-role access and do not add permissive client policies just to silence the warning. |
| Security-definer RPCs | **Needs separate function-by-function review.** | Advisor lists 15 callable functions. Prior audit documentation says several are intended authenticated operations with tenant checks. Do not revoke them in bulk; inspect each function's authorization and call sites. |
| M1–M4, UX1–UX2, P1–P3, B1–B4 | **Not comprehensively re-measured in this pass.** | Counts in the supplied report are static-analysis claims; no local clone/build was available in this environment. Treat them as backlog hypotheses until a fresh static scan, CI, Lighthouse/axe and bundle measurement confirm impact. |

## Changes in this branch

1. `supabase/migrations/20261030120000_supplier_finance_tenant_rls.sql` — explicitly enables RLS on the four tables, revokes `anon`, grants CRUD to `authenticated` subject to RLS, and versions the tenant policies for purchases, purchase items, allocations and accounts payable.
2. `GOOGLE_MAPS_SETUP.md` — removes a realistic-looking API-key sample, avoids outdated fixed pricing claims, and clarifies that historical keys must be rotated.
3. `docs/superpowers/plans/2026-10-30-fleetease-security-audit-remediation.md` — plan and release gates.

## Release gates still required

- Run CI/type-check/tests/build against the PR head; the hosted GitHub API is available here, but cloning the repo for local execution failed because the runtime could not resolve `github.com`.
- Test with two non-super-admin users from different companies: select/insert/update/delete attempts against each other's four finance tables must be denied.
- Confirm the live migration/policy definitions match the new migration after review; do not apply this migration to production from this workflow.
- Rotate historical Google Maps keys and verify referrer/API restrictions in Google Cloud.
- Enable leaked-password protection in Supabase Auth and validate.
- Review `shared_links` access design and the 15 SECURITY DEFINER functions separately.
- Do not merge or deploy until the CI and tenant-isolation gates pass.
