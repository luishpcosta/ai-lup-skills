# Refletindo guardrails do Claude Code no Devin CLI ("usar agents")

Devin CLI não tem skills, `--allowedTools`, nem (documentado publicamente) um jeito de restringir
permissão granular a uma lista de comandos. Quando o usuário escolhe Devin — sozinho ou junto com
Claude Code — a forma de "refletir" um comportamento pensado para Claude Code é reescrevê-lo como
um **prompt de agente autocontido** (`devin -p '<prompt>'`) que carrega a mesma intenção em texto
livre, em vez de depender de mecanismo de plataforma que o Devin não tem. Isso é exatamente o que
`automate-review/config.env` já faz — leia os dois blocos `AGENT_PR_REVIEW_PLATFORM_CMD` lá antes
de adaptar qualquer guardrail novo, é o padrão de referência.

## O padrão de tradução

| Elemento no Claude Code | Equivalente no Devin CLI | Como compensar |
|---|---|---|
| Skill (`/review-pr`) | Não existe | O prompt do `-p` explica o que fazer em texto livre, incluindo os comandos `gh`/`git` exatos a rodar — não pode dizer "use a skill X" |
| `--allowedTools` (allowlist granular) | Não documentado | Só existe bypass total (`--permission-mode bypass`). **Isso é uma superfície de risco maior**, não equivalente — documente o risco no `config.env`, não finja que é a mesma coisa |
| `--permission-mode dontAsk` | `--permission-mode bypass` | Bypass libera qualquer comando, não só os necessários. Avise o usuário: se o prompt tiver um bug ou for injetado (ex.: PR de origem não confiável), o raio de ação é o processo inteiro, não uma allowlist |
| `-p` sem `--continue`/`--resume` | `-p` sem `-c`/`-r` | Mesma invariante nos dois: cada execução automática precisa ser uma sessão nova e stateless — nunca herdar contexto de execuções anteriores no mesmo prompt |
| Matcher por ferramenta específica (`"Bash"`, `"Agent"`) | Matcher por nome de ferramenta do Devin (`"exec"`, e o resto **não confirmado**) | Não confie no matcher da plataforma pra filtrar conteúdo — o próprio script deve ler o payload (`tool_input.command`) e decidir sozinho, igual todo `lib.sh` já vendorizado faz |
| Nome de evento (`PreCompact`, `PreToolUse`) | Pode ter nome diferente (`PostCompaction`) ou não ter equivalente documentado | Verifique a doc pública do Devin CLI para o evento em questão antes de assumir que existe; se não houver, registre como "não confirmado" e proponha rodar `/hooks` numa sessão real pra confirmar |

## Processo ao adaptar um guardrail novo (fora dos quatro já vendorizados)

1. Escreva o guardrail pensando primeiro no Claude Code (é onde há mais documentação pública
   confirmada: `PreToolUse`/`PostToolUse`, `--allowedTools`, matchers por ferramenta).
2. Para refletir no Devin, pergunte: o comportamento depende de um mecanismo de plataforma
   (allowlist, skill, subagente) que o Devin não tem documentado? Se sim, reescreva como
   instrução em texto livre dentro do prompt do `-p`, sem inventar uma flag que não existe.
3. Marque explicitamente no `config.env`/comentário qualquer coisa "não confirmada" —
   `automate-resource-guards/README.md` e `automate-review/README.md` já fazem isso (ex.: nome da
   ferramenta de spawn de subagente no Devin, campo `async` em hooks). Nunca apresente uma
   suposição como fato confirmado.
4. Se o mecanismo de bloqueio em si (exit 2 num `PreToolUse`) for o que está em jogo — não um
   prompt de agente —, ele já funciona igual nas duas plataformas (mesmo payload por stdin, mesmo
   exit code). O que muda ali é só o matcher e o nome do evento, cobertos na tabela acima e em
   [guardrails-catalog.md](guardrails-catalog.md).

## Risco a sempre comunicar ao usuário

Quando a única forma de rodar algo no Devin sem travar numa sessão sem terminal é
`--permission-mode bypass`, isso é uma decisão de risco maior que o equivalente no Claude Code —
não uma limitação cosmética. Diga isso na fase de questionamento, não só num comentário no
arquivo: se o usuário está escolhendo "Devin" ou "ambos" para um guardrail que dependeria de
allowlist granular (hoje, isso é só `automate-review`), confirme que ele está ciente antes de
gerar o `config.env` com `bypass`.
