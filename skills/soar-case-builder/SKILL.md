---
name: soar-case-builder
description: >-
  Conduz uma entrevista questionadora (grilling) sobre um caso real que
  aconteceu na squad e gera um arquivo de case no método SOAR (Situation,
  Obstacle, Action, Result) pronto para um dossiê de avaliação/promoção.
  Você faz as perguntas duras — cobra especificidade, contribuição individual
  em vez de "o time fez", métrica de verdade e evidência verificável — e
  reescreve cada resposta na forma canônica para o usuário confirmar. Depois
  de gerar o arquivo, um script valida a estrutura e uma revisão independente
  aponta pontos fortes e fracos, oferecendo uma nova rodada em cima dos
  fracos. Também aceita anotações cruas (Slack, ticket, notas soltas) como
  ponto de partida, separando o que é fato citável do que é memória.
  Use quando o usuário quiser "montar um case", "documentar uma conquista pro
  dossiê", "escrever isso em SOAR/STAR", ou colar notas bagunçadas pra virar
  um case revisado.
metadata:
  language: agnostic
  tags: [interview, elicitation, soar, star, career, dossie, grilling]
---

# SOAR Case Builder

Monta um case no método **SOAR** a partir de um caso real da squad. O fluxo tem quatro
etapas e você conduz todas:

```
1. Entrevista (você pergunta)  →  2. Gera o arquivo  →  3. Valida estrutura (script)
                                                            ↓
                          4. Revisão: fortes/fracos  →  nova rodada? (usuário decide)
```

**A divisão de responsabilidade importa.** Julgamento sobre o texto do usuário é seu —
ele chega em linguagem natural e nenhum regex dá conta da variedade. O script só confere
a **forma do arquivo que você escreveu** (seção faltando, placeholder esquecido, carimbo
contradizendo o corpo), porque isso é decidível e um erro ali custa só você corrigir.

## Etapa 1 — Entrevista

Leia [references/entrevista.md](references/entrevista.md): tem os 9 campos na ordem, o que
cada um aceita e rejeita, e exemplos bons e ruins.

Regras do turno:

1. **Uma pergunta por vez.** Não despeje a lista inteira — a segunda resposta em diante
   vira monossílabo.
2. **Nunca invente.** Métrica, data, evidência e nome de sistema saem da boca do usuário.
   Se ele não sabe, o campo tem saída honesta (`[sem métrica: <motivo>]`,
   `sem evidência disponível`) — use a saída, não arredonde a realidade.
3. **Reescreva e confirme.** Traduza a resposta para a forma que o campo pede, mostre as
   duas e peça confirmação explícita:
   ```
   Você disse:    "ajudei a resolver o problema de timeout"
   Vou registrar: Eu identifiquei que o lock otimista causava o timeout e implementei
                  um feature flag pra trocar a estratégia sob demanda.
   Confere, ou quer corrigir?
   ```
   A reescrita **não pode adicionar fato que ele não disse**. Se falta uma peça que a
   forma exige, isso é pergunta, não lacuna pra preencher.
4. **Quando cobrar de novo, traga uma contraproposta.** "Isso está vago" joga o trabalho
   de volta pro usuário e ensina ele a te contornar. Pergunte o que falta:
   > "'Melhorou a performance' não sobrevive a um 'melhorou quanto?' na banca. Você
   > lembra de algum número — tempo de resposta, taxa de erro, fila? Se não tiver número
   > nenhum, a gente registra isso explicitamente, o que é melhor que um número inventado."
5. **Duas rodadas por campo, no máximo.** Se depois de duas tentativas o campo continua
   sem o que precisa, registre o que tem com a ressalva
   `_[NÃO VERIFICADO: <o que falta>]_` e siga. Entrevista que trava é pior que case com
   lacuna declarada — e a ressalva é o que impede o arquivo de mentir.

### Partindo de anotações cruas

Se o usuário colar notas (Slack, ticket, rascunho): **leia você mesmo** — é um punhado de
linhas, cabe no contexto. Extraia os candidatos por campo e mostre a separação antes de
seguir:

- **Fato citável** — está escrito nas notas. Cite o trecho.
- **Memória** — o usuário vai afirmar agora, sem estar nas notas. Vale igual, mas não
  confunda um com o outro na hora de pedir evidência.
- **Descartado** — vago ou contraditório. Mostre o que você descartou **e por quê**;
  deixe ele resgatar se você entendeu errado.

Depois disso, entreviste normalmente: a extração adianta campos, não substitui a
entrevista (data e evidência quase nunca estão nas notas).

## Etapa 2 — Gerar o arquivo

Preencha [templates/case.md](templates/case.md) e grave em `cases/<slug>.md`
(slug = título em minúsculas, sem acento, separado por hífen).

O campo `**Verificação:**` do cabeçalho aceita exatamente um de:

| Valor | Quando |
|---|---|
| `verificado` | todo campo fechou com o que o SOAR pede |
| `parcialmente verificado` | algum campo ficou com ressalva `[NÃO VERIFICADO: ...]` |
| `não verificado` | o case inteiro é memória, sem nenhuma evidência |

Os dois marcadores honestos de ausência — `[sem métrica: <motivo>]` e
`_[NÃO VERIFICADO: <o que falta>]_` — valem igual para o validador. Use o que descrever
melhor o caso; o que ele não aceita é omitir a ausência em silêncio.

**As saídas honestas têm orçamento.** Elas existem para o caso sem dado, não para chegar
no verde depressa. Se `Result` **e** `Evidência` usarem a saída, não sobrou nada
verificável e `**Verificação:**` tem de ser `não verificado` — o script cobra isso. Duas
ou mais saídas no mesmo case viram aviso: reveja se alguma ainda dá pra fechar com dado
real antes de aceitar.

O campo `**Revisão:**` registra o desfecho da Etapa 4 e começa como `pendente`:

| Valor | Quando |
|---|---|
| `pendente` | ainda não revisado (todo case nasce assim) |
| `sem ressalvas` | revisado, nada em aberto |
| `<N> em aberto` | revisado, e o usuário optou por fechar com N fraquezas conhecidas |

## Etapa 3 — Validar a estrutura

```bash
node skills/soar-case-builder/scripts/validate-case.mjs cases/<slug>.md
```

Sai ≠0 listando o que corrigir. **Corrija e rode de novo até passar** — é o seu próprio
arquivo, não um veredito sobre o usuário. Se o script reclamar de algo que você acha
legítimo, é bug do script: diga isso em vez de deformar o case pra passar.

## Etapa 4 — Revisão e nova rodada

**Delegue a revisão a um contexto limpo.** Você acabou de conduzir a entrevista, então
seu cérebro completa as lacunas do arquivo com o que foi dito na conversa — exatamente o
que o leitor do dossiê não vai poder fazer. Abra um subagente e passe **só**:

- o caminho do arquivo,
- a rubrica ([references/revisao.md](references/revisao.md)).

**Não resuma a entrevista para o revisor, não explique o contexto, não antecipe o que
você acha fraco.** O briefing prestativo destrói a única coisa que torna essa revisão
útil. Se o ambiente não tiver subagente, faça você mesmo seguindo a rubrica — mas saiba
que o resultado é mais fraco.

Com a devolutiva em mãos:

1. Mostre ao usuário os **pontos fortes** e os **pontos fracos** (cada fraco já vem com a
   pergunta que o resolveria).
2. **Ofereça a nova rodada e deixe ele escolher:**
   > "Achei 3 pontos fracos. Quer que eu faça mais uma rodada de perguntas em cima
   > deles, ou prefere fechar o case assim?"
3. Se topar: entreviste **só os pontos fracos**, regenere, e rode Etapa 3 e 4 de novo.
4. Se recusar: feche sem insistir e grave o placar honesto em `**Revisão:**`
   (`sem ressalvas` ou `<N> em aberto`). O que ficou em aberto fica registrado — daqui a
   seis meses, quem lê o dossiê (inclusive você) merece saber o que já se sabia que era
   frágil.

## Design Rules

- **Script valida forma; você julga conteúdo; a revisão julga o conjunto.** Não mova
  julgamento semântico pra dentro do script — texto livre em português não cabe em regex,
  e o falso positivo ensina o usuário a escrever pro validador em vez de pra verdade.
- **"O time fez" nunca vira "eu fiz" em silêncio.** Se a resposta não separa a
  contribuição individual, pergunte — é o ponto central de um case de dossiê.
- **Nada é descartado sem mostrar o motivo**, nem na extração nem na revisão.
- **O carimbo não mente.** `verificado` com ressalva no corpo é erro (o script pega).
- **Um case por arquivo**, revisável isoladamente.

## Quando não usar

- Avaliar um dossiê já pronto: é revisão, não elicitação — leia e comente direto.
- Redigir case fictício ou "de exemplo": a skill existe pra extrair fato verificável, não
  pra escrever prosa de currículo.
