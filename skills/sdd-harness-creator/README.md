# sdd-harness-creator

A compact skill for building and auditing **spec-driven (SDD)** harnesses around AI coding agents.

It makes a repository drive implementation from specifications: each feature flows through Specify → Clarify → Plan → Tasks → Implement → Verify, with gates between phases and traceability from every acceptance criterion to a task and to verification evidence.

It is the spec-driven sibling of `harness-creator`. The scripts use only Node.js built-in modules and are self-contained, so the skill installs and runs independently.

## Use

```bash
node skills/sdd-harness-creator/scripts/create-sdd-harness.mjs   --target /path/to/project
node skills/sdd-harness-creator/scripts/check-traceability.mjs   --target /path/to/project
node skills/sdd-harness-creator/scripts/validate-sdd-harness.mjs --target /path/to/project
```

## What It Creates

- `AGENTS.md` or `CLAUDE.md` — SDD flow and phase gates
- `constitution.md` — project principles/invariants
- `spec-registry.json` (+ `spec-registry.schema.json`) — structured source of truth
- `specs/NNN-slug/{spec,plan,tasks}.md` — example feature
- `progress.md`, `session-handoff.md`
- `init.sh` — verification + traceability check

## What It Checks

`validate-sdd-harness.mjs` scores six SDD subsystems: Constitution, Specification, Planning, Tasks & Traceability, Verification, Lifecycle. The score is structural — it tells you whether the SDD harness is present and coherent; it does not replace real agent-session testing.

`check-traceability.mjs` is the executable gate: it fails on orphan acceptance criteria, orphan tasks, open clarifications, or ACs without evidence.

## Boundaries

This skill is for spec-driven harness engineering, not model selection, prompt tuning alone, or app architecture. Keep project-specific facts (constitution, specs) in the target repository.
