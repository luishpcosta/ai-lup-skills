---
id: ADR-20250620-1542-3f0a
titulo: Estornos passam a ser processados por fila assíncrona
status: aceito
contextos: [Payment]
afeta: [Payment, Ordering]
supera: []
depende_de: []
---
# ADR-20250620-1542-3f0a: Estornos passam a ser processados por fila assíncrona

- **Status**: Aceito
- **Data**: 2025-06-20
- **Contexto de domínio**: Payment

## Contexto

Nos picos de tráfego de campanhas promocionais, o volume de estornos simultâneos
derrubou a latência de Payment.

## Decisão

Payment publica cada pedido de estorno em uma fila e o processa de forma assíncrona.
Quem chama Payment recebe apenas a confirmação de que o pedido de estorno foi aceito
na fila — nunca o resultado final na mesma chamada.

## Contextos/componentes afetados

- Payment
- Ordering
