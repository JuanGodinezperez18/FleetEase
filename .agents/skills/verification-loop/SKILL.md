---
name: verification-loop
description: Run an evidence-based verification loop for FleetEase changes before declaring work complete.
metadata:
  origin: ECC
  adapted_for: FleetEase
---

# FleetEase Verification Loop

Use after a significant implementation, bug fix, refactor or security-sensitive change.

## Phase 1 — Diff and scope

Inspect the changed files and confirm there are no unrelated modifications.

For each changed file ask:
- Is this file required?
- Does the change preserve existing architecture?
- Did it introduce duplicate business logic?
- Did it bypass a shared service, mapper, RPC or financial source of truth?

## Phase 2 — Type safety

Run:

```bash
npm run type-check
```

Fix relevant TypeScript errors before proceeding.

## Phase 3 — Targeted tests

Run the smallest relevant Jest tests first.

For bug fixes, verify the regression test exercises the actual failing path.

## Phase 4 — Broader tests

Run:

```bash
npm run test:ci
```

When appropriate, also run:

```bash
npm run test:coverage
```

## Phase 5 — Build

For production-impacting changes:

```bash
npm run build
```

A failed production build blocks completion.

## Phase 6 — Security

For auth, Supabase, API, uploads, financial or sensitive-data changes, invoke `security-review` and verify its checklist.

## Phase 7 — Architecture integrity

Before completion verify:
- financial calculations still have one source of truth;
- reports/dashboard do not invent independent financial calculations;
- company isolation remains intact;
- soft deletes remain intact;
- role boundaries remain intact;
- protected formulas were not modified without explicit authorization.

## Completion report

Use factual evidence:

```text
VERIFICATION
Build: PASS/FAIL/NOT RUN
Types: PASS/FAIL/NOT RUN
Targeted tests: PASS/FAIL/NOT RUN
Full tests: PASS/FAIL/NOT RUN
Coverage: RESULT/NOT RUN
Security: PASS/FAIL/NOT RUN
Scope: <files/modules>
Known issues: <list>
```

Never mark an unrun check as PASS.
