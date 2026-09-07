#!/usr/bin/env bash
# Testes das funções puras de ../lib.sh e do comportamento end-to-end de
# ../guards/pre-push-validation-gate.sh via stdin simulado. Sem rede, sem
# framework novo. Uso: bash tests/run-tests.sh (a partir de hooks/).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="$SCRIPT_DIR/../guards/pre-push-validation-gate.sh"
# shellcheck source=../lib.sh
source "$SCRIPT_DIR/../lib.sh"

pass=0
fail=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FALHOU: $desc — esperado '$expected', obtido '$actual'"
  fi
}

assert_true() {
  local desc="$1" r
  shift
  if "$@" >/dev/null 2>&1; then r=0; else r=1; fi
  assert_eq "$desc (deveria bater)" "0" "$r"
}

assert_false() {
  local desc="$1" r
  shift
  if "$@" >/dev/null 2>&1; then r=0; else r=1; fi
  assert_eq "$desc (não deveria bater)" "1" "$r"
}

# --- is_git_push_command ---------------------------------------------------

assert_true  "is_git_push_command: git push simples"            is_git_push_command "git push"
assert_true  "is_git_push_command: git push com args"           is_git_push_command "git push origin feature/x"
assert_true  "is_git_push_command: comando composto com push"   is_git_push_command "npm test && git push"
assert_false "is_git_push_command: git pull (não é push)"       is_git_push_command "git pull origin main"
assert_false "is_git_push_command: comando sem git"              is_git_push_command "npm test"

# --- guard end-to-end (via stdin) ------------------------------------------

_run_guard() {
  local payload="$1"
  shift
  # Nunca "env -i": zerar o ambiente derruba variáveis que o Windows/MSYS
  # precisa (SystemRoot, SystemDrive) para criar o subprocesso, e o efeito
  # colateral observado foi bash.exe/git.exe espalhando um cache do Windows
  # dentro do próprio repositório. `env VAR=val ...` (sem -i) só sobrepõe as
  # variáveis do teste, preservando o resto do ambiente do chamador.
  printf '%s' "$payload" | env "$@" "$GUARD" >/dev/null 2>/dev/null
  return $?
}

NON_PUSH_PAYLOAD='{"tool_name":"Bash","tool_input":{"command":"npm test"}}'
PUSH_PAYLOAD='{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}'

_run_guard "$NON_PUSH_PAYLOAD"
assert_eq "guard: comando que não é push -> sempre libera (exit 0)" "0" "$?"

_run_guard "$PUSH_PAYLOAD" VALIDATION_GATE_ENABLED=false
assert_eq "guard: VALIDATION_GATE_ENABLED=false -> libera sem checar nada" "0" "$?"

_run_guard "$PUSH_PAYLOAD" VALIDATION_GATE_COMMAND=
assert_eq "guard: VALIDATION_GATE_COMMAND vazio -> libera (fail-open)" "0" "$?"

_run_guard "$PUSH_PAYLOAD" VALIDATION_GATE_COMMAND="exit 0"
assert_eq "guard: comando de validação passa (exit 0) -> libera o push" "0" "$?"

_run_guard "$PUSH_PAYLOAD" VALIDATION_GATE_COMMAND="exit 1"
assert_eq "guard: comando de validação falha (exit 1) -> BLOQUEIA o push (exit 2)" "2" "$?"

_run_guard "$PUSH_PAYLOAD" VALIDATION_GATE_COMMAND="exit 0" VALIDATION_GATE_CWD=pasta-que-nao-existe
assert_eq "guard: VALIDATION_GATE_CWD inexistente -> libera (fail-open)" "0" "$?"

echo ""
echo "Resultado: $pass passaram, $fail falharam."
[ "$fail" -eq 0 ]
