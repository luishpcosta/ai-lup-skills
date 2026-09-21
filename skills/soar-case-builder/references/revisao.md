# Revisão — pontos fortes, pontos fracos, nova rodada

A validação por script já passou: o arquivo está bem formado. Isso não diz nada sobre ele
ser **bom**. Esta etapa é a que julga o conteúdo.

## A regra que faz a revisão valer

**Julgue o arquivo como quem nunca ouviu a entrevista.** Quem vai ler o dossiê — gestor,
comitê de promoção, entrevistador — não estava na conversa.

Por isso o caminho padrão é **rodar esta revisão num contexto limpo**, recebendo só o
caminho do arquivo e esta rubrica. Quem conduziu a entrevista é revisor ruim por
construção: o cérebro completa as lacunas com o que foi dito e não registrado, e "tente
esquecer o que você sabe" não é uma instrução que funciona de verdade. Contexto limpo
transforma isso em fato em vez de força de vontade.

**Se você recebeu só o arquivo:** ótimo, é assim que tem de ser. Não peça o histórico da
entrevista — a falta dele é o instrumento de medida, não uma lacuna a preencher.

**Se você está revisando o que você mesmo escreveu** (não havia subagente disponível):
pergunte de cada frase *"como eu sei disso, olhando só este arquivo?"*. Resposta "porque
ele me contou na conversa" = fraqueza. Seja mais duro que o normal para compensar o viés
que você sabe que tem.

## O que procurar

### Pontos fortes — o que sustenta uma repergunta

Não é elogio genérico. Um ponto forte é um lugar do case que **aguenta a próxima
pergunta da banca**:

- Número com denominador claro ("8% das compras", não "8% de melhoria").
- Ação com decisão visível, incluindo o que foi descartado e por quê.
- Obstáculo que explica por que a solução não era óbvia.
- Evidência que alguém consegue abrir sem pedir ajuda.

Diga **por que** é forte, não só que é: "o antes/depois com denominador aguenta um
'melhorou quanto?' sem precisar de você na sala".

### Pontos fracos — o que desmonta na primeira repergunta

Procure especificamente:

| Fraqueza | Como aparece | A repergunta que derruba |
|---|---|---|
| Crédito ambíguo | Ação escrita em "nós" ou verbo genérico ("atuei", "apoiei") | "Qual parte foi você?" |
| Métrica sem denominador | "reduzi 80%" sem dizer de quanto pra quanto, ou de quê | "80% de quê?" |
| Resultado sem ligação com a ação | O número aparece, mas nada conecta ele ao que ele fez | "Como você sabe que foi a sua mudança?" |
| Obstáculo decorativo | Descreve dificuldade que a ação não endereça | "E isso atrapalhou onde, exatamente?" |
| Escala implícita | "a fila", "o sistema" — sem tamanho, o leitor não sabe se é grande | "Isso é grande?" |
| Evidência que não abre | Referência vaga, print sem origem | "Onde eu vejo isso?" |
| Tempo verbal escorregadio | "era responsável por" no lugar de "fiz" | "Você fez, ou era seu escopo?" |

Cada ponto fraco sai com **a pergunta específica que o resolve** — é ela que vai virar a
próxima rodada. Fraqueza sem pergunta é reclamação.

### O que NÃO é ponto fraco

- Case pequeno. Nem todo case é heroico; um bem contado vale mais que um inflado.
- Ressalva `[NÃO VERIFICADO: ...]` declarada. Isso é honestidade funcionando, não defeito
  — só vira fraqueza se der pra resolver e ninguém tentou.
- `[sem métrica: ...]` com justificativa real. Vale mais que número inventado.

## Formato da devolutiva

Curto e acionável. Algo como:

```
PONTOS FORTES
- O antes/depois (8% → 0,3% das compras no pico) tem denominador: aguenta "melhorou quanto?".
- A ação nomeia o que você descartou (cache distribuído) e por quê — mostra decisão, não só execução.

PONTOS FRACOS
1. O R$ 40 mil aparece como "estimada" sem dizer como foi estimado.
   → Pergunta: de onde saiu esse número — ticket médio × compras perdidas, ou outra conta?
2. A evidência é um ticket só; o dashboard citado na conversa não entrou no arquivo.
   → Pergunta: dá pra incluir o link do dashboard, ou pelo menos o nome dele?
3. "Squad Pagamentos" não diz o tamanho — o leitor não sabe se a fila de 12 mil é muito.
   → Pergunta: 12 mil estornos representam quanto do volume normal?

Achei 3 pontos fracos. Quer que eu faça mais uma rodada de perguntas em cima deles,
ou prefere fechar o case assim?
```

## A nova rodada

Se o usuário topar:

1. Entreviste **só os pontos fracos** — não recomece o case do zero, ele já respondeu o
   resto.
2. Mesmas regras da entrevista: reescreva, confirme, não invente, duas tentativas por
   ponto.
3. Regenere o arquivo, rode o `validate-case.mjs` de novo, e revise de novo.
4. Se um ponto continuar sem resolver depois da rodada, registre a ressalva
   `_[NÃO VERIFICADO: ...]_` e ajuste o carimbo `**Verificação:**` — o script checa essa
   coerência.

Em qualquer desfecho, **atualize o campo `**Revisão:**` do cabeçalho**:

| Situação | Valor |
|---|---|
| Nada ficou em aberto | `sem ressalvas` |
| O usuário fechou com N fraquezas conhecidas | `<N> em aberto` |

Esse campo é o que impede a revisão de virar teatro: sem ele, um case revisado e um case
nunca revisado ficam indistinguíveis no arquivo.

Se ele recusar, **feche o case sem insistir**. O dossiê é dele; seu papel era mostrar
onde está frágil, não obrigar a consertar. Uma segunda recusa no mesmo ponto encerra o
assunto de vez.

## Cuidado com a fraqueza inventada

Você foi convidado a achar pontos fracos, então vai achar — inclusive num case que está
bom. Três bullets plausíveis saem sempre, e é assim que a revisão vira um moedor infinito
que cansa o usuário.

Antes de listar um ponto fraco, passe ele por este teste: **existe uma repergunta concreta
que ele derruba?** Se você não consegue escrever a pergunta, não é fraqueza — é
preenchimento. Diga que o case está sólido e ofereça fechar; terminar é um resultado
legítimo.
