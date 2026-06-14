# Session Progress Log

## Current State

**Last Updated:** 2026-06-14
**Active Feature:** 003-cli-update — CLI — Comando update
**Active SDD Phase:** Verify (concluída)
**Pending Gate:** nenhum — feature verificada

## Status

### What's Done

- [x] Spec/plan/tasks de `003-cli-update` criados e passando nos gates.
- [x] `cli/src/commands/update.js` implementado e registrado em `cli/index.js`.
- [x] `cli/test/update.test.js` cobrindo AC-1..AC-5 (cobertura 100% em `src/**`).
- [x] `spec-registry.json` atualizado (feature 003, ACs `verified`).
- [x] README documentando `lup-skills update`.
- [x] `./init.sh` verde: 36 testes, 36 ACs, sem lacunas de rastreabilidade.

### What's In Progress

- (nada)

### What's Next

1. Commit (Conventional Commits) com o repo limpo.

## Open Clarifications

- (nenhuma)

## Blockers / Risks

- (nenhum)

## Decisions Made

- **`update` oferece todos os agentes e instala onde faltar**: por agente selecionado,
  substitui a versão antiga ou instala do zero se ainda não existir. Mensagem distingue
  "atualizada" de "instalada".
  - Context: pedido "também faça a instalação caso não exista se o agente selecionado".
  - Constitution impact: nenhum.
- **Troca incondicional (sem comparar versões)**: sempre apaga e recopia, removendo
  arquivos obsoletos da versão antiga.

## Evidence of Completion

- [x] AC-1..AC-5 verificados: `cli/test/update.test.js` (npm test) — 36/36 passam.
- [x] Cobertura: `npm run test:coverage` — 100% statements/branches/functions/lines em `src/**`.
- [x] Traceability gate limpo: `./init.sh` — "OK — no traceability gaps."

## Notes for Next Session

Padrão de comando estável: validação de origem (`findSkill`) + detecção de instalação
(`AGENT_TARGETS` + `getSkillTargetPath`) + seleção via `prompt` injetável. Próximas
features do CLI podem reaproveitar essa estrutura.
