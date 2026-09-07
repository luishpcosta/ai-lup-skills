#!/usr/bin/env bash
# Funções puras + leitura de stdin + log de auditoria dos guards de
# segurança PreToolUse. Testes: hooks/tests/run-tests.sh.

# --- stdin JSON -----------------------------------------------------------
# Três camadas, da mais confiável para a menos: jq -> python3 -> regex. As
# duas primeiras são parsers de verdade. A terceira é último recurso (Git
# Bash sem jq e sem python3) e precisa entender \" e \\ dentro do valor: sem
# isso o comando era truncado no primeiro \" e o guard deixava passar
# (`echo \"x\" ; cat ~/.ssh/id_rsa` não era bloqueado).

# Desfaz os escapes JSON que importam para o texto de um comando (\" \\ \/),
# numa passada só — `\\"` vira `\"`, não `"` solto. \n/\t continuam
# literais: nenhuma detecção depende de quebra de linha real.
json_unescape() {
  printf '%s' "$1" | sed 's|\\\(["\\/]\)|\1|g'
}

# Extrai um campo string de JSON via regex (última camada de fallback).
# Procura a chave em qualquer nível — suficiente para os payloads reais de
# hook, que não repetem "command" em níveis diferentes.
# Args: json_text field_name
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

# tool_input.command do payload.
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

# --- Detecções: credential-exfil-guard -------------------------------------
# printf em vez de echo: um comando começando com -n/-e seria engolido pelo
# echo e escaparia da detecção.

# As duas funções abaixo compõem checagens ANDed (fonte de dump + verbo de
# filtro) em vez de uma regex só, de propósito: cobrem tanto o dump
# POSIX/bash (env|printenv|set) quanto o equivalente nativo do PowerShell
# (Get-ChildItem/gci/dir/ls Env: — "set" sozinho já é builtin do cmd.exe e do
# PowerShell também, por isso já estava coberto) piped a um filtro
# (grep, ou Select-String/sls/Where-Object no PowerShell). Sem isso,
# "Get-ChildItem Env: | Select-String TOKEN" passava batido enquanto
# "env | grep TOKEN" era bloqueado — mesma fuga de segredo, sintaxe
# diferente.
_is_env_dump_source() {
  # Duas alternativas separadas, não uma única regex com \b no final: os
  # tokens bash (env/printenv/set) terminam em letra e precisam de \b pra não
  # casar dentro de "environment"/"reset"; os tokens PowerShell terminam em
  # ":" (Env:), que já é inequívoco — \b ali falha, porque ":" seguido de
  # espaço são os dois não-palavra e não existe fronteira de palavra entre
  # eles (regressão real, pegou na hora de testar contra "Get-ChildItem Env:
  # | Select-String TOKEN").
  printf '%s\n' "$1" | grep -qiE '(^|[|;&]|&&)\s*(env|printenv|set)\b' \
    || printf '%s\n' "$1" | grep -qiE '(^|[|;&]|&&)\s*(get-childitem|gci|dir|ls|get-item)\s+env:'
}

_is_filter_verb() {
  printf '%s\n' "$1" | grep -qiE '(grep|select-string|\bsls\b|where-object|\?\{)'
}

is_secret_grep_env_dump() {
  _is_env_dump_source "$1" \
    && _is_filter_verb "$1" \
    && printf '%s\n' "$1" | grep -qiE '\b(token|secret|key|password|credential|auth|oauth|cookie|session|api.key)\b'
}

# grep sobre dump de ambiente por QUALQUER termo — vaza valor mesmo se o
# termo não for óbvio (#69053: "env | grep JIRA" vazou JIRA_API_TOKEN).
is_any_grep_env_dump() {
  _is_env_dump_source "$1" && _is_filter_verb "$1"
}

is_credential_file_search() {
  printf '%s\n' "$1" | grep -qiE 'find\s.*-name\s.*\*?(token|secret|credential|password|\.key|\.pem|\.p12|\.pfx|\.keystore|\.jks|\.env)'
}

# Verbo de leitura: cat/type (bash e cmd.exe/PowerShell têm "type" como
# alias) e os cmdlets nativos do PowerShell (Get-Content/gc). Path com "/" ou
# "\" — Windows aceita os dois, e $env:USERPROFILE\.ssh\id_rsa é tão válido
# quanto ~/.ssh/id_rsa.
is_ssh_credential_read() {
  printf '%s\n' "$1" | grep -qiE '\b(cat|type|get-content|gc)\b' \
    && printf '%s\n' "$1" | grep -qE '\.ssh[\\/](id_|authorized_keys|known_hosts|config)'
}

is_system_credential_read() {
  printf '%s\n' "$1" | grep -qiE '\b(cat|type|get-content|gc)\b' \
    && printf '%s\n' "$1" | grep -qE '(/etc/shadow|/etc/gshadow|/etc/passwd)'
}

is_cloud_credential_read() {
  printf '%s\n' "$1" | grep -qiE '\b(cat|type|get-content|gc)\b' \
    && printf '%s\n' "$1" | grep -qE '\.(aws|gcloud|azure|kube)[\\/](credentials|config|token)'
}

is_browser_credential_hunt() {
  printf '%s\n' "$1" | grep -qiE 'find\s.*\.(chrome|firefox|mozilla|safari).*\b(login|password|cookie|token)\b'
}

is_bare_env_dump() {
  printf '%s\n' "$1" | grep -qiE '^\s*(env|printenv|set|get-childitem\s+env:|gci\s+env:|dir\s+env:|ls\s+env:|get-item\s+env:)\s*$'
}

is_credential_file_upload() {
  printf '%s\n' "$1" | grep -qiE 'curl[[:space:]].*-d[[:space:]]+@[^[:space:]]*(\.env|\.pem|\.key|credentials|\.ssh/id_)|wget[[:space:]].*--post-file[= ][^[:space:]]*(\.env|\.pem|\.key|credentials|\.ssh/id_)'
}

is_credential_file_piped_to_network() {
  printf '%s\n' "$1" | grep -qiE 'cat[[:space:]]+[^[:space:]]*(\.env|\.pem|\.key|credentials|\.ssh/id_)[^[:space:]]*[[:space:]]*\|.*curl|cat[[:space:]]+[^[:space:]]*(\.env|\.pem|\.key|credentials|\.ssh/id_)[^[:space:]]*[[:space:]]*\|.*wget'
}

# security find-generic/internet-password -w de um serviço com nome de segredo.
is_macos_keychain_secret_extraction() {
  printf '%s\n' "$1" | grep -qiE 'security\s+find-(generic|internet)-password' \
    && printf '%s\n' "$1" | grep -qE '(^|[[:space:]])-w([[:space:]]|$)' \
    && printf '%s\n' "$1" | grep -qiE 'ANTHROPIC|OPENAI|AUTH[_-]?TOKEN|API[_-]?KEY|ACCESS[_-]?TOKEN|[_-]SECRET|OAUTH|GITHUB[_-]?TOKEN|(^|[^a-z])secret([^a-z]|$)'
}

is_keychain_piped_to_network() {
  printf '%s\n' "$1" | grep -qiE 'security\s+find-(generic|internet)-password' \
    && printf '%s\n' "$1" | grep -qiE '\|[[:space:]]*(curl|wget|nc|ncat|telnet)([[:space:]]|$)'
}

# $TOKEN/$SECRET/etc (ou $env:TOKEN no PowerShell) pipado direto pra um
# cliente de rede (não header) — inclui Invoke-WebRequest/iwr e
# Invoke-RestMethod/irm, os cmdlets nativos do PowerShell equivalentes a
# curl/wget.
is_secret_env_piped_to_network() {
  printf '%s\n' "$1" | grep -qE '\$\{?([Ee][Nn][Vv]:)?[A-Za-z_]*(TOKEN|SECRET|API[_-]?KEY|PASSWORD|CREDENTIAL|AUTH)[A-Za-z_]*' \
    && printf '%s\n' "$1" | grep -qiE '\|[[:space:]]*(curl|wget|nc|ncat|telnet|iwr|invoke-webrequest|irm|invoke-restmethod)([[:space:]]|$)'
}

# --- Detecções: db-connect-guard -------------------------------------------

is_remote_sql_connect() {
  printf '%s\n' "$1" | grep -qE '\b(mysql|psql|mongo(sh)?)\s+.*(-h\s+|--host[= ])'
}

is_remote_redis_connect() {
  printf '%s\n' "$1" | grep -qE '\bredis-cli\s+.*(-h\s+|--host)'
}

is_prisma_destructive_command() {
  printf '%s\n' "$1" | grep -qE '\bprisma\s+(db\s+push|migrate\s+deploy|migrate\s+reset)'
}

# --- Config -----------------------------------------------------------------

load_config_env() {
  local config_file="$1"
  [ -f "$config_file" ] || return 0

  local vars=(SECURITY_GUARD_ENABLED SECURITY_GUARD_TRACE_LOG_PATH)
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

is_security_guard_enabled() {
  [ "${SECURITY_GUARD_ENABLED:-true}" != "false" ]
}

# --- Trace log --------------------------------------------------------------
# Mesmo padrão de automate-review/hooks/lib.sh. Registra todo BLOCKED/WARNING
# — nunca os "passou sem bater em nada" (senão vira ruído). Best-effort:
# nunca derruba o guard chamador.

_data_dir() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data"
  mkdir -p "$dir" 2>/dev/null || true
  printf '%s' "$dir"
}

# Default: data/trace.log nesta pasta. Override via
# SECURITY_GUARD_TRACE_LOG_PATH (config.env ou env var).
trace_log_path() {
  if [ -n "${SECURITY_GUARD_TRACE_LOG_PATH:-}" ]; then
    mkdir -p "$(dirname "$SECURITY_GUARD_TRACE_LOG_PATH")" 2>/dev/null || true
    printf '%s' "$SECURITY_GUARD_TRACE_LOG_PATH"
  else
    printf '%s/trace.log' "$(_data_dir)"
  fi
}

# Achata quebras de linha e corta em 500 caracteres: uma entrada do trace log
# é UMA linha, e comandos multi-linha quebravam o formato para quem lê com
# grep/tail.
sanitize_trace_detail() {
  local detail="$1"
  detail="$(printf '%s' "$detail" | tr '\n\r\t' '   ')"
  if [ "${#detail}" -gt 500 ]; then
    detail="${detail:0:500}…"
  fi
  printf '%s' "$detail"
}

# Args: timestamp_iso guard decision detail
format_trace_line() {
  local ts="$1" guard="$2" decision="$3" detail="${4:-}"
  printf '[%s] guard=%s decision=%s%s\n' "$ts" "$guard" "$decision" "${detail:+ detail=$detail}"
}

# Args: guard decision [detail]
trace_log() {
  format_trace_line "$(date -Iseconds)" "$1" "$2" "$(sanitize_trace_detail "${3:-}")" \
    >> "$(trace_log_path)" 2>/dev/null || true
}
