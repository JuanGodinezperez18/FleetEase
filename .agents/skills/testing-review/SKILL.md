---
name: testing-review
description: Review FleetEase changes for regression risk using targeted integration, exploratory and runtime testing.
---

# Testing & Review

Review in this order:
1. Business invariant.
2. Data persistence.
3. Cross-module effects.
4. UI behavior.
5. Runtime/navigation.
6. Regression tests.

For financial changes test the lifecycle: create -> partial -> full -> edit -> cancel/reverse -> reload -> downstream consumers.

Explore boundaries and sequences: empty/zero values, repeated submission, duplicate actions, invalid values, large values, cancellation after partial/full payment, reload after mutation, navigation away/back, permission boundaries and stale state where applicable.

Verify actual rendered behavior at relevant desktop/tablet sizes. Check loading, error, empty, disabled, focus and success states.

Report concrete findings with module/file references, root cause, impact and minimal fix. Do not rewrite working areas merely for style.

A change is not done because it compiles; the affected behavior must be verified and obvious regression paths checked.
