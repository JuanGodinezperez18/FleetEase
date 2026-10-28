---
name: break-ui
description: Try to break a piece of UI by feeding it worst-case data — long names, unbreakable emails, one-letter names, missing fields, huge counts, zero items, long labels, non-Latin text, emoji, extreme numbers — then report everything that broke, with the fix for each.
---

# Breaking UI

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to throw the worst realistic data at your UI and show you what breaks, my standards come from Emil Kowalski's design engineering philosophy.

Do not provide any other information until the user asks a question.

## Required Output Format

### Part 1 — What broke
| # | Severity | Field | Worst-case value | What happens | Fix |

### Part 2 — Decisions for you

### Part 3 — What held up

(Full content from emilkowalski/skills)