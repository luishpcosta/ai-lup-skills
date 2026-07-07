#!/usr/bin/env python3
"""Gera diagramas de arquitetura a partir de um arquivo Python que usa a lib `diagrams`.

Uso:
    python3 generate_diagram.py --check-only
        Só verifica as dependências (diagrams + graphviz) e sugere instalação.

    python3 generate_diagram.py <diagrama.py> [--output-dir DIR]
        Verifica dependências, executa o arquivo com cwd em --output-dir
        (default: diretório atual) e lista as imagens geradas.

Sai com código 0 em sucesso; != 0 com mensagem clara do que faltou/falhou.
"""
import argparse
import os
import shutil
import subprocess
import sys


def check_dependencies() -> list[str]:
    """Retorna lista de problemas encontrados (vazia = tudo ok)."""
    problems = []

    try:
        import diagrams  # noqa: F401
    except ImportError:
        problems.append(
            "Lib 'diagrams' não instalada. Instale com:\n"
            "    pip install diagrams   (ou pip3 / pipx / poetry add diagrams / uv tool install diagrams)"
        )

    if shutil.which("dot") is None:
        problems.append(
            "Graphviz não encontrado (binário 'dot'). Instale com:\n"
            "    Debian/Ubuntu: sudo apt-get install -y graphviz\n"
            "    macOS:         brew install graphviz\n"
            "    Windows:       choco install graphviz  (ou winget install Graphviz.Graphviz -i)"
        )

    return problems


def run_diagram(diagram_file: str, output_dir: str) -> int:
    diagram_path = os.path.abspath(diagram_file)
    if not os.path.isfile(diagram_path):
        print(f"ERRO: arquivo não encontrado: {diagram_path}", file=sys.stderr)
        return 1

    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    before = {e.name: e.stat().st_mtime for e in os.scandir(output_dir) if e.is_file()}

    result = subprocess.run(
        [sys.executable, diagram_path],
        cwd=output_dir,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout, end="")
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr, end="")
        print(f"\nERRO: o script do diagrama falhou (exit {result.returncode}).", file=sys.stderr)
        return result.returncode

    exts = (".png", ".jpg", ".svg", ".pdf", ".dot")
    generated = sorted(
        e.name for e in os.scandir(output_dir)
        if e.is_file() and e.name.lower().endswith(exts)
        and (e.name not in before or e.stat().st_mtime > before[e.name])
    )

    if not generated:
        print(
            "AVISO: o script rodou mas nenhuma imagem nova foi encontrada em "
            f"{output_dir}. Verifique se o script usa 'with Diagram(...)' "
            "(e considere 'filename' sem caminho absoluto).",
            file=sys.stderr,
        )
        return 2

    print("Imagens geradas:")
    for name in generated:
        print(f"  {os.path.join(output_dir, name)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("diagram_file", nargs="?", help="arquivo .py que define o diagrama")
    parser.add_argument("--output-dir", default=".", help="diretório onde salvar as imagens (default: cwd)")
    parser.add_argument("--check-only", action="store_true", help="só verifica dependências")
    args = parser.parse_args()

    problems = check_dependencies()
    if problems:
        print("Dependências faltando:\n", file=sys.stderr)
        for p in problems:
            print(f"- {p}\n", file=sys.stderr)
        return 3

    if args.check_only:
        print("OK: 'diagrams' e Graphviz disponíveis.")
        return 0

    if not args.diagram_file:
        parser.error("informe o arquivo do diagrama ou use --check-only")

    return run_diagram(args.diagram_file, args.output_dir)


if __name__ == "__main__":
    sys.exit(main())
