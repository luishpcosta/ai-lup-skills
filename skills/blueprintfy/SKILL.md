---
name: blueprintfy
description: "Constrói e afia o modelo de domínio de um projeto: entrevista implacável para estressar um plano/design, glossário de linguagem onipresente (CONTEXT.md/CONTEXT-MAP.md) e ADRs de decisões arquiteturais, tudo em um único fluxo contínuo. Use sempre que o usuário quiser definir/discutir terminologia de domínio, apertar um plano antes de construir, mapear bounded contexts, ou disser algo como 'grilar isso comigo', 'vamos estressar essa decisão', 'preciso alinhar a linguagem do domínio', 'isso é uma Order ou uma Invoice mesmo?'. Também cobre o setup inicial de um repositório sem CONTEXT.md: rode o checklist de bootstrap (references/setup-checklist.md) sempre que o usuário pedir para 'começar a modelagem de domínio', 'criar o glossário do zero' ou 'mapear os contextos do sistema' — pergunte primeiro se já existem documentos de negócio e ADRs no repo antes de propor qualquer estrutura. Acione mesmo sem o usuário citar 'DDD', 'ADR' ou 'CONTEXT.md' explicitamente — se a intenção é sair de um entendimento vago para um modelo de domínio preciso e registrado, esta skill se aplica."
metadata:
  language: agnostic
  tags: [domain-modeling, ddd, glossary, adr, architecture, interview, bounded-context]
---

# Blueprintfy

Constrói e afia o modelo de domínio de um projeto **enquanto** se discute o design —
não é uma skill de leitura passiva de glossário, é a disciplina ativa de questionar
termos, inventar cenários de borda e registrar linguagem/decisões no instante em que
elas se cristalizam. Combina três coisas que sempre andaram juntas: entrevistar sem
descanso (`grilling`), manter o glossário e as ADRs de domínio em dia
(`domain-modeling`), e um modo de bootstrap para quando o repositório ainda não tem
nada disso.

Ler `CONTEXT.md` só para consultar um termo não é isso — qualquer skill pode fazer
isso em uma linha. Esta skill entra em cena quando o modelo está mudando, não quando
está só sendo consumido.

## Como decidir o modo

- **Repositório sem `CONTEXT.md`/`CONTEXT-MAP.md` e sem sessão em andamento** → comece
  pelo **Modo 1 (Setup inicial)**.
- **Já existe `CONTEXT.md`/`CONTEXT-MAP.md`, ou o usuário quer discutir/estressar um
  plano agora** → vá direto para o **Modo 2 (Sessão contínua)**.
- Nunca se force a rodar o Modo 1 se o usuário só quer bater um papo rápido sobre um
  termo — o setup completo é para quando o objetivo é estabelecer a base do modelo.

## Modo 1 — Setup inicial (bootstrap)

Antes de propor qualquer estrutura, rode o checklist com o usuário — não assuma nada
sobre o que já existe:

1. **"Já existem documentos de negócio no repositório?"** (PRDs, briefings, specs,
   RFCs, tickets longos). Se sim, peça o caminho.
2. **"Já existem ADRs registradas?"** Se sim, peça o caminho (a convenção deste
   catálogo é `adr/ADR-<id>-titulo.md` — ver `references/adr-template.md`; mas
   respeite a convenção que o repo já usa se for outra).
3. **"O sistema tem mais de um bounded context/domínio?"** Não assuma a partir da
   estrutura de pastas sozinho — proponha sua leitura ("percebi múltiplos serviços em
   `src/ordering` e `src/billing`, parece que são contextos separados — confere?") e
   confirme antes de decidir entre `CONTEXT.md` único ou `CONTEXT-MAP.md` +
   `CONTEXT.md` por contexto.

Depois de coletar essas três respostas, siga o roteiro completo em
`references/setup-checklist.md` — ele detalha como escanear os documentos existentes,
propor um rascunho de glossário termo a termo (nunca grave direto sem validar com o
usuário) e como decidir estrutura de contexto único vs. múltiplo. Se não houver nada
documentado ainda, pule o escaneamento e vá direto para o Modo 2 — o glossário nasce
organicamente durante a conversa.

Crie os arquivos de forma preguiçosa: só grave `CONTEXT.md`/`CONTEXT-MAP.md` quando o
primeiro termo estiver de fato validado, só crie `docs/adr/` (ou a pasta de ADR do
repo) quando a primeira decisão realmente merecer uma.

## Modo 2 — Sessão contínua (entrevista + modelagem ativa)

### Entreviste sem descanso

Faça perguntas sobre cada aspecto do plano/design até chegar a um entendimento
compartilhado. Percorra cada ramo da árvore de decisão, resolvendo as dependências
entre decisões uma de cada vez. Para cada pergunta, ofereça sua resposta recomendada —
isso dá ao usuário algo concreto para confirmar ou corrigir, em vez de uma folha em
branco.

Pergunte **uma coisa de cada vez**, esperando o retorno antes de continuar. Várias
perguntas empilhadas de uma vez só deixam o usuário perdido sobre o que responder
primeiro.

Se uma pergunta pode ser respondida explorando o código em vez de perguntar ao
usuário, explore o código.

### Desafie contra o glossário existente

Quando o usuário usar um termo que conflita com o `CONTEXT.md` atual, aponte na hora:
"Seu glossário define 'cancelamento' como X, mas parece que você quer dizer Y — qual
dos dois é?"

### Afie linguagem vaga

Quando o termo usado for genérico ou sobrecarregado, proponha um termo canônico
preciso: "Você está dizendo 'conta' — quer dizer o Customer ou o User? São coisas
diferentes."

### Discuta cenários concretos

Quando uma relação de domínio estiver em discussão, estresse-a com cenários
específicos. Invente cenários que testem casos de borda e forcem o usuário a ser
preciso sobre onde termina um conceito e começa outro.

### Cruze com o código

Quando o usuário descrever como algo funciona, confira se o código concorda. Se
encontrar contradição, traga à tona: "Seu código cancela o Order inteiro, mas você
acabou de dizer que cancelamento parcial é possível — qual dos dois está certo?"

### Atualize `CONTEXT.md` inline

Quando um termo for resolvido, atualize `CONTEXT.md` (ou o `CONTEXT.md` do contexto
certo, se houver `CONTEXT-MAP.md`) ali mesmo, na hora — não acumule para depois. Use o
formato em `references/context-format.md`.

`CONTEXT.md` deve ser totalmente livre de detalhes de implementação. Não trate
`CONTEXT.md` como spec, rascunho ou repositório de decisões técnicas — é glossário e
nada mais.

### Ofereça ADR com moderação

Só ofereça criar uma ADR quando as três condições forem verdadeiras ao mesmo tempo:

1. **Difícil de reverter** — o custo de mudar de ideia depois é relevante.
2. **Surpreendente sem contexto** — um leitor futuro vai se perguntar "por que
   fizeram assim?".
3. **Resultado de um trade-off real** — havia alternativas genuínas e uma foi
   escolhida por razões específicas.

Se faltar qualquer uma das três, não ofereça ADR — o rascunho de decisão fica só no
histórico da conversa. Use o template e o gerador de ID em
`references/adr-template.md`.

## Estrutura de arquivos

A maioria dos repositórios tem um único contexto:

```
/
├── CONTEXT.md
├── adr/
│   ├── ADR-20260615-0930-a1f2-nome-da-decisao.md
│   └── ADR-20260620-1542-3f0a-outra-decisao.md
└── src/
```

Se existir um `CONTEXT-MAP.md` na raiz, o repo tem múltiplos contextos. O mapa aponta
onde cada um vive:

```
/
├── CONTEXT-MAP.md
├── adr/                               ← decisões de todo o sistema
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── adr/                       ← decisões específicas do contexto
│   └── billing/
│       ├── CONTEXT.md
│       └── adr/
```

Quando existirem múltiplos contextos, infira a qual o assunto atual pertence. Se não
estiver claro, pergunte — não adivinhe uma decisão que muda onde tudo é gravado.

## Arquivos de referência

- `references/context-format.md` — formato de `CONTEXT.md`/`CONTEXT-MAP.md`, regras de
  linguagem (ser opinativo, definições curtas, o que entra e o que não entra).
- `references/adr-template.md` — template de ADR e como gerar o ID (mesma convenção de
  `prd-to-adr`/`issue-to-adr` deste catálogo), e o critério de quando vale a pena
  registrar uma.
- `references/setup-checklist.md` — roteiro completo do Modo 1: como escanear docs de
  negócio/ADRs existentes, propor rascunho de glossário e decidir contexto único vs.
  múltiplo.
