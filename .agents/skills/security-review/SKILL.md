---
name: security-review
description: Apply ECC-style security review to FleetEase authentication, authorization, user input, API routes, uploads, secrets, financial operations and Supabase/RLS changes.
metadata:
  origin: ECC
  adapted_for: FleetEase
---

# FleetEase Security Review

Use this skill before shipping security-sensitive changes.

## FleetEase-specific priorities

### 1. Tenant isolation
- Every tenant-scoped query must respect `company_id`.
- Do not trust a client-supplied company ID.
- Verify ownership/tenant context server-side.
- Preserve Supabase RLS as a second enforcement layer.

### 2. Authorization
- Respect dashboard, partner and client portal boundaries.
- Verify roles server-side for sensitive mutations.
- Do not expose admin/editor operations through client-only checks.

### 3. Financial operations
For payments, credits, deposits, refunds, expenses, income, partner balances, fines or cash flow:
- Prefer the established atomic transaction/RPC path.
- Do not create parallel calculations in UI/report modules.
- Preserve the existing financial source of truth.
- Test create/edit/delete/cancel and reversal behavior.
- Verify both accounting records and cash-flow effects.

### 4. Input validation
- Validate untrusted input with the project's existing Zod patterns.
- Validate IDs, amounts, dates, enums, file metadata and uploaded content.
- Do not interpolate user input into SQL.
- Avoid returning internal database errors to users.

### 5. Secrets and configuration
- Never commit credentials, service-role keys or private tokens.
- Keep environment files ignored.
- Treat public environment variables as public.
- Do not expose Supabase service-role credentials to browser code.

### 6. XSS / dynamic content
- Prefer React's escaped rendering.
- Sanitize intentionally rendered HTML.
- Review dynamic `href`, `src`, redirects and external URLs.
- Preserve the application's CSP/security-header strategy.

### 7. Supabase
- Review RLS policies for every affected table.
- Check SELECT/INSERT/UPDATE/DELETE policies, not just SELECT.
- Preserve soft-delete conventions.
- Review RPC `SECURITY DEFINER` functions for authorization and search_path safety.
- Never weaken RLS merely to make a feature work.

### 8. File uploads
- Validate size, MIME type and extension.
- Review storage path construction for traversal/IDOR.
- Verify storage policies match tenant/role boundaries.

## Security gate

Before considering a sensitive change complete, check:

- [ ] Authentication/session behavior preserved
- [ ] Authorization enforced server-side
- [ ] Tenant isolation preserved
- [ ] RLS reviewed
- [ ] Input validated
- [ ] No secret exposure
- [ ] No unsafe dynamic URL/HTML handling
- [ ] Financial mutations remain atomic where applicable
- [ ] Error responses do not expose internals
- [ ] Regression/security tests added where appropriate

If a security issue is discovered, fix the root cause rather than masking the symptom.
