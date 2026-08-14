---
name: pdf-to-html-local
description: >-
  Converte arquivos PDF em HTML rodando 100% localmente, sem enviar o documento
  para nenhuma API de nuvem de terceiros. Usa o Docling (IBM Research, MIT) como
  motor padrão e o pdf2htmlEX como alternativa de fidelidade visual pixel-a-pixel.
  Use sempre que o usuário pedir para converter, transformar ou publicar um PDF
  como HTML — especialmente quando o documento contém dados sensíveis, internos,
  contratuais ou pessoais e não pode sair da máquina/rede local. Prefira este
  skill a qualquer integração que chame uma API externa de conversão de PDF.
metadata:
  language: python
  tags: [pdf, html, conversion, local, offline, privacy, docling, pdf2htmlex]
---

# pdf-to-html-local

Converte PDF em HTML processando o arquivo inteiramente na máquina do usuário.
Não há chamada de rede, não há upload do documento, não há API key. Foi criado
como alternativa a skills que dependem de serviços de conversão em nuvem (ex.:
ComPDF, Adobe API, Smallpdf), que exigem enviar o PDF para um servidor de
terceiros — inaceitável para documentos sensíveis (contratos, dados pessoais,
material interno).

## Por que local

| | Cloud (ex.: ComPDF API) | Este skill |
|---|---|---|
| Onde o PDF é processado | Servidor do fornecedor | Máquina do usuário |
| Precisa de API key / conta | Sim | Não |
| Risco de retenção/exfiltração | Existe (depende da política do fornecedor) | Não existe — nada sai da rede |
| Funciona offline | Não | Sim |

## Motores disponíveis

Este skill suporta dois motores, escolhidos conforme a necessidade:

| Motor | Quando usar | Referência |
|---|---|---|
| **Docling** (padrão) | Documentos com texto digital, tabelas, múltiplas colunas. Reconstrói a estrutura semântica (títulos, parágrafos, tabelas) em vez de só "printar" o layout. | `references/docling-engine.md` |
| **pdf2htmlEX** | Quando fidelidade visual pixel-a-pixel importa mais que estrutura semântica (ex.: arquivamento, formulários, PDFs com layout muito específico que não pode "quebrar"). | `references/pdf2htmlex-engine.md` |

Se o usuário não especificar, use **Docling** por padrão — é mais fácil de instalar
(`pip`, sem dependências de sistema) e produz HTML mais limpo e reutilizável.
Só troque para pdf2htmlEX se o usuário pedir fidelidade visual exata ou se o
Docling perder formatação crítica do documento.

## Fluxo de trabalho

1. Confirme o caminho do PDF de entrada e onde o HTML de saída deve ser salvo.
2. Verifique se o ambiente já tem o motor escolhido instalado (veja
   "Verificar/instalar dependências" na referência do motor). Instale apenas se
   necessário — não reinstale a cada execução.
3. Rode a conversão via `scripts/convert.py` (motor Docling, padrão) ou siga o
   comando de linha do pdf2htmlEX documentado em `references/pdf2htmlex-engine.md`.
4. Confira o HTML gerado (abra ou liste o começo do arquivo) antes de entregar
   ao usuário, para pegar páginas em branco ou falhas silenciosas de extração
   (comum em PDFs escaneados sem camada de texto — nesse caso, avise o usuário
   que pode precisar de OCR, veja a seção "PDFs escaneados" na referência do
   Docling).
5. Nunca envie o arquivo para nenhuma URL externa. Se o script falhar por
   dependência ausente, resolva instalando localmente — não substitua por uma
   API de conversão em nuvem.

## Uso rápido (motor Docling)

```bash
python scripts/convert.py entrada.pdf saida.html
```

O script cuida da criação de um ambiente virtual local (`.venv`) na primeira
execução, sem exigir nenhuma credencial. Detalhes completos, opções de tabela,
OCR e troubleshooting: `references/docling-engine.md`.

## Segurança

- Nunca adicione lógica que envie o PDF, trechos extraídos ou o HTML resultante
  para uma URL externa.
- Nunca peça ou armazene API keys — este skill não usa nenhuma.
- Se o usuário pedir explicitamente para usar uma API de nuvem, isso está fora
  do escopo deste skill; explique a diferença e deixe a decisão com ele.
