---
name: supabase-architecture
description: Review and modify FleetEase Supabase/Postgres code safely, including RLS, migrations, RPCs, transactions, tenant isolation and persistence mappings.
---

# Supabase Architecture

Follow FleetEase's existing Supabase architecture.

Required checks:
- Every tenant query is scoped by company_id.
- Respect RLS and role boundaries.
- Preserve soft-delete behavior: filter is_deleted=false and do not hard-delete where repository rules prohibit it.
- Use existing services, mappers and typed database definitions instead of parallel persistence paths.
- Treat RPCs and database functions as contracts; inspect their SQL/signature before changing callers.
- Multi-record financial mutations must be atomic.
- Never expose service-role credentials to client code.
- Validate authorization server-side; UI role checks are not security boundaries.
- For migrations, check dependencies, rollback risk and existing production data.

Debug from UI -> service -> RPC/database -> RLS/auth -> returned state. Do not patch only the visible component if the invariant is owned lower in the stack.

After database changes verify the affected query/RPC, RLS behavior, mapped domain object and user-visible flow.
