# Motor pdf2htmlEX

[pdf2htmlEX](https://github.com/pdf2htmlEX/pdf2htmlEX) é uma ferramenta C++
open source (baseada no Poppler) que converte PDF em HTML mantendo fidelidade
visual pixel-a-pixel — o HTML gerado se parece exatamente com o PDF original
quando aberto no navegador, incluindo fontes embutidas como @font-face. Roda
inteiramente via linha de comando, sem qualquer chamada de rede.

Use este motor no lugar do Docling quando:
- O usuário precisa que o HTML pareça visualmente idêntico ao PDF (ex.:
  formulários, plantas, documentos com diagramação muito específica).
- O Docling perdeu formatação importante do documento.
- O objetivo é arquivamento/publicação, não reuso do conteúdo como texto
  estruturado (para isso, Docling é melhor).

## Verificar/instalar dependências

Debian/Ubuntu:

```bash
sudo apt-get install pdf2htmlex
```

macOS (Homebrew):

```bash
brew install pdf2htmlex
```

Se o pacote não estiver disponível no repositório padrão do sistema, use a
imagem Docker oficial (ainda local — nenhum upload envolvido, o container só
roda o binário na máquina do usuário):

```bash
docker run -v "$(pwd)":/pdf pdf2htmlex/pdf2htmlex --zoom 1.3 entrada.pdf saida.html
```

## Uso (binário nativo)

```bash
pdf2htmlex --zoom 1.3 entrada.pdf saida.html
```

Opções úteis:

| Flag | Efeito |
|---|---|
| `--zoom N` | Fator de escala do render (padrão bom: 1.3) |
| `--dest-dir DIR` | Pasta de saída |
| `--embed-css 0` | Não embute CSS no HTML (gera arquivo `.css` separado) |
| `--split-pages 1` | Gera um arquivo HTML por página em vez de um único documento |

## Diferenças em relação ao Docling

- Não extrai estrutura semântica (não sabe o que é "título" ou "tabela") — só
  reproduz o layout visual.
- HTML resultante costuma ser mais pesado (posicionamento absoluto, fontes
  embutidas) e menos reutilizável para reprocessamento por LLM/RAG.
- Melhor fidelidade visual do que qualquer motor baseado em reconstrução de
  estrutura.
