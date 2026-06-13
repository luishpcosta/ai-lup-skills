# Spec (reverse-engineered): cli

**Feature ID:** 002-cli
**Phase:** documented
**Origin:** reverse-engineered from existing code
**Last updated:** 2026-06-13

> Reconstructed from the current implementation. Acceptance criteria were derived from tests.
> Review and correct these against intended behavior, then advance the feature toward `verified`/`done`.

## Current Behavior (as observed in code)

Source files:
- cli/index.js
- cli/src/commands/add.js
- cli/src/commands/list.js
- cli/src/commands/remove.js
- cli/src/utils/frontmatter.js
- cli/src/utils/paths.js
- cli/src/utils/skills.js

Public surface (exported/public symbols):
- addCommand
- listCommand
- removeCommand
- readSkillMetadata
- getSkillTargetPath
- REPO_ROOT
- SKILLS_SOURCE_DIR
- AGENT_TARGETS
- discoverSkills
- findSkill

Tests covering this module:
- cli/test/add.test.js
- cli/test/frontmatter.test.js
- cli/test/list.test.js
- cli/test/paths.test.js
- cli/test/remove.test.js
- cli/test/skills.test.js

## Acceptance Criteria (reconstructed)

- **AC-1** — addCommand exibe erro quando a skill não existe _(existing test: cli/test/add.test.js)_
- **AC-2** — addCommand não copia nada quando nenhum agente é selecionado _(existing test: cli/test/add.test.js)_
- **AC-3** — addCommand copia a skill para os agentes selecionados _(existing test: cli/test/add.test.js)_
- **AC-4** — addCommand encontra skill aninhada em categoria e instala de forma plana _(existing test: cli/test/add.test.js)_
- **AC-5** — lê language e tags inline aninhados sob metadata _(existing test: cli/test/add.test.js)_
- **AC-6** — lê language com aspas e tags em bloco sob metadata _(existing test: cli/test/add.test.js)_
- **AC-7** — também tolera language e tags no topo do frontmatter _(existing test: cli/test/add.test.js)_
- **AC-8** — campos ausentes retornam valores neutros _(existing test: cli/test/add.test.js)_
- **AC-9** — sem frontmatter retorna valores neutros _(existing test: cli/test/add.test.js)_
- **AC-10** — sem arquivo SKILL.md retorna valores neutros _(existing test: cli/test/add.test.js)_
- **AC-11** — tags em bloco param na primeira linha que não é item _(existing test: cli/test/add.test.js)_
- **AC-12** — language vazio é tratado como ausente _(existing test: cli/test/add.test.js)_
- **AC-13** — listCommand mostra "Nenhuma skill disponível." quando o diretório não existe _(existing test: cli/test/add.test.js)_
- **AC-14** — listCommand agrupa por language seguindo o frontmatter, não as pastas _(existing test: cli/test/add.test.js)_
- **AC-15** — listCommand filtra por --language _(existing test: cli/test/add.test.js)_

## Assumptions / To Confirm

- [ ] Confirm each AC matches *intended* behavior, not just current behavior.
- [ ] Identify any undocumented behavior or dead code not captured above.
- [ ] Note edge cases the existing tests do not cover.

## Out of Scope (Non-Goals)

- _(fill in once intended scope is confirmed)_
