# Session Progress Log

## Current State

**Last Updated:** 2026-09-05
**Active Feature:** 004-sdd-elicitation — sdd-harness-creator: elicitação guiada e reverse aprovado
**Active SDD Phase:** Verify (concluída)
**Pending Gate:** nenhum — feature verificada

## Status

### What's Done

- [x] Spec/plan/tasks de `004-sdd-elicitation` criados e passando nos gates (13 ACs, 22 tasks).
- [x] **Greenfield**: `scripts/interview.mjs` + `scripts/lib/questions.mjs` — entrevista conduzida
      por script, estado em `.sdd/interview.json`, validação mecânica das respostas, reescrita da
      resposta pela LLM com aceite do usuário, `render` preenchendo os templates.
- [x] **Brownfield**: `scripts/recon.mjs` + `scripts/lib/{recon,recon-scan}.mjs` — escada de
      evidência (nomes de teste → superfície pública → assinaturas + doc-comments → commits),
      orçamento por módulo, ranking; corpo de função nunca entra no digest.
- [x] `reverse-engineer.mjs` interativo: `--list`, `--propose` (não grava), `--write` com
      `Confirmed-by`/`Confirmed-on` e `Corrections from review`, `--skip`, `--more-evidence`;
      lote preservado atrás de `--all`.
- [x] `scripts/lib/scaffold.mjs` compartilhado; `copyTemplate` com defaults; templates
      parametrizados (`{{PLACEHOLDER}}`) sem regressão no scaffold puro.
- [x] `SKILL.md` com branch explícito Mode 1/Mode 2 + `references/{elicitation,brownfield-recon}.md`;
      README, `spec-driven-pattern.md` (vocabulário canônico de fases) e `evals.json` atualizados.
- [x] Testes: `test/{questions,interview,recon}.test.mjs` novos + `scaffold.test.mjs` estendido —
      63/63 passando; cobertura do `cli` intacta em 100%.
- [x] `./init.sh` verde.

### What's In Progress

- (nada)

### What's Next

1. Commit (Conventional Commits) com o repo limpo.
2. Considerar rodar a própria skill revisada contra este repo (`interview.mjs --artifact constitution`)
   para validar o fluxo em uso real.

## Open Clarifications

- (nenhuma)

## Blockers / Risks

- (nenhum)

## Decisions Made

- **Entrevista conduzida por script, não por prosa** (2026-09-05): o banco de perguntas e os
  validadores vivem em `scripts/lib/questions.mjs`; o estado em `.sdd/interview.json`. A LLM só
  lê a pergunta, reescreve a resposta na forma canônica e pede o aceite do usuário.
  - Context: a skill precisa funcionar em modelos mais leves que o Opus, que perdem o estado da
    entrevista e decidem sozinhos que já perguntaram o bastante.
  - Constitution impact: nenhum.
- **Regra das duas rodadas**: após duas rejeições, a terceira resposta é registrada como
  `[NEEDS CLARIFICATION]` em vez de travar a sessão — o gate de Clarify a captura depois.
- **Brownfield sem ler o código**: a economia é estrutural, não instrução de prompt — os
  extratores só emitem declarações, doc-comments, nomes de teste e assuntos de commit, e
  `applyBudget` limita quantas linhas chegam ao digest.
- **Aprovação módulo a módulo**: `--propose` não grava nada; `--write` carimba
  `Confirmed-by`/`Confirmed-on`. Uma spec reconstruída nunca é confundida com uma revisada.
- **Default do `reverse-engineer.mjs` passou a ser `--list`** (não-destrutivo). O lote antigo
  continua disponível em `--all`; os testes existentes foram ajustados para essa flag.
- **Passo de CI "Gate de rastreabilidade SDD" removido** (2026-09-05): chamava
  `check-traceability.mjs`, um shim que sempre sai 0 — gate de fachada, e exatamente a referência
  obsoleta que `references/upgrading.md` manda remover.
  - Constitution impact: nenhum (a rastreabilidade sempre foi manual, via Coverage Check).

## Evidence of Completion

- [x] AC-1..AC-13 verificados: `node --test skills/sdd-harness-creator/test/*.test.mjs` — 63/63.
- [x] Cobertura do CLI: `npm run test:coverage` — 100% statements/branches/functions/lines em `src/**`.
- [x] `./init.sh` verde (testes do `cli` + testes da skill).
- [x] Coverage Check de `specs/004-sdd-elicitation/tasks.md`: cobertura bidirecional AC↔task confirmada.

## Notes for Next Session

Padrão reaproveitável para qualquer script novo da skill: estado em `.sdd/`, toda saída de sucesso
terminando em `NEXT:` ou `DONE`, validação mecânica separada em lib pura e testada por unidade,
e o efeito destrutivo sempre atrás de uma flag explícita.
