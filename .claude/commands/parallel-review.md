---
description: Run the four review agents (contract, performance, concurrency, maintainability) in parallel against the current branch's diff
argument-hint: "[base-ref, default: main]"
---

Diff the current branch against `${ARGUMENTS:-main}` using a merge-base diff (e.g. `git diff "${ARGUMENTS:-main}...HEAD"`, i.e. only what this branch has added). If the diff is empty, say so and stop.

Otherwise, launch these four agents **in parallel** — a single message with four Agent tool calls — passing each the same diff:

- `review-contract`
- `review-performance`
- `review-concurrency`
- `review-maintainability`

Each agent's own definition already contains its full instructions; just hand it the diff and the base ref it's compared against.

Once all four return, present their findings grouped under their own heading (Contract & Robustness, Performance & Scale, Concurrency & Side Effects, Maintainability & Design). This is advisory only — don't take any action beyond reporting.
