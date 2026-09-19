# soar-case-builder

Entrevista (grilling) o usuário sobre um caso real da squad, no estilo direto do
Mat Pocock, para montar um case no método **SOAR** (Situation, Obstacle, Action,
Result) pronto para um dossiê de avaliação/promoção.

A validação é mecânica: um banco de validadores em `scripts/lib/validators.mjs`
recusa resposta vaga, sem métrica, sem dono em 1ª pessoa ou sem data verificável,
com o motivo — não depende do modelo "lembrar" de ser rigoroso no meio da conversa.

## Uso

Do zero:

```bash
node skills/soar-case-builder/scripts/case.mjs init   --case "<título>" [--target DIR]
node skills/soar-case-builder/scripts/case.mjs next   --case <slug>
node skills/soar-case-builder/scripts/case.mjs answer --case <slug> --id Q-ID --raw "..." --restated "..."
node skills/soar-case-builder/scripts/case.mjs status --case <slug>
node skills/soar-case-builder/scripts/case.mjs render --case <slug>
```

A partir de notas cruas (Slack, ticket, rascunho):

```bash
node skills/soar-case-builder/scripts/extract.mjs --file notas.txt
```

Classifica cada linha por campo SOAR e roda o mesmo grilling da entrevista — toda
candidata sai `OK` ou `DESCARTADO <motivo>`, nada é filtrado em silêncio.

## O que gera

- `.soar/<slug>.json` — estado da entrevista (retomável entre sessões)
- `cases/<slug>.md` — o case final, com cabeçalho `Verificação:` indicando se alguma
  resposta ficou marcada `[NÃO VERIFICADO]` após esgotar as tentativas

## Tests

```bash
node --test skills/soar-case-builder/test/*.test.mjs
```

## Método

Ver [references/grilling-method.md](references/grilling-method.md) para a rubrica
completa (por quê cada campo existe, exemplos bons/ruins, a regra das duas rodadas).
