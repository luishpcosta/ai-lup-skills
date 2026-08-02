#!/usr/bin/env bash
# Clona um owner/repo do GitHub de forma rasa e temporária, deixa o working
# directory dentro do clone no commit/branch pedido, roda o comando de
# inspeção informado, e SEMPRE remove o diretório temporário ao final —
# sucesso ou erro. Nunca deixa clone para trás.
#
# Uso:
#   fetch-ref.sh <owner>/<repo> --branch <branch> -- <comando...>
#   fetch-ref.sh <owner>/<repo> --commit <sha>    -- <comando...>
#
# Exemplos:
#   fetch-ref.sh org/service-billing --branch main -- git log -1 -p
#   fetch-ref.sh org/service-billing --commit a1b2c3d -- git show a1b2c3d
#   fetch-ref.sh org/service-billing --branch main -- cat docs/CONTRACT.md
#
# Se precisar rodar mais de um comando de inspeção sobre o mesmo clone (diff
# + ler arquivos vizinhos, por exemplo), passe um único comando composto em
# vez de chamar este script várias vezes:
#   fetch-ref.sh org/service-billing --commit a1b2c3d -- \
#     sh -c 'git show a1b2c3d -- services/order/ && cat services/order/CONTRACT.md'

set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  fetch-ref.sh <owner>/<repo> (--branch <branch> | --commit <sha>) -- <comando...>
EOF
}

if [[ $# -lt 4 ]]; then
  usage
  exit 1
fi

REPO="$1"; shift

MODE=""
REF=""
case "$1" in
  --branch)
    MODE="branch"
    REF="$2"
    shift 2
    ;;
  --commit)
    MODE="commit"
    REF="$2"
    shift 2
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [[ "${1:-}" != "--" ]]; then
  usage
  exit 1
fi
shift

if [[ $# -eq 0 ]]; then
  echo "Faltou o comando a rodar dentro do clone (depois de --)." >&2
  usage
  exit 1
fi

TMPDIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

DEST="$TMPDIR/repo"

if [[ "$MODE" == "branch" ]]; then
  gh repo clone "$REPO" "$DEST" -- --depth 1 --branch "$REF" --single-branch
else
  # Clone raso (blobless) da branch padrão, depois busca o commit específico.
  # --depth 2 (não 1): com profundidade 1 o commit chega sem o pai, então
  # `git show`/`git log -p` nele diffam contra a árvore vazia e mostram o
  # repositório inteiro como "adicionado" em vez do diff real do commit — é
  # inútil para reconciliação. Profundidade 2 garante o pai imediato.
  # Alguns hosts restringem fetch de um SHA arbitrário fora do histórico
  # buscado; se falhar, cai para um clone completo como último recurso —
  # ainda temporário, ainda removido ao final.
  if ! gh repo clone "$REPO" "$DEST" -- --no-single-branch --filter=blob:none 2>/dev/null; then
    gh repo clone "$REPO" "$DEST"
  fi
  if ! git -C "$DEST" fetch --depth 2 origin "$REF" 2>/dev/null; then
    echo "Fetch raso do commit $REF falhou; buscando histórico completo como fallback." >&2
    git -C "$DEST" fetch --unshallow origin || git -C "$DEST" fetch origin
  fi
  git -C "$DEST" checkout "$REF"
fi

cd "$DEST"
"$@"
