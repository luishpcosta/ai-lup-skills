# Project Constitution — ai-lup-skills

Princípios inegociáveis deste repositório. Planos e código devem cumpri-los;
conflitos são escalados a um humano, nunca sobrepostos em silêncio.

## Princípios

1. **Spec antes de código** — Nenhuma implementação começa antes de a feature ter
   spec aprovada e passar no gate de Tasks.
2. **Todo comportamento é rastreável** — Cada critério de aceite mapeia para uma task
   e para evidência de verificação.
3. **Verificação é obrigatória** — "Sempre testar o que for feito": toda mudança de
   código (em `cli/` ou `skills/`) é validada por testes automatizados antes de ser
   considerada concluída. Não basta testar manualmente.
4. **Passos pequenos e reversíveis** — Uma feature e uma task por vez; o repo
   permanece reinicializável via `./init.sh`.

## Restrições Técnicas

- **Stack**: Node.js (ESM). O CLI `lup-skills` usa commander; os scripts das skills
  usam **apenas módulos nativos do Node** (sem dependências externas).
- **Testes**: `node --test` (cobertura via `c8` no `cli/`).
- **Skills**: descobertas recursivamente por `SKILL.md`; categorização vem do
  frontmatter (`metadata.language` + `metadata.tags`), não das pastas.
- **Commits**: Conventional Commits (`feat`, `fix`, `docs`, `refactor`, ...), no
  imperativo, atômicos.

## Barra de Qualidade

- **Cobertura acima de 90%** ao alterar código no `cli/`: rodar `npm run test:coverage`
  (dentro de `cli/`) e garantir >90% em statements/branches/functions/lines (`src/**`).
- Verificação do harness (`./init.sh`): testes do `cli` + testes das skills + gate de
  rastreabilidade (`check-traceability`) sem lacunas.

## Emendas

Alterar esta constituição exige decisão explícita registrada em `progress.md`
(data, motivo, quem aprovou).
