# Spec (reverse-engineered): CLI — Utilitários (frontmatter/paths/skills)

**Feature ID:** 002-cli-utils
**Phase:** documented
**Origin:** reverse-engineered from existing code
**Last updated:** 2026-06-13

> Reconstruído do comportamento atual (critérios derivados dos testes existentes).
> Revisar contra o comportamento *pretendido* antes de avançar para `verified`/`done`.

## Problema / Contexto

Camada de utilitários do CLI: leitura de metadata, resolução de caminhos por agente e descoberta de skills.

## Comportamento Atual (observado no código)

Arquivos-fonte:
- `cli/src/utils/frontmatter.js`
- `cli/src/utils/paths.js`
- `cli/src/utils/skills.js`

Superfície pública:
- `readSkillMetadata`
- `getSkillTargetPath`
- `AGENT_TARGETS`
- `discoverSkills`
- `findSkill`

Testes que cobrem esta feature:
- `cli/test/frontmatter.test.js`
- `cli/test/paths.test.js`
- `cli/test/skills.test.js`

## Critérios de Aceite (reconstruídos)

_Leitura de frontmatter (readSkillMetadata)_ — fonte `cli/src/utils/frontmatter.js`, teste `cli/test/frontmatter.test.js`:
- **AC-1** — lê language e tags inline aninhados sob metadata _(satisfaz T-1)_
- **AC-2** — lê language com aspas e tags em bloco sob metadata _(satisfaz T-1)_
- **AC-3** — também tolera language e tags no topo do frontmatter _(satisfaz T-1)_
- **AC-4** — campos ausentes retornam valores neutros _(satisfaz T-1)_
- **AC-5** — sem frontmatter retorna valores neutros _(satisfaz T-1)_
- **AC-6** — sem arquivo SKILL.md retorna valores neutros _(satisfaz T-1)_
- **AC-7** — tags em bloco param na primeira linha que não é item _(satisfaz T-1)_
- **AC-8** — language vazio é tratado como ausente _(satisfaz T-1)_

_Resolução de caminhos (getSkillTargetPath/AGENT_TARGETS)_ — fonte `cli/src/utils/paths.js`, teste `cli/test/paths.test.js`:
- **AC-9** — getSkillTargetPath resolve o caminho para o agente Claude _(satisfaz T-2)_
- **AC-10** — getSkillTargetPath resolve o caminho para o agente Devin _(satisfaz T-2)_
- **AC-11** — getSkillTargetPath lança erro para agente desconhecido _(satisfaz T-2)_
- **AC-12** — AGENT_TARGETS contém claude e devin _(satisfaz T-2)_

_Descoberta de skills (discoverSkills/findSkill)_ — fonte `cli/src/utils/skills.js`, teste `cli/test/skills.test.js`:
- **AC-13** — discoverSkills retorna [] quando o diretório não existe _(satisfaz T-3)_
- **AC-14** — discoverSkills acha skills na raiz e aninhadas em categorias _(satisfaz T-3)_
- **AC-15** — discoverSkills não desce dentro de uma skill (ignora scripts/) _(satisfaz T-3)_
- **AC-16** — findSkill encontra a skill pelo nome _(satisfaz T-3)_
- **AC-17** — findSkill retorna undefined quando não existe _(satisfaz T-3)_
- **AC-18** — findSkill lança erro em caso de nome ambíguo _(satisfaz T-3)_

## Assumptions / To Confirm

- [ ] Confirmar que cada AC reflete o comportamento *pretendido*, não apenas o atual.
- [ ] Verificar edge cases não cobertos pelos testes existentes.

## Fora de Escopo (Não-objetivos)

- Novos comandos/utilitários ainda não implementados (entram como specs novas, spec-first).
