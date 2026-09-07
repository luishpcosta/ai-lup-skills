# automate-validation-gate

Guard `PreToolUse` que roda a validação já existente no repositório (teste, cobertura, lint —
o que o Delivery Guard encontrou na varredura, não algo novo) **antes** de um `git push` ser
executado pelo agente, e bloqueia o push (exit 2) se essa validação falhar. Diferente de
`automate-review`, que revisa código **depois** que o push já aconteceu — este guard age antes,
como condição para o push acontecer. Compatível com Claude Code e Devin CLI.

Não vem do `ai-lup-toolling` — foi criado dentro da skill `delivery-guard` especificamente para
fechar a lacuna descrita em `references/validation-gap-detection.md`: um repositório que já tem
teste/cobertura/lint configurado, mas nenhum hook os aciona automaticamente antes de um push do
agente.

## Como funciona

```
git push (qualquer branch)
  └─ pre-push-validation-gate.sh   PreToolUse: intercepta ANTES do push rodar
       ├─ VALIDATION_GATE_COMMAND vazio?        → libera o push, WARNING no trace log
       ├─ VALIDATION_GATE_CWD não existe?       → libera o push, WARNING no trace log
       ├─ comando roda e sai 0                  → libera o push, sem log (passou limpo)
       └─ comando roda e sai != 0               → BLOQUEIA o push (exit 2), log BLOCKED
```

O gate roda o comando **de forma síncrona**: o agente espera o teste/cobertura/lint terminar
antes do push seguir. Isso é intencional — o objetivo é impedir o push, não só avisar depois.

## Instalar

Copie `config.env` e `hooks/` para dentro do repo-alvo (veja o passo "Vendorizar e ligar" em
`SKILL.md` da skill `delivery-guard`), preencha `VALIDATION_GATE_COMMAND` com o comando real
detectado na varredura de validação, e mescle o fragmento de `examples/claude-settings.json`
(Claude Code) e/ou `examples/devin-hooks.json` (Devin CLI) substituindo `{{HOOKS_DIR}}` pelo
caminho relativo da cópia.

## Config (`config.env`)

| Variável | Papel |
|---|---|
| `VALIDATION_GATE_ENABLED` | Liga/desliga o gate (`true` por padrão) |
| `VALIDATION_GATE_COMMAND` | Comando de validação a rodar antes do push. **Vazio por padrão** — sem ele, o gate não bloqueia nada (fail-open com WARNING). Preencha com o comando real do repositório, nunca um inventado |
| `VALIDATION_GATE_CWD` | Subpasta (relativa à raiz do repo) onde rodar o comando — default `.` |
| `VALIDATION_GATE_TRACE_LOG_PATH` | Onde gravar o trace log (default: `data/trace.log` nesta pasta) |

Variável já exportada no ambiente vence sobre o arquivo.

## Fail-open vs. fail-closed — onde cada um se aplica

- **Fail-open** (libera o push, loga `WARNING`): quando o **mecanismo** falha por motivo alheio ao
  código — `VALIDATION_GATE_COMMAND` não configurado, `VALIDATION_GATE_CWD` apontando pra pasta
  que não existe, ou a raiz do repositório não ser resolvível via `git rev-parse`. Travar o agente
  por causa de uma configuração ausente seria pior que deixar o push seguir sem gate.
- **Fail-closed** (bloqueia o push, exit 2): sempre que `VALIDATION_GATE_COMMAND` roda e retorna
  exit code diferente de zero — teste falhou, cobertura abaixo do limiar, lint com erro. Esse é o
  comportamento inteiro pelo qual este guard existe; não há um modo "só avisa" — se o repositório
  quiser um efeito mais brando, o comando configurado é que deve decidir isso (ex.: um script que
  sempre sai 0 e só imprime aviso).

## Limites conhecidos

- Roda em **todo** `git push`, de qualquer branch — não distingue `feature/*` de `main`, ao
  contrário de `automate-review`. Se isso for indesejado para algum fluxo específico, ajuste
  `VALIDATION_GATE_COMMAND` para ele mesmo decidir (ex.: checar a branch antes de rodar a
  suíte pesada) — o guard em si não filtra por branch.
- Síncrono: o agente fica bloqueado até o comando terminar. Para suítes muito lentas, ajuste o
  `"timeout"` do hook em `settings.json`/`hooks.v1.json` (default sugerido nos exemplos: 300s) e
  considere se o comando certo aqui é a suíte inteira ou um subconjunto rápido.
- Não modifica CI/CD do repositório — roda só quando o **agente** tenta um push a partir da sessão
  local; um push feito fora do agente (por outro processo, outra pessoa) não passa por este hook.
- Detecção de "é um `git push`" é por substring simples (`*"git push"*`), igual
  `automate-review` — um comando composto (`some-script.sh && git push`) também aciona o gate,
  de propósito.

## Trace log (auditoria)

Todo `BLOCKED` e `WARNING` vai para `data/trace.log`, um evento por linha, por máquina, fora do
controle de versão. Push que passa limpo não é logado (senão viraria ruído a cada push).

```
[2026-09-07T14:02:11-03:00] guard=pre-push-validation-gate decision=BLOCKED detail=exit=1 cmd=npm test | push=git push origin feature/x | output=...
```

## Testar

```bash
bash hooks/tests/run-tests.sh

echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' \
  | VALIDATION_GATE_COMMAND="exit 1" hooks/guards/pre-push-validation-gate.sh; echo "exit=$?"   # BLOCKED / exit=2

echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' \
  | VALIDATION_GATE_COMMAND="exit 0" hooks/guards/pre-push-validation-gate.sh; echo "exit=$?"   # libera / exit=0
```
