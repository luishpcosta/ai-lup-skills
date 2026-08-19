# Motor markitdown

[markitdown](https://github.com/microsoft/markitdown) é uma biblioteca Python
open source da Microsoft (licença MIT) para converter vários formatos de
documento (docx, pdf, pptx, xlsx, html, ...) em Markdown. Aqui ela é usada
apenas para `.docx`. Roda inteiramente em CPU, sem qualquer chamada de rede
no fluxo padrão. `scripts/convert.py` chama a API Python do markitdown
diretamente (não o CLI), porque precisa da opção `keep_data_uris` para o modo
`--embedded`.

## Verificar/instalar dependências

```bash
python3 -m venv .venv
.venv/bin/pip install 'markitdown[all]'
```

Ou, com `uv`:

```bash
uv venv .venv
uv pip install --python .venv/bin/python 'markitdown[all]'
```

Nenhuma credencial é necessária. O extra `[all]` instala os conversores
opcionais (pptx, xlsx, áudio, etc.) — para converter apenas `.docx`, o pacote
básico `markitdown` já basta, mas `[all]` evita surpresas se o usuário pedir
outro formato depois.

Para `.doc` legado (Word 97-2003) e para converter imagens WMF/EMF para PNG,
instale também o LibreOffice:

```bash
# Debian/Ubuntu
sudo apt-get install libreoffice
# macOS
brew install --cask libreoffice
```

O script detecta o binário automaticamente (`soffice`, `libreoffice`, ou o
caminho padrão do LibreOffice no macOS) e roda sempre em modo `--headless`.

## Por que o script não usa apenas `markitdown entrada.docx -o saida.md`

O CLI do markitdown descarta as imagens: o conversor de HTML→Markdown que ele
usa por padrão trunca qualquer `data:` URI para o texto literal
`data:image/png;base64...` (com reticências mesmo, não é base64 real — veja
`convert_img` em `markitdown/converters/_markdownify.py`), para não poluir o
Markdown com blobs enormes. Isso deixa a imagem irrecuperável a partir do
`.md` sozinho.

`scripts/convert.py` contorna isso de duas formas:
- **Modo padrão**: abre o `.docx` como zip, lê `word/document.xml` e
  `word/_rels/document.xml.rels` para descobrir, na ordem em que aparecem no
  corpo do documento, quais imagens (`word/media/imageN.*`) cada referência
  `r:embed` aponta. Essa ordem bate exatamente com a ordem dos placeholders
  que o markitdown gera, então dá para substituir um pelo outro por posição,
  sem depender de nomes de arquivo nem hashes.
- **Modo `--embedded`**: chama `MarkItDown().convert(path, keep_data_uris=True)`
  — uma opção nativa do markitdown que mantém o base64 real em vez de
  truncar. Mais simples, mas gera um `.md` maior (não recomendado para
  documentos com muitas imagens grandes se o destino for um LLM/RAG sensível
  a tamanho de contexto).

## Limitações conhecidas

- **Imagens em cabeçalho/rodapé**: o script só varre `word/document.xml`
  (corpo do documento), então imagens usadas apenas em cabeçalho/rodapé
  (ex.: logotipo da empresa) não entram na extração — isso é intencional, já
  que o markitdown também não as inclui no Markdown gerado.
- **Contagem de placeholders divergente**: se o número de placeholders no
  Markdown não bater com o número de imagens extraídas do `.docx` (raro —
  pode acontecer com elementos gráficos que não são fotos/figuras comuns, ex.:
  marcas d'água ou objetos de desenho complexos), o script avisa no stderr e
  deixa os placeholders excedentes como estão. Sempre confira esse aviso
  antes de entregar o resultado ao usuário.
- **WMF/EMF sem LibreOffice**: se o documento tiver imagens WMF/EMF (comum em
  `.doc` bem antigos) e o LibreOffice não estiver instalado, o script salva o
  arquivo no formato original e avisa — a maioria dos visualizadores Markdown
  não vai renderizar essas imagens. Instale o LibreOffice para conversão
  automática para PNG.
- **Tabelas muito complexas** (células mescladas em padrões incomuns) podem
  sair simplificadas — isso vem do conversor HTML→Markdown do próprio
  markitdown, não há flag adicional para ajustar.
- **Legenda de imagem via LLM**: o markitdown tem um parâmetro opcional
  `llm_client`/`llm_model` na API Python para descrever imagens usando um
  LLM externo (ex.: OpenAI). `scripts/convert.py` nunca passa essas opções.
  Não adicione esse recurso à conversão sem deixar claro ao usuário que isso
  envia as imagens do documento para uma API de nuvem — foge do propósito
  deste skill.
