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

```
Skills disponíveis:
  - skill-creator
```

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

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `lup-skills list` (ou `ls`) | Lista as skills disponíveis no repositório central para instalação. |
| `lup-skills add <skill-name>` | Copia a skill `<skill-name>` do repositório central para o(s) agente(s) escolhido(s) no projeto atual. |
| `lup-skills remove <skill-name>` | Remove a skill `<skill-name>` do(s) agente(s) escolhido(s) no projeto atual. |
| `lup-skills --help` | Lista todos os comandos disponíveis. |

## Criando novas skills

A skill `skill-creator` (incluída neste repositório) auxilia na criação, edição e
avaliação de novas skills. Instale-a com `lup-skills add skill-creator` e siga as
instruções do seu `SKILL.md`.

Qualquer skill é apenas uma pasta `skills/<nome-da-skill>/` contendo um `SKILL.md`
(com frontmatter `name` e `description`) e, opcionalmente, outros arquivos/pastas de
apoio (scripts, referências, assets etc.) — todo o conteúdo da pasta é copiado de
forma bruta pelo `lup-skills add`.

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
