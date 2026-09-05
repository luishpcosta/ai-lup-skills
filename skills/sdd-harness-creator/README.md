# sdd-harness-creator

A compact skill for building **spec-driven (SDD)** harnesses around AI coding agents.

It makes a repository drive implementation from specifications: each feature flows through Specify → Clarify → Plan → Tasks → Implement → Verify, with gates between phases and traceability from every acceptance criterion to a task and to verification evidence.

It is the spec-driven sibling of `harness-creator`. The scripts use only Node.js built-in modules and are self-contained, so the skill installs and runs independently.

## Two modes

The mode is decided by one question: does the target repo already have source code?

### Greenfield — elicit the artifacts

An empty repo has nothing to reverse-engineer, so the artifacts are **interviewed** out of the user. A script owns the interview state, hands out one question at a time with its rubric, and rejects vague answers mechanically; the model rewrites each reply into canonical form and the user accepts it.

```bash
node skills/sdd-harness-creator/scripts/interview.mjs init   --target /path/to/project
node skills/sdd-harness-creator/scripts/interview.mjs next   --target /path/to/project
node skills/sdd-harness-creator/scripts/interview.mjs answer --id Q-SPEC-AC --raw "…" --restated "…" --target /path/to/project
node skills/sdd-harness-creator/scripts/interview.mjs render --target /path/to/project
```

### Brownfield — reconstruct, then confirm

An existing repo is reconstructed from **cheap evidence only** — test names, public surface, declaration lines, head doc comments, commit subjects. The script reads the code; the model only ever sees a bounded digest, and function bodies never enter it. Specs are proposed one module at a time and written only after the user approves.

```bash
node skills/sdd-harness-creator/scripts/recon.mjs            --target /path/to/project
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project --list
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project --module auth --propose
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project --module auth --write --notes "…"
```

Written specs carry `**Confirmed-by:**`/`**Confirmed-on:**`, so a reconstruction is never mistaken for a reviewed spec. `--all [--dry-run]` keeps the old non-interactive batch behavior.

## Designed for lighter models

Every design choice here exists so the skill does not depend on a large model's memory or restraint:

- **State on disk** (`.sdd/interview.json`, `.sdd/recon.json`) — a session that dies mid-interview resumes exactly where it stopped.
- **Every command prints `NEXT:`** — the model runs what it was told, instead of planning.
- **Extraction is structural** — the reduction in reading is enforced by the extractors, not requested in a prompt.
- **Rejection is mechanical** — vague answers, non-commands and criteria missing Given/When/Then are refused by a validator, not by judgement.

## Plain scaffold

```bash
node skills/sdd-harness-creator/scripts/create-sdd-harness.mjs --target /path/to/project
```

Creates `AGENTS.md` (or `CLAUDE.md`), `constitution.md`, `specs/001-example/{spec,plan,tasks}.md`, `progress.md` and `init.sh` with placeholder guidance — for when the user explicitly does not want an interview.

## Tracking state

There's no separate registry file — each `spec.md`/`plan.md`/`tasks.md` carries its own `**Phase:**` line, and `tasks.md` carries per-task Status/Evidence columns plus a Coverage Check. Traceability and verification are confirmed manually against those, not by a script.

## Migrating from a version with `spec-registry.json`

```bash
node skills/sdd-harness-creator/scripts/migrate-from-registry.mjs --target /path/to/project
```

Prints a summary of what the registry tracked, renames it to `spec-registry.json.bak` (never deletes), and lists what to check by hand.

## Tests

```bash
node --test skills/sdd-harness-creator/test/*.test.mjs
```

## Boundaries

This skill is for spec-driven harness engineering, not model selection, prompt tuning alone, or app architecture. Keep project-specific facts (constitution, specs) in the target repository.
