---
name: sdd-harness-creator
description: >-
  Build, audit, and improve spec-driven (SDD) harnesses for AI coding agents:
  constitution, per-feature spec/plan/tasks, acceptance-criteria traceability,
  phase gates, verification-against-spec, and session lifecycle. Use when a
  repository should drive implementation from specifications instead of ad-hoc
  feature lists.
metadata:
  language: agnostic
  tags: [meta, sdd, spec-driven, skill-creation]
---

# SDD Harness Creator

Use this skill to make a repository drive coding agents from **specifications**: each feature flows through Specify → Clarify → Plan → Tasks → Implement → Verify, with gates between phases and traceability from every acceptance criterion to a task and to verification evidence.

This is the spec-driven sibling of `harness-creator`. Reach for it when the source of truth should be the spec, not a free-form feature list.

Not for model selection, prompt tuning in isolation, chat UI design, or general app architecture.

## Build-time vs. run-time

This skill runs **once per repository** (build-time): it scaffolds the structure, gates, and validators. The actual per-feature authoring of `spec.md`/`plan.md`/`tasks.md` happens **inside the target repo** (run-time), done by whatever agent follows the generated `AGENTS.md`. So authoring guidance must live in the target repo — it is baked into the templates and `AGENTS.md`, not kept only in this skill. No second "authoring" skill is required.

## The SDD Flow

| Phase | Artifact | Gate to leave the phase |
|---|---|---|
| Specify | `specs/NNN-slug/spec.md` | Every requirement has a testable acceptance criterion (AC-ID); no `[NEEDS CLARIFICATION]` left |
| Clarify | spec.md (clarifications log) | Zero open clarification markers |
| Plan | `specs/NNN-slug/plan.md` | Every functional requirement is covered; decisions consistent with `constitution.md` |
| Tasks | `specs/NNN-slug/tasks.md` | Bidirectional coverage: every AC has ≥1 task and every task references an AC |
| Implement | code | One task at a time; never start before the Tasks gate passes |
| Verify | evidence in `spec-registry.json` | Every AC has recorded passing evidence; traceability complete |

`spec-registry.json` is the structured source of truth (phases, AC↔task links, evidence). The markdown docs carry the same AC IDs for humans.

## First Move

1. Inspect what already exists: instruction files, any specs, verification commands, package manifests.
2. Ask only for missing context that cannot be inferred safely: target agent, file name (`AGENTS.md` vs `CLAUDE.md`), whether overwriting is allowed.
3. Scaffold the SDD harness, then explain how to replace the example feature under `specs/`.

## Common Tasks

### Create an SDD harness

```bash
node skills/sdd-harness-creator/scripts/create-sdd-harness.mjs --target /path/to/project
```

Options:

- `--agent-file CLAUDE.md` for Claude-oriented projects.
- `--package-manager npm|pnpm|yarn|bun` when detection is wrong.
- `--commands "cmd one,cmd two"` for custom verification.
- `--force` only after confirming overwrites are acceptable.

### Adopt SDD on an existing codebase (reverse-engineer)

For brownfield projects, reconstruct specs from the current implementation so new work builds on documented behavior:

```bash
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project --dry-run
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project
```

It scans source modules, derives acceptance criteria (preferring existing test names, else exported symbols), writes `specs/NNN-slug/{spec,plan,tasks}.md`, and merges features into `spec-registry.json` with `phase: "documented"` and `origin: "reverse-engineered"`. Existing registry features are preserved. Then review each retro-spec, confirm the criteria reflect *intended* (not just current) behavior, and run the traceability check.

### Check traceability (the core SDD gate)

```bash
node skills/sdd-harness-creator/scripts/check-traceability.mjs --target /path/to/project
```

Reports orphan acceptance criteria (no task), orphan tasks (no AC), open clarifications, and ACs without evidence. Non-zero exit on any gap, so it works inside `init.sh`.

### Audit an existing SDD harness

```bash
node skills/sdd-harness-creator/scripts/validate-sdd-harness.mjs --target /path/to/project
```

Reports the six SDD subsystem scores, the lowest-scoring area, and the first 2-3 changes that would improve reliability.

## When to Read References

- Methodology, gates, and traceability rules: [Spec-Driven Pattern](references/spec-driven-pattern.md)
- Registry structure (reference only — not scaffolded into target repos): [spec-registry.schema.json](references/spec-registry.schema.json)

## Design Rules

- Keep the root instruction file short: route the flow and state the gates, not a full manual.
- The spec is the source of truth. Code is derived from it; verification is measured against acceptance criteria.
- No phase may be skipped, and no gate may be bypassed without an explicit, recorded decision.
- Every acceptance criterion is testable and traceable to a task and to evidence.
- Keep project facts in the target repo (constitution, specs), not in this skill.
- Never hide destructive behavior in scripts; overwrites require explicit user approval.

## Deliverable Checklist

- [ ] `AGENTS.md` or `CLAUDE.md` with the SDD flow and gates
- [ ] `constitution.md` (project principles/invariants)
- [ ] `spec-registry.json`
- [ ] `specs/NNN-slug/{spec,plan,tasks}.md` example feature
- [ ] `progress.md`
- [ ] `init.sh` running verification + traceability check

For an existing codebase, additionally run `reverse-engineer.mjs` to seed `specs/` and the registry from current behavior before planning new features.

If you cannot create files, provide exact file contents and commands instead.
