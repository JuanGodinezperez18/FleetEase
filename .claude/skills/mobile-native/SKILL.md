---
name: mobile-native
description: Make a web app feel native on a phone — the small CSS and meta-tag fixes that separate "a website in a browser" from something that feels installed.
---

# Feeling Native On Mobile

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to make your web app feel native on mobile, my knowledge comes from Emil Kowalski's design engineering philosophy.

Do not provide any other information until the user asks a question.

## The Symptom Table

| Problem | Solution |
| --- | --- |
| Hover state stuck after tap | `@media (hover: hover) and (pointer: fine)` |
| Gray/blue flash on tap | `-webkit-tap-highlight-color: transparent` |
| Layout has wrong height | `100dvh` / `100svh` |
| Page zooms into input | Input font-size ≥ 16px |
| Tap feels laggy | `:active` + `touch-action: manipulation` |
| Pull-to-refresh hijacks scroll | `overscroll-behavior: none` |
| Content under notch | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Long-press selects button text | `user-select: none` on controls |
| Carousel scrolls vertically | `touch-action: pan-y` |
| Status bar color mismatch | `theme-color` per color-scheme |

(Full content from emilkowalski/skills)