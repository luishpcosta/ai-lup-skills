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

## Por que "status: proposto" existe

Se o usuário pedir para gerar o ADR mas ainda não confirmar os itens 🆕/🔶
(por exemplo, quer revisar com o time antes), é possível salvar a memória com
`status: proposto` nesses itens — assim a próxima vez que a skill rodar, ela
sinaliza que existem itens pendentes de confirmação em vez de tratá-los como
definitivos. Só promova para `confirmado` depois do checkpoint da Fase 5.