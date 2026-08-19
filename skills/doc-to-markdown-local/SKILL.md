---
name: doc-to-markdown-local
description: >-
  Converte documentos Word (.doc/.docx) em Markdown limpo rodando 100%
  localmente, sem enviar o documento para nenhuma API de nuvem de terceiros.
  Usa o markitdown (Microsoft, MIT) como motor de conversão e extrai as
  imagens do próprio pacote .docx para uma pasta separada (ou embutidas como
  base64, se pedido). Use sempre que o usuário pedir para converter,
  transformar ou preparar um .doc/.docx como Markdown — especialmente quando
  o documento contém dados sensíveis, internos, contratuais ou pessoais e não
  pode sair da máquina/rede local, ou quando o Markdown será consumido por um
  LLM/RAG e precisa ser compacto. Prefira este skill a qualquer integração
  que chame uma API externa de conversão de documentos.
metadata:
  language: python
  tags: [docx, doc, word, markdown, conversion, local, offline, privacy, markitdown]
---

# doc-to-markdown-local

Converte Word (.doc/.docx) em Markdown processando o arquivo inteiramente na
máquina do usuário. Não há chamada de rede, não há upload do documento, não
há API key. Foi criado como alternativa a skills que dependem de serviços de
conversão em nuvem, que exigem enviar o documento para um servidor de
terceiros — inaceitável para documentos sensíveis (contratos, dados pessoais,
material interno).

## Por que local

| | Cloud (ex.: APIs de conversão de documento) | Este skill |
|---|---|---|
| Onde o documento é processado | Servidor do fornecedor | Máquina do usuário |
| Precisa de API key / conta | Sim | Não |
| Risco de retenção/exfiltração | Existe (depende da política do fornecedor) | Não existe — nada sai da rede |
| Funciona offline | Não | Sim |

## Motor

Este skill usa o [markitdown](https://github.com/microsoft/markitdown)
(Microsoft, licença MIT) para extrair texto, títulos e tabelas do .docx.
`.doc` legado é convertido para `.docx` primeiro via LibreOffice local
(`--headless`), sem nenhuma dependência de rede.

O markitdown, sozinho, **descarta** as imagens do .docx: por padrão ele troca
cada imagem por um placeholder truncado (`data:image/png;base64...`) que não
é base64 válido nem aponta para arquivo nenhum. `scripts/convert.py` resolve
isso extraindo as imagens diretamente do pacote .docx (que é um zip) e:
- no modo padrão, salva cada imagem como arquivo em `<saida>_images/` e
  substitui o placeholder pelo link relativo correto, na ordem em que as
  imagens aparecem no documento;
- no modo `--embedded`, usa a opção nativa `keep_data_uris=True` do
  markitdown para embutir o base64 real da imagem no próprio `.md`, gerando
  um único arquivo autocontido.

Imagens legadas em WMF/EMF (comuns em .doc antigos) são convertidas para PNG
via LibreOffice quando disponível — a maioria dos visualizadores Markdown não
renderiza WMF/EMF. Detalhes e limitações: `references/markitdown-engine.md`.

## Fluxo de trabalho

1. Confirme o caminho do .doc/.docx de entrada e onde o Markdown de saída
   deve ser salvo (e se o usuário quer imagens em pasta separada — padrão —
   ou embutidas em base64 com `--embedded`).
2. Verifique se o ambiente já tem `markitdown` instalado (veja
   "Verificar/instalar dependências" em `references/markitdown-engine.md`).
   Instale apenas se necessário — não reinstale a cada execução. Se a entrada
   for `.doc`, confirme também que o LibreOffice está disponível.
3. Rode a conversão via `scripts/convert.py`.
4. Confira o Markdown gerado (abra ou liste o começo do arquivo) antes de
   entregar ao usuário — preste atenção a avisos do script sobre imagens sem
   correspondência ou em formato não renderizável (veja a saída de erro do
   comando).
5. Nunca envie o arquivo para nenhuma URL externa. Se o script falhar por
   dependência ausente, resolva instalando localmente — não substitua por uma
   API de conversão em nuvem.

## Uso rápido

```bash
python scripts/convert.py entrada.docx saida.md
```

Gera `saida.md` e, se houver imagens, a pasta `saida_images/` ao lado dele,
com links relativos já corrigidos.

Para um único arquivo autocontido (imagens embutidas em base64):

```bash
python scripts/convert.py entrada.docx saida.md --embedded
```

Para `.doc` legado, o comando é o mesmo — o script converte para `.docx` via
LibreOffice automaticamente antes de gerar o Markdown:

```bash
python scripts/convert.py entrada.doc saida.md
```

Opções do script:

| Flag | Efeito |
|---|---|
| (nenhuma) | Modo padrão — imagens extraídas para `<saida>_images/` |
| `--images-dir DIR` | Usa `DIR` em vez do padrão `<saida>_images/` |
| `--embedded` | Embute as imagens como base64 dentro do próprio `.md` |
| `--no-progress` | Desliga mensagens de progresso |

Detalhes de instalação, troubleshooting e limitações (imagens em cabeçalho/
rodapé, contagem de placeholders, WMF/EMF sem LibreOffice):
`references/markitdown-engine.md`.

## Segurança

- Nunca adicione lógica que envie o documento, trechos extraídos ou o
  Markdown resultante para uma URL externa.
- O markitdown tem um recurso opcional de legenda de imagem via LLM
  (`llm_client`/`llm_model`), usado apenas se você passar essas opções
  explicitamente na API Python — `scripts/convert.py` nunca as usa. Não
  adicione essas opções a menos que o usuário peça explicitamente e entenda
  que isso envia a imagem para uma API de LLM externa.
- Nunca peça ou armazene API keys — este skill não usa nenhuma.
- Se o usuário pedir explicitamente para usar uma API de nuvem, isso está
  fora do escopo deste skill; explique a diferença e deixe a decisão com ele.
