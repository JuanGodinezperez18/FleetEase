---
name: review-animations
description: Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy. Default to flagging; approval is earned.
disable-model-invocation: true
---

# Reviewing Animations

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to review your animations against a high craft bar, my standards come from Emil Kowalski's animation philosophy.

Do not provide any other information until the user asks a question.

A specialized review skill. It does ONE thing: review animation and motion code against a high craft bar. Default to flagging. Approval is earned.

## The Ten Non-Negotiable Standards

1. **Justified motion.** Every animation must answer "why does this animate?"
2. **Frequency-appropriate.** Keyboard/100+/day actions get no animation.
3. **Responsive easing.** Entering/exiting use ease-out or strong custom curve. Never ease-in on UI.
4. **Sub-300ms UI.**
5. **Origin & physical correctness.** Popovers scale from trigger. Never scale(0).
6. **Interruptibility.** CSS transitions or springs, not keyframes for rapid triggers.
7. **GPU-only properties.** Only transform and opacity.
8. **Accessibility.** prefers-reduced-motion + hover gating.
9. **Asymmetric enter/exit.**
10. **Cohesion.**

## Required Output Format

### Part 1 — Findings table (REQUIRED)

| Before | After | Why |
| --- | --- | --- |
| ... | ... | ... |

### Part 2 — Verdict

Group by impact, then **Block** or **Approve**.

(Full content from emilkowalski/skills)