# Método de Grilling

## Por que "grilling"

Quem escreve o próprio case tende a suavizar: "ajudei o time", "melhorei a
performance", "foi um sucesso". Cada frase dessas parece informativa e não é —
não sobrevive a uma pergunta de acompanhamento ("o que exatamente você fez?",
"quanto melhorou?", "quem mais participou?"). O estilo de grilling do Mat Pocock
(conhecido por interrogar afirmações imprecisas até sobrar só o que é
verificável) existe pra isso: a entrevista não aceita a primeira formulação,
ela empurra até a resposta virar algo que resiste à pergunta seguinte.

A diferença para uma entrevista comum é que aqui isso é **mecânico**: um
validador roda contra o texto e recusa, com o motivo — o modelo não precisa
"lembrar" de ser rigoroso a cada resposta, o que importa porque num modelo mais
leve essa disciplina é exatamente o que se perde no meio de uma conversa longa.

## As quatro coisas que o grilling sempre cobra

### 1. Especificidade — nada de discurso corporativo

`isVagueClaim` mantém um banco de frases genéricas ("melhorei a performance",
"trouxe valor", "ajudei o time", "foi um sucesso"...). Qualquer uma delas é
recusada — não porque a frase seja falsa, mas porque não diz nada que outra
pessoa não pudesse copiar e colar em qualquer case.

| Vago (recusado) | Específico (aceito) |
|---|---|
| Melhorei a performance do sistema. | Reduzi o P95 de latência do endpoint de checkout de 800ms para 120ms trocando uma query N+1 por uma view materializada. |
| Ajudei o time a entregar com qualidade. | Escrevi os testes de regressão que pegaram o bug de arredondamento antes do deploy. |

### 2. Propriedade — o que VOCÊ fez, não o time

`hasFirstPersonOwnership` (só no campo Action) exige um verbo em primeira
pessoa (decidi, implementei, propus, liderei...) e recusa quando a frase só
usa "nós"/"o time"/"a squad" sem separar a parte da pessoa. Isso não é sobre
apagar o time do case — é sobre não deixar a contribuição individual invisível
atrás do "nós", que é exatamente o problema quando esse case vai virar
evidência de avaliação/promoção individual.

| Sem dono (recusado) | Com dono (aceito) |
|---|---|
| Nós resolvemos o problema de timeout. | Eu identifiquei que o timeout vinha do lock otimista, propus a troca pra lock pessimista só na janela de pico (descartei cache distribuído por não dar tempo de testar) e implementei o feature flag. |
| A squad decidiu migrar pro novo serviço. | Eu desenhei o plano de migração em três fases e liderei a primeira, que reduziu o risco de rollback total. |

Repare que a versão aceita também nomeia o que foi **descartado** — não é
obrigatório, mas é o tipo de detalhe que separa um case genérico de um
verificável: mostra que houve decisão, não só execução.

### 3. Prova — número ou justificativa honesta, nunca "melhorou muito"

`hasMetricOrExplicitQualitative` (no campo Result) exige um número — percentual,
antes/depois, tempo, dinheiro — ou a válvula de escape explícita
`[sem métrica: <justificativa honesta>]` quando genuinamente não existe uma. A
válvula existe porque forçar uma métrica inventada é pior do que admitir que
não foi medido; mas ela só funciona se for realmente honesta.

| Sem prova (recusado) | Com prova (aceito) |
|---|---|
| A performance melhorou bastante. | Timeout caiu de 8% para 0.3% das compras no pico da Black Friday. |
| O time ficou mais produtivo. | `[sem métrica: não medimos throughput antes da mudança — o sinal que temos é qualitativo: dois devs relataram menos retrabalho]` |

### 4. Data e obstáculo verificáveis

`hasTimeframe` recusa "recentemente"/"há um tempo" e exige mês/trimestre + ano.
`isConcreteObstacle` recusa um obstáculo que só repete a situação com outras
palavras, ou que usa um motivo genérico ("era complicado", "faltou tempo") sem
nomear a restrição real por trás — o mesmo espírito da especificidade, aplicado
à pergunta "por que isso não era trivial".

## O que a válvula de escape NÃO é

`[sem métrica: ...]` e `sem evidência disponível` existem para casos reais sem
dado, não para escapar do trabalho de achar o dado. Antes de usar a válvula,
pergunte: existe um dashboard, um ticket, uma mensagem que confirme isso? Só
depois de checar é que a resposta honesta é "não existe" — e aí sim, registre
assim, sem inventar.

## A regra das duas rodadas

Depois de duas recusas na mesma pergunta, a terceira resposta é aceita mesmo
que ainda falhe o grilling — mas marcada `[NÃO VERIFICADO: <motivo>]`, e isso
aparece tanto no campo quanto no cabeçalho do case renderizado
(`**Verificação:** parcialmente verificado`). A entrevista nunca trava
indefinidamente; ela só deixa de fingir que algo foi verificado quando não foi.

## Extração de notas cruas

`extract.mjs` roda a mesma bateria de validadores sobre candidatas tiradas de
um texto colado, sem nenhuma pergunta — é heurística de palavra-chave, então
erra em ambos os sentidos (classifica errado, ou deixa "não classificado"). O
contrato importante não é a precisão da classificação, é que **nenhuma
candidata desaparece**: toda linha aparece no relatório, `OK` ou `DESCARTADO`
com motivo, para o usuário decidir — o script nunca filtra silenciosamente.
