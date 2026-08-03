# Sinais de convenção de planejamento existente

Este roteiro é o detalhamento do Passo 1 do `SKILL.md`: como varrer o repositório-alvo
para chegar na entrevista do `blueprintfy` com uma hipótese, em vez de uma pergunta em
branco. É uma leitura leve — não abra e leia todo documento encontrado, só o suficiente
para formar a hipótese em cada eixo. Nenhum desses sinais nomeia uma ferramenta
específica de propósito: o que importa é o padrão observável em disco, porque o
`blueprintfy` pode estar sendo instalado num repo cuja estrutura de planejamento nasceu
de qualquer processo, formal ou informal.

## 1. Onde vivem os documentos de planejamento

Procure, a partir da raiz:

- Uma pasta de topo com múltiplas subpastas nomeadas por feature, contendo arquivos
  como `spec.md`, `plan.md`, `tasks.md`, `PRD*.md`, `ADR*.md`, `PRODUCT_BRIEF*.md` — o
  nome da pasta de topo varia (`specs/`, `docs/refinamento/`, `docs/planning/`,
  `docs/prds/`, `rfcs/`...); o que identifica o padrão é a repetição da mesma estrutura
  em múltiplas subpastas, não o nome da pasta em si.
- O padrão de nome de cada subpasta de feature: prefixo numérico (`001-`, `042-`),
  prefixo de data, ou só o slug da feature sem prefixo. Registre qual é — vira a
  hipótese para nomear a pasta de qualquer contexto novo do `blueprintfy`, se fizer
  sentido reaproveitar.
- Documentos soltos fora de pastas por feature (um `GLOSSARY.md`, um `docs/domain.md`
  único) — também contam como candidato a documento de negócio na pergunta do
  `blueprintfy` sobre isso, mesmo sem seguir o padrão de pastas acima.

Comando útil para o primeiro varrimento (ajuste a profundidade conforme o tamanho do
repo):

```
find . -maxdepth 4 -iregex '.*/\(spec\|plan\|tasks\|prd\|adr\|product.brief\)[^/]*\.md' -not -path '*/node_modules/*'
```

## 2. Idioma predominante

Olhe os nomes de arquivo/pasta e os títulos (primeira linha `#`) dos documentos
encontrados no eixo 1. Não é preciso ler o corpo inteiro — títulos e nomes de arquivo já
denunciam o idioma (`spec.md`/`plan.md`/`tasks.md` vs. `especificacao.md`/`plano.md`, ou
o conteúdo do H1). Se houver mistura, prefira o idioma que aparece na maioria dos
documentos mais recentes (`git log -1 --format=%cd -- <arquivo>` para desempate), e
sinalize a mistura ao usuário em vez de escolher silenciosamente.

## 3. Formato de ID já em uso

Olhe o começo dos nomes de arquivo ou o campo `id`/equivalente no front matter dos
documentos do eixo 1:

- Numérico sequencial simples: `001`, `PRD-002`.
- Data + hex, como `ADR-20260615-0930-a1f2-nome-da-decisao` (é o formato default deste
  catálogo para ADRs — se o repo já usa outra coisa, é a convenção do repo que vence).
- Slug puro, sem ID separado.

Se o repositório já tem um formato consolidado para specs/PRDs, é forte candidato a ser
também o formato de ID que o `blueprintfy` deveria propor para as ADRs que criar — leve
isso como sugestão explícita na pergunta correspondente do checklist dele, mas deixe o
usuário confirmar; o `blueprintfy` também pode ter razão para manter o formato dele
quando os dois tipos de documento não deveriam compartilhar numeração.

## 4. Arquivos-âncora de um fluxo de planejamento formal

A presença de qualquer um destes, na raiz ou perto dela, é sinal de que o repo já opera
com um processo estruturado — mesmo que nenhuma pasta de planejamento exista ainda:

- Um arquivo de princípios/invariantes do projeto (`constitution.md` ou equivalente).
- Um arquivo de instrução para agentes descrevendo fases/gates de um fluxo de
  planejamento (`AGENTS.md`, `CLAUDE.md`, ou similar, com seções tipo "Specify",
  "Plan", "Tasks", "Verify").
- Um `progress.md` (ou nome equivalente) de continuidade de sessão.
- Um script de verificação de bootstrap/inicialização (`init.sh` ou equivalente),
  citado pelo arquivo de instrução acima.

Encontrar esses arquivos não substitui nenhuma pergunta do checklist do `blueprintfy` —
só aumenta a confiança da hipótese nos eixos 1-3 e é um bom motivo para mencionar ao
usuário que o repo já tem um fluxo de planejamento formal, então o `CONTEXT-MAP.md`
deveria linkar para ele em vez de duplicá-lo.

## Se nada for encontrado

Ausência de sinais nos quatro eixos não é um problema a reportar — é simplesmente um
repositório greenfield nesse eixo. Não invente uma convenção para "preencher a
lacuna": deixe o `blueprintfy` decidir a estrutura do zero com o usuário, como faria sem
o Codefy.
