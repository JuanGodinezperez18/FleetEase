# FleetEase Design System

## Scope

This document is the source of truth for FleetEase UI. Visual work must preserve business logic, data flows, permissions, financial calculations, routing semantics, and validation rules.

## Brand tokens

Use the `--fe-*` CSS variables (defined in `src/app/fleetease-ui.css`) as the **only** source of truth for color, radius, shadow, motion, and control sizing.

### Brand and surfaces

- `--fe-lime`: primary FleetEase accent (`#d7ff3f`). Signal and brand — not decoration.
- `--fe-lime-text`: darker lime for text/icons on light surfaces (`#5c6d08`).
- `--fe-ink`: dark application shell.
- `--fe-bg`: current theme application background.
- `--fe-main`: current theme main surface.
- `--fe-surface`: current theme card/surface.
- `--fe-panel`: elevated panel surface.
- `--fe-border`: subtle border.
- `--fe-hover`, `--fe-hover-strong`: interaction surfaces.
- `--fe-nav-active`, `--fe-nav-active-strong`: sidebar / nav selected state (lime tint).
- `--fe-nav-active-text`: text on active nav in light mode.

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

### Loading

- `--fe-skeleton` / `--fe-skeleton-shimmer`: skeleton base and highlight.
- Always use the shared `Skeleton` component or the `.fe-skeleton` class. Never invent one-off pulse boxes.

## Theme model

1. **Semantic tokens first.** Components read `--fe-*`, not hard-coded hex (except inside the token file).
2. **Dark and light from the same tokens.** `.dark` and `.light` only reassign semantic variables; they must not introduce parallel visual systems.
3. **Avoid long-term `!important` bridges.** Bridges for legacy `text-white` / dark hex exist for migration only; when editing a module, replace them with tokens.
4. **Lime stays lime.** Active nav, primary actions, and focus rings must resolve to `--fe-lime` (or `--fe-lime-text` on light backgrounds when contrast requires it). Do not use a muted HSL “primary” for brand chrome.

## Component rules

### Card

`Card` is the canonical application surface. Consume FleetEase border, radius, surface, and shadow tokens.

Use `hover` only when the card is meaningfully interactive.

### Button

Prefer semantic variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`.

### Skeleton

Use shared `Skeleton` / `.fe-skeleton` for every loading state (route `loading.tsx`, suspense fallbacks, module placeholders). A single empty rectangle is never an acceptable loading state.

### Sidebar / navigation

- Inactive: muted text + hover surface.
- Active: `--fe-nav-active` background, lime accent bar/icon, readable text (`--fe-text` or `--fe-nav-active-text` in light).
- Do not rely solely on shadcn `--sidebar-primary` without aligning it to `--fe-lime`.

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
10. **Loading states must feel intentional** (full skeleton structure, never a lone empty box).

## Migration policy

When a module is already being edited, replace local colors, radii, and shadows with `--fe-*` tokens.

Do not perform a blind repository-wide class replacement. Visual normalization should be incremental and validated to avoid regressions — but **new work must meet the token standard on first merge**.

## Explicit non-goals for pure visual PRs

- Changing business logic, financial calculations, database queries, or authorization.
- Dashboard information architecture changes without product sign-off.
- Removing legacy components without a reference check.
