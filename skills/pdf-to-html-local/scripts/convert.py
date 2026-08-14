#!/usr/bin/env python3
"""
Converte um PDF em HTML localmente usando Docling (IBM Research, MIT).

100% offline: nenhum dado do PDF sai da máquina. Não usa API key, não faz
nenhuma chamada de rede além do download único dos pesos do modelo de layout
na primeira execução do Docling (feito pela própria lib, uma vez, em cache
local).

Uso:
    python convert.py entrada.pdf saida.html [--images-dir DIR] [--no-progress]
"""

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Converte PDF em HTML localmente via Docling.")
    parser.add_argument("input_pdf", type=Path, help="Caminho do PDF de entrada")
    parser.add_argument("output_html", type=Path, help="Caminho do HTML de saída")
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=None,
        help="Pasta para extrair imagens embutidas (opcional)",
    )
    parser.add_argument(
        "--no-progress",
        action="store_true",
        help="Desliga mensagens de progresso",
    )
    args = parser.parse_args()

    if not args.input_pdf.exists():
        print(f"Erro: arquivo de entrada não encontrado: {args.input_pdf}", file=sys.stderr)
        return 1

    try:
        from docling.document_converter import DocumentConverter
    except ImportError:
        print(
            "Docling não está instalado neste ambiente Python.\n"
            "Instale localmente (sem nenhuma API/credencial necessária):\n\n"
            "  uv venv .venv && uv pip install --python .venv/bin/python docling docling-core\n\n"
            "ou, sem uv:\n\n"
            "  python3 -m venv .venv && .venv/bin/pip install docling docling-core\n",
            file=sys.stderr,
        )
        return 1

    if not args.no_progress:
        print(f"Convertendo {args.input_pdf} -> {args.output_html} (processamento local, sem rede)...")

    converter = DocumentConverter()
    result = converter.convert(str(args.input_pdf))
    doc = result.document

    html_content = doc.export_to_html()

    if not html_content.strip() or len(html_content.strip()) < 50:
        print(
            "Aviso: o HTML gerado está vazio ou quase vazio. "
            "Isso costuma indicar um PDF escaneado sem camada de texto (precisa de OCR). "
            "Veja references/docling-engine.md, seção 'PDFs escaneados'.",
            file=sys.stderr,
        )

    args.output_html.parent.mkdir(parents=True, exist_ok=True)
    args.output_html.write_text(html_content, encoding="utf-8")

    if args.images_dir:
        args.images_dir.mkdir(parents=True, exist_ok=True)
        try:
            for i, picture in enumerate(doc.pictures):
                img = picture.get_image(doc)
                if img is not None:
                    img_path = args.images_dir / f"image_{i}.png"
                    img.save(img_path)
        except Exception as exc:  # noqa: BLE001
            print(f"Aviso: falha ao extrair imagens: {exc}", file=sys.stderr)

    if not args.no_progress:
        print(f"OK — HTML salvo em {args.output_html}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
