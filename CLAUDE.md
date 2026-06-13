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

## Desenvolvimento orientado a specs (SDD)

Este repositório adotou **Spec-Driven Development**: a especificação é a fonte da
verdade. Código novo deriva da spec e uma feature só é "done" quando todo critério
de aceite tem evidência. As regras de qualidade acima continuam valendo e estão
consolidadas em `constitution.md` (princípios inegociáveis).

### Startup

1. Confirme o diretório com `pwd`.
2. Leia este arquivo e `constitution.md`.
3. Rode `./init.sh` (verificação dos testes + gate de rastreabilidade).
4. Leia `spec-registry.json` para ver a fase SDD de cada feature.

### Fluxo (uma feature por vez, com gates)

| Fase | Produz | Gate para sair |
|---|---|---|
| **Specify** | `specs/NNN-slug/spec.md` | Todo requisito tem critério de aceite testável (AC-ID); escopo e edge cases definidos |
| **Clarify** | clarifications resolvidas | Zero marcadores `[NEEDS CLARIFICATION]` |
| **Plan** | `specs/NNN-slug/plan.md` | Todo requisito coberto; decisões consistentes com `constitution.md` |
| **Tasks** | `specs/NNN-slug/tasks.md` | Todo AC tem ≥1 task **e** toda task referencia um AC |
| **Implement** | código + testes | Uma task por vez; não começar antes do gate de Tasks |
| **Verify** | evidência em `spec-registry.json` | Todo AC `verified` com evidência registrada |

Atualize a `phase` da feature em `spec-registry.json` ao avançar.

### Artefatos

- `constitution.md` — princípios/invariantes (inclui as regras de qualidade)
- `spec-registry.json` (+ schema) — fonte da verdade estruturada (fases, AC↔task, evidência)
- `specs/NNN-slug/{spec,plan,tasks}.md` — documentos por feature
- `progress.md` / `session-handoff.md` — continuidade de sessão
- `init.sh` — verificação + gate de rastreabilidade

Features com `origin: "reverse-engineered"` e `phase: "documented"` foram reconstruídas
do código existente (engenharia reversa) e precisam ser revisadas contra o comportamento
*pretendido* antes de avançar para `verified`/`done`.

### Definition of Done

Uma feature só está done quando: spec/plan/tasks existem e passaram nos gates; todo AC
está `verified` com evidência; `check-traceability` não acusa lacunas; a verificação
real (testes do `cli` + testes das skills) rodou; e o repo continua reinicializável via
`./init.sh`.

### Fim de sessão

Atualize `phase`/status dos ACs em `spec-registry.json`, o `progress.md`, registre
clarifications/bloqueios e faça commit (Conventional Commits) com o repo em estado limpo.

Detalhes da metodologia: `skills/sdd-harness-creator/references/spec-driven-pattern.md`.
