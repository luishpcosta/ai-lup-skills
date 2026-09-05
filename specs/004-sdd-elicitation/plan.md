# Plan: sdd-harness-creator — Elicitação guiada e reverse aprovado

**Feature ID:** 004-sdd-elicitation
**Phase:** verified
**Spec:** ./spec.md
**Last updated:** 2026-09-05

> COMO a spec será implementada. Todo FR de `spec.md` é endereçado aqui.

## Technical Approach

Três invariantes de projeto, escolhidas para que a skill funcione em modelos leves:

1. **Estado em disco, nunca no contexto** — `.sdd/interview.json` e `.sdd/recon.json` no repo
   alvo. O modelo nunca precisa lembrar o que já perguntou nem o que já aprovou.
2. **Todo comando imprime `NEXT: <comando exato>`** — o modelo leve executa o que o script
   mandou, em vez de planejar o próximo passo.
3. **O script lê o código; o modelo lê só o digest** — a economia de leitura é estrutural
   (extratores que só produzem assinaturas, nomes de teste e doc-comments), não uma instrução
   de prompt que o modelo pode ignorar.

## Architecture & Components

| Componente | Responsabilidade |
|---|---|
| `scripts/lib/questions.mjs` (novo) | Banco de perguntas por artefato + validadores puros |
| `scripts/interview.mjs` (novo) | CLI da entrevista: `init`/`next`/`answer`/`status`/`render` |
| `scripts/lib/recon.mjs` (novo) | Extratores baratos + orçamento + ranking (puro) |
| `scripts/recon.mjs` (novo) | CLI do recon: gera `.sdd/recon.json` + digest legível |
| `scripts/reverse-engineer.mjs` (alterado) | Ganha `--list`, `--propose`, `--write`, `--more-evidence`; `--all` preserva o lote |
| `scripts/lib/reverse.mjs` (alterado) | Header de aprovação e seção de correções na spec gerada |
| `scripts/lib/sdd-utils.mjs` (alterado) | `copyTemplate` aceita mapa de defaults de placeholder |
| `templates/*.md` (alterado) | `<fill in>` vira `{{PLACEHOLDER}}` com default equivalente |
| `SKILL.md` + `references/` | Branch explícito Mode 1/Mode 2 e os protocolos de turno |

## Data Model

`.sdd/interview.json`:

```
{ version, target, createdAt, project: { stack, packageManager, commands[] },
  answers: { "Q-ID": { raw, restated, at, needsClarification? } },
  order: ["Q-ID", ...] }
```

`.sdd/recon.json`:

```
{ version, target, sourceRoot, budget, generatedAt,
  project: { name, description, scripts[], docs[] },
  modules: [ { name, slug, score, rung, sourceFiles[], testFiles[],
               evidence: { testNames[], exports[], signatures[], headDocs[], gitSubjects[] },
               truncated } ],
  approvals: { "<slug>": { status: approved|corrected|skipped, at, notes } } }
```

## Interfaces / Contracts

- `questions.mjs`: `QUESTIONS`, `VALIDATORS`, `validateAnswer(question, text)`,
  `questionsFor(artifact)`, `nextQuestion(state)`, `renderValues(state)`.
- `recon.mjs` (lib): `extractSignatures(content, ext)`, `extractHeadDoc(content, ext, maxLines)`,
  `scoreModule(module, evidence)`, `applyBudget(evidence, budget)`, `renderDigest(module)`.
- Contrato de saída dos CLIs: sucesso ⇒ última linha `NEXT: …` ou `DONE`; rejeição ⇒ exit ≠0 com
  `REJECTED: …` e `RE-ASK: …`.

## Requirement Coverage

| Requirement | Addressed by |
|---|---|
| FR-1 / AC-1 | `interview.mjs next` lendo `.sdd/interview.json` |
| FR-2 / AC-2 | `VALIDATORS` + `validateAnswer` chamados por `interview.mjs answer` |
| FR-3 / AC-3 | campos `raw`/`restated` no estado; `renderValues` usa `restated` |
| FR-4 / AC-4 | `interview.mjs render` + `copyTemplate` com valores da entrevista |
| FR-5 / AC-5 | mapa de defaults em `copyTemplate`, usado por `create-sdd-harness.mjs` |
| FR-6 / AC-6 | extratores de `lib/recon.mjs` (só assinatura/doc/teste) + `applyBudget` |
| FR-7 / AC-7 | `scoreModule` (testes > doc > exports) e ordenação em `--list` |
| FR-8 / AC-8, AC-13 | `--propose` sem escrita; `approvals` em `.sdd/recon.json` |
| FR-9 / AC-9 | `--write` + header `Confirmed-by`/`Confirmed-on` em `lib/reverse.mjs` |
| FR-10 / AC-10 | `rung` por módulo + `--more-evidence` |
| FR-11 / AC-11 | caminho `--all` mantido intacto em `reverse-engineer.mjs` |
| FR-12 / AC-12 | helper `printNext()` compartilhado |

## Constitution Compliance

- **Spec antes de código** — esta spec 004 precede a implementação.
- **Verificação obrigatória** — testes `node --test` novos por AC; `./init.sh` já roda
  `skills/sdd-harness-creator/test/*.test.mjs`.
- **Stack** — Node ESM, **apenas módulos nativos** (`node:fs/promises`, `node:path`,
  `node:child_process` para o `git log`), sem dependências externas.
- **Passos pequenos e reversíveis** — uma task por vez; comportamento antigo preservado
  atrás de `--all` e dos defaults de template.

## Key Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Condução da entrevista | Script guarda estado e imprime a próxima pergunta | Só prosa em `references/`; híbrido prosa+validador | Modelo leve não mantém estado de entrevista de forma confiável |
| Forma da resposta | LLM reescreve, usuário aceita | Exigir formato do usuário; aceitar cru | Usuário responde livre; documento sai canônico |
| Aprovação brownfield | Um módulo por turno | Lote com revisão no fim; escopo antes | Mantém o contexto pequeno e a correção cirúrgica |
| Leitura de código | Extratores textuais com orçamento | AST/type-checker | Sem dependência externa; barato e determinístico |
| Histórico git | `git log --format=%s` limitado | Ignorar histórico | Sinal de *intenção* muito barato; degrada bem sem git |

## Risks

- **Regressão no scaffold atual** — mitigado pelos defaults de placeholder e por manter os
  testes de `scaffold.test.mjs` sem edição.
- **Entrevista longa demais** — mitigado por defaults detectados e por perguntas obrigatórias
  reduzidas ao mínimo por artefato.
- **Falsos negativos do validador** — mitigado pela regra das 2 rodadas: a terceira resposta
  é registrada como `[NEEDS CLARIFICATION]` em vez de travar.
