# Plan (as-built): CLI — Utilitários (frontmatter/paths/skills)

**Feature ID:** 002-cli-utils
**Phase:** documented
**Spec:** ./spec.md
**Last updated:** 2026-06-13

> Notas as-built reconstruídas do código existente. Atualizar antes de planejar trabalho *novo*.

## Estrutura Existente

- `cli/src/utils/frontmatter.js` — Leitura de frontmatter (readSkillMetadata) (teste `cli/test/frontmatter.test.js`)
- `cli/src/utils/paths.js` — Resolução de caminhos (getSkillTargetPath/AGENT_TARGETS) (teste `cli/test/paths.test.js`)
- `cli/src/utils/skills.js` — Descoberta de skills (discoverSkills/findSkill) (teste `cli/test/skills.test.js`)

## Notas

- Stack Node.js (ESM); apenas módulos nativos + commander no CLI.
- Trabalho novo nesta feature deve adicionar ACs forward-looking em spec.md e tasks correspondentes.
