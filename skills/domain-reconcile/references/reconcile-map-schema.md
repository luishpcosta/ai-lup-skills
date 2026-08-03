# Schema do `reconcile-map.yaml`

Este arquivo é o harness de rastreamento desta skill: o "de-para" entre repositórios
externos (código real) e os contextos do `CONTEXT-MAP.md` (domínio documentado), com o
último ponto (commit + branch) em que cada par foi conciliado. Vive sempre na raiz do
repo documental, ao lado do `CONTEXT-MAP.md`.

## Formato

```yaml
repos:
  - repo: org/service-billing          # owner/repo do GitHub
    context: Billing                   # nome exato da entrada em CONTEXT-MAP.md
    last_reconciled:
      ref: main                        # branch ou "commit" quando a origem foi um sha direto
      commit: a1b2c3d4e5f6              # sha completo, nunca abreviado
      at: 2026-08-02T14:03:00Z          # timestamp UTC da sessão de reconciliação
    open_discrepancies:
      - "ADR-20260615-0930-a1f2 AC-3: código permite cancelamento parcial, doc ainda não reflete"
    notes: "cancelamento parcial liberado no commit a1b2c3d; PB pendente de atualização"

  - repo: org/service-billing
    context: Payment                   # o mesmo repositório pode tocar mais de um contexto
    last_reconciled:
      ref: release/2026-07
      commit: 9f8e7d6c5b4a
      at: 2026-07-28T09:12:00Z
    open_discrepancies: []
```

## Regras de preenchimento

- **Chave de identidade de uma entrada** é o par `repo` + `context` — nunca crie uma
  segunda entrada para o mesmo par; atualize a existente. Um repositório que toca mais
  de um contexto (caso comum em monorepos) ganha uma entrada por contexto, não uma
  entrada com lista de contextos — é o que deixa `last_reconciled` e
  `open_discrepancies` corretos por contexto, já que cada reconciliação parte de um
  contexto por vez (Passo 1.3 do `SKILL.md`).
- **`last_reconciled.commit`** é sempre o commit efetivamente inspecionado no Passo 2
  (sha completo de 40 caracteres, não o abreviado que o `gh`/`git log` mostra por
  padrão) — evita ambiguidade se o histórico for reescrito.
- **`open_discrepancies`** lista, em texto curto, cada candidato do Passo 4 que o
  usuário decidiu conscientemente **não** resolver agora (respondeu "não" no Passo 5).
  Referencie o AC/RF/ADR pelo id exato. Quando uma discrepância antiga for finalmente
  resolvida numa sessão futura, remova a linha correspondente — a lista deve refletir
  o estado real, não um histórico acumulado (isso é trabalho do `git log` do próprio
  `reconcile-map.yaml`).
- **`notes`** é opcional, texto livre, para contexto que não cabe em uma linha de
  discrepância — não vira campo estruturado, exatamente como o corpo do `CONTEXT.md`
  não é estruturado.
- Nunca invente uma entrada preventivamente "porque provavelmente vai ser conciliado
  depois" — e não confunda "o Passo 2 buscou o commit com sucesso" com "a sessão
  terminou". Uma entrada só nasce (ou é atualizada) depois que o Passo 4
  (interrogatório) chegou a uma resposta do usuário para cada candidato e o Passo 5
  (autorização passagem-por-passagem) foi decidido — mesmo que a decisão, para algum
  candidato, tenha sido "não mexer agora" (isso é o que vira `open_discrepancies`, não
  uma ausência de decisão). Uma sessão que buscou o commit (Passo 2) mas parou no meio
  do Passo 4 esperando resposta do usuário **não** é uma sessão terminada — não escreva
  nada em `reconcile-map.yaml` ainda.

## Registro no `CONTEXT-MAP.md`

Na primeira vez que `reconcile-map.yaml` for criado num repositório, proponha ao usuário
adicionar uma seção nova ao `CONTEXT-MAP.md` (as seções existentes —
`## Documentos de negócio (as-is)` e `## Planejamento (to-be)` — não descrevem um
arquivo de rastreamento entre repositórios e contextos, então isso não é "adivinhar em
qual seção entra", é propor uma seção que ainda não existe):

```md
## Repositórios rastreados

- [reconcile-map.yaml](./reconcile-map.yaml) — de-para entre repositórios externos e contextos,
  com o último commit/branch conciliado por par (mantido por `domain-reconcile`)
```

Depois de adicionada uma vez, as sessões seguintes só atualizam `reconcile-map.yaml` — a
seção do mapa não muda a cada reconciliação, só quando o arquivo em si passa a existir
(gate de criação de documento, Passo 3 "Validação": confirme que o link resolve).
