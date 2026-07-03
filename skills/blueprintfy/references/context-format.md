# Formato de CONTEXT.md

## Estrutura

```md
# {Nome do Contexto}

{Uma ou duas frases descrevendo o que é esse contexto e por que ele existe.}

## Linguagem

**Order**:
{Uma ou duas frases descrevendo o termo}
_Evitar_: Purchase, transaction

**Invoice**:
Uma cobrança enviada ao cliente após a entrega.
_Evitar_: Bill, payment request

**Customer**:
Uma pessoa ou organização que faz pedidos.
_Evitar_: Client, buyer, account
```

## Regras

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

## Contexto único vs. múltiplo

**Contexto único (a maioria dos repos):** um único `CONTEXT.md` na raiz do repo.

**Múltiplos contextos:** um `CONTEXT-MAP.md` **sempre na raiz** funciona como índice
de navegação do repositório: lista os contextos, onde cada um vive, como se
relacionam e — quando existirem — onde estão os documentos de negócio já produtivos
(as-is) e o planejamento to-be (SDD):

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

A skill infere qual estrutura se aplica:

- Se `CONTEXT-MAP.md` existir, leia-o para localizar os contextos e documentos.
- Se só existir um `CONTEXT.md` na raiz, é contexto único.
- Se nenhum dos dois existir, crie um `CONTEXT.md` na raiz de forma preguiçosa, quando
  o primeiro termo for resolvido (ver `setup-checklist.md` se for a primeira vez que
  o repo recebe um).

Quando houver múltiplos contextos, infira a qual o tópico atual se relaciona. Se não
estiver claro, pergunte.
