# Schema: `platform-memory.yaml`

Arquivo único que acumula o conhecimento sobre a plataforma a cada PRD
processado. É a fonte de verdade que a skill consulta na Fase 0 e atualiza
na Fase 7.

```yaml
plataforma: <nome da plataforma>
atualizado_em: <data ISO>
ultimo_adr: ADR-007          # facilita saber o próximo número sequencial

componentes:
  - id: order-service
    tipo: microservico        # microservico | lambda | fila | topico | banco
    descricao: Gerencia ciclo de vida de pedidos
    introduzido_por: ADR-001
    status: confirmado         # confirmado | proposto (ainda não confirmado pelo usuário)

  - id: coupon-service
    tipo: microservico
    descricao: Valida cupons de desconto no checkout
    introduzido_por: ADR-007
    status: confirmado

conexoes:
  - origem: order-service
    destino: payment-service
    tipo: rest-sync
    introduzido_por: ADR-001
    status: confirmado

  - origem: order-service
    destino: coupon-service
    tipo: rest-sync
    introduzido_por: ADR-007
    status: confirmado

historico_prds:
  - prd: "Checkout com cupom de desconto"
    adr: ADR-007
    data: 2026-06-20
    componentes_novos: [coupon-service]
    conexoes_novas:
      - { origem: order-service, destino: coupon-service, tipo: rest-sync }
```

## Lógica de diff (Fase 2 da skill)

Para cada componente/conexão que a arquitetura proposta envolve, comparar
contra as listas `componentes` e `conexoes` acima:

```
para cada componente proposto:
    se id existe em componentes (status: confirmado) -> ✅ conhecido
    senão -> 🆕 componente novo (precisa confirmação)

para cada conexao proposta (origem, destino, tipo):
    se par (origem, destino) já existe em conexoes -> ✅ conhecida
    senão se origem E destino já existem em componentes -> 🔶 conexão nova entre componentes conhecidos
    senão -> 🆕 envolve ao menos um componente novo (cai na regra acima)
```

Apresente isso ao usuário como uma lista simples antes do ADR, por exemplo:

```
Confronto com a memória da plataforma:
  ✅ order-service       (conhecido)
  ✅ payment-service     (conhecido)
  🆕 coupon-service      (novo — confirmar)
  🔶 order-service → coupon-service  (conexão nova — confirmar)
```

## Como achar quem consome um tópico/evento (mensageria)

Usado na Fase 3.5 (elicitação de contrato), antes de propor mudança de
payload em um evento/tópico já existente. A convenção é a mesma seta de
dados de sempre: uma conexão `origem -> destino` significa que `origem`
envia algo que `destino` recebe/processa. Para um tópico/fila
(`tipo: topico` ou `tipo: fila` em `componentes`):

- **Produtores** são conexões em que o tópico/fila é o `destino`
  (ex.: `order-service -> pedido-cancelado-topic`).
- **Consumidores** são conexões em que o tópico/fila é a `origem`
  (ex.: `pedido-cancelado-topic -> notification-service`).

Antes de propor uma mudança de payload, filtre `conexoes` por
`origem == <topico/fila>` e liste todos os `destino` encontrados — essa é a
lista de consumidores que a Fase 3.5 usa para perguntar sobre
compatibilidade, **mesmo que nenhum deles tenha sido citado no
PRD/demanda atual**.

## Por que "status: proposto" existe

Se o usuário pedir para gerar o ADR mas ainda não confirmar os itens 🆕/🔶
(por exemplo, quer revisar com o time antes), é possível salvar a memória com
`status: proposto` nesses itens — assim a próxima vez que a skill rodar, ela
sinaliza que existem itens pendentes de confirmação em vez de tratá-los como
definitivos. Só promova para `confirmado` depois do checkpoint da Fase 5.
