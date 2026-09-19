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
| Se o case é bom | **revisão em contexto limpo** | recebe só o arquivo e a rubrica — quem conduziu a entrevista completa as lacunas de cabeça, que é justamente o que o leitor do dossiê não pode fazer |

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
nenhum placeholder/TODO esquecido, `Result` com número ou marcador explícito de
ausência, `Evidência` com referência ou `sem evidência disponível`, o carimbo
`**Verificação:**` batendo com as ressalvas do corpo, e o **orçamento de saídas
honestas** — se `Result` e `Evidência` abrirem mão dos dois, não sobrou nada
verificável e o carimbo tem de dizer `não verificado`. Sai ≠0 listando o que corrigir.

O campo `**Revisão:**` (`pendente` | `sem ressalvas` | `<N> em aberto`) registra o
desfecho da etapa 4 — inclusive "o usuário fechou com N fraquezas conhecidas". Sem
ele, um case revisado e um nunca revisado ficam indistinguíveis no arquivo.

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

Além do validador, a suíte amarra a **prosa ao código**: se o vocabulário
documentado no `SKILL.md` divergir do que o schema aceita, se o template ganhar
uma seção que o validador não conhece, se um link apontar para arquivo deletado,
ou se um campo da `entrevista.md` perder parte da rubrica, o teste falha. É o
que impede a documentação de virar mentira silenciosa quando o código muda.

O que ela **não** cobre: se a rubrica é boa. Isso só se mede rodando a skill com
um modelo e julgando o resultado — os casos `kind: "behavior"` em `evals/evals.json`
descrevem o que deveria ser verificado, mas a verificação é manual, feita quando
uma rubrica muda.
