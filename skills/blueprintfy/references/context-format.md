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

**Múltiplos contextos:** um `CONTEXT-MAP.md` na raiz lista os contextos, onde cada um
vive e como se relacionam:

```md
# Context Map

## Contextos

- [Ordering](./src/ordering/CONTEXT.md) — recebe e acompanha pedidos de clientes
- [Billing](./src/billing/CONTEXT.md) — gera faturas e processa pagamentos
- [Fulfillment](./src/fulfillment/CONTEXT.md) — gerencia separação e envio no depósito

## Relacionamentos

- **Ordering → Fulfillment**: Ordering emite eventos `OrderPlaced`; Fulfillment
  consome para iniciar a separação
- **Fulfillment → Billing**: Fulfillment emite eventos `ShipmentDispatched`; Billing
  consome para gerar a fatura
- **Ordering ↔ Billing**: tipos compartilhados para `CustomerId` e `Money`
```

A skill infere qual estrutura se aplica:

- Se `CONTEXT-MAP.md` existir, leia-o para localizar os contextos.
- Se só existir um `CONTEXT.md` na raiz, é contexto único.
- Se nenhum dos dois existir, crie um `CONTEXT.md` na raiz de forma preguiçosa, quando
  o primeiro termo for resolvido (ver `setup-checklist.md` se for a primeira vez que
  o repo recebe um).

Quando houver múltiplos contextos, infira a qual o tópico atual se relaciona. Se não
estiver claro, pergunte.
