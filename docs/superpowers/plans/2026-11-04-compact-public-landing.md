# Compact public landing implementation plan

**Goal:** Apply the visual audit approved by Juan to PR #137, preserving the dashboard work and all business behavior.
**Architecture:** Server-rendered marketing pages share navigation and footer. A small Radix tabs island replaces three stacked product screenshots; detailed screenshots move to Funciones. Local administration has its own public page.
**Stack:** Existing Next.js, React, Tailwind, Radix and Framer Motion only.
**Spec:** Approved visual audit `FleetEase_Auditoria_Visual_PR137.zip`, commit 9a753d5 baseline, and the proposal in this conversation.

## Constraints and decisions

- Keep black/lime FleetEase identity, existing type, plans, contact subjects, social links, image variants and protected application routes.
- Execute directly in the existing isolated PR branch; the user approved implementation and preview publication. No merge or production changes.
- Design read: marketing for Mexican rental operators; operational black/lime visual language; ENERGY 2, RHYTHM 2, MOTION 2. Accent identifies actions and selected product category. Tabs group comparable views; pricing cards preserve three actual offers. Crop UI through presentation only, retaining full image links.
- Apply visual rules during the approved implementation; no asset generation or new dependencies.

## Review focus

Anonymous marketing vs private route boundaries; keyboard tabs and mobile menu; anchor links from secondary pages; content with reduced motion; screenshots and FAQ structured data consistency.

## Tasks

- [ ] Public routes: extend middleware tests for six exact public routes and private lookalikes, watch new cases fail, add exact allowlist, rerun.
- [ ] Compact principal: shared footer/shell, focused screenshot rendering, keyboard accessible product tabs, compact steps preserving `#como-funciona`, plans earlier, four shared FAQ entries and condensed service strip. Verify tabs change content, keyboard and full image link.
- [ ] Secondary pages: move detailed showcase to Funciones, refocus Soluciones by audience, add administration page with existing contact subject and sitemap entry. Preserve metadata/canonicals.
- [ ] Motion: remove group reveal, menu opacity/transform with Escape and focus return, reduced motion support, sticky CTA independent final-intersection state. Test sticky suppression through subsequent scroll.
- [ ] Verification: type check, production build, targeted tests and full suite; source review; preview anonymous navigation and screenshot evidence. Record widths actually observed and pending limitations.

## Progress

Baseline confirmed clean at 9a753d5; PR #137 open/draft. No implementation from the interrupted turn had been made.

Implementation: exact six-route marketing allowlist; compact home with Radix product explorer, focused presentation crop and full screenshot links; shared public header/footer; detailed Funciones, audience-based Soluciones, local administration page and sitemap; four FAQ entries shared with JSON-LD; reduced-motion menu and CTA; retained final-CTA intersection state.

Verification: six new anonymous route cases failed with login redirects before implementation and pass afterward; three private lookalikes remain protected. Two explorer cases failed before tabs existed and now pass (click + arrow key). Sticky CTA regression failed on scroll after final intersection and passes after retaining visibility state. TypeScript passes. Full suite: 343 pass, 5 existing failures (financial-metrics inclusive end boundary; auth-persistence persistent session, tab session, inactive scope cleanup and sign-out cleanup), previously reproduced on clean baseline. First production build passes; final build and preview verification pending.

Fresh code review: one important selector collision affecting inactive tabs, corrected using exact class tokens. Verify computed colors in preview. Copy improved to “En qué podemos apoyarte”. Minor deferred: responsive image selection remains based on container width, while focused presentation enlarges the image by 23%; existing source variants remain available and full images can be opened. Browser validation remains necessary.

Preview findings: a duplicate selector in landing-text.css also affected inactive tabs, reproduced by a real computed-style test and corrected. Reflow checks via browser zoom observed 779 and 340 CSS-pixel widths without horizontal overflow. At 779 px the header was crowded: switch desktop navigation at lg (1024) and show all three real plans from md (768). An incoming /#pricing link reached home before its content mounted through the shared splash, leaving scroll at zero: honor the hash once the header/content mounts, with a regression test. No global auth/splash change.
