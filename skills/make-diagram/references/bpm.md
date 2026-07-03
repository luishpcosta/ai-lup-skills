# BPM / fluxograma de processo (requisitos funcionais e não funcionais)

Para desenhar um **processo de negócio** (BPM) — passo a passo com decisões,
início/fim — **não use `diagrams.programming.flowchart`** (`Action`, `Decision`,
`StartEnd` etc., listados em `nodes-programming.md`). Essas classes são nós de
**ícone + legenda abaixo** (o mesmo estilo dos ícones de AWS/GCP): o texto fica
solto embaixo da forma, com um vão grande entre os dois, e o resultado parece
"flutuante"/desconectado — não como um fluxograma de verdade, onde o texto vive
**dentro** da forma.

Use, em vez disso, `Node` genérico (`from diagrams import Node`) com formas
puras do Graphviz e o texto como label — igual ao helper `Queue`/`User` do
`c4.md`, mas com `shape="oval"/"box"/"diamond"` no lugar de imagem custom.

## Formas e papéis

| Elemento do processo | `shape` | Papel |
|---|---|---|
| Início/Fim | `oval` | Eventos de início e término |
| Atividade/passo | `box` (`style="rounded,filled"`) | Um requisito funcional executável |
| Decisão/gateway | `diamond` | Ponto de ramificação (rotule as arestas de saída, ex. `sim`/`não`) |
| Requisito não funcional | `note` | Anotação — não faz parte do fluxo, só qualifica um passo |

## Armadilha: `fixedsize=true` por padrão

A lib `diagrams` define um `node_attr` global com `fixedsize=true` (via
`width`/`height` fixos ~1.4×1.4pol). Se você não sobrescrever isso, qualquer
label maior que a caixa **transborda visualmente** (efeito mais visível em
labels de várias linhas, como as notas de requisito não funcional). Sempre
inclua isso nos atributos de cada forma:

```python
BASE_ATTRS = {"fixedsize": "false", "width": "0", "height": "0"}
```

## Template

```python
from diagrams import Diagram, Edge, Node

graph_attr = {"splines": "ortho", "nodesep": "0.5", "ranksep": "0.5"}

BASE_ATTRS = {"fixedsize": "false", "width": "0", "height": "0", "fontsize": "12", "margin": "0.2,0.12"}
START_END = {**BASE_ATTRS, "shape": "oval", "style": "filled", "fillcolor": "darkseagreen2"}
ACTION = {**BASE_ATTRS, "shape": "box", "style": "rounded,filled", "fillcolor": "lightskyblue2"}
DECISION = {**BASE_ATTRS, "shape": "diamond", "style": "filled", "fillcolor": "bisque", "margin": "0.15,0.1"}
NFR = {**BASE_ATTRS, "shape": "note", "style": "filled", "fillcolor": "lightyellow", "fontsize": "11"}

def StartEnd(label): return Node(label, **START_END)
def Action(label): return Node(label, **ACTION)
def Decision(label): return Node(label, **DECISION)
def NonFunctional(label): return Node(label, **NFR)

def attach_nfr(step, *labels):
    for label in labels:
        step >> Edge(style="dashed", color="darkorange3", arrowhead="none",
                     constraint="false") >> NonFunctional(label)

with Diagram("Processo", direction="TB", graph_attr=graph_attr, show=False):
    inicio = StartEnd("Inicio")
    passo = Action("Executa requisito funcional X")
    gateway = Decision("Condicao atendida?")
    fim = StartEnd("Fim")

    inicio >> passo >> gateway >> Edge(label="sim") >> fim

    attach_nfr(passo, "Requisito nao funcional: ex. performance < 2s")
```

## Convenções

- **Requisitos funcionais** = o fluxo principal (`Action`/`Decision`/`StartEnd`
  conectados por `>>`). Cada `Action` é um requisito funcional executável; cada
  `Decision` é uma regra de negócio/condição.
- **Requisitos não funcionais** = notas (`NonFunctional`) presas ao passo que
  elas qualificam via `attach_nfr`, com aresta tracejada e `constraint="false"`
  (não força ranking/posição no fluxo principal — a nota fica ao lado, não no
  meio do caminho).
- Rotule sempre as arestas de saída de um `Decision` (`Edge(label="sim"/"não")`).
- Prefira `graph_attr={"splines": "ortho"}` neste tipo de diagrama — deixa as
  conexões das notas em ângulo reto, mais fácil de seguir visualmente do que
  splines curvas cruzando o diagrama.
- Múltiplos `Fim` (`StartEnd`) são normais — cada desfecho do processo (sucesso,
  cancelamento, recusa) termina no seu próprio nó.
