# Entrevista — os 9 campos

Ordem fixa. Uma pergunta por turno. Para cada campo: o que perguntar, por que ele existe,
o que aceita, o que rejeita, e um par bom/ruim.

O "rejeita" não é lista fechada de frases — é o **critério**. Você julga se a resposta
atende, porque o jeito de ser vago em português é infinito e nenhuma lista cobre.

---

## 1. Título

**Pergunte:** Como você chamaria esse case em uma linha?

**Por quê:** um dossiê com "Melhoria de performance" três vezes não navega.

- **Aceita:** nomeia o que foi feito e onde, de um jeito que distingue dos outros cases.
- **Rejeita:** categoria genérica que serviria pra qualquer case.

| Ruim | Bom |
|---|---|
| Melhoria de performance | Redução de timeout no checkout durante a Black Friday |

## 2. Squad / Papel

**Pergunte:** Qual squad, e qual era o seu papel nele nessa época?

**Por quê:** quem lê o dossiê pode não saber seu papel naquele momento — e "dev júnior" e
"tech lead" mudam completamente o peso da mesma ação.

- **Aceita:** squad + papel.
- **Rejeita:** só um dos dois.

| Ruim | Bom |
|---|---|
| Squad Checkout | Squad Checkout, como dev backend sênior |

## 3. Quando

**Pergunte:** Quando isso aconteceu? Mês ou trimestre, e ano.

**Por quê:** sem data ninguém cruza com sprint, release ou ticket — e um case sem data
parece evasivo mesmo quando não é.

- **Aceita:** mês/trimestre + ano.
- **Rejeita:** referência relativa ("recentemente", "ano passado", "faz um tempo").

| Ruim | Bom |
|---|---|
| Faz uns meses | Q4 2025 (novembro) |

## 4. Situation

**Pergunte:** Qual era a situação? O que estava acontecendo, em qual sistema ou processo,
afetando quem?

**Por quê:** é a base contra a qual o obstáculo e a ação são cobrados. Vaga aqui,
tudo depois fica sem chão.

- **Aceita:** sistema/processo nomeado, quem era afetado, o que estava em jogo.
- **Rejeita:** cenário genérico sem sujeito identificável.

| Ruim | Bom |
|---|---|
| Tínhamos um problema de performance. | O checkout do app dava timeout em ~8% das compras no pico, derrubando conversão. |

## 5. Obstacle

**Pergunte:** O que especificamente tornava isso difícil? Não a situação de novo — a
restrição real: técnica, de prazo, de dependência, de informação.

**Por quê:** é o campo que mais vira "era complicado". Sem ele, a ação parece trivial (e
o case não impressiona) ou parece mágica (e o case não convence).

- **Aceita:** uma restrição nomeada, diferente da situação.
- **Rejeita:** repetir a situação com outras palavras; adjetivo de dificuldade sem dizer
  a causa ("era complexo", "era corrido").

| Ruim | Bom |
|---|---|
| Era muito difícil de resolver. | Só reproduzia sob carga real de Black Friday, que não dava pra simular em staging, e a janela de deploy antes do pico era de 40 minutos. |

## 6. Action

**Pergunte:** O que **você** fez — não o time, você? Que decisão tomou, o que descartou,
e por quê?

**Por quê:** é o ponto central de um dossiê individual. "Nós" esconde exatamente o que
está sendo avaliado.

- **Aceita:** ação atribuível a ele, em qualquer construção ("eu implementei", "coube a
  mim", "assumi", "peguei pra mim", "fui eu quem"). Melhor ainda se disser o que
  **descartou** — mostra decisão, não só execução.
- **Rejeita:** só "nós"/"o time" sem separar a parte dele; verbo genérico que não
  descreve ação ("atuei", "participei", "dei suporte") sem dizer fazendo o quê.

| Ruim | Bom |
|---|---|
| Trabalhamos juntos pra resolver. | Eu identifiquei que o timeout vinha do lock otimista no estoque, propus lock pessimista só na janela de pico (descartei cache distribuído por não dar tempo de testar) e implementei o feature flag. |

**Cuidado com o falso conflito:** se ele descreve o time *e* a parte dele, está ótimo —
o objetivo é a contribuição ficar visível, não apagar o time.

## 7. Result

**Pergunte:** Qual foi o resultado? Número, antes/depois — e o impacto pra quem?

**Por quê:** "melhorou muito" não sobrevive a um "melhorou quanto?".

- **Aceita:** número que significa alguma coisa, com o impacto de quem se beneficiou. Ou,
  quando genuinamente não foi medido, `[sem métrica: <justificativa honesta>]`.
- **Rejeita:** adjetivo no lugar de medida; número decorativo que não mede o resultado
  ("fizemos 3 reuniões"); porcentagem impossível.

| Ruim | Bom |
|---|---|
| A performance melhorou bastante. | Timeout caiu de 8% para 0,3% das compras no pico, evitando perda estimada de R$ 40 mil em conversão. |
| | `[sem métrica: não medíamos a fila antes da mudança; o sinal é qualitativo — dois devs relataram menos retrabalho]` |

**Antes de aceitar a saída `[sem métrica: ...]`**, pergunte se existe dashboard, ticket ou
mensagem que mostre o antes. A saída é pra caso sem dado, não pra economizar a busca.

## 8. Evidência

**Pergunte:** Tem como comprovar depois? Link, ticket, PR, dashboard, print?

**Por quê:** numa banca, case sem evidência vira palavra contra palavra.

- **Aceita:** referência que alguém consegue abrir; ou a frase exata
  `sem evidência disponível`.
- **Rejeita:** "deve ter em algum lugar" — ou acha, ou declara que não tem.

| Ruim | Bom |
|---|---|
| Deve ter registro em algum lugar. | JIRA CHK-4213, PR #892, dashboard de conversão (print salvo) |

## 9. Aprendizado (opcional)

**Pergunte:** O que você faria diferente? (Pode pular.)

**Por quê:** numa avaliação, reflexão honesta costuma pesar mais que o resultado positivo
sozinho — mostra senioridade.

- **Aceita:** algo concreto que mudaria, ou pular.
- **Rejeita:** clichê ("aprendi muito com a experiência").

| Ruim | Bom |
|---|---|
| Aprendi bastante. | Testaria o feature flag com tráfego espelhado antes, em vez de confiar só no staging. |
