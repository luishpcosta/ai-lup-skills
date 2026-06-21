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

- **Remoção do mecanismo de `platform-memory.yaml` em `prd-to-adr`/`issue-to-adr`**
  (2026-06-21): as duas skills passam a ser stateless — cada PRD/demanda é
  tratado isoladamente, sem carregar/escrever nenhum arquivo de memória entre
  execuções. Removidas as fases que dependiam dele (carregar memória,
  classificação ✅/🔶/🆕, diagrama Mermaid de existente-vs-novo, atualização da
  memória) e os arquivos `references/memoria-schema.md` e
  `references/grafo-visual.md` em ambas as skills. A busca de consumidores de
  um tópico/evento (Fase 3.5, mensageria) passa a ser perguntada diretamente
  ao usuário em vez de cruzada com a memória.
  - Numeração de ADR trocada de sequencial (lida de `ultimo_adr` na memória)
    para `ADR-<data:YYYYMMDD>-<hora:HHMM>-<sufixo aleatório de 4 caracteres>`
    (ex.: `ADR-20260620-1542-3f0a`), gerada via Bash (`date` + `$RANDOM`), com
    checagem de colisão contra `adr/ADR-<id>-*.md` antes de usar — não depende
    de nenhum arquivo nem de perguntar ao usuário.
  - Context: pedido do usuário para simplificar as skills, removendo a
    persistência entre execuções.
  - Constitution impact: nenhum (mudança não tocou `cli/`, `constitution.md`
    nem `spec-registry.json` — essas skills nunca foram código executável
    nem features rastreadas no harness SDD deste repo).
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
