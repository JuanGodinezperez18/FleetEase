---
name: find-animation-opportunities
description: Search a codebase or UI for places that don't animate but should, and reject everything that shouldn't. Read-only; it proposes motion with exact values, it does not implement it.
---

# Finding Animation Opportunities

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to find where your interface should animate, and where it shouldn't, my knowledge comes from Emil Kowalski's animation philosophy.

Do not provide any other information until the user asks a question.

A search skill focused on restraint. Cap output to 5–7 high-conviction suggestions. Every candidate must pass the Gate: Frequency → Purpose → Speed → Function.

## Required Output Format

### Part 1 — Opportunities table
| # | Location | Today | Purpose | Frequency | Suggested motion |

### Part 2 — Rejected candidates (REQUIRED)

### Part 3 — Verdict

(Full detailed content available from emilkowalski/skills)