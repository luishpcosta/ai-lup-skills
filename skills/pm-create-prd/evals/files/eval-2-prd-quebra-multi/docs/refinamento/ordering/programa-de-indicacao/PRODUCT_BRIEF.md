---
id: PB-20260705-1400-c3d4
titulo: Programa de indicação
status: aprovado
contextos: [Ordering]
afeta: [Payment, Notification]
supera: []
depende_de: []
---

# Briefing de produto: Programa de indicação

## Resumo executivo

Um cliente indica um amigo; quando o amigo faz o primeiro pedido, o indicador ganha
um crédito para usar no próximo pagamento e os dois recebem uma comunicação. Toca
Ordering (primeiro pedido do indicado), Payment (crédito) e Notification
(comunicação).

## O Problema

Aquisição de clientes depende só de mídia paga; não há mecanismo para transformar
clientes satisfeitos em canal de aquisição.

## A Solução

Três capacidades:

1. **Registrar a indicação**: associar o código do indicador ao primeiro Pedido do
   indicado (Ordering).
2. **Conceder o crédito**: quando o primeiro pedido do indicado é confirmado, gerar
   um Crédito para o indicador (Payment).
3. **Comunicar os dois**: avisar indicador e indicado quando a indicação se concretiza
   (Notification).

## O que torna Isto Diferente

Usa mecanismos que já existem em cada contexto (Pedido, Crédito, Comunicação) — não
cria programa de pontos nem carteira nova.

## Quem Isto Serve

- Cliente indicador, que ganha crédito.
- Cliente indicado, que chega com desconto de boas-vindas.
- Time de growth, que ganha um canal de aquisição mensurável.

## Critérios de Sucesso

- % de novos clientes vindos de indicação.
- Custo de aquisição por indicação menor que o de mídia paga.

## Escopo

**No escopo:**
- Código de indicação por cliente.
- Registro da indicação no primeiro pedido do indicado.
- Concessão do crédito ao indicador após confirmação do primeiro pedido.
- Comunicação aos dois clientes.

**Fora do escopo:**
- Programa de pontos recorrente.
- Indicação de não-clientes por canais externos (afiliados).

## Visão

Se o canal provar retorno, evoluir para recompensas escalonadas e indicação em cadeia.
