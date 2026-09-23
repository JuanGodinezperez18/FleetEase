---
name: fleetease-financial-integrity
description: Protect FleetEase's financial source of truth. Use for financial data, transactions, payments, credits, CxC, partner balances, deposits, income, expenses, purchases, fines, cash flow, profitability, dashboards, reports or analysis.
---

# FleetEase Financial Integrity

A financial fact must have one authoritative source. UI pages, dashboards, reports and analysis must consume authoritative data/services; they must not independently recreate financial formulas.

Before changing code:
1. Identify the authoritative persistence/service/RPC.
2. Trace create, edit, cancel, delete/soft-delete and reversal paths.
3. Identify downstream consumers.
4. Search for duplicate formulas, hardcoded thresholds and magic amounts.
5. Preserve approved formulas in src/lib/financial-metrics.ts and other protected calculation modules unless the user explicitly authorizes a formula change.

For multi-record financial operations, verify atomicity and rollback. A UI success message is invalid until persistence succeeds.

Preferred flow:
DB/source transaction -> domain/service calculation -> shared derived metric -> consumers.

Do not create page-local financial calculations when a shared source exists.

For relevant changes test create, partial payment, full payment, edit, cancellation, reversal, deletion/soft-delete, reload and cross-module consumers.

When changing a financial workflow, inspect Dashboard, Reports, Financial Analysis, Payments, CxC, Partners, Vehicles and other affected modules for duplicate calculations or stale assumptions.

Every review must state: source of truth, writers, consumers, duplicated logic found, transaction/reversal behavior and regression tests required.
