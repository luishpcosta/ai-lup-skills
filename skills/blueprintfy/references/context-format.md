# Formato de CONTEXT.md

O conteúdo do `CONTEXT.md` de cada contexto pertence ao repositório, não à skill:
cada projeto define o que entra nele (visão geral de negócio, BPM, processos, links
para regras do domínio). Por isso a skill **não impõe esqueleto nem template** para
o arquivo — o que ela cria e mantém é a **seção de linguagem** dentro dele.

## Seção de linguagem

Ao resolver um termo, escreva na seção `## Linguagem` do `CONTEXT.md` do contexto —
criando a seção se o arquivo ainda não a tiver, e criando o arquivo (referenciado no
`CONTEXT-MAP.md`) se o contexto ainda não tiver um. Cada termo segue este formato:

```md
**{Termo}**:
{Uma ou duas frases descrevendo o termo}
_Evitar_: {sinônimos a não usar}
```

Exemplo de entrada:

```md
**Invoice**:
Uma cobrança enviada ao cliente após a entrega.
_Evitar_: Bill, payment request
```

## Regras (da seção de linguagem)

- **Seja opinativo.** Quando existirem várias palavras para o mesmo conceito, escolha
  a melhor e liste as outras em `_Evitar_`.
- **Mantenha definições curtas.** Uma ou duas frases no máximo. Defina o que o termo
  **é**, não o que ele faz.
- **Só inclua termos específicos deste contexto.** Conceitos genéricos de programação
  (timeouts, tipos de erro, padrões utilitários) não entram, mesmo que o projeto os
  use bastante. Antes de adicionar um termo, pergunte: isso é um conceito único deste
  contexto, ou um conceito genérico de programação? Só o primeiro entra.
- **Agrupe termos sob subtítulos** quando surgirem clusters naturais. Se todos os
  termos pertencem a uma única área coesa, uma lista simples está de bom tamanho.

## O `CONTEXT-MAP.md` (sempre na raiz)

A estrutura é sempre a mesma: um `CONTEXT-MAP.md` **na raiz do repo** como índice de
navegação, e um `CONTEXT.md` por contexto vivendo onde o mapa apontar. Repositório de
contexto único é só um mapa com uma entrada — **não existe a variante "`CONTEXT.md`
sem mapa"**. Glossários que o repo já tenha (qualquer nome ou local) são documentação
existente: entram no inventário do setup (ver `setup-checklist.md`), e o mapa nasce
referenciando o que o usuário confirmar.

O mapa lista os contextos, onde cada um vive, como se relacionam e — quando
existirem — onde estão os documentos de negócio já produtivos (as-is) e o
planejamento to-be (SDD):

```md
# Context Map

## Contextos

- [Ordering](./docs/dominio/ordering/CONTEXT.md) — recebe e acompanha pedidos de clientes
- [Billing](./src/billing/CONTEXT.md) — gera faturas e processa pagamentos
- [Fulfillment](./src/fulfillment/CONTEXT.md) — gerencia separação e envio no depósito

## Relacionamentos

- **Ordering → Fulfillment**: Ordering emite eventos `OrderPlaced`; Fulfillment
  consome para iniciar a separação
- **Fulfillment → Billing**: Fulfillment emite eventos `ShipmentDispatched`; Billing
  consome para gerar a fatura
- **Ordering ↔ Billing**: tipos compartilhados para `CustomerId` e `Money`

## Documentos de negócio (as-is)

- **Ordering**: [regras do domínio](./docs/dominio/ordering/) — detalhamento de
  negócio por área do domínio
- **Billing**: [regras de faturamento](./docs/dominio/billing/)

## Planejamento (to-be)

- **Ordering**: [refinamento](./docs/refinamento/ordering/) — PRODUCT_BRIEF, PRDs,
  ADRs e SPECs por funcionalidade
- **Billing**: [refinamento](./docs/refinamento/billing/)
```

As seções **Documentos de negócio (as-is)** e **Planejamento (to-be)** são opcionais
— só entram quando esses documentos existem. Os caminhos são livres (o `CONTEXT.md`
de um contexto pode viver em `src/`, em `docs/` ou onde o repo preferir); o que fixa
a estrutura é o mapa, não uma convenção de pastas.

## Regras de navegação (quando existe `CONTEXT-MAP.md`)

- **O mapa é o único ponto de entrada.** Antes de explorar pastas de documentação,
  leia o `CONTEXT-MAP.md` e siga apenas os caminhos referenciados nele.
- **O que não está no mapa não existe para o modelo.** Documentos presentes na árvore
  mas não referenciados no mapa são ignorados — não os escaneie nem os use como fonte
  de termos/regras. Se um deles parecer relevante, pergunte ao usuário se deve ser
  adicionado ao mapa.
- **As-is vs. to-be têm pesos diferentes.** Documentos de negócio (as-is) descrevem o
  que já é produtivo — são fonte de verdade para desafiar termos e planos. Documentos
  de planejamento (to-be) descrevem intenção — use-os como contexto do que está sendo
  construído, e aponte quando um to-be contradiz uma regra as-is ou o glossário.
- **Mantenha o mapa em dia.** Quando um novo contexto, pasta de domínio ou pasta de
  refinamento surgir na conversa, adicione a referência ao `CONTEXT-MAP.md` na hora,
  como se faz com termos no `CONTEXT.md`.

## Gate de criação de documento

Todo documento novo criado na estrutura mapeada (`CONTEXT.md` de contexto, doc de
domínio, PRODUCT_BRIEF, PRD, ADR, SPEC) passa por este gate, executado **pelo mesmo
agente que criou o arquivo**, na mesma ação:

1. **Alcance** — verifique se o novo arquivo é alcançável a partir do
   `CONTEXT-MAP.md`: o próprio arquivo está referenciado, ou a pasta que o contém
   está (uma pasta referenciada cobre os arquivos dentro dela).
2. **Registro** — se não for alcançável, adicione a referência na seção adequada do
   mapa (`## Contextos`, `## Documentos de negócio (as-is)` ou `## Planejamento
   (to-be)`). Se não estiver claro em qual seção ou contexto o documento entra,
   pergunte ao usuário — não adivinhe.
3. **Validação** — releia o `CONTEXT-MAP.md` depois do registro e confira: (a) o
   caminho recém-referenciado existe no disco; (b) nenhum outro link do mapa quebrou;
   (c) o novo documento está alcançável a partir do mapa. Reporte o resultado ao
   usuário (ex.: "criei `X`, registrei em *Planejamento (to-be) → Ordering* e
   validei que o link resolve").

O documento só está entregue quando os três passos passam. Isso vale também para
skills externas que criam documentos no repo (ex.: ADRs geradas por `prd-to-adr`/
`issue-to-adr`) — quem cria, registra e valida.

A skill infere o estado do repo:

- Se `CONTEXT-MAP.md` existir na raiz, leia-o para localizar os contextos e
  documentos.
- Se não existir, é a primeira configuração: rode o setup (`setup-checklist.md`) —
  vale tanto para repo já documentado quanto sem documentação — e crie o
  `CONTEXT-MAP.md` + o primeiro `CONTEXT.md` de forma preguiçosa, quando o primeiro
  termo for resolvido. Não trabalhe sem mapa.

Quando houver múltiplos contextos, infira a qual o tópico atual se relaciona. Se não
estiver claro, pergunte.
