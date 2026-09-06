# Project Constitution

Non-negotiable principles for this repository. Plans and code must comply; conflicts are escalated to a human, never overridden silently.

**Project purpose:** {{PROJECT_PURPOSE}}

## Principles

1. **Spec before code** — No implementation begins before its feature has an approved spec and passes the Tasks gate.
2. **Every behavior is traceable** — Each acceptance criterion maps to a task and to verification evidence.
3. **Verification is mandatory** — A feature is done only when its acceptance criteria are proven by automated checks (or explicitly recorded manual evidence).
4. **Small, reversible steps** — One feature and one task at a time; keep the repo restartable.

Project-specific principles:

{{EXTRA_PRINCIPLES}}

## Technical Constraints

- **Language / stack**: {{TECH_STACK}}
- **Test framework**: {{TEST_FRAMEWORK}}
- **Style / lint**: {{STYLE_LINT}}
- **Architecture boundaries**:

{{ARCH_BOUNDARIES}}

## Quality Bar

- Verification command(s) that must pass: {{QUALITY_BAR}}
- Every acceptance criterion is proven by a check that can be re-run.

## Amendments

Changing this constitution requires an explicit decision recorded in `progress.md` (date, rationale, who approved).
