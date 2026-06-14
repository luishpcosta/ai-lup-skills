# ai-lup-skills

Repositório central de skills de IA, com um CLI (`lup-skills`) para instalar e remover
essas skills em qualquer projeto local.

## Estrutura do repositório

```
ai-lup-skills/
  cli/                 # CLI lup-skills (Node.js + commander)
  skills/              # Skills disponíveis para instalação
    skill-creator/
      SKILL.md
      templates/
```

Cada skill em `skills/<skill-name>/` é uma pasta autocontida com um arquivo `SKILL.md`
(frontmatter com `name` e `description`) e arquivos auxiliares opcionais.

## Instalação local (passo a passo)

### 1. Registrar o comando `lup-skills` globalmente

Entre na pasta `cli/` deste repositório, instale as dependências e rode `npm link`
para registrar o comando `lup-skills` no seu sistema:

```bash
cd ai-lup-skills/cli
npm install
npm link
```

Após isso, o comando `lup-skills` estará disponível em qualquer pasta do seu computador.

> O CLI descobre o caminho deste repositório automaticamente (a partir de onde o
> `index.js` foi instalado via `npm link`), então não é necessário configurar nada
> além disso.

### 2. Ir até o projeto onde as skills serão usadas

Vá para qualquer projeto de software, completamente separado deste repositório:

```bash
cd /caminho/para/seu-projeto
```

### 3. Listar as skills disponíveis

```bash
lup-skills list
```

A saída é agrupada por linguagem (skills independentes de linguagem aparecem em
`agnostic`), e cada skill mostra suas tags entre colchetes:

```
Skills disponíveis:

agnostic:
  - skill-creator        [meta, skill-creation]

python:
  - py-linter            [linting, ci]
```

Você pode filtrar por linguagem ou por tag:

```bash
lup-skills list --language python
lup-skills list --tag sdd
```

> O agrupamento vem dos metadados de cada skill (frontmatter do `SKILL.md`), **não**
> da estrutura de pastas — veja [Categorias e contribuição](#categorias-e-contribuição).

### 4. Instalar uma skill com `lup-skills add`

```bash
lup-skills add skill-creator
```

O CLI vai perguntar para quais agentes a skill deve ser instalada:

```
? Para quais agentes deseja instalar a skill "skill-creator"? (espaço para marcar)
❯◯ Claude
 ◯ Devin
```

- Use as setas `↑`/`↓` para navegar.
- Use `espaço` para marcar/desmarcar um ou mais agentes.
- Use `a` para marcar todos, `i` para inverter a seleção.
- Pressione `Enter` para confirmar.

A skill será copiada para:

- **Claude** → `.claude/skills/<skill-name>/`
- **Devin** → `.agents/skills/<skill-name>/`

Você pode marcar um ou ambos os agentes na mesma execução.

### 5. Remover uma skill com `lup-skills remove`

```bash
lup-skills remove skill-creator
```

O CLI detecta em quais agentes a skill está instalada no projeto atual e pergunta de
quais deles ela deve ser removida (mesma navegação com espaço/enter descrita acima).
As pastas correspondentes (`.claude/skills/<skill-name>` e/ou `.agents/skills/<skill-name>`)
serão apagadas.

### 6. Atualizar uma skill com `lup-skills update`

```bash
lup-skills update skill-creator
```

Use quando a skill evoluiu no repositório central e você quer propagar a nova versão.
O CLI pergunta em quais agentes atualizar (todos os suportados) e, para cada um,
**apaga a versão antiga e reinstala a atual** do repositório central, removendo arquivos
que não existem mais na nova versão. Se o agente selecionado ainda não tiver a skill, ela
é instalada do zero.

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `lup-skills list` (ou `ls`) | Lista as skills disponíveis, agrupadas por linguagem. Aceita `--language <x>` e `--tag <y>` para filtrar. |
| `lup-skills add <skill-name>` | Copia a skill `<skill-name>` do repositório central para o(s) agente(s) escolhido(s) no projeto atual. |
| `lup-skills remove <skill-name>` | Remove a skill `<skill-name>` do(s) agente(s) escolhido(s) no projeto atual. |
| `lup-skills update <skill-name>` | Atualiza a skill `<skill-name>`: apaga a versão instalada e reinstala a atual do repositório central no(s) agente(s) escolhido(s); instala do zero onde ainda não existir. |
| `lup-skills --help` | Lista todos os comandos disponíveis. |

## Categorias e contribuição

Cada skill é uma pasta contendo um `SKILL.md`. A **categorização** (linguagem e tags)
vem dos metadados no frontmatter do `SKILL.md`, sob o campo `metadata`:

```yaml
---
name: sdd-setup
description: Prepara o repositório para Spec-Driven Development.
metadata:
  language: agnostic        # agnostic (independente de linguagem) | python | javascript | ...
  tags: [sdd, repo-setup]   # opcional, lista livre de tópicos
---
```

- `language: agnostic` cobre os dois eixos: separa por linguagem e marca as skills
  independentes de linguagem. Skills sem `language` aparecem em `sem categoria`.
- As **pastas dentro de `skills/`** são apenas organização para contribuidores
  (ex.: `skills/python/py-linter/`). Elas **não** afetam a UX nem o agrupamento — o CLI
  descobre as skills recursivamente (qualquer pasta com `SKILL.md`) e categoriza pelo
  frontmatter. A instalação (`add`) é sempre plana: `.claude/skills/<nome>/`.

Para adicionar uma skill nova, veja o [CONTRIBUTING.md](CONTRIBUTING.md). A skill
`skill-creator` (incluída) também auxilia na criação e avaliação de skills — instale-a
com `lup-skills add skill-creator`.

## Testes e cobertura

O CLI tem testes automatizados (`node --test`) cobrindo `cli/src/`. Para rodar:

```bash
cd ai-lup-skills/cli
npm test
```

Para rodar com verificação de cobertura (mínimo de 90% em statements, branches,
functions e lines):

```bash
npm run test:coverage
```

## Desinstalar o comando global

Para remover o link global do `lup-skills`:

```bash
cd ai-lup-skills/cli
npm unlink -g lup-skills
```
