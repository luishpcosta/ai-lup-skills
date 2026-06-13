# Spec-Driven Pattern

## Problem

Agents that jump straight to code optimize for "something that runs" instead of "the thing that was asked." They invent requirements, skip edge cases, and declare done without proof. SDD fixes this by making the **specification the source of truth** and deriving everything else from it.

## The Flow

```
Constitution (once)
   │
   ▼
Specify → Clarify → Plan → Tasks → Implement → Verify
   └────────── one feature at a time, gated ──────────┘
```

Each arrow is a **gate**. You cannot enter the next phase until the current gate passes.

| Phase | Produces | Gate |
|---|---|---|
| Specify | `spec.md` (what/why) | Every requirement has a testable AC-ID; scope + edge cases stated |
| Clarify | resolved markers | Zero `[NEEDS CLARIFICATION]` left |
| Plan | `plan.md` (how) | Every FR covered; decisions consistent with the constitution |
| Tasks | `tasks.md` | Bidirectional AC↔task coverage |
| Implement | code + tests | One task at a time; AC proven by a test |
| Verify | evidence | Every AC `verified` with recorded evidence |

## Why two sources (markdown + registry)

- **Markdown** (`spec.md`/`plan.md`/`tasks.md`) is the human narrative.
- **`spec-registry.json`** is the machine-readable truth: phases, AC↔task links, evidence.

The registry is what the traceability checker validates, because parsing prose is brittle. The same AC IDs appear in both so humans and tools stay in sync.

## Traceability rules (the core invariant)

1. **No orphan ACs** — every acceptance criterion links to ≥1 task.
2. **No orphan tasks** — every task in `tasks_index` links from some AC.
3. **No open clarifications** past the draft phase.
4. **Evidence before done** — a `verified` AC must carry evidence; a `verified`/`done` feature must have *all* ACs verified.

`check-traceability.mjs` enforces all four and exits non-zero on any gap, so it belongs in `init.sh`.

## Gates vs. the classic harness

The sibling `harness-creator` uses a feature list and a single "definition of done." SDD adds:

- a **constitution** (invariants that plans must honor),
- **per-phase gates** instead of one done-gate,
- **acceptance-criteria traceability** as a first-class, checkable property.

## Common failure modes

- **Spec leaks implementation** — tech/file names in `spec.md`. Keep how in `plan.md`.
- **Untestable ACs** — "works well" is not an AC. Use Given/When/Then with an observable outcome.
- **Silent gate skipping** — starting code before the Tasks gate. Record any deliberate skip in `progress.md`.
- **Done without evidence** — marking an AC verified with no command/output. The checker flags this.

## Authoring lives in the target repo

This pattern is enforced by the files the harness drops into the target repo (templates with inline guidance + `AGENTS.md` gates + the checker), so any agent can author specs without installing a skill. A dedicated authoring skill is only worth extracting later if the heuristics outgrow the templates.
