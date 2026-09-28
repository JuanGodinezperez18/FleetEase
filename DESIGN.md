# FleetEase Design System — Phase 1

## Scope

Phase 1 consolidates the existing visual language without changing business logic, data flows, permissions, financial calculations, routing semantics, or validation rules.

## Brand tokens

Use the `--fe-*` CSS variables as the source of truth for FleetEase UI.

### Brand and surfaces

- `--fe-lime`: primary FleetEase accent.
- `--fe-ink`: dark application shell.
- `--fe-bg`: current theme application background.
- `--fe-main`: current theme main surface.
- `--fe-surface`: current theme card/surface.
- `--fe-panel`: elevated panel surface.
- `--fe-border`: subtle border.
- `--fe-hover`, `--fe-hover-strong`: interaction surfaces.

### Text

- `--fe-text`: primary text.
- `--fe-text-secondary`: secondary text.
- `--fe-text-muted`: supporting text.
- `--fe-text-faint`: metadata/eyebrow text.

### Controls and interaction

- `--fe-control-height`: 44px standard touch target.
- `--fe-control-height-sm`: 36px compact control.
- `--fe-focus-ring`: keyboard focus indicator.
- `--fe-motion-fast`: 160ms.
- `--fe-motion-base`: 240ms.
- `--fe-motion-slow`: 360ms.

### Shape and elevation

- `--fe-radius-sm`: compact controls.
- `--fe-radius-md`: cards and medium surfaces.
- `--fe-radius-lg`: larger grouped surfaces.
- `--fe-shadow-sm`: standard surface elevation.
- `--fe-shadow-md`: elevated surface.

## Component rules

### Card

`Card` is the canonical application surface. The component now consumes FleetEase border, radius, surface and shadow tokens.

Use `hover` only when the card is meaningfully interactive. Do not add decorative hover effects to static information.

### Button

`Button` is the canonical action component. Prefer semantic variants over local color utilities.

- `default`: primary FleetEase action.
- `secondary`: secondary action.
- `outline`: low-emphasis bordered action.
- `ghost`: contextual action.
- `destructive`: destructive operation.
- `link`: inline navigation/action.

### Skeleton

Use the shared `Skeleton` component for loading states. Avoid one-off pulse backgrounds when the same state can be represented by a shared primitive.

### Modules

Prefer:

- `.fe-module-header`
- `.fe-module-eyebrow`
- `.fe-module-title`
- `.fe-module-subtitle`
- `.fe-module-actions`
- `.fe-filter-surface`

for module-level hierarchy.

## UX principles

1. **Operational clarity over decoration.**
2. **Motion communicates state or feedback; it should not compete with data.**
3. **Lime is a signal and brand accent, not a universal decoration.**
4. **Use whitespace and typography to establish hierarchy before adding effects.**
5. **Do not communicate important state through color alone.**
6. **Keep interactive targets at least 44px where practical.**
7. **Respect `prefers-reduced-motion`.**
8. **Design dark and light themes from the same semantic tokens.**
9. **Do not introduce a new visual pattern when an existing primitive can express the same intent.**

## Migration policy

When a module is already being edited, replace local FleetEase colors, radii and shadows with `--fe-*` tokens where practical.

Do not perform a blind repository-wide class replacement. Visual normalization should be incremental and validated to avoid regressions.

## Phase 1 exclusions

The following are intentionally deferred:

- module-by-module visual redesign;
- dashboard information architecture changes;
- removal of legacy components without reference verification;
- changing default interaction behavior across existing cards;
- business logic, financial calculations, database queries and authorization changes.
