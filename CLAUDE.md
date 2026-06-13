# ai-lup-skills

## Resumo do projeto

Repositório central de skills de IA + CLI (`lup-skills`) para instalar/remover/listar
essas skills em qualquer projeto local.

```
ai-lup-skills/
  cli/        # CLI lup-skills (Node.js ESM + commander)
    index.js                -> registra os comandos (add, remove, list)
    src/commands/           -> implementação de cada comando
    src/utils/paths.js      -> caminhos de destino (.claude/skills, .agents/skills)
    src/utils/skills.js     -> descoberta recursiva de skills (discoverSkills/findSkill)
    src/utils/frontmatter.js-> lê metadata (language, tags) do SKILL.md
    test/                   -> testes (node --test) + cobertura (c8)
  skills/     # "loja" de skills; pastas internas são só organização (não viram categoria)
    skill-creator/SKILL.md
  README.md / CONTRIBUTING.md
```

- Comandos do CLI: `lup-skills list [--language x] [--tag y] | add <skill> | remove <skill>`.
- `add`/`remove` perguntam (checkbox) para quais agentes agir: Claude →
  `.claude/skills/<skill>`, Devin → `.agents/skills/<skill>`. Instalação sempre plana.
- Skills são descobertas **recursivamente** (qualquer pasta com `SKILL.md`). A
  **categorização vem do frontmatter** (`metadata.language` + `metadata.tags`), NÃO das
  pastas; `list` agrupa por `language` e filtra por `--language`/`--tag`.
- `add` copia toda a pasta da skill de forma bruta (recursiva).

Para detalhes de uso, ver `README.md`; para a convenção de skills, `CONTRIBUTING.md`.
Para entender um comando, leia apenas o arquivo correspondente em `cli/src/commands/`.

## Regras de qualidade

- **Sempre testar o que for feito.** Toda mudança de código (no `cli/` ou em
  `skills/`) deve ser validada com testes automatizados antes de ser considerada
  concluída — não basta testar manualmente.
- **Cobertura de testes acima de 90%.** Ao adicionar ou alterar código no `cli/`,
  rode `npm run test:coverage` (dentro de `cli/`) e garanta que o resultado fique
  acima de 90% em statements/branches/functions/lines (`src/**`). Adicione casos de
  teste para cobrir cenários novos ou alterados.
- Essas regras se aplicam a qualquer nova skill, comando do CLI ou utilitário
  adicionado a este repositório.
