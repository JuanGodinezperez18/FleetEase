# Atomic payment edit implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks.

**Goal:** Allow authorized payment amount edits through the atomic RPC while preserving direct-write immutability and tenant isolation.

**Architecture:** A private transaction-scoped authorization row binds a single payment, actor, company and exact old/new amount. Only the existing privileged edit RPC can write it; the invoker trigger accepts that amount transition and continues rejecting other sensitive changes. Edit/delete RPCs require an active administrator/editor profile. Existing allocation and recalculation services remain authoritative.

**Tech Stack:** PostgreSQL, Supabase RPC, Next.js, Jest, isolated PGlite.

**Spec:** docs/audits/FUNCTIONAL_TESTS_2026-11-06.md, continuation after PR #141.

## Global constraints

- No financial formula changes, hard deletion of business records, tenant scope relaxation or user-editable authorization flags.
- New SQL remains reviewable in the next PR. Production QA probes use only new disposable records; no historical cleanup.
- Distinguish isolated SQL proof, deployed UI observations and unapplied migration status.

## Review focus

- Direct UPDATE, forged session settings and private-table writes must not authorize an edit.
- Deleted profiles, clients/partners and foreign companies must not mutate payments.
- Invalid target/amount must roll back allocations, record and audit together.
- Successful edits and failures must leave no authorization rows behind.
- Supplier, deposit, fine and credit paths must preserve existing recalculation semantics.

### Task 1: Scope payment edits and roles

**Files:** new migration `scope_atomic_payment_edits`; `supabase/tests/atomic_payment_edit.sql`; isolated runner.

**Interface:** Preserve `update_financial_payment_atomic(uuid,numeric,date,text,text,uuid)` and `delete_financial_payment_atomic(uuid)`.

- [x] Reproduce admin amount edit failure with the live function definitions in an isolated fixture.
- [x] Add private authorization storage and scoped trigger exception, active-profile role checks and unchanged atomic allocation logic.
- [x] Test edit up/down, relink, overpayment rollback, direct/forged writes, tenants, roles, deleted/missing profiles, cleanup and delete.
- [x] Review SQL and run relevant application regressions/TypeScript/build.

### Task 2: Verify live flows and record evidence

**Files:** `docs/audits/FUNCTIONAL_TESTS_2026-11-06.md`, `REAUDIT_2026-11-05.md`, `PHASE2_SECURITY_FUNCTIONAL_AUDIT.md`, existing audit matrix.

- [x] Verify deployed PR #142 reference/date behavior with new QA payments.
- [x] Probe additional payment reversals and role boundaries safely; preserve actual failures as open findings. Refund expense support was added after reproducing missing history and PAYMENT_NOT_FOUND.
- [x] Remove new QA business records logically, verify DB and reload, document limits, publish next PR and update matrix.
