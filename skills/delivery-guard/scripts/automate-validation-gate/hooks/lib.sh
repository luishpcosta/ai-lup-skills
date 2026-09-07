#!/usr/bin/env bash
# Funções puras + leitura de stdin + log de auditoria do gate de validação
# pré-push. Mesma convenção de parsing das outras ferramentas desta skill
# (json_unescape/extract_json_string_field/read_tool_command) — cada
# automate-*/ é independente e autocontida, então essas funções aparecem
# duplicadas em cada lib.sh de propósito, não por descuido.
# Testes: hooks/tests/run-tests.sh.

# --- stdin JSON -----------------------------------------------------------
# Três camadas, da mais confiável para a menos: jq -> python3 -> regex. O
# Git for Windows/MSYS2 não traz jq, e a camada regex precisa desfazer \" e
# \\ dentro do valor — sem isso um comando com aspas escapadas era truncado
# na primeira aspa e o gate deixava passar sem rodar a validação.

json_unescape() {
  printf '%s' "$1" | sed 's|\\\(["\\/]\)|\1|g'
}

extract_json_string_field() {
  local json="$1" field="$2" raw
  raw="$(printf '%s' "$json" \
    | grep -oE "\"$field\"[[:space:]]*:[[:space:]]*\"(\\\\.|[^\"\\\\])*\"" \
    | head -1)"
  [ -z "$raw" ] && return 0
  raw="${raw#*:}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw#\"}"
  raw="${raw%\"}"
  json_unescape "$raw"
}

read_tool_command() {
  local payload="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$payload" | python3 -c 'import json, sys
try:
    payload = json.load(sys.stdin)
except Exception:
    raise SystemExit(0)
value = (payload.get("tool_input") or {}).get("command")
if isinstance(value, str):
    sys.stdout.write(value)
' 2>/dev/null
  else
    extract_json_string_field "$payload" "command"
  fi
}

# --- Detecção: é um push pro remoto? ---------------------------------------
# Substring simples, mesmo critério de automate-review/hooks/lib.sh
# (is_git_push_command) — defesa própria porque nem toda plataforma filtra
# hooks pelo conteúdo do comando (só o "if" do Claude Code faz isso, e só
# nele mesmo; o matcher do Devin é só por nome de ferramenta). Não distingue
# branch/remote — todo "git push" aciona o gate, de propósito: um push que
# derruba CI em qualquer branch já é o problema que este guard existe pra
# evitar.
is_git_push_command() {
  case "$1" in
    *"git push"*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- Config -----------------------------------------------------------------

load_config_env() {
  local config_file="$1"
  [ -f "$config_file" ] || return 0

  local vars=(VALIDATION_GATE_ENABLED VALIDATION_GATE_COMMAND VALIDATION_GATE_CWD VALIDATION_GATE_TRACE_LOG_PATH)
  local var
  local -A prior=()

  for var in "${vars[@]}"; do
    [ -n "${!var+x}" ] && prior["$var"]="${!var}"
  done

  # shellcheck disable=SC1090
  source "$config_file"

  for var in "${vars[@]}"; do
    [ -n "${prior[$var]+x}" ] && printf -v "$var" '%s' "${prior[$var]}"
  done
}

load_config_env "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/config.env"

is_validation_gate_enabled() {
  [ "${VALIDATION_GATE_ENABLED:-true}" != "false" ]
}

# --- Trace log --------------------------------------------------------------
# Mesmo padrão das outras ferramentas: só decisões que importam (BLOCKED,
# WARNING, ACTION) — nunca "passou sem bater em nada". Best-effort: nunca
# derruba o guard chamador.

_data_dir() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data"
  mkdir -p "$dir" 2>/dev/null || true
  printf '%s' "$dir"
}

trace_log_path() {
  if [ -n "${VALIDATION_GATE_TRACE_LOG_PATH:-}" ]; then
    mkdir -p "$(dirname "$VALIDATION_GATE_TRACE_LOG_PATH")" 2>/dev/null || true
    printf '%s' "$VALIDATION_GATE_TRACE_LOG_PATH"
  else
    printf '%s/trace.log' "$(_data_dir)"
  fi
}

sanitize_trace_detail() {
  local detail="$1"
  detail="$(printf '%s' "$detail" | tr '\n\r\t' '   ')"
  if [ "${#detail}" -gt 500 ]; then
    detail="${detail:0:500}…"
  fi
  printf '%s' "$detail"
}

format_trace_line() {
  local ts="$1" guard="$2" decision="$3" detail="${4:-}"
  printf '[%s] guard=%s decision=%s%s\n' "$ts" "$guard" "$decision" "${detail:+ detail=$detail}"
}

trace_log() {
  format_trace_line "$(date -Iseconds)" "$1" "$2" "$(sanitize_trace_detail "${3:-}")" \
    >> "$(trace_log_path)" 2>/dev/null || true
}
