---
name: sdd-harness-creator
description: >-
  Build spec-driven (SDD) harnesses for AI coding agents: constitution,
  per-feature spec/plan/tasks, acceptance-criteria traceability, phase gates,
  verification-against-spec, and session lifecycle — all tracked in markdown,
  no external state file. Greenfield projects are elicited through a scripted
  interview; brownfield projects are reconstructed from cheap evidence and
  approved one module at a time. Use when a repository should drive
  implementation from specifications instead of ad-hoc feature lists.
metadata:
  language: agnostic
  tags: [meta, sdd, spec-driven, skill-creation, elicitation, brownfield]
---

# SDD Harness Creator

Use this skill to make a repository drive coding agents from **specifications**: each feature flows through Specify → Clarify → Plan → Tasks → Implement → Verify, with gates between phases and traceability from every acceptance criterion to a task and to verification evidence.

This is the spec-driven sibling of `harness-creator`. Reach for it when the source of truth should be the spec, not a free-form feature list.

Not for model selection, prompt tuning in isolation, chat UI design, or general app architecture.

## Pick the mode first

Look at the target repo. Is there source code outside docs/ and config?

- **No → Mode 1, greenfield.** The artifacts have to be *elicited*. Scaffolding a repo full of `<fill in>` placeholders produces a harness of appearances; an agent then invents the requirements it was supposed to be constrained by.
- **Yes → Mode 2, brownfield.** The artifacts have to be *reconstructed* from what the code already implies, then confirmed by the user — current behavior is not automatically intended behavior.

Both modes are driven by scripts that keep their state on disk and print the exact next command. Follow that literally.

## Rules that make this work on a lighter model

1. **One question or one module per turn.** Never batch.
2. **Never invent the next step** — run the command the last one printed after `NEXT:`.
3. **Never read the target's source files.** The recon script reads them for you and emits a bounded digest; reading source yourself is the failure this design exists to prevent.
4. **Paste the question verbatim** (translate it if the user is not writing in English). Do not paraphrase a question into something vaguer.
5. **Nothing is written until the user approves it.**

## Mode 1 — Greenfield: elicit, then render

```bash
node skills/sdd-harness-creator/scripts/interview.mjs init --target /path/to/project
```

Then repeat this loop until `next` prints `DONE`:

1. `interview.mjs next` — prints one question with its rubric (ACCEPT / REJECT / good / bad example).
2. Read the `ASK:` line to the user, verbatim.
3. **Rewrite their reply** into the form `ACCEPT:` describes, show them both, and get an explicit yes:
   ```
   You said:      "it should error out if the file isn't there"
   I'll record:   AC-3 — Given the target file does not exist, when the command runs,
                  then it exits non-zero with "not found".
   Accept this, or correct it?
   ```
4. `interview.mjs answer --id <Q-ID> --raw "<their words>" --restated "<your rewrite>"`.
   A vague or malformed rewrite exits non-zero with `REJECTED:` and `RE-ASK:` — show the user *why* and ask again. The third attempt is recorded as `[NEEDS CLARIFICATION]` rather than blocking the session.
   Repeating questions (criteria, edge cases, risks) stay open until you close them with `--done`.
5. When done: `interview.mjs render` writes the harness with the elicited content.

The grilling is mechanical, not a matter of judgement: `scripts/lib/questions.mjs` rejects non-commands, criteria missing Given/When/Then, implementation leaking into `spec.md`, and a bank of vague terms. Details and the full question bank: [Elicitation](references/elicitation.md).

## Mode 2 — Brownfield: cheap recon, then approve module by module

```bash
node skills/sdd-harness-creator/scripts/create-sdd-harness.mjs --target /path/to/project
node skills/sdd-harness-creator/scripts/recon.mjs            --target /path/to/project
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target /path/to/project --list
```

`recon.mjs` climbs an evidence ladder — test names, public surface, declaration lines, head doc comments, commit subjects — and never emits a function body. `--list` ranks modules by evidence strength, because a module with tests reconstructs far better than one without.

Then, **one module per turn**:

1. `reverse-engineer.mjs --module <name> --propose` — prints that module's digest and the draft spec. Writes nothing.
2. Show the user the draft acceptance criteria and ask which applies: **approve / correct / skip / more evidence**.
3. Run exactly one of the four commands it printed:
   - `--write` (approved), `--write --notes "<correction>"` (corrected — the note lands in a `Corrections from review` section),
   - `--skip` (not worth tracking; never offered again),
   - `--more-evidence` (climb one rung and propose again, still within budget).
4. Back to `--list` for the next module.

Written specs carry `**Confirmed-by:**` and `**Confirmed-on:**`, so a reconstructed spec is never mistaken for a reviewed one. Then run Mode 1's interview for `constitution.md` alone (`interview.mjs init --artifact constitution`) — principles cannot be read off the code.

Details, budgets, and when to escalate: [Brownfield Recon](references/brownfield-recon.md).

Batch mode is still available for non-interactive use, and is the only destructive path:

```bash
node skills/sdd-harness-creator/scripts/reverse-engineer.mjs --target DIR --all --dry-run
```

## Other tasks

### Plain scaffold, no interview

```bash
node skills/sdd-harness-creator/scripts/create-sdd-harness.mjs --target /path/to/project
```

Options: `--agent-file CLAUDE.md`, `--package-manager npm|pnpm|yarn|bun`, `--commands "cmd one,cmd two"`, `--force` (only after confirming overwrites are acceptable). The artifacts land with placeholder guidance — use it when the user explicitly does not want an interview.

### Migrate a harness scaffolded before this version

```bash
node skills/sdd-harness-creator/scripts/migrate-from-registry.mjs --target /path/to/project
```

For projects that already have a `spec-registry.json` from an older version: prints what it tracked, renames it to `spec-registry.json.bak` (never deletes), and prints a manual checklist. If the user asks to update this skill in a repo that already has a harness, run through [Upgrading](references/upgrading.md) — it covers more than this one script does.

## Build-time vs. run-time

This skill runs **once per repository** (build-time): it elicits or reconstructs the artifacts and sets up the gates. The per-feature authoring that follows happens **inside the target repo** (run-time), done by whatever agent follows the generated `AGENTS.md`. So authoring guidance must live in the target repo — it is baked into the templates and `AGENTS.md`, not kept only in this skill.

## The SDD Flow

| Phase | Artifact | Gate to leave the phase |
|---|---|---|
| Specify | `specs/NNN-slug/spec.md` | Every requirement has a testable acceptance criterion (AC-ID) |
| Clarify | spec.md (clarifications log) | Zero `[NEEDS CLARIFICATION]` markers left |
| Plan | `specs/NNN-slug/plan.md` | Every functional requirement is covered; decisions consistent with `constitution.md` |
| Tasks | `specs/NNN-slug/tasks.md` | Bidirectional coverage: every AC has ≥1 task and every task references an AC |
| Implement | code | One task at a time; never start before the Tasks gate passes |
| Verify | evidence in `tasks.md`'s Evidence column and `progress.md` | Every AC has recorded passing evidence |

Markdown is the only source of truth: each `spec.md`/`plan.md`/`tasks.md` carries its own `**Phase:**` line, and `tasks.md` carries per-task Status/Evidence. There is no separate machine-readable registry — traceability is confirmed manually against `tasks.md`'s Coverage Check before advancing a phase.

## When to Read References

- Methodology, gates, and the canonical phase names: [Spec-Driven Pattern](references/spec-driven-pattern.md)
- Running the greenfield interview: [Elicitation](references/elicitation.md)
- Running the brownfield recon and approval loop: [Brownfield Recon](references/brownfield-recon.md)
- After updating this skill in a repo that already has a harness: [Upgrading](references/upgrading.md)

## Design Rules

- Keep the root instruction file short: route the flow and state the gates, not a full manual.
- The spec is the source of truth. Code is derived from it; verification is measured against acceptance criteria.
- No phase may be skipped, and no gate may be bypassed without an explicit, recorded decision.
- Every acceptance criterion is testable and traceable to a task and to evidence.
- State belongs on disk (`.sdd/`), not in the conversation — a session that dies mid-interview resumes exactly where it stopped.
- Keep project facts in the target repo (constitution, specs), not in this skill.
- Never hide destructive behavior in scripts; overwrites require explicit user approval.

## Deliverable Checklist

- [ ] `AGENTS.md` or `CLAUDE.md` with the SDD flow and gates
- [ ] `constitution.md` filled from the interview, not left as placeholders
- [ ] `specs/NNN-slug/{spec,plan,tasks}.md` — elicited (greenfield) or confirmed (brownfield)
- [ ] `progress.md`
- [ ] `init.sh` running verification
- [ ] `.sdd/` added to the target repo's `.gitignore` if the interview state should not be committed

If you cannot create files, provide exact file contents and commands instead.
