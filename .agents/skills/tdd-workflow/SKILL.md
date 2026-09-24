---
name: tdd-workflow
description: Apply ECC-style test-driven development to FleetEase feature work, bug fixes and refactors. Use the repository's Jest, TypeScript and targeted integration/E2E tests without changing protected business formulas.
metadata:
  origin: ECC
  adapted_for: FleetEase
---

# FleetEase TDD Workflow

Use this workflow for production changes unless the task is purely documentation or copy.

## Rules

1. Inspect the existing implementation and tests before changing code.
2. Define the user-visible behavior and regression risk.
3. Add or update a focused regression test before production code whenever practical.
4. Run the smallest relevant test and establish a meaningful RED state when fixing a reproducible bug.
5. Implement the smallest safe change.
6. Run the same test GREEN, then run type-check and relevant broader tests.
7. For financial, Supabase, auth or security changes, also apply the corresponding FleetEase skill.
8. Never modify protected financial formulas unless the user explicitly authorizes it.
9. Never use a test as a reason to weaken RLS, tenant isolation, role boundaries or soft-delete rules.
10. Record validation actually performed; never claim a test passed if it was not run.

## FleetEase validation commands

- `npm run type-check`
- `npm run test:ci`
- `npm run test:coverage`
- `npm run build`

Prefer targeted Jest tests first, then broader validation.

## Evidence

For significant changes, report:

| Area | Evidence |
|---|---|
| Behavior | Test that proves the intended behavior |
| Regression | Test that reproduces the previous failure |
| Types | `npm run type-check` result |
| Tests | Targeted and/or CI suite result |
| Build | `npm run build` result when applicable |
| Scope | Files/modules intentionally changed |

Do not require an arbitrary 80% project-wide coverage target if that conflicts with FleetEase's existing configuration; improve coverage around the changed behavior instead.
