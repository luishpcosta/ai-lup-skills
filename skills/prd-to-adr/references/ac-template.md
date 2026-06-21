# Atividades e Acceptance Criteria — ADR-XXX

> Referência: `ADR-XXX-titulo.md`. Cada atividade pertence a um componente e
> tem 1+ AC vinculada. ACs de contrato (API/evento/schema) devem descrever o
> contrato explicitamente, não apenas "deve funcionar".

## Componente: <nome-do-componente>

### Atividade ADR-XXX-AT-01: <título da atividade>

- **Descrição**: <o que precisa ser feito, objetivamente>
- **Depende de**: <outra atividade ou componente, se houver>

**AC ADR-XXX-AC-01**
```
Dado <contexto/pré-condição>
Quando <ação>
Então <resultado esperado, verificável objetivamente>
```

**AC ADR-XXX-AC-02** (se houver contrato entre componentes)
```
Dado que <componente A> chama <componente B>
O contrato deve ser: <schema/payload/status codes esperados>
E casos de erro devem retornar: <comportamento esperado>
```

---

## Componente: <próximo-componente>

### Atividade ADR-XXX-AT-02: <título>
...

---

## Tabela de rastreabilidade

| Requisito (PRD) | ADR | Atividade | AC | Componente | Status |
|---|---|---|---|---|---|
| RF-01 | ADR-XXX | AT-01 | AC-01, AC-02 | <componente> | Pendente |
| RNF-01 | ADR-XXX | AT-02 | AC-03 | <componente> | Pendente |

> Atualize a coluna "Status" conforme as atividades avançam (Pendente / Em
> andamento / Concluído / Bloqueado). Isso é o que permite a uma IA (ou a
> outro humano) auditar depois se o PRD foi de fato atendido ponta a ponta.