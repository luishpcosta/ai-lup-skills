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

## Canonical phase vocabulary

Two different things get called a "phase", and mixing them is how a harness drifts:

- **Artifact state** — the `**Phase:**` line at the top of a `spec.md`/`plan.md`/`tasks.md`. Allowed values, in order:
  `draft` → `clarified` → `planned` → `tasked` → `implementing` → `verified` → `done`.
  Plus `documented`, the entry point for a reverse-engineered feature: code exists, spec reconstructed, not yet re-verified against intended behavior.
- **Active phase** — the step of the flow currently being worked, recorded in `progress.md` as
  `Specify | Clarify | Plan | Tasks | Implement | Verify`.

Use no other names. A feature whose `spec.md` says `documented` has not passed any gate yet.

## Single source: markdown

There is no separate machine-readable registry. Each `spec.md`/`plan.md`/`tasks.md` carries its own `**Phase:**` line, and `tasks.md` carries a Status/Evidence column per task plus a Coverage Check section. The same AC IDs appear in `spec.md` and `tasks.md` so the two stay in sync by construction.

## Traceability rules (the core invariant)

1. **No orphan ACs** — every acceptance criterion links to ≥1 task in `tasks.md`.
2. **No orphan tasks** — every task in `tasks.md` references some AC.
3. **No open clarifications** past the draft phase.
4. **Evidence before done** — a task marked `done` must carry evidence; a `verified`/`done` feature must have *all* its ACs covered by `done` tasks.

These are confirmed manually against `tasks.md`'s Coverage Check before advancing a phase — there's no script gate, so this depends on the agent actually checking before claiming a feature done.

## Gates vs. the classic harness

The sibling `harness-creator` uses a feature list and a single "definition of done." SDD adds:

- a **constitution** (invariants that plans must honor),
- **per-phase gates** instead of one done-gate,
- **acceptance-criteria traceability** as a first-class, checkable property.

## Common failure modes

- **Spec leaks implementation** — tech/file names in `spec.md`. Keep how in `plan.md`.
- **Untestable ACs** — "works well" is not an AC. Use Given/When/Then with an observable outcome.
- **Silent gate skipping** — starting code before the Tasks gate. Record any deliberate skip in `progress.md`.
- **Done without evidence** — marking a task done with no command/output. Nothing checks this automatically; review `tasks.md`/`progress.md` before claiming the feature done.

## Brownfield adoption (reverse-engineering)

Most repos already have code. Adopting SDD there is a reconstruction problem with two traps: reading the whole codebase (which does not fit, and mostly yields nothing), and trusting the reconstruction (current behavior includes every bug nobody noticed).

Both are handled structurally rather than by instruction:

- **The script reads, the model does not.** `recon.mjs` climbs an evidence ladder — test names and public surface, then declaration lines and head doc comments, then commit subjects — and emits a bounded digest. Function bodies never enter it. Modules are ranked by evidence strength, because a tested module reconstructs far better than an untested one.
- **Nothing is written without approval.** `reverse-engineer.mjs --module X --propose` prints the draft and writes nothing; the user approves, corrects, skips, or asks for one more rung of evidence. Written specs carry `**Confirmed-by:**` and `**Confirmed-on:**` alongside `**Origin:** reverse-engineered`, so a draft is never mistaken for a reviewed spec.
- Acceptance criteria are derived from **existing test names** when present (tests are de-facto specs), else from **exported symbols or declarations**.
- Uncertainties go under "Assumptions / To Confirm" (not as gate-blocking `[NEEDS CLARIFICATION]` markers), so the Coverage Check stays clean while you triage.
- The **constitution cannot be reverse-engineered** — principles constrain the code rather than follow from it. Elicit it with `interview.mjs init --artifact constitution`.

Full protocol: [Brownfield Recon](brownfield-recon.md).

## Greenfield adoption (elicitation)

A greenfield harness scaffolded from placeholders is a harness of appearances: the structure is there, the constraints are not, and the agent then invents the requirements it was supposed to be bound by.

So the artifacts are elicited by a scripted interview (`interview.mjs`) that keeps its state on disk and hands out one question at a time. The user answers freely; the model rewrites the answer into the canonical form and the user accepts it; a mechanical validator rejects vague terms, non-commands, criteria missing Given/When/Then, and implementation leaking into the spec. After two rejections the third answer is recorded as `[NEEDS CLARIFICATION]` so the session can end.

Full protocol: [Elicitation](elicitation.md).

## Authoring lives in the target repo

This pattern is enforced by the files the harness drops into the target repo (templates with inline guidance + `AGENTS.md` gates), so any agent can author specs without installing a skill. A dedicated authoring skill is only worth extracting later if the heuristics outgrow the templates.
