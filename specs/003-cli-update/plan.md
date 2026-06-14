# Plan: CLI — Comando update

**Feature ID:** 003-cli-update
**Phase:** verified
**Spec:** ./spec.md
**Last updated:** 2026-06-14

## Abordagem

`update` reutiliza os utilitários existentes (sem novas dependências):

1. **Validação de origem** (como `add`): `findSkill(skillName, skillsSourceDir)`. Se não
   achar, erro + `exitCode 1` e não pergunta. → AC-1
2. **Seleção** (checkbox injetável via `prompt`) sobre **todos** os agentes de
   `AGENT_TARGETS`; lista vazia cancela. → AC-2, AC-3
3. **Troca limpa por agente**: registra se o destino já existia, `rmSync(target,
   recursive+force)` → `mkdirSync` → `cpSync(skill.dir, target, recursive)`. O `existed`
   define o verbo da mensagem ("atualizada" vs "instalada"). → AC-4, AC-5

A diferença frente ao `add` é a remoção prévia do destino: garante substituição limpa,
descartando arquivos que não existem mais na versão nova.

## Arquivos

- `cli/src/commands/update.js` — novo comando.
- `cli/index.js` — registro do subcomando `update <skill-name>`.
- `cli/test/update.test.js` — testes (node --test).

## Consistência com a constituição

- Stack Node.js ESM, só commander/inquirer já presentes + módulos nativos.
- Cobertura mantida em 100% (`npm run test:coverage`), acima da barra de 90%.
- Mantém injeção de `prompt`/`cwd`/`skillsSourceDir` para testabilidade, igual a `add`/`remove`.
