---
name: prd-to-adr
description: "Use sempre que o usuário fornecer/referenciar um PRD e pedir a arquitetura de solução que o atende, ou para 'criar ADR a partir do PRD', 'quebrar em atividades por componente' ou 'gerar acceptance criteria ligadas à arquitetura'. A skill mantém uma memória incremental da plataforma (componentes/conexões já conhecidos): a cada PRD, confirma se ele é sobre a plataforma já mapeada, identifica componentes/conexões novos vs. reuso, e enriquece a memória para os próximos PRDs. Garante ADR registrado e ACs rastreáveis ao PRD, com checkpoint humano antes de quebrar em múltiplos passos/ADRs. Use mesmo sem o usuário citar 'ADR' ou 'acceptance criteria' literalmente — se a intenção é ir do requisito de produto às atividades técnicas com rastreabilidade e continuidade entre PRDs, esta skill se aplica."
metadata:
  language: agnostic
  tags: [meta, sdd, spec-driven, adr]
---

# PRD → Arquitetura → ADR + ACs (com memória incremental da plataforma)

Transforma um PRD em uma proposta de arquitetura registrada como ADR, decomposta em
atividades por componente com Acceptance Criteria (AC) rastreável — e mantém um
arquivo de memória da plataforma que cresce a cada PRD processado, em vez de tratar
cada feature como um caso isolado de "greenfield" ou "brownfield".

## Conceito central: memória da plataforma

Existe um arquivo único (`platform-memory.yaml`, ver `references/memoria-schema.md`)
que acumula, ao longo do tempo:
- todos os **componentes** já conhecidos (microsserviços, lambdas, filas, tópicos, bancos);
- todas as **conexões** já conhecidas entre eles;
- de qual PRD/ADR cada componente/conexão se originou;
- um histórico de PRDs processados.

Cada novo PRD não começa do zero: ele é confrontado contra essa memória. O resultado
da Fase 2 sempre classifica o que está sendo proposto em três grupos: **conhecido**
(reuso, sem necessidade de confirmação), **conexão nova entre componentes conhecidos**
(precisa confirmação) e **componente novo** (precisa confirmação). Só depois da
confirmação a memória é atualizada (Fase 7).

## Quando usar

- O usuário cola ou referencia um PRD e pede a arquitetura que o atende.
- O usuário já tem um PRD e quer "as atividades por componente".
- O usuário pede para formalizar uma decisão arquitetural já discutida em ADR.
- Há (ou deveria haver) um `platform-memory.yaml` no projeto sendo continuamente
  enriquecido a cada feature — esta skill é o ponto de entrada e saída dessa memória.

## Fluxo (siga as fases em ordem; não pule Fase 0 nem o checkpoint da Fase 5)

### Fase 0 — Carregar (ou iniciar) a memória da plataforma

1. Procure `platform-memory.yaml` no projeto (raiz, `architecture/`, ou pergunte
   ao usuário onde ele vive se não encontrar nada).
2. **Se encontrar**: carregue componentes, conexões e histórico. Informe ao
   usuário, de forma breve, quantos componentes/conexões já são conhecidos
   (ex.: "Encontrei a memória da plataforma: 6 componentes e 8 conexões
   mapeadas, último PRD processado em <data>.").
3. **Se não encontrar**: avise que esta é a primeira vez que a plataforma está
   sendo mapeada por esse processo, e que o arquivo será criado do zero a
   partir deste PRD. Não trate isso como uma decisão menor — pergunte se o
   usuário quer popular a memória inicial com componentes já existentes antes
   de seguir (evita "reinventar" um serviço que já existe mas não foi descrito
   ainda).

### Fase 1 — Extrair o essencial do PRD

Extraia, de forma explícita (mostre ao usuário antes de seguir):
- **Objetivo de negócio** (1-2 frases)
- **Requisitos funcionais** (RF-01, RF-02...)
- **Requisitos não-funcionais** (performance, disponibilidade, segurança)
- **Restrições conhecidas**
- **Fora de escopo**

Se o PRD for vago em requisitos não-funcionais, pergunte antes de prosseguir.

### Fase 2 — Propor arquitetura e confrontar com a memória

1. Proponha a arquitetura que atende ao PRD (1-3 opções com trade-offs, se
   houver decisão relevante a ser tomada).
2. Para a opção escolhida (ou única), classifique **cada componente e cada
   conexão envolvidos** contra `platform-memory.yaml`:

   - ✅ **Conhecido** — já existe na memória, sendo reutilizado sem alteração
     de contrato. Não precisa de confirmação explícita.
   - 🔶 **Conexão nova entre componentes conhecidos** — ex.: `order-service`
     e `coupon-service` já existem, mas nunca se conectaram. Precisa de
     confirmação.
   - 🆕 **Componente novo** — não está na memória. Precisa de confirmação.

3. Apresente essa classificação como uma lista curta antes de seguir para o
   ADR — é o "diff" entre o que o PRD pede e o que a plataforma já sabe.
   **Para todo item 🔶 ou 🆕, pergunte explicitamente se o usuário quer
   adicioná-lo ao mapeamento da plataforma** — isso nunca é assumido
   automaticamente, mesmo que pareça óbvio. Use `ask_user_input_v0` quando a
   confirmação for binária e simples (ex.: "Confirma que coupon-service é
   novo e não uma duplicata de algo existente? Adicionar ao mapeamento?").
   Itens recusados pelo usuário não entram no ADR como componente novo —
   trate como se o usuário tivesse apontado um componente já existente com
   outro nome, e pergunte qual é.

### Fase 3 — Escrever o ADR

Use `references/adr-template.md`. Pontos obrigatórios:
- **Status sempre "Proposto"** até confirmação do usuário.
- A seção **Decisão** linka aos RF-/RNF- da Fase 1.
- Marque explicitamente, na seção de componentes afetados, quais são
  🆕 novos e quais são ✅ já conhecidos (herdado da classificação da Fase 2).
- Inclua **Alternativas consideradas**.
- Numere sequencialmente (consulte o histórico em `platform-memory.yaml`
  para saber o próximo número de ADR, em vez de perguntar ao usuário sempre).

### Fase 3.5 — Elicitar o contrato de payload (antes das ACs)

"Descrever o contrato explicitamente" na AC (Fase 4) não acontece por conta
própria — alguém precisa elicitar campos, tipos e regras de erro antes de
escrever a AC. Essa elicitação é diferente para REST e para mensageria,
porque o risco é diferente: em REST, quem sofre o erro é quem chama, na
hora; em mensageria, quem sofre não é quem publica, são os consumidores
desacoplados — que podem nem estar no radar da demanda atual.

Aplique esta fase a toda conexão 🔶 nova, componente 🆕 novo, ou conexão ✅
já conhecida cujo payload está sendo alterado (pule conexões sem payload
estruturado, ex.: leitura direta de banco). Ver
`references/contrato-payload.md` para o roteiro completo; resumo:

**REST (síncrono)** — pergunte e registre: campos do payload (request e
response), tipo de cada campo, obrigatoriedade, contrato de erro (status
codes + formato do corpo de erro por cenário de negócio) e idempotência em
escrita (como uma repetição/retry é tratada).

**Mensageria (assíncrono)** — pergunte e registre: versionamento do schema
do evento, compatibilidade (campo novo é **sempre opcional**; remover ou
renomear campo é breaking change), idempotência do consumidor (chave de
deduplicação para entrega at-least-once) e política de DLQ. Antes de propor
qualquer mudança em payload de evento/tópico já existente, **cruze com
`platform-memory.yaml`** para listar todos os consumidores já conhecidos
(ver seção correspondente em `references/memoria-schema.md`) e pergunte
explicitamente se a mudança é compatível com cada um — mesmo que nenhum
apareça no PRD/demanda atual.

Se alguma resposta ficar pendente após uma rodada de perguntas, registre
como assunção explícita (mesmo critério das demais fases) e leve isso para
o ADR.

### Fase 4 — Decompor em atividades por componente

Cada **atividade** representa o recorte completo a ser implementado por um
componente para atender ao ADR — não um passo minúsculo. Por isso, é normal
que uma atividade seja extensa (várias ACs, múltiplos endpoints/casos de
contrato). Não force atividades artificialmente pequenas.

Use IDs `ADR-XXX-AT-NN`, ACs com `ADR-XXX-AC-NN` (ver `references/ac-template.md`).
Toda atividade que cria uma 🔶 conexão nova ou 🆕 componente novo precisa de
AC descrevendo o contrato explicitamente — usando o que foi elicitado na
Fase 3.5 (campos/tipos/erros/idempotência para REST; versionamento/
compatibilidade/idempotência do consumidor/DLQ para mensageria), não só
"deve funcionar".

**Oferecer quebra quando a atividade for extensa**: depois de listar uma
atividade com várias ACs, se ela parecer grande (muitos cenários, mistura
responsabilidades distintas, ou o usuário comentar que está extensa),
pergunte explicitamente se o usuário quer quebrá-la em duas ou mais
atividades (ex.: `ADR-XXX-AT-01a` e `ADR-XXX-AT-01b`, ou `AT-01`/`AT-02`
separando por sub-responsabilidade). Nunca quebre sem perguntar — a decisão
de granularidade é do usuário, a skill só sinaliza quando o recorte parece
grande demais para uma entrega só.

### Fase 5 — Checkpoint humano (obrigatório, não pule)

Antes de finalizar:
1. Apresente a lista de atividades por componente.
2. Pergunte se alguma atividade deve virar um ADR separado (múltiplos times,
   risco técnico alto, entrega independente).
3. Reconfirme qualquer item 🆕/🔶 da Fase 2 que ainda não tenha confirmação
   explícita — não atualize a memória com algo não confirmado.

### Fase 5.5 — Gerar diagrama do grafo atualizado (obrigatório quando há item novo)

Sempre que houver ao menos um componente 🆕 ou conexão 🔶/🆕 confirmada na
Fase 2, **gere um arquivo com diagrama Mermaid do grafo completo atualizado**
(memória existente + adições propostas) antes de escrever em
`platform-memory.yaml`. Esse é um caso real de validação visual — o objetivo
é o usuário ver o grafo com seus próprios olhos e confirmar que a nova
conexão está no lugar certo, não apenas confiar na lista em texto da Fase 2.

Convenção de estilo (ver `references/grafo-visual.md` para o template
completo):
- Componentes/conexões **já existentes na memória** → estilo neutro.
- Componentes/conexões **novos, ainda não confirmados definitivamente** →
  estilo destacado (cor diferente, borda tracejada) para chamar atenção.

Salve como arquivo (ex.: `platform-memory-graph.md`) e pergunte diretamente:
"O grafo está correto? A conexão nova está onde deveria estar?" — só depois
de confirmação explícita siga para a Fase 6/7. Se o usuário apontar algo
errado, volte para a Fase 2 e ajuste a classificação antes de prosseguir.

### Fase 6 — Entregáveis do PRD

Gere como arquivos (sempre arquivo, nunca só inline):
- `adr/ADR-XXX-titulo.md`
- `adr/ADR-XXX-acs.md`
- `platform-memory-graph.md` (gerado na Fase 5.5, se aplicável)

### Fase 7 — Atualizar a memória da plataforma (não pule esta fase)

Depois da confirmação das Fases 5 e 5.5, **escreva de volta** em
`platform-memory.yaml`:
- Adicione os componentes 🆕 confirmados, com `introduzido_por: ADR-XXX` e
  `status: confirmado`.
- Adicione as conexões 🔶/🆕 confirmadas, mesma proveniência.
- Adicione uma entrada em `historico_prds` com data, PRD, ADR gerado e o que
  foi acrescentado.
- Mostre ao usuário um resumo curto do que foi adicionado à memória (ex.:
  "Memória atualizada: +1 componente (coupon-service), +2 conexões.").
- Regenere `platform-memory-graph.md` sem os estilos de "ainda não
  confirmado" — agora tudo ali é definitivo, até a próxima rodada de
  diffs.

Essa fase é o que torna o processo cumulativo — sem ela, o próximo PRD volta
a começar do zero.

## Arquivos de referência

- `references/adr-template.md` — template de ADR.
- `references/ac-template.md` — template de Atividade + Acceptance Criteria.
- `references/memoria-schema.md` — schema do `platform-memory.yaml` e exemplo
  de diff entre PRD novo e memória existente.
- `references/grafo-visual.md` — convenção de estilo Mermaid para destacar
  componentes/conexões novos no diagrama de validação (Fase 5.5).
- `references/contrato-payload.md` — roteiro de elicitação do contrato de
  payload (REST vs. mensageria), usado na Fase 3.5.