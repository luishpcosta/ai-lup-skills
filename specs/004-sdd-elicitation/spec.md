# Spec: sdd-harness-creator — Elicitação guiada e reverse aprovado

**Feature ID:** 004-sdd-elicitation
**Phase:** verified
**Owner:** luishpcosta
**Last updated:** 2026-09-05

> WHAT e WHY apenas — sem detalhes de implementação. Esses ficam em `plan.md`.

## Problem / Motivation

A skill `sdd-harness-creator` faz hoje um **scaffold mudo**:

- **Greenfield** — os templates são copiados com os placeholders crus (`<fill in>`,
  `<Why does this feature exist?>`) e nada instrui o agente a preenchê-los. O harness
  nasce de fachada: tem a estrutura do SDD, não tem o conteúdo.
- **Brownfield** — `reverse-engineer.mjs` lê o corpo inteiro de cada arquivo-fonte,
  gera até 20 features de uma vez e grava tudo sem nenhum ponto de aprovação. A
  revisão humana existe só como prosa ("depois revise cada retro-spec").
- Em **modelos mais leves que o Opus** (Haiku/Sonnet) o desenho atual não se sustenta:
  o modelo esquece o que já perguntou, decide sozinho que já perguntou o bastante,
  e estoura contexto lendo código-fonte.

A skill precisa conduzir uma **elicitação real** no greenfield e uma **reconstrução
barata e aprovada pelo usuário** no brownfield, com o estado fora do contexto do modelo.

## User Stories

- Como usuário iniciando um projeto novo, quero ser **entrevistado artefato por artefato**,
  para que `constitution.md` e a primeira spec saiam preenchidos com decisões reais.
- Como usuário respondendo em linguagem livre, quero que o agente **reescreva minha resposta**
  na forma canônica e me peça aceite, para que o documento fique preciso sem eu ter de
  escrever no formato exigido.
- Como usuário adotando SDD num repo existente, quero que a spec de cada módulo seja
  **proposta e aprovada uma por vez**, para que nada seja gravado sem eu confirmar.
- Como usuário rodando isso num modelo leve, quero que o **script** guarde o estado e diga
  o próximo comando, para que a sessão sobreviva a reinícios e o modelo não improvise.

## Functional Requirements

- FR-1: A entrevista é conduzida por script, uma pergunta por vez, com estado persistido em disco.
- FR-2: Respostas vagas ou fora da forma exigida são rejeitadas mecanicamente, com motivo e re-pergunta.
- FR-3: Cada resposta guarda o texto cru do usuário e a reescrita canônica aceita por ele.
- FR-4: A renderização preenche os templates com as respostas, sem deixar placeholder cru.
- FR-5: O scaffold sem entrevista mantém o comportamento atual.
- FR-6: O reconhecimento de um repo existente usa apenas sinais baratos, com orçamento explícito, e nunca expõe corpo de arquivo.
- FR-7: Os módulos são ranqueados por força de evidência para o usuário escolher o escopo.
- FR-8: A spec de um módulo é proposta sem gravar nada; a gravação exige um comando separado.
- FR-9: A gravação registra quem aprovou e quando, e preserva correções do usuário.
- FR-10: A evidência de um módulo pode ser aprofundada sob demanda, um degrau por vez.
- FR-11: O modo em lote não-interativo é preservado.
- FR-12: Todo comando termina indicando o próximo comando exato.

## Acceptance Criteria

- **AC-1** — Given uma entrevista iniciada, when `interview.mjs next` roda duas vezes sem
  resposta no meio, then a mesma pergunta pendente é devolvida nas duas. _(FR-1)_
- **AC-2** — Given uma pergunta com rubrica, when a resposta é um termo vago do banco
  (ex.: "funciona bem"), then o comando sai com código ≠0 imprimindo `REJECTED:` com o motivo
  e `RE-ASK:` com a re-pergunta. _(FR-2)_
- **AC-3** — Given uma resposta aceita, when ela é gravada, then o estado contém o texto cru e
  a reescrita, e a reescrita é o que aparece no artefato renderizado. _(FR-3)_
- **AC-4** — Given todas as perguntas de um artefato respondidas, when `render` roda, then o
  arquivo gerado não contém `{{`, `<fill in>` nem `[NEEDS CLARIFICATION` não intencional. _(FR-4)_
- **AC-5** — Given nenhuma entrevista, when `create-sdd-harness.mjs` roda, then os artefatos
  saem com o mesmo texto-guia de hoje e nenhum `{{` residual. _(FR-5)_
- **AC-6** — Given um repo com arquivos-fonte, when o digest de recon é gerado, then nenhuma
  linha do digest vem do corpo de uma função e o total de linhas de evidência por módulo
  respeita o orçamento configurado. _(FR-6)_
- **AC-7** — Given um módulo com testes e outro sem, when a listagem é impressa, then o módulo
  com testes aparece acima do sem testes. _(FR-7)_
- **AC-8** — Given um módulo escolhido, when o comando de proposta roda, then nenhum arquivo é
  criado ou alterado no repo alvo fora de `.sdd/`. _(FR-8)_
- **AC-9** — Given uma proposta aprovada, when a gravação roda, then apenas os arquivos daquele
  módulo são criados e o `spec.md` carrega `**Confirmed-by:**` e `**Confirmed-on:**`. _(FR-9)_
- **AC-10** — Given um módulo com evidência insuficiente, when o aprofundamento é pedido, then o
  digest cresce com o degrau seguinte da escada e continua dentro do orçamento. _(FR-10)_
- **AC-11** — Given o modo em lote, when ele roda com `--dry-run`, then nada é gravado e a saída
  lista o que seria criado, como hoje. _(FR-11)_
- **AC-12** — Given qualquer comando dos scripts novos, when ele termina com sucesso, then a
  última linha útil da saída começa com `NEXT:` ou `DONE`. _(FR-12)_
- **AC-13** — Given um módulo marcado como pulado, when a listagem/proposta seguinte roda, then
  ele não é oferecido de novo. _(FR-8, FR-9)_

## Edge Cases

- Repo alvo sem `package.json` e sem código-fonte: recon informa que não há módulos e não falha.
- Resposta rejeitada duas vezes seguidas: a terceira é aceita como `[NEEDS CLARIFICATION]`
  registrado, para não travar a sessão.
- `.sdd/interview.json` corrompido ou de versão antiga: o comando falha com mensagem explícita
  em vez de gravar artefato meia-boca.
- Módulo cujo nome colide com um `specs/NNN-slug` existente: é pulado, como hoje.
- Repo sem git: os sinais de histórico são omitidos sem quebrar o recon.

## Out of Scope (Non-Goals)

- Alterar o `cli/` (`lup-skills`) — esta feature vive inteiramente em `skills/sdd-harness-creator/`.
- Gate automático de rastreabilidade (segue manual, via Coverage Check).
- Traduzir a skill para português (permanece em inglês).
- Análise semântica de código (AST, type-checker): a extração continua textual e barata.

## Open Questions

- (nenhuma)

## Clarifications Log

| Date | Question | Resolution |
|---|---|---|
| 2026-09-05 | Como conduzir a elicitação em modelo leve? | Script conduz (estado em `.sdd/`), com a LLM reescrevendo a resposta e o usuário aceitando |
| 2026-09-05 | Como o usuário aprova as specs no brownfield? | Um módulo por vez: propor → aprovar/corrigir/pular/mais evidência → gravar |
| 2026-09-05 | Idioma do conteúdo novo | Inglês, coerente com o resto da skill |
| 2026-09-05 | Rastrear como feature SDD? | Sim — esta spec 004 |
