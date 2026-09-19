# soar-case-builder

Conduz uma entrevista questionadora sobre um caso real da squad e gera um case no
método **SOAR** (Situation, Obstacle, Action, Result) para um dossiê de
avaliação/promoção.

```
1. Entrevista (a LLM pergunta)  →  2. Gera o arquivo  →  3. Valida estrutura (script)
                                                              ↓
                            4. Revisão: fortes/fracos  →  nova rodada? (usuário decide)
```

## A divisão de responsabilidade

É o ponto central do desenho, e vale explicar porque a primeira versão desta skill
errou exatamente aqui:

| Camada | Quem decide | Por quê |
|---|---|---|
| Qualidade do que o usuário respondeu | **a LLM** | texto livre em português não cabe em regex — uma lista de frases vagas tem recall perto de zero, e o falso positivo ensina a pessoa a escrever pro validador em vez de pra verdade |
| Estrutura do arquivo gerado | **o script** | seção faltando, placeholder esquecido, carimbo contradizendo o corpo: decidível, e um falso positivo custa só a LLM corrigir o próprio output |
| Se o case é bom | **revisão independente** | lida como quem nunca ouviu a entrevista, que é a situação de quem vai ler o dossiê |

Medição que motivou isso: validando texto livre com banco de palavras-chave,
4 de 6 respostas legítimas eram rejeitadas e 7 de 8 respostas vagas passavam.
"Reduzi em 200% os problemas" passava; "Coube a mim desenhar o plano de rollback"
era rejeitado.

## Uso

A entrevista e a revisão são conduzidas pela LLM seguindo o `SKILL.md`. O único
script valida a estrutura do arquivo gerado:

```bash
node skills/soar-case-builder/scripts/validate-case.mjs cases/<slug>.md [--json]
```

Ele checa: título e campos de cabeçalho, as cinco seções obrigatórias preenchidas,
nenhum placeholder/TODO esquecido, `Result` com número ou `[sem métrica: ...]`
explícito, `Evidência` com referência ou `sem evidência disponível`, e o carimbo
`**Verificação:**` batendo com as ressalvas do corpo. Sai ≠0 listando o que corrigir.

Ele **não** avalia se o conteúdo é bom — isso é a etapa 4.

## Arquivos

- `SKILL.md` — o fluxo das quatro etapas e as regras de turno da entrevista
- `references/entrevista.md` — os 9 campos: o que perguntar, o que aceita/rejeita, exemplos
- `references/revisao.md` — rubrica de revisão: fortes, fracos, e o laço de nova rodada
- `templates/case.md` — o template do artefato
- `scripts/validate-case.mjs` + `scripts/lib/case-schema.mjs` — validação estrutural

## Tests

```bash
node --test skills/soar-case-builder/test/*.test.mjs
```
