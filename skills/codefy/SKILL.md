---
name: codefy
description: "Ponto de entrada estável para qualquer solicitação de modelagem de domínio num repositório de aplicação, repassando sempre para o blueprintfy. Antes do CONTEXT-MAP.md existir, prepara o terreno para o bootstrap (Modo 1): lê as convenções que o repositório já usa — idioma dos documentos, formato de ID, onde vivem specs/PRDs/ADRs/planejamento — para que a entrevista de bootstrap não comece de uma folha em branco. Depois que o CONTEXT-MAP.md já existe, continua sendo o ponto de entrada: repassa direto para o Modo 2 do blueprintfy qualquer pedido de modelagem contínua (glossário, ADR, estressar uma decisão), sem repetir a varredura de convenções. Nunca substitui a entrevista do blueprintfy em nenhum dos dois modos. Cobra a instalação da skill blueprintfy no repositório-alvo se ela ainda não estiver presente, e não segue sem ela. Use sempre que o usuário, a partir de um repositório de aplicação, pedir para 'configurar o blueprintfy nesse repo', 'começar a modelagem de domínio aqui', 'criar o CONTEXT-MAP.md', ou fizer qualquer pedido de modelagem de domínio contínua — 'isso é uma Order ou uma Invoice mesmo?', 'vamos estressar essa decisão', 'preciso alinhar a linguagem do domínio' — mesmo sem citar 'blueprintfy', 'CONTEXT-MAP' ou 'bootstrap' explicitamente."
metadata:
  language: agnostic
  tags: [ddd, sdd, bootstrap, domain-modeling, blueprintfy, orchestration, relay]
---

# Codefy

Codefy é uma camada fina entre o usuário de um repositório de aplicação e o
`blueprintfy`: não modela domínio, não escreve `CONTEXT.md`, não decide ADR — isso
continua sendo sempre trabalho do `blueprintfy`, em qualquer um dos seus modos. O
papel de Codefy é ser o ponto de entrada estável: qualquer solicitação de modelagem de
domínio, bootstrap ou contínua, passa por ele antes de chegar ao `blueprintfy`.

- **Antes do `CONTEXT-MAP.md` existir** — Codefy prepara o terreno para o **Modo 1
  (bootstrap)**: chega na entrevista já com uma leitura da estrutura de planejamento
  que o repositório usa (nomenclatura, idioma, onde vivem specs/PRDs/ADRs), para que
  as perguntas do checklist — e as decisões de pasta/nome que vêm depois — não
  comecem de uma folha em branco nem introduzam uma convenção nova ao lado de uma
  que já existe. Pense nisso como o mesmo movimento que o `blueprintfy` já faz na
  própria Pergunta 3 do Modo 1 ("percebi `src/ordering` e `src/billing`, isso sugere
  contextos separados — confere?") — só que aplicado à estrutura de planejamento em
  vez de à estrutura de bounded contexts.
- **Depois que o `CONTEXT-MAP.md` já existe** — Codefy repassa a solicitação direto
  para o **Modo 2 (sessão contínua)** do `blueprintfy`, sem repetir a varredura de
  convenções (ela só faz sentido uma vez, no bootstrap). Ver "Relay contínuo" abaixo.

## Quando isso roda

Codefy roda sempre que o usuário, a partir de um repositório de aplicação, pedir
qualquer coisa relacionada a modelo de domínio. A diferença entre os dois cenários é
só qual modo do `blueprintfy` recebe o repasse:

- **Sem `CONTEXT-MAP.md` na raiz** → modo bootstrap (Passos 0–3 abaixo).
- **Com `CONTEXT-MAP.md` na raiz** → modo relay (ver "Relay contínuo" abaixo) — não
  rode os Passos 1–3, eles são específicos do bootstrap.

## Passo 0 — Garanta que o `blueprintfy` está instalado

Codefy não duplica a lógica do `blueprintfy` — ele só o orienta, então não funciona sem
ele instalado no repositório-alvo. Procure, nesta ordem, a partir da raiz do repo:

1. `.claude/skills/blueprintfy/SKILL.md`
2. `.agents/skills/blueprintfy/SKILL.md`

Se não encontrar nenhum dos dois, **pare aqui** e peça para o usuário instalar antes de
continuar:

```
lup-skills add blueprintfy
```

Explique brevemente por quê: Codefy nunca modela domínio sozinho, seja no bootstrap
ou depois — sem o `blueprintfy` instalado não há quem faça a entrevista em si. Não
tente reproduzir o comportamento dele de memória nem prosseguir sem ele — depois de
instalado, retome do Passo 1 (bootstrap) ou do relay (ver "Relay contínuo" abaixo).

## Passo 1 — Leia como o repo já organiza planejamento, antes de perguntar

Antes de abrir a entrevista do Modo 1, faça uma varredura rápida e leve do repositório à
procura de sinais de que já existe uma convenção de planejamento (specs, PRDs, ADRs,
constituição de projeto, glossários, etc.) — **independente de qual ferramenta a criou**.
O objetivo não é adivinhar por adivinhar: é chegar com uma hipótese concreta para
apresentar ao usuário, do mesmo jeito que o `blueprintfy` já faz para bounded contexts.
Ver `references/sinais-de-convencao.md` para a lista completa de onde procurar e como
formular a hipótese. Resumindo os quatro eixos:

- **Onde vivem os documentos de planejamento** — pasta raiz (`specs/`, `docs/refinamento/`,
  `docs/planning/` ou outra) e o padrão de nome de pasta por feature (`NNN-slug`, slug
  puro, datado etc.).
- **Idioma predominante** nesses documentos e nos nomes de arquivo/pasta (inglês vs.
  português, ou outro) — não misture um padrão novo no idioma errado.
- **Formato de ID** já em uso para specs/PRDs/ADRs (numérico sequencial, data+hex, slug
  puro) — se existir um, é isso que qualquer documento novo do `blueprintfy`
  (CONTEXT-MAP, ADRs) deveria imitar em vez de usar o formato default do catálogo.
- **Arquivos-âncora de um fluxo de planejamento formal** (algo como `constitution.md`,
  `AGENTS.md`/`CLAUDE.md` descrevendo fases, `progress.md`, um script de verificação tipo
  `init.sh`) — sinal forte de que o repo já opera com processo estruturado, mesmo que
  nenhum ADR/glossário exista ainda.

Se nada disso for encontrado, não force uma hipótese — é um repo genuinamente greenfield
nesse eixo, e o `blueprintfy` decide a estrutura do zero com o usuário, normalmente.

## Passo 2 — Repasse a entrevista do Modo 1 do `blueprintfy`, não a substitua

Leia o `SKILL.md` do `blueprintfy` encontrado no Passo 0 e siga o roteiro dele (o
checklist referenciado a partir do próprio `SKILL.md` dele) normalmente — as perguntas
continuam sendo feitas ao usuário, uma de cada vez, com resposta recomendada, exatamente
como o `blueprintfy` já pede. A diferença é só a qualidade da hipótese que Codefy
oferece antes de cada uma:

- Se o Passo 1 encontrou documentos de negócio/specs/PRDs, chegue na pergunta sobre
  documentos de negócio já com o caminho em mãos ("achei `specs/` com specs, PRDs e
  ADRs — é isso que você quer dizer com documentos de negócio, ou tem outra coisa?") em
  vez de perguntar às cegas.
- Se encontrou ADRs com uma convenção própria (pasta e formato diferentes do padrão
  default do catálogo), leve isso para a pergunta sobre ADRs e proponha manter a
  convenção existente — é a própria regra do `blueprintfy` ("respeite a convenção
  existente"); Codefy só garante que a informação chegue pronta.
- Isso vale igual em repositório **greenfield** (nada documentado ainda — a resposta
  natural tende a ser "não" em tudo, e o roteiro do `blueprintfy` pula direto para o
  Modo 2) e **brownfield** (código em produção com documentação espalhada). Codefy não
  decide qual cenário é o do repo; ele só chega com sinais melhores para qualquer um dos
  dois. **Nunca pule uma pergunta do checklist do `blueprintfy` porque Codefy "já sabe a
  resposta"** — proponha a resposta, não a assuma no lugar do usuário.

## Passo 3 — Alinhe nomenclatura e local ao criar os arquivos

Quando o `blueprintfy` chegar na etapa de decidir a estrutura e criar os arquivos,
garanta que a proposta de pasta/nome/idioma para `CONTEXT-MAP.md`, para o `CONTEXT.md`
de cada contexto e para as ADRs segue o que o Passo 1 detectou — inglês se o resto do
repo é em inglês, `NNN-slug` se é o padrão de pasta que as specs já usam, e assim por
diante — sempre como sugestão a confirmar com o usuário, nunca como decisão automática.
Se o repo já tem uma pasta de planejamento to-be (specs/PRDs/ADRs), sugira registrar
esse caminho na seção correspondente do `CONTEXT-MAP.md`, como o próprio checklist do
`blueprintfy` já prevê para documentos existentes.

## Relay contínuo (depois que o `CONTEXT-MAP.md` existe)

Assim que o `CONTEXT-MAP.md` existir na raiz (com ou sem contextos populados), o
bootstrap terminou — mas Codefy continua sendo o ponto de entrada em sessões futuras
do mesmo repositório. A partir daqui:

- Não rode os Passos 1–3 de novo: a varredura de convenções (idioma, formato de ID,
  onde vivem os documentos) só faz sentido uma vez, no bootstrap. O `CONTEXT-MAP.md`
  e o `CONTEXT.md` de cada contexto já registram a convenção vigente.
- Repasse a solicitação do usuário direto para o **Modo 2** do `blueprintfy` (leia o
  `SKILL.md` dele e siga o roteiro do Modo 2 normalmente) — glossário, ADR, estressar
  uma decisão, o que for. Codefy não decide nem participa do mérito da modelagem;
  ele só garante que o pedido chegue ao `blueprintfy`.
- Continue confirmando que o `blueprintfy` está instalado (Passo 0) antes de repassar
  — a instalação pode ter sido removida entre sessões.

Não há mais "fim do trabalho": Codefy é invocado a cada nova solicitação de modelagem
de domínio nesse repositório, bootstrap ou não.

## Arquivos de referência

- `references/sinais-de-convencao.md` — onde procurar sinais de convenção de
  planejamento existente (pastas, idioma, formato de ID, arquivos-âncora) e como
  transformar isso numa hipótese concreta para as perguntas do `blueprintfy`.
