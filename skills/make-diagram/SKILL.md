---
name: make-diagram
description: >-
  Gera diagramas de arquitetura como imagem (PNG) usando a lib Python `diagrams`
  (mingrammer) + Graphviz, a partir de uma descrição em texto ou de um flowchart
  Mermaid. Cobre AWS, Kubernetes, C4, GCP, Azure, on-premises e mais. Use sempre
  que o usuário pedir para desenhar, criar, gerar ou converter um diagrama de
  arquitetura, infraestrutura, cloud, deployment ou topologia — inclusive quando
  ele disser apenas "desenha essa arquitetura", "gera um diagrama disso", colar
  um Mermaid pedindo imagem, ou pedir um diagrama C4/AWS/K8s do sistema.
metadata:
  language: agnostic
  tags: [diagrams, architecture, aws, kubernetes, c4, python, graphviz]
---

# make-diagram

Transforma a descrição de uma arquitetura (texto livre ou Mermaid) em um diagrama
renderizado (PNG por padrão) usando a lib Python [`diagrams`](https://diagrams.mingrammer.com)
com ícones oficiais dos providers. Foco principal: **AWS**, **Kubernetes** e **C4**.

## Fluxo de trabalho

### 1. Entenda a arquitetura

Extraia da mensagem do usuário: os componentes, como se conectam (direção do fluxo),
agrupamentos (VPCs, namespaces, camadas, boundaries) e rótulos relevantes.

- **Texto livre**: identifique cada componente e mapeie para a classe de nó mais
  específica do provider (ex.: "load balancer na AWS" → `ELB`; "fila" → `SQS`).
- **Mermaid**: use a tabela de conversão em `references/library-guide.md`
  (seção "Mapeando Mermaid → diagrams"): `subgraph` → `Cluster`, `-->` → `>>`,
  rótulos de aresta → `Edge(label=...)`.

Se a descrição for ambígua em algo estrutural (ex.: não dá para saber se é AWS ou
on-premises, ou o sentido de um fluxo), pergunte antes de gerar — um diagrama
errado custa mais que uma pergunta.

### 2. Escolha o estilo e leia a referência certa

| Pedido do usuário | Referência a ler |
|---|---|
| Arquitetura AWS | `references/nodes-aws.md` |
| Kubernetes / K8s / cluster | `references/nodes-k8s.md` |
| C4 / contexto / container diagram | `references/c4.md` |
| BPM / fluxograma / processo de negócio / requisitos funcionais e não funcionais | `references/bpm.md` (não use `diagrams.programming.flowchart` — ver aviso em `nodes-programming.md`) |
| GCP / Azure | `references/nodes-gcp.md` / `references/nodes-azure.md` |
| On-premises / open-source (nginx, kafka, postgres...) | `references/nodes-onprem.md` |
| Genéricos, linguagens, SaaS, Elastic | `references/nodes-generic.md`, `nodes-programming.md`, `nodes-saas.md`, `nodes-elastic.md` |

Leia **apenas** os arquivos do(s) provider(s) envolvido(s). Arquiteturas mistas são
normais (ex.: EKS na AWS + nós k8s + Postgres onprem) — combine providers no mesmo
diagrama. Se um componente não tiver classe específica, use um nó de
`nodes-generic.md` ou `diagrams.custom.Custom` com um ícone.

Leia também `references/library-guide.md` se ainda não conhecer a API
(`Diagram`, `Cluster`, `Edge`, operadores `>>`/`<<`/`-`).

### 3. Verifique as dependências

Rode:

```bash
python3 <caminho-da-skill>/scripts/generate_diagram.py --check-only
```

Se faltar algo, o script imprime os comandos de instalação (`pip install diagrams`,
`apt-get install graphviz`...). Ofereça-se para instalar e rode os comandos com o
consentimento do usuário; depois repita o check.

### 4. Pergunte onde salvar

**Sempre pergunte ao usuário onde salvar a imagem antes de gerar**, sugerindo a
raiz do projeto como padrão. Exemplo: "Vou salvar o PNG na raiz do projeto
(`./nome_do_diagrama.png`). Pode ser, ou prefere outro local?" Se o usuário já
tiver dito o local no pedido, use-o sem perguntar de novo.

### 5. Escreva o código do diagrama

Crie um arquivo `<slug>_diagram.py` no mesmo diretório escolhido para a imagem
(assim o usuário pode ajustar e regenerar). Regras que evitam os erros mais comuns:

- Use **sempre `show=False`** (ambiente sem display trava/abre janela).
- Importe apenas classes que existem nos arquivos `nodes-*.md` — não invente nomes;
  na dúvida, confira a referência.
- Título do `Diagram` legível ("Pipeline de Eventos"); use `filename` se precisar
  controlar o nome do arquivo.
- `direction="TB"` costuma ficar melhor para hierarquias (K8s, C4); `LR` (default)
  para pipelines.
- Agrupe com `Cluster` o que o usuário descreveu como agrupado (VPC, namespace,
  "camada de serviços"); guarde nós em variáveis para conectar dentro/fora.
- Duas listas não se conectam diretamente (`[a,b] >> [c,d]` é inválido) — conecte
  via nó intermediário ou em passos.
- Rotule fluxos importantes com `Edge(label=...)`; em C4 use `Relationship`.
- Em C4, nós com `description` precisam de caixa maior (`width="3.9", height="2.1"`)
  ou o texto transborda — veja "Tamanho dos nós" em `references/c4.md`.

### 6. Gere e confira

```bash
python3 <caminho-da-skill>/scripts/generate_diagram.py <slug>_diagram.py --output-dir <local-escolhido>
```

O script executa o arquivo e lista as imagens geradas. Depois:

1. Confirme que o PNG existe no local combinado e informe o caminho ao usuário.
2. Se possível, visualize a imagem gerada (ferramenta de leitura de imagem) e
   confira se os componentes e conexões batem com o pedido antes de entregar.
3. Se o usuário pedir ajustes (cores, direção, agrupamento), edite o `.py` e
   regenere — o arquivo fica salvo justamente para isso.

## Exemplo mínimo (AWS)

```python
from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB, Route53

with Diagram("Web Service", show=False):
    dns = Route53("dns")
    lb = ELB("lb")

    with Cluster("Services"):
        svcs = [ECS("web1"), ECS("web2")]

    dns >> lb >> svcs >> RDS("userdb")
```

## Estrutura da skill

- `scripts/generate_diagram.py` — checa dependências e executa o diagrama no diretório certo
- `references/library-guide.md` — API da lib + tabela Mermaid → diagrams
- `references/c4.md` — modelo C4: classes, convenções, fila horizontal (mensageria), ícone de pessoa e exemplo completo
- `references/bpm.md` — fluxograma de processo (BPM) com formas puras (texto dentro da forma) e notas de requisito não funcional; explica por que evitar `diagrams.programming.flowchart`
- `assets/c4_queue.png` — cilindro horizontal para nós de fila/broker em C4 (ver c4.md)
- `assets/c4_user.png` — ícone de usuário/ator para nós `Person` em C4 (ver c4.md; usa `PERSON_SIZE` própria — mesma altura de `C4_SIZE`, largura ajustada à proporção do ícone — para não distorcer)
- `references/nodes-<provider>.md` — todas as classes de nós por provider (aws, k8s, gcp, azure, onprem, generic, programming, saas, elastic)
