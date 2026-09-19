---
name: soar-case-builder
description: >-
  Entrevista (grilling) o usuário sobre um caso real que aconteceu na squad —
  no estilo direto e sem paninho quente do Mat Pocock — para montar um
  arquivo de case no método SOAR (Situation, Obstacle, Action, Result) pronto
  para entrar num dossiê de avaliação/promoção. Rejeita mecanicamente
  respostas vagas ("melhorei a performance"), sem métrica, sem dono claro
  ("o time decidiu" em vez de "eu decidi") ou sem data verificável, pedindo de
  novo até o case ficar concreto. Também aceita anotações cruas (Slack,
  ticket, notas soltas) e extrai candidatos por campo, descartando trechos
  dúbios ou mal formatados com o motivo explícito em vez de aceitá-los calado.
  Use quando o usuário quiser "montar um case", "documentar uma conquista pro
  dossiê", "escrever isso em SOAR/STAR", ou colar notas bagunçadas pra virar
  um case revisado.
metadata:
  language: agnostic
  tags: [interview, elicitation, soar, star, career, dossie, grilling]
---

# SOAR Case Builder

Monta um case no método **SOAR** (Situation, Obstacle, Action, Result) a partir de um
caso real da squad, via entrevista mecânica: o script guarda o estado e diz a próxima
pergunta, o modelo só lê em voz alta, reescreve a resposta do usuário na forma que a
rubrica pede, e pede confirmação — igual ao `sdd-harness-creator`, mas para um único
artefato de 9 campos em vez de quatro artefatos inteiros.

**O grilling é mecânico, não uma questão de o modelo "ser rigoroso".** Uma resposta
vaga, sem métrica, sem dono em 1ª pessoa ou sem data verificável é recusada por um
validador em `scripts/lib/validators.mjs`, com o motivo — não depende do modelo lembrar
disso no meio da conversa.

## Regras de turno

1. **Uma pergunta por turno.** Nunca invente a próxima — rode o comando que o
   `NEXT:` do último comando imprimiu.
2. **Leia a pergunta (`PERGUNTE:`) ao usuário, literalmente.** Traduza só se ele
   escrever em outro idioma; não parafraseie pra ficar "mais fácil" — a rubrica foi
   calibrada junto com o texto exato.
3. **Reescreva a resposta dele na forma que `ACEITA SE` pede, mostre as duas, peça
   confirmação explícita** antes de registrar:
   ```
   Você disse:    "ajudei a resolver o problema de timeout"
   Vou registrar: Eu identifiquei que o lock otimista causava o timeout e implementei
                  um feature flag pra trocar a estratégia sob demanda.
   Confere, ou quer corrigir?
   ```
4. Registre com `case.mjs answer`. Se vier `REJECTED:`, mostre o motivo ao usuário e
   pergunte de novo — não amoleça a pergunta pra "passar". Depois de 2 recusas, a 3ª
   resposta é aceita mesmo assim, marcada `[NÃO VERIFICADO]` — isso não é falha sua,
   é o jeito de a entrevista nunca travar.
5. Repita até `DONE`, então rode `render`.

## Passo 0 — Tem anotações cruas, ou começa do zero?

**Do zero** → vá direto para "Iniciar um case".

**Tem notas soltas** (Slack, ticket, rascunho) → rode a extração primeiro:

```bash
node skills/soar-case-builder/scripts/extract.mjs --file notas.txt
```

Ela quebra o texto em candidatas, classifica cada uma por campo SOAR e roda o mesmo
grilling mecânico da entrevista — cada linha sai `OK` ou `DESCARTADO <motivo>`. Nada
some silenciosamente: mostre a lista completa ao usuário, incluindo as descartadas, e
deixe ele decidir aproveitar (reescrevendo pra passar no grilling), corrigir, ou
descartar de verdade. **Não pule esse passo de confirmação** — o extrator é heurístico
(palavras-chave), não confiável o bastante pra decidir sozinho o que entra no case.

Use as candidatas aprovadas como ponto de partida das respostas na entrevista — ainda
assim, rode a entrevista normalmente; ela é o que garante que todo campo (inclusive os
que a extração não achou, como data e evidência) fique preenchido e validado.

## Iniciar um case

```bash
node skills/soar-case-builder/scripts/case.mjs init --case "<título curto>" [--target DIR]
```

`--target` é o repositório/pasta onde o dossiê vive (default: diretório atual). O
estado da entrevista fica em `.soar/<slug>.json` dentro dele; o arquivo final sai em
`cases/<slug>.md`.

Depois, o loop de 5 passos acima: `next` → pergunte → reescreva e confirme → `answer`
→ repita até `DONE` → `render`.

```bash
node skills/soar-case-builder/scripts/case.mjs next    --case <slug>
node skills/soar-case-builder/scripts/case.mjs answer  --case <slug> --id Q-ID --raw "<palavras do usuário>" --restated "<sua reescrita>"
node skills/soar-case-builder/scripts/case.mjs status  --case <slug>
node skills/soar-case-builder/scripts/case.mjs render  --case <slug>
```

## Os 9 campos, em ordem

| Campo | O que grilla |
|---|---|
| Título | Precisa distinguir este case dos outros — rejeita categoria genérica |
| Squad/Papel | Squad + seu papel na época |
| Quando | Mês/trimestre + ano — rejeita "recentemente", "há um tempo" |
| Situation | Contexto concreto: sistema, quem era afetado, o que estava em jogo |
| Obstacle | A restrição real (técnica/prazo/dependência) — rejeita repetir a situação ou motivo genérico ("era complicado") |
| Action | **O que você fez, não o time** — exige verbo em 1ª pessoa; "nós decidimos" sem sua parte específica é recusado |
| Result | Número real, ou `[sem métrica: <justificativa honesta>]` quando genuinamente não existe |
| Evidência | Link/ticket/PR verificável, ou a frase exata `sem evidência disponível` |
| Aprendizado | Opcional — o que faria diferente (responda "pular" pra omitir) |

Rubrica completa (por quê cada campo existe, exemplos bons/ruins): [Método de Grilling](references/grilling-method.md).

## Design Rules

- **A pergunta e a rubrica são o script, não a conversa.** O modelo não inventa
  critério próprio de "isso já está bom" — quem decide é `validateAnswer`.
- **Nunca invente métrica, data ou evidência que o usuário não deu.** Quando não
  existir, o campo tem uma saída honesta (`[sem métrica: ...]`, `sem evidência
  disponível`) — use-a, não arredonde a realidade pra passar no grilling.
- **"O time fez" nunca vira "eu fiz" silenciosamente.** Se a resposta não distingue a
  contribuição pessoal, pergunte de novo — é o ponto central de um case de dossiê.
- **Nada é descartado sem mostrar o motivo.** Tanto na entrevista (`REJECTED:`) quanto
  na extração de notas cruas (`DESCARTADO ... motivo:`).
- **Um case por arquivo.** `render` recusa sobrescrever sem `--force` — cada case vira
  uma entrada permanente e revisável do dossiê.

## Quando não usar

- Para avaliar/pontuar um dossiê já pronto (isso é revisão, não elicitação) — leia e
  comente diretamente, sem rodar a entrevista.
- Para gerar um case fictício ou "de exemplo" sem uma situação real por trás — a skill
  existe pra extrair fatos verificáveis, não pra redigir prosa de currículo.
