# Motor Docling

[Docling](https://github.com/docling-project/docling) é uma biblioteca Python
open source do IBM Research (licença MIT), com modelo de layout treinado para
reconhecer estrutura de documentos (títulos, parágrafos, tabelas) e exportar
para HTML, Markdown ou JSON. Roda em CPU por padrão; usa aceleração MLX
(Apple Silicon) ou CUDA (NVIDIA) se disponível. Nenhum dado sai da máquina.

## Verificar/instalar dependências

O script `scripts/convert.py` usa um venv local em `.venv/` dentro da pasta do
skill, criado automaticamente na primeira execução via `uv` (se disponível) ou
`python -m venv` como fallback:

```bash
cd <pasta-do-skill>
uv venv .venv
uv pip install --python .venv/bin/python docling docling-core
```

Sem `uv`:

```bash
python3 -m venv .venv
.venv/bin/pip install docling docling-core
```

A primeira instalação baixa os pesos do modelo de layout (uma vez, fica em
cache local do Docling — não é uma chamada de API por documento, é apenas o
download inicial do modelo). Depois disso, a conversão é 100% offline.

## Uso

```bash
.venv/bin/python scripts/convert.py entrada.pdf saida.html
```

Opções do script:

| Flag | Efeito |
|---|---|
| (nenhuma) | Modo padrão — bom equilíbrio entre velocidade e qualidade estrutural |
| `--images-dir DIR` | Extrai imagens embutidas para uma pasta separada, referenciadas no HTML |
| `--no-progress` | Desliga a barra de progresso (útil em execução não interativa) |

## PDFs escaneados (sem camada de texto)

Se o PDF for uma digitalização (imagem), o Docling só extrai texto se o OCR
estiver habilitado. Verifique se o Tesseract está instalado:

```bash
# Debian/Ubuntu
sudo apt-get install tesseract-ocr
# macOS
brew install tesseract
```

O Docling detecta e usa o Tesseract automaticamente quando presente. Se o HTML
gerado vier vazio ou só com imagens, é sinal de que o documento é escaneado e
falta OCR — avise o usuário antes de assumir que a conversão falhou por outro
motivo.

## Tabelas complexas

O Docling usa o modelo TableFormer para tabelas, com boa precisão em tabelas
mescladas e sem bordas. Se uma tabela sair malformada no HTML, não há flag
adicional a tentar no Docling em si — considere revisar manualmente o trecho
ou, em último caso, comparar com o resultado do pdf2htmlEX (que preserva o
layout visual da tabela como imagem/posicionamento absoluto, mesmo sem
entender a estrutura).

## Limitações conhecidas

- Documentos muito longos (centenas de páginas) podem demorar minutos — rode
  em background e informe o usuário.
- Layouts extremamente não convencionais (revistas, PDFs de design gráfico)
  podem perder fidelidade visual; nesses casos, prefira o pdf2htmlEX.
