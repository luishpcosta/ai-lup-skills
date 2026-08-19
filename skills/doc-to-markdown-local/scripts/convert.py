#!/usr/bin/env python3
"""
Converte documentos Word (.doc/.docx) em Markdown localmente, usando o
markitdown (Microsoft, MIT) como motor de texto/tabelas e extração direta do
pacote .docx (zip) para as imagens.

100% offline: nada do documento é enviado para nenhuma API. .doc legado e
imagens WMF/EMF passam pelo LibreOffice local (--headless), quando instalado.

Uso:
    python convert.py entrada.docx saida.md [--images-dir DIR] [--embedded] [--no-progress]
"""

from __future__ import annotations

import argparse
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Optional

R_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
DATA_URI_IMG_RE = re.compile(r"!\[([^\]]*)\]\(data:[^)]*\)")

SOFFICE_CANDIDATES = [
    "soffice",
    "libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
]


def find_soffice() -> Optional[str]:
    for candidate in SOFFICE_CANDIDATES:
        if shutil.which(candidate):
            return candidate
        if Path(candidate).exists():
            return candidate
    return None


def convert_doc_to_docx(doc_path: Path, out_dir: Path) -> Path:
    soffice = find_soffice()
    if not soffice:
        print(
            "Erro: converter .doc legado requer o LibreOffice instalado localmente.\n"
            "Instale (sem nenhuma API/credencial necessária):\n"
            "  Debian/Ubuntu: sudo apt-get install libreoffice\n"
            "  macOS:         brew install --cask libreoffice\n",
            file=sys.stderr,
        )
        raise SystemExit(1)
    subprocess.run(
        [soffice, "--headless", "--convert-to", "docx", "--outdir", str(out_dir), str(doc_path)],
        check=True,
        capture_output=True,
        timeout=120,
    )
    result = out_dir / (doc_path.stem + ".docx")
    if not result.exists():
        print("Erro: o LibreOffice não gerou o .docx esperado a partir do .doc.", file=sys.stderr)
        raise SystemExit(1)
    return result


def extract_body_images_in_order(docx_path: Path) -> list[tuple[bytes, str]]:
    """Lê o .docx como zip e retorna (bytes, extensao) de cada imagem do corpo
    do documento, na ordem em que aparecem no texto — a mesma ordem que o
    markitdown usa para gerar os placeholders de imagem, então dá para casar
    os dois por posição sem depender de nomes de arquivo."""
    with zipfile.ZipFile(docx_path) as z:
        names = set(z.namelist())
        if "word/document.xml" not in names or "word/_rels/document.xml.rels" not in names:
            return []

        doc_root = ET.fromstring(z.read("word/document.xml"))
        rels_root = ET.fromstring(z.read("word/_rels/document.xml.rels"))
        rel_map = {rel.get("Id"): rel.get("Target") for rel in rels_root}

        embed_ids = [el.attrib[f"{R_NS}embed"] for el in doc_root.iter() if f"{R_NS}embed" in el.attrib]

        images: list[tuple[bytes, str]] = []
        for rid in embed_ids:
            target = rel_map.get(rid)
            if not target:
                continue
            member = posixpath.normpath(posixpath.join("word", target))
            try:
                data = z.read(member)
            except KeyError:
                continue
            ext = Path(target).suffix.lower().lstrip(".") or "bin"
            images.append((data, ext))
        return images


def save_image(data: bytes, ext: str, target_stem: Path, tmp_dir: Path) -> Path:
    """Salva a imagem em target_stem.<ext>, convertendo WMF/EMF para PNG via
    LibreOffice quando disponível (a maioria dos visualizadores Markdown não
    renderiza WMF/EMF)."""
    if ext not in ("wmf", "emf"):
        out_path = target_stem.with_suffix("." + ext)
        out_path.write_bytes(data)
        return out_path

    soffice = find_soffice()
    if not soffice:
        out_path = target_stem.with_suffix("." + ext)
        out_path.write_bytes(data)
        print(
            f"Aviso: {out_path.name} está em {ext.upper()}, que a maioria dos "
            "visualizadores Markdown não renderiza. Instale o LibreOffice para "
            "conversão automática para PNG.",
            file=sys.stderr,
        )
        return out_path

    src = tmp_dir / f"src_{target_stem.name}.{ext}"
    src.write_bytes(data)
    subprocess.run(
        [soffice, "--headless", "--convert-to", "png", "--outdir", str(tmp_dir), str(src)],
        check=True,
        capture_output=True,
        timeout=60,
    )
    png_src = tmp_dir / f"src_{target_stem.name}.png"
    out_path = target_stem.with_suffix(".png")
    shutil.move(str(png_src), str(out_path))
    return out_path


def substitute_images(
    markdown_text: str,
    images: list[tuple[bytes, str]],
    images_dir: Path,
    rel_prefix: str,
    tmp_dir: Path,
) -> str:
    """O markitdown, por padrão, troca cada imagem por um placeholder truncado
    (`data:image/png;base64...`) que não é base64 válido nem referencia
    arquivo nenhum. Substitui cada placeholder, na ordem em que aparecem,
    pela imagem real extraída do .docx."""
    counter = {"n": 0}

    def repl(match: re.Match) -> str:
        idx = counter["n"]
        if idx >= len(images):
            return match.group(0)
        counter["n"] += 1
        alt = match.group(1)
        data, ext = images[idx]
        target_stem = images_dir / f"image_{idx + 1}"
        out_path = save_image(data, ext, target_stem, tmp_dir)
        return f"![{alt}]({rel_prefix}{out_path.name})"

    new_text = DATA_URI_IMG_RE.sub(repl, markdown_text)
    if counter["n"] != len(images):
        print(
            f"Aviso: {counter['n']} imagem(ns) associada(s) no texto, mas "
            f"{len(images)} extraída(s) do .docx — confira a numeração das imagens.",
            file=sys.stderr,
        )
    return new_text


def main() -> int:
    parser = argparse.ArgumentParser(description="Converte Word (.doc/.docx) em Markdown localmente.")
    parser.add_argument("input_file", type=Path, help="Caminho do .doc ou .docx de entrada")
    parser.add_argument("output_md", type=Path, help="Caminho do .md de saída")
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=None,
        help="Pasta para as imagens extraídas (padrão: <saida>_images ao lado do .md)",
    )
    parser.add_argument(
        "--embedded",
        action="store_true",
        help="Embute as imagens como base64 dentro do próprio .md, em vez de arquivos separados",
    )
    parser.add_argument("--no-progress", action="store_true", help="Desliga mensagens de progresso")
    args = parser.parse_args()

    if not args.input_file.exists():
        print(f"Erro: arquivo de entrada não encontrado: {args.input_file}", file=sys.stderr)
        return 1

    try:
        from markitdown import MarkItDown
    except ImportError:
        print(
            "markitdown não está instalado neste ambiente Python.\n"
            "Instale localmente (sem nenhuma API/credencial necessária):\n\n"
            "  uv venv .venv && uv pip install --python .venv/bin/python 'markitdown[all]'\n\n"
            "ou, sem uv:\n\n"
            "  python3 -m venv .venv && .venv/bin/pip install 'markitdown[all]'\n",
            file=sys.stderr,
        )
        return 1

    if not args.no_progress:
        print(f"Convertendo {args.input_file} -> {args.output_md} (processamento local, sem rede)...")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)

        docx_path = args.input_file
        if args.input_file.suffix.lower() == ".doc":
            docx_path = convert_doc_to_docx(args.input_file, tmp_dir)

        md = MarkItDown()
        if args.embedded:
            # keep_data_uris=True mantém o base64 real da imagem no markdown,
            # em vez do placeholder truncado que o markitdown usa por padrão.
            result = md.convert(str(docx_path), keep_data_uris=True)
            markdown_text = result.text_content
        else:
            result = md.convert(str(docx_path))
            markdown_text = result.text_content

            images = extract_body_images_in_order(docx_path)
            if images:
                images_dir = args.images_dir or (args.output_md.parent / f"{args.output_md.stem}_images")
                images_dir.mkdir(parents=True, exist_ok=True)
                markdown_text = substitute_images(markdown_text, images, images_dir, f"{images_dir.name}/", tmp_dir)

        args.output_md.parent.mkdir(parents=True, exist_ok=True)
        args.output_md.write_text(markdown_text, encoding="utf-8")

    if not args.no_progress:
        print(f"OK — Markdown salvo em {args.output_md}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
