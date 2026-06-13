# ai-lup-skills

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
