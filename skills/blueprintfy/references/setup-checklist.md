# Checklist de setup inicial (Modo 1)

Este roteiro só roda quando o repositório ainda não tem `CONTEXT.md`/`CONTEXT-MAP.md`
e o usuário quer estabelecer a base do modelo de domínio — não em toda conversa. Se já
existe glossário, vá direto para o Modo 2 do `SKILL.md`.

## 1. Pergunte, não assuma

Faça as três perguntas do checklist **uma de cada vez**, na ordem abaixo — a ordem
importa porque cada resposta muda o que fazer na próxima etapa.

### Pergunta 1 — Documentos de negócio

"Já existem documentos de negócio escritos sobre este projeto? (PRDs, briefings,
specs, RFCs, atas de decisão, tickets longos)"

- **Sim** → peça o(s) caminho(s) ("onde eles estão? uma pasta, um link, arquivos
  soltos?").
- **Não** → não force a busca. Pule para o Modo 2 e deixe o glossário nascer da
  conversa.

### Pergunta 2 — ADRs existentes

"Já existem decisões arquiteturais registradas (ADRs) neste repositório?"

- **Sim** → peça o caminho. Se o repo já usa uma convenção própria (pasta e formato
  diferentes de `adr/ADR-<id>-titulo.md`), **respeite a convenção existente** em vez
  de forçar a deste catálogo — o objetivo é não fragmentar o histórico de decisões do
  projeto.
- **Não** → nenhuma ação; a primeira ADR será criada organicamente quando (e se)
  surgir uma decisão que qualifique, seguindo `adr-template.md`.

### Pergunta 3 — Múltiplos contextos

Antes de perguntar, dê uma primeira leitura na estrutura do repo (pastas de topo em
`src/`, múltiplos serviços num monorepo, múltiplos `package.json`/`go.mod` etc.) para
chegar com uma hipótese, não uma pergunta em branco:

"Percebi [sinais concretos, ex.: `src/ordering` e `src/billing` com times/deploys
separados] — isso sugere contextos separados. Isso está certo, ou é tudo um domínio
só?"

Se os sinais estruturais forem fracos ou ambíguos, pergunte diretamente sem propor
hipótese. **Nunca decida sozinho** entre `CONTEXT.md` único e `CONTEXT-MAP.md` — essa
escolha define onde tudo vai morar dali em diante e é cara de desfazer depois.

## 2. Se houver documentos de negócio: escaneie e proponha rascunho

1. Leia os documentos indicados.
2. Extraia candidatos a termos de domínio — substantivos que aparecem repetidamente e
   carregam significado específico do negócio (não conceitos técnicos genéricos; ver
   regra em `context-format.md`).
3. Para cada termo candidato, monte uma definição curta (1-2 frases) baseada no que o
   documento diz — não invente comportamento que o texto não sustenta.
4. Apresente o rascunho **termo a termo** ao usuário antes de gravar qualquer arquivo:
   ```
   Rascunho de CONTEXT.md a partir de <documento>:

   **Order**: <definição extraída>
   **Invoice**: <definição extraída>

   Isso bate com o que vocês usam? Algum termo faltando, errado ou que deveria virar
   "Evitar" de outro?
   ```
5. Só grave `CONTEXT.md` (ou o `CONTEXT.md` de cada contexto, se multi-contexto) depois
   da confirmação. Nunca escreva o arquivo direto a partir da extração automática —
   documentos de negócio usam a linguagem de quem escreveu, que nem sempre é a
   linguagem que o time quer canonizar no código.

## 3. Se houver ADRs existentes: leia e resuma

1. Leia as ADRs indicadas.
2. Resuma as decisões já tomadas que têm relação com fronteiras de contexto ou
   linguagem onipresente (não precisa resumir toda ADR técnica que não toca em
   modelagem de domínio).
3. Se alguma decisão já registrada conflita com a estrutura de contexto que está sendo
   proposta na Pergunta 3, traga isso à tona antes de seguir — é o mesmo tipo de
   contradição que o Modo 2 aponta ao cruzar glossário com código.

## 4. Decida a estrutura e crie os arquivos

- **Contexto único** → crie `CONTEXT.md` na raiz com os termos confirmados. Parta do
  esqueleto em `assets/CONTEXT.md.template`.
- **Múltiplos contextos** → crie `CONTEXT-MAP.md` **na raiz** listando os contextos
  identificados e como se relacionam (ver formato em `context-format.md`, esqueleto em
  `assets/CONTEXT-MAP.md.template`), e um `CONTEXT.md` por contexto com os termos que
  pertencem a ele. O `CONTEXT.md` de cada contexto pode viver onde o repo preferir
  (`src/<contexto>/`, `docs/<dominio>/<contexto>/`...) — pergunte ao usuário onde
  cada um deve morar; é o mapa que registra o caminho.
- **Registre no mapa os documentos que já existem** → se as Perguntas 1 e 2
  identificaram documentos de negócio (as-is) e/ou pastas de planejamento to-be
  (PRDs/ADRs/SPECs de SDD), adicione-os às seções opcionais **Documentos de negócio
  (as-is)** e **Planejamento (to-be)** do `CONTEXT-MAP.md`. A partir daí valem as
  regras de navegação de `context-format.md`: o mapa é o único ponto de entrada, e
  documentos fora do mapa são ignorados nas sessões seguintes — por isso, confirme
  com o usuário o que entra e o que fica de fora.

Se nenhum documento de negócio nem ADR existia, não crie nada ainda neste passo —
os arquivos nascem no Modo 2, no momento em que o primeiro termo/decisão for
resolvido em conversa.

## 5. Transição para o Modo 2

Depois do setup (com ou sem documentos existentes), a sessão continua no Modo 2:
entrevista implacável + manutenção ativa do glossário/ADRs conforme a conversa avança.
