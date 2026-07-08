# Context Map

## Contextos

- [Ordering](./docs/dominio/ordering/CONTEXT.md) — recebe, acompanha e cancela pedidos de clientes
- [Payment](./docs/dominio/payment/CONTEXT.md) — processa pagamentos, créditos e estornos
- [Notification](./docs/dominio/notification/CONTEXT.md) — envia comunicações ao cliente (e-mail, push)

## Relacionamentos

- **Ordering → Payment**: Ordering aciona Payment no fluxo de cancelamento para
  processar o estorno do pedido
- **Notification → Ordering**: Notification consome eventos de pedido para comunicar
  o cliente

## Decisões (ADR)

- [Registro de decisões](./adr/) — ADRs de todo o sistema

## Planejamento (to-be)

- **Ordering**: [refinamento](./docs/refinamento/ordering/) — briefings e PRDs por funcionalidade
