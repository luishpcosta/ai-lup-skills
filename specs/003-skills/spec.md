# Spec (reverse-engineered): skills

**Feature ID:** 003-skills
**Phase:** documented
**Origin:** reverse-engineered from existing code
**Last updated:** 2026-06-13

> Reconstructed from the current implementation. Acceptance criteria were derived from tests.
> Review and correct these against intended behavior, then advance the feature toward `verified`/`done`.

## Current Behavior (as observed in code)

Source files:
- skills/sdd-harness-creator/scripts/check-traceability.mjs
- skills/sdd-harness-creator/scripts/create-sdd-harness.mjs
- skills/sdd-harness-creator/scripts/lib/reverse.mjs
- skills/sdd-harness-creator/scripts/lib/sdd-utils.mjs
- skills/sdd-harness-creator/scripts/reverse-engineer.mjs
- skills/sdd-harness-creator/scripts/validate-sdd-harness.mjs
- skills/skill-creator/eval-viewer/generate_review.py
- skills/skill-creator/scripts/__init__.py
- skills/skill-creator/scripts/aggregate_benchmark.py
- skills/skill-creator/scripts/generate_report.py
- skills/skill-creator/scripts/improve_description.py
- skills/skill-creator/scripts/package_skill.py
- skills/skill-creator/scripts/quick_validate.py
- skills/skill-creator/scripts/run_eval.py
- skills/skill-creator/scripts/run_loop.py
- skills/skill-creator/scripts/utils.py

Public surface (exported/public symbols):
- slugify
- isTestFile
- extOf
- detectSourceRoot
- groupIntoModules
- extractExports
- extractTestNames
- buildReverseFeature
- parseArgs
- exists
- readText
- readJson
- writeText
- copyTemplate
- detectPackageManager
- listFiles
- detectProject
- dedupe
- isoDate
- isoDateTime
- verificationCommands
- initScriptFromCommands
- analyzeTraceability
- loadSddHarnessFiles
- scoreSddHarness
- formatScoreReport
- formatTraceabilityReport
- SKILL_ROOT
- TEMPLATE_DIR
- SUBSYSTEMS
- PHASES
- get_mime_type
- find_runs
- build_run
- embed_file
- load_previous_iteration
- generate_html
- main
- ReviewHandler
- calculate_stats
- load_run_results
- aggregate_results
- generate_benchmark
- generate_markdown
- main
- generate_html
- main
- improve_description
- main
- should_exclude
- package_skill
- main
- validate_skill
- find_project_root
- run_single_query
- run_eval
- main
- split_eval_set
- run_loop
- main
- parse_skill_md

Tests covering this module:
- skills/sdd-harness-creator/test/reverse.test.mjs
- skills/sdd-harness-creator/test/scaffold.test.mjs
- skills/sdd-harness-creator/test/sdd-utils.test.mjs

## Acceptance Criteria (reconstructed)

- **AC-1** — slugify normalizes names _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-2** — isTestFile recognizes common test conventions _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-3** — detectSourceRoot prefers src then lib then app _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-4** — groupIntoModules splits by first segment under source root _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-5** — extractExports handles JS/TS forms _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-6** — extractExports handles Python public defs/classes _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-7** — extractTestNames reads JS test titles and python test fns _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-8** — auth _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-9** — logs in _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-10** — rejects bad password _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-11** — buildReverseFeature derives ACs from tests and stays traceability-clean _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-12** — buildReverseFeature falls back to exports, then to module-level AC _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-13** — create-sdd-harness scaffolds all expected files _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-14** — scaffold fills date placeholders (no YYYY-MM-DD masks left) _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_
- **AC-15** — scaffolded harness passes the traceability gate _(existing test: skills/sdd-harness-creator/test/reverse.test.mjs)_

## Assumptions / To Confirm

- [ ] Confirm each AC matches *intended* behavior, not just current behavior.
- [ ] Identify any undocumented behavior or dead code not captured above.
- [ ] Note edge cases the existing tests do not cover.

## Out of Scope (Non-Goals)

- _(fill in once intended scope is confirmed)_
