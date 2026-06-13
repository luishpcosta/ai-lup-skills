# Tasks: Example Feature

**Feature ID:** 001-example
**Phase:** tasked
**Plan:** ./plan.md
**Last updated:** 2026-06-13

> Small, ordered, independently verifiable tasks derived from `plan.md`.
> **Gate:** every acceptance criterion has ≥1 task, and every task references an AC.
> Mirror the task↔AC links into `spec-registry.json` (`acceptance_criteria[].tasks` and `tasks_index`).

## Tasks

| ID | Task | Satisfies | Status | Evidence |
|---|---|---|---|---|
| T-1 | <atomic task> | AC-1 | todo | |
| T-2 | <atomic task> | AC-1, AC-2 | todo | |
| T-3 | <write test proving AC-2> | AC-2 | todo | |

Status values: `todo` → `doing` → `done`.

## Coverage Check

- Every AC referenced by at least one task? <yes/no>
- Every task linked to an AC? <yes/no>

Run `node skills/sdd-harness-creator/scripts/check-traceability.mjs --target .` to confirm before implementing.
