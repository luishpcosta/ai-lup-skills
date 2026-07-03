# Guia da lib `diagrams` (mingrammer/diagrams)

Resumo prático da API. Fonte: docs oficiais (getting-started e guides).

## Requisitos

- Python 3.7+
- **Graphviz** instalado no sistema (a lib usa o binário `dot` para renderizar)
- `pip install diagrams`

## Diagram (contexto global)

```python
from diagrams import Diagram

with Diagram("Nome do Diagrama", show=False):
    ...
```

Parâmetros úteis do construtor:

| Parâmetro | Default | Uso |
|---|---|---|
| 1º arg (`name`) | — | Título do diagrama; também gera o nome do arquivo (snake_case) |
| `filename` | derivado do name | Nome do arquivo de saída **sem extensão** |
| `outformat` | `"png"` | `png`, `jpg`, `svg`, `pdf`, `dot` — aceita lista para múltiplas saídas |
| `show` | `True` | **Sempre use `show=False`** em ambiente headless/CI (evita tentar abrir a imagem) |
| `direction` | `"LR"` | Fluxo: `TB`, `BT`, `LR`, `RL` |
| `graph_attr` / `node_attr` / `edge_attr` | — | Dicts com atributos Graphviz (ex.: `{"fontsize": "45", "bgcolor": "transparent"}`) |

O arquivo é salvo no **diretório de trabalho atual** (cwd) do processo Python — para
controlar onde o PNG é salvo, rode o script a partir do diretório desejado ou use
`filename` com caminho.

## Nós e fluxo de dados

Um nó = provider + tipo de recurso + classe. Conecte com operadores:

- `>>` — esquerda para direita
- `<<` — direita para esquerda
- `-` — sem direção (cuidado com precedência: use parênteses ao misturar com `>>`/`<<`)

```python
ELB("lb") >> EC2("web") >> RDS("userdb")
```

Listas conectam vários nós de uma vez (fan-out/fan-in), mas **não é possível
conectar duas listas diretamente** (limitação de operadores do Python):

```python
ELB("lb") >> [EC2("w1"), EC2("w2"), EC2("w3")] >> RDS("events")
```

A ordem de renderização é o inverso da ordem de declaração.

## Cluster (agrupamento)

```python
from diagrams import Cluster

with Cluster("DB Cluster"):
    primary = RDS("primary")
    primary - [RDS("replica1"), RDS("replica2")]
```

Clusters podem ser aninhados sem limite de profundidade. Nós dentro do cluster
podem se conectar a nós de fora — guarde a referência em variável.

## Edge (arestas com rótulo/cor/estilo)

```python
from diagrams import Edge

metrics << Edge(color="firebrick", style="dashed", label="collect") << Grafana("monitoring")
grpcsvc >> Edge(color="brown") >> primary
```

Atributos: `label`, `color`, `style` (`dashed`, `dotted`, `bold`), além de
atributos Graphviz arbitrários (`minlen`, `headport`...).

Para reduzir poluição visual em diagramas densos:
- Use um nó em branco como ponto de junção: `Node("", shape="plaintext", width="0", height="0")`
- Ou `graph_attr={"concentrate": "true", "splines": "spline"}` para mesclar arestas

## Nó customizado (ícone próprio)

```python
from diagrams.custom import Custom
queue = Custom("Message queue", "./rabbitmq.png")  # caminho para imagem local
```

## Execução

```shell
python diagrama.py          # gera o arquivo no cwd
diagrams d1.py d2.py        # CLI processa vários arquivos
```

## Mapeando Mermaid → diagrams

Quando o usuário fornecer um flowchart Mermaid:

| Mermaid | diagrams |
|---|---|
| `graph TD` / `flowchart TB` | `Diagram(..., direction="TB")` |
| `graph LR` | `direction="LR"` (default) |
| `A --> B` | `a >> b` |
| `A --- B` | `a - b` |
| `A -->\|label\| B` | `a >> Edge(label="label") >> b` |
| `subgraph Nome ... end` | `with Cluster("Nome"):` |
| Nó `A[Web Server]` | Escolha a classe mais próxima do provider (ex.: `EC2("Web Server")`) |

O texto do nó Mermaid indica **o quê** o componente é — traduza para a classe do
provider certo (veja os arquivos `nodes-*.md`), mantendo o texto como label.
