#!/usr/bin/env bash
# Bloqueia "git push" enquanto a validação configurada (teste, cobertura,
# lint, o que o repositório já usa) não passar. Roda a validação de forma
# SÍNCRONA, antes do push acontecer — diferente de automate-review, que
# revisa DEPOIS que o push já foi feito.
#
# TRIGGER: PreToolUse | MATCHER: "Bash"/"PowerShell" (Claude Code), "exec"
#   (Devin CLI). Só age quando o comando é (ou contém) "git push" — todo o
#   resto passa direto no primeiro `exit 0`.
#
# Fail-open só para falha do MECANISMO (comando não configurado, cwd
# inexistente): nesse caso o push segue e fica um WARNING no trace log.
# Depois que a validação roda de verdade, o próprio resultado dela decide —
# exit != 0 do VALIDATION_GATE_COMMAND BLOQUEIA o push, sempre.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib.sh
source "$SCRIPT_DIR/../lib.sh"

is_validation_gate_enabled || exit 0

INPUT="$(cat)"
COMMAND="$(read_tool_command "$INPUT")"
[ -z "$COMMAND" ] && exit 0
is_git_push_command "$COMMAND" || exit 0

GUARD="pre-push-validation-gate"

if [ -z "${VALIDATION_GATE_COMMAND:-}" ]; then
  trace_log "$GUARD" WARNING "push liberado sem gate — VALIDATION_GATE_COMMAND não configurado | cmd=$COMMAND"
  exit 0
fi

# Raiz do repositório via git, não uma contagem fixa de "..": a profundidade
# de onde este script foi vendorizado (.claude/hooks/..., .agent-guards/...,
# etc.) não é assunto deste script, e contar níveis quebraria silenciosamente
# se o caminho de instalação mudasse.
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  trace_log "$GUARD" WARNING "push liberado sem gate — não foi possível resolver a raiz do repositório via git"
  exit 0
fi
RUN_DIR="$REPO_ROOT/${VALIDATION_GATE_CWD:-.}"

if [ ! -d "$RUN_DIR" ]; then
  trace_log "$GUARD" WARNING "push liberado sem gate — VALIDATION_GATE_CWD não existe: $RUN_DIR"
  exit 0
fi

OUTPUT="$(cd "$RUN_DIR" && bash -c "$VALIDATION_GATE_COMMAND" 2>&1)"
STATUS=$?

if [ "$STATUS" -eq 0 ]; then
  exit 0
fi

TAIL_OUTPUT="$(printf '%s\n' "$OUTPUT" | tail -20)"
echo "BLOCKED [$GUARD]: validação falhou (exit=$STATUS) — push bloqueado até '$VALIDATION_GATE_COMMAND' passar." >&2
echo "$TAIL_OUTPUT" >&2
trace_log "$GUARD" BLOCKED "exit=$STATUS cmd=$VALIDATION_GATE_COMMAND | push=$COMMAND | output=$TAIL_OUTPUT"
exit 2
