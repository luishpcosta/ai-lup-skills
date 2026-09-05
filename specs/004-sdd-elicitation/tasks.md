# Tasks: sdd-harness-creator — Elicitação guiada e reverse aprovado

**Feature ID:** 004-sdd-elicitation
**Phase:** verified
**Plan:** ./plan.md
**Last updated:** 2026-09-05

> Todas as tasks concluídas e verificadas.
> Tasks pequenas, ordenadas e verificáveis, derivadas de `plan.md`.
> **Gate:** todo critério de aceite tem ≥1 task, e toda task referencia um AC.

## Tasks

| ID | Task | Satisfies | Status | Evidence |
|---|---|---|---|---|
| T-1 | `scripts/lib/questions.mjs`: banco de perguntas + validadores puros + `validateAnswer` | AC-2 | done | questions.test.mjs — validators + rubric coverage (11/11) |
| T-2 | `scripts/lib/questions.mjs`: `nextQuestion`/`renderValues` sobre o estado | AC-1, AC-3 | done | questions.test.mjs — nextQuestion / renderValues (11/11) |
| T-3 | `scripts/interview.mjs`: `init`/`next`/`status` com estado em `.sdd/interview.json` | AC-1 | done | interview.test.mjs — "asks one question at a time and survives a restart" |
| T-4 | `scripts/interview.mjs`: `answer` com rejeição (`REJECTED`/`RE-ASK`, exit ≠0) e regra das 2 rodadas | AC-2, AC-3 | done | interview.test.mjs — rejection, GWT rejection, two-round rule, raw+restated |
| T-5 | `copyTemplate` com mapa de defaults + placeholders `{{}}` nos templates | AC-5 | done | scaffold.test.mjs — scaffold suite green with no `{{` left (19/19) |
| T-6 | `scripts/interview.mjs render`: gera artefatos sem placeholder cru | AC-4 | done | interview.test.mjs — "renders artifacts with no placeholders left" |
| T-7 | `scripts/lib/recon.mjs`: `extractSignatures`/`extractHeadDoc`/`gitSubjects` (sem corpo de função) | AC-6 | done | recon.test.mjs — signatures/head-doc/git subjects, body-leak assertions |
| T-8 | `scripts/lib/recon.mjs`: `applyBudget` + `scoreModule` + `renderDigest` | AC-6, AC-7 | done | recon.test.mjs — applyBudget, scoreModule, renderDigest (10/10) |
| T-9 | `scripts/recon.mjs`: CLI gerando `.sdd/recon.json` + digest | AC-6, AC-7 | done | scaffold.test.mjs — "recon writes a bounded digest and never emits a function body" |
| T-10 | `reverse-engineer.mjs --list` ranqueado, omitindo módulos pulados | AC-7, AC-13 | done | scaffold.test.mjs — "--list ranks a tested module above an untested one"; "a skipped module is not offered again" |
| T-11 | `reverse-engineer.mjs --module X --propose` sem gravar nada | AC-8 | done | scaffold.test.mjs — "--propose writes nothing outside .sdd/" |
| T-12 | `reverse-engineer.mjs --module X --write` + `Confirmed-by`/`Confirmed-on` e correções | AC-9 | done | scaffold.test.mjs — "--write stamps the confirmation and records the user correction" |
| T-13 | `reverse-engineer.mjs --module X --more-evidence`: escada por módulo | AC-10 | done | scaffold.test.mjs — "--more-evidence escalates one rung and keeps the budget" |
| T-14 | Preservar `--all [--dry-run]` (lote não-interativo) | AC-11 | done | scaffold.test.mjs — `--all` and `--all --dry-run` cases unchanged; "no mode flag lists instead of writing" |
| T-15 | Helper `printNext()` aplicado a todos os comandos novos | AC-12 | done | interview.test.mjs — "every command ends with a NEXT: or DONE line"; NEXT assertions in scaffold.test.mjs |
| T-16 | Testes: `test/questions.test.mjs` (validadores, cada `reject` do banco) | AC-2 | done | node --test test/questions.test.mjs — 11/11 |
| T-17 | Testes: `test/interview.test.mjs` (retomada, rejeição, raw/restated, render limpo) | AC-1, AC-2, AC-3, AC-4, AC-12 | done | node --test test/interview.test.mjs — 12/12 |
| T-18 | Testes: `test/recon.test.mjs` (sem corpo, orçamento, ranking, escada) | AC-6, AC-7, AC-10 | done | node --test test/recon.test.mjs — 10/10 |
| T-19 | Testes: `test/scaffold.test.mjs` estendido (propose não grava, write carimba, `--all --dry-run`, defaults) | AC-5, AC-8, AC-9, AC-11, AC-13 | done | node --test test/scaffold.test.mjs — 19/19 |
| T-20 | `SKILL.md` com branch Mode 1/Mode 2 + `references/{elicitation,brownfield-recon}.md` | AC-1, AC-8, AC-12 | done | SKILL.md Mode 1/Mode 2 + references/{elicitation,brownfield-recon}.md |
| T-21 | `README.md`, `references/spec-driven-pattern.md`, `evals/evals.json`, vocabulário de fases | AC-4, AC-9 | done | README.md, spec-driven-pattern.md (phase vocabulary), templates/agents.md, evals.json |
| T-22 | Verificação final: `./init.sh` verde + cobertura do `cli` + `progress.md` atualizado | AC-1..AC-13 | done | ./init.sh green: cli tests + 63/63 skill tests; cli coverage 100% statements/branches/functions/lines |

Status values: `todo` → `doing` → `done`.

## Coverage Check

Confirmar antes de implementar:

- Todo AC referenciado por ao menos uma task? **sim** (AC-1 T-2/T-3/T-17/T-20; AC-2 T-1/T-4/T-16/T-17;
  AC-3 T-2/T-4/T-17; AC-4 T-6/T-17/T-21; AC-5 T-5/T-19; AC-6 T-7/T-8/T-9/T-18; AC-7 T-8/T-9/T-10/T-18;
  AC-8 T-11/T-19/T-20; AC-9 T-12/T-19/T-21; AC-10 T-13/T-18; AC-11 T-14/T-19; AC-12 T-15/T-17/T-20;
  AC-13 T-10/T-19; todos também em T-22)
- Toda task ligada a um AC? **sim**
