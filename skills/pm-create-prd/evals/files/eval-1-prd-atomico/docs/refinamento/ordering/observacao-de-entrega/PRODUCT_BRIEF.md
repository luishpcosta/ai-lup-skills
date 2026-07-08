---
id: PB-20260701-0930-a1b2
titulo: Observação de entrega no pedido
status: aprovado
contextos: [Ordering]
afeta: []
supera: []
depende_de: []
---

# Briefing de produto: Observação de entrega no pedido

## Resumo executivo

Permitir que o cliente adicione uma observação de entrega ao pedido (ex.: "deixar na
portaria") até o momento do despacho. Extensão contida do contexto Ordering, sem
mudança nos contratos com Payment.

## O Problema

Clientes ligam para o atendimento para pedir instruções de entrega que não têm onde
ser registradas; entregadores não recebem a instrução e a taxa de reentrega sobe.

## A Solução

Um campo de observação de entrega no Pedido, editável pelo cliente até o Despacho
(depois dele o pedido não aceita mais alterações, conforme o glossário). A observação
acompanha o pedido até o entregador.

## O que torna Isto Diferente

Nada de novo fluxo ou novo conceito: usa o ciclo de vida que o Pedido já tem, com o
Despacho como fronteira natural de edição.

## Quem Isto Serve

- Cliente que compra e quer instruir a entrega.
- Entregador, que passa a receber a instrução junto do pedido.

## Critérios de Sucesso

- Queda nas ligações de atendimento sobre instrução de entrega.
- Queda na taxa de reentrega por endereço/acesso.

## Escopo

**No escopo:**
- Adicionar/editar/remover a observação até o Despacho.
- Exibir a observação para o entregador.

**Fora do escopo:**
- Comunicação proativa ao cliente (Notification não é tocado).
- Alterar itens ou endereço do pedido.

## Visão

Evoluir para instruções estruturadas de entrega (janelas de horário, ponto de
retirada) se a observação livre provar demanda.
