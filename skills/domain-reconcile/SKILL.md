---
name: domain-reconcile
description: "Busca informações num repositório GitHub externo — um commit específico, ou um documento específico por branch — via gh CLI, e concilia o que encontrar contra o que já está documentado no domínio: PB, PRD (RF-/RNF-) e ADR + Acceptance Criteria (ADR-XXX-AC-NN), navegando pelo CONTEXT-MAP.md que o blueprintfy mantém. Antes de qualquer análise, sempre pergunta qual repositório, qual commit ou documento (e em qual branch), e a qual domínio/contexto a análise pertence — nunca assume. Interroga sem descanso cada divergência encontrada até eliminar toda ambiguidade sobre se o código avançou, se o doc está desatualizado, ou se é falso positivo — e NUNCA edita PB/PRD/ADR/AC sem autorização explícita do usuário, passagem por passagem. Mantém um harness de rastreamento (reconcile-map.yaml na raiz) com o de-para repositório↔contexto e o último commit/branch conciliado. Use sempre que o usuário disser algo como 'confere se esse commit bate com nosso PRD', 'esse branch já reflete a ADR X?', 'concilia esse repositório com a documentação', 'será que esse código ainda cumpre o AC tal', ou quiser auditar deriva entre código de um repositório externo e a documentação de domínio — mesmo sem citar 'reconciliação', 'gh' ou 'YAML' explicitamente."
metadata:
  language: agnostic
  tags: [ddd, sdd, reconciliation, github, gh-cli, audit, blueprintfy, discovery, acceptance-criteria]
---

# Domain Reconcile

Domain Reconcile pergunta a um repositório externo "o que você realmente fez?" e pergunta
à documentação de domínio "o que a gente disse que ia acontecer?" — e não deixa a
conversa terminar até as duas respostas estarem reconciliadas ou a divergência estar
explicitamente registrada como aceita. Não é uma skill de modelagem: não inventa termo
de glossário, não decide arquitetura. É auditoria e reconciliação — a pergunta central é
sempre "isso que o código fez ainda bate com o que documentamos, e se não bate, isso é
um doc desatualizado ou um comportamento não autorizado?"

Complementa o `blueprintfy` (funda e mantém CONTEXT-MAP.md/CONTEXT.md/ADRs) e a cadeia
`pm-create-pb` → `pm-create-prd` → `prd-to-adr`/`issue-to-adr` (que produzem PB, PRD e
ADR+ACs) — esta skill não cria esses documentos do zero, ela os usa como vara de medir
contra código real.

## Quando isso roda

Sempre que o usuário quiser saber se uma mudança em outro repositório (um commit, um
branch, um documento específico daquele repo) já está refletida — ou contradiz — a
documentação de domínio atual. Precisa de um `CONTEXT-MAP.md` na raiz do repositório
**onde a skill está rodando** (o repo documental) para ter contra o que conciliar.

## Passo 0 — Pré-requisitos, sem exceção

1. **`gh` autenticado**: rode `gh auth status`. Se falhar, peça para o usuário rodar
   `gh auth login` antes de continuar — toda busca no Passo 2 depende disso, não há
   como contornar.
2. **`CONTEXT-MAP.md` na raiz do repo documental**: se não existir, não há nada para
   conciliar contra. Avise o usuário e, se a skill `blueprintfy` estiver disponível,
   ofereça rodar o bootstrap dela primeiro (mesmo critério que `pm-create-pb` usa). Não
   prossiga sem mapa.
3. **`reconcile-map.yaml`**: se não existir na raiz ainda, esta é a primeira reconciliação já
   feita neste repositório documental — normal, ele nasce no Passo 6.

## Passo 1 — Pergunte, uma coisa de cada vez, nunca assuma

Mesma disciplina de entrevista do `blueprintfy`: uma pergunta por vez, com resposta
recomendada quando houver base para propor uma (por exemplo, a partir do histórico já
registrado em `reconcile-map.yaml`), esperando a confirmação do usuário antes de seguir.

1. **Qual repositório externo?** (`owner/repo` do GitHub.) Se `reconcile-map.yaml` já tem
   entradas, liste-as como sugestão rápida — mas sempre permita um repositório novo.
2. **O que visitar nele**: um **commit específico** (hash) ou um **documento
   específico** (caminho) — e em qual **branch/ref**. Pergunte primeiro qual das duas
   formas, depois o valor. Se o usuário só souber "a última mudança na branch X", use
   `gh api repos/<owner>/<repo>/branches/<branch>` para resolver o commit mais recente
   e confirme com o usuário antes de seguir — não decida sozinho qual é "a mudança
   relevante" se houver mais de um commit candidato.
3. **A qual domínio/contexto de análise isso pertence?** Leia `CONTEXT-MAP.md` e
   apresente os contextos existentes (nomes exatos) para o usuário escolher — se um
   nome de contexto parecer óbvio a partir do nome do repositório ou da mensagem do
   commit, proponha como hipótese, mas peça confirmação do mesmo jeito que o
   `blueprintfy` faz na Pergunta 3 do Modo 1.

Nunca pule uma das três perguntas por parecer óbvia a partir do contexto da conversa —
essa disciplina é o que torna a reconciliação confiável.

## Passo 2 — Busque com clone raso e temporário, sempre removido no final

Use um clone raso temporário (não `gh api` isolado) porque geralmente é preciso olhar
múltiplos arquivos/trechos ao redor do commit para julgar o impacto real, não só o
diff bruto. O script `scripts/fetch-ref.sh` encapsula isso com limpeza garantida (roda
um comando dentro do clone e remove o diretório temporário ao final, mesmo se o comando
falhar):

```bash
scripts/fetch-ref.sh <owner>/<repo> --branch <branch> -- git log -1 -p
scripts/fetch-ref.sh <owner>/<repo> --commit <sha>    -- git show <sha>
scripts/fetch-ref.sh <owner>/<repo> --branch <branch> -- cat <caminho-do-doc>
```

Regras:

- **Nunca deixe o clone para trás.** Se precisar rodar vários comandos de inspeção
  sobre o mesmo clone (diff + ler arquivos vizinhos + `git blame`), passe um único
  comando composto (`sh -c '...'`) para `fetch-ref.sh` em vez de clonar de novo a cada
  pergunta — clonar é o passo caro, e o objetivo é uma limpeza por sessão, não zero
  clones.
- **Um clone velho de uma sessão anterior é lixo, não cache.** Se encontrar um
  diretório temporário sobrando (sessão anterior que travou), não reaproveite às cegas
  — o repositório pode ter avançado; remova e busque de novo.
- Se o fetch por SHA específico falhar (alguns hosts restringem buscar um commit
  arbitrário fora do histórico de uma branch), o script já tenta um fallback de clone
  completo da branch padrão; se mesmo assim falhar, informe o usuário em vez de travar
  em retry silencioso.

## Passo 3 — Cruze com os documentos de Discovery do contexto

Usando o contexto confirmado no Passo 1.3: leia `CONTEXT-MAP.md` → localize o
`CONTEXT.md` do contexto e os documentos registrados em "Planejamento (to-be)" para
ele — PB, PRD(s) e ADR(s) com seu arquivo de ACs (`ADR-XXX-acs.md`, com IDs
`ADR-XXX-AC-NN`). Não escaneie documentos fora do que o mapa referencia, mesma regra
de navegação do `blueprintfy`.

Dentro desses documentos, o alvo mais produtivo de comparação são as **ACs** da(s) ADR(s)
— elas descrevem contrato/comportamento no nível de detalhe mais próximo do código
(campos, contrato de erro, idempotência). Os RF-/RNF- do PRD servem de contexto mais
amplo quando a AC não cobrir o que mudou. Use o glossário do `CONTEXT.md` para julgar
se um arquivo tocado no commit é relevante para este contexto — um arquivo tocado não é
automaticamente uma divergência; pode ser mudança não relacionada.

Monte uma lista curta de **candidatos a divergência**: cada um é um par
(trecho do código encontrado no Passo 2) ↔ (AC/RF/decisão da ADR que ele parece tocar).

## Passo 4 — Interrogatório implacável, antes de tocar em qualquer documento

Para cada candidato do Passo 3, não assuma qual lado está certo. Uma pergunta de cada
vez, no mesmo espírito do "entreviste sem descanso" do `blueprintfy`:

- **Apresente a tensão concreta**, nunca em abstrato: "a AC-3 da `ADR-012-acs.md` diz
  que cancelamento parcial não é permitido, mas o commit em
  `services/order/cancel.go` adiciona um branch para `partial=true` — isso é
  intencional?"
- **Force uma resposta específica**, não uma confirmação genérica: o código está à
  frente do doc (doc desatualizado), é um bug no código (doc está certo — mas esta
  skill não mexe no repositório externo, só sinaliza), ou é falso positivo (mudança não
  relacionada)?
- **Não pare na primeira resposta plausível.** Se a resposta abrir uma pergunta nova
  (ex.: "sim, é intencional" mas isso contradiz outra ADR vigente), continue
  perguntando até esgotar a dúvida — mesma disciplina que o `blueprintfy` aplica ao
  cruzar glossário com código.
- **Nunca vire isso um checkbox de "confirma tudo?"** — o usuário precisa se
  comprometer com o que mudou e por quê, um candidato de cada vez, antes de qualquer
  documento ser tocado.

## Passo 5 — Resultado da reconciliação: só edita com autorização, passagem por passagem

Só depois que cada linha do Passo 4 estiver resolvida, pergunte **explicitamente, uma
passagem de cada vez**, se o usuário autoriza atualizar o documento correspondente.
Nunca agrupe em um "ok, atualiza tudo" — mostre a mudança proposta ("mudar a AC-3 de X
para Y") e espere o sim antes de gravar. Se o usuário disser não para uma passagem
específica, não a toque — registre como discrepância aberta no resumo da sessão em vez
de deixá-la cair no silêncio.

Cada candidato termina em um destes destinos, sempre autorizado individualmente:

- **Atualizar uma AC/RF existente** para refletir o comportamento novo.
- **Registrar `supera:`** numa ADR nova se a divergência revela uma decisão que
  substitui a anterior (não edite a ADR antiga).
- **Criar uma ADR nova** se a reconciliação revelar uma decisão de arquitetura real que
  o código já tomou mas que nunca foi documentada — use o template/gerador de ID do
  próprio `blueprintfy` (`references/adr-template.md` dele) em vez de inventar um
  formato aqui, para não fragmentar a convenção do catálogo.
- **Nenhuma ação**, com a discrepância registrada como aceita/aberta — quando o usuário
  decide conscientemente não mexer em nada agora.

Toda edição segue o mesmo gate de criação/edição de documento do `blueprintfy` (alcance
a partir do `CONTEXT-MAP.md`, registro se faltar, validação do link) — não é um gate
novo, é o mesmo.

## Passo 6 — Atualize o harness `reconcile-map.yaml`

Depois que a sessão de reconciliação terminar — mesmo que parcial, com algumas
passagens autorizadas e outras deixadas em aberto — registre o resultado em
`reconcile-map.yaml`, na raiz do repo documental. Se o arquivo ainda não existir, criá-lo
pela primeira vez também passa pelo gate de criação de documento do `blueprintfy`:
como ele não é nem "Documentos de negócio (as-is)" nem "Planejamento (to-be)", proponha
ao usuário uma seção nova no `CONTEXT-MAP.md` (sugestão: `## Repositórios rastreados`)
na primeira vez que isso acontecer; depois disso é só manter a entrada em dia.

Formato completo, exemplos e o snippet de registro no mapa estão em
`references/reconcile-map-schema.md`. Atualize a entrada existente (por `repo` + `context`)
em vez de duplicar; crie uma entrada nova só para um par repositório↔contexto inédito.

## Arquivos de referência

- `references/reconcile-map-schema.md` — schema YAML completo de `reconcile-map.yaml`, exemplo
  com múltiplos repositórios/contextos, e o snippet de registro na seção
  `## Repositórios rastreados` do `CONTEXT-MAP.md`.
- `scripts/fetch-ref.sh` — clone raso e temporário de um `owner/repo`, num
  commit ou branch, roda o comando de inspeção pedido e sempre limpa o diretório
  temporário ao final (sucesso ou erro).
