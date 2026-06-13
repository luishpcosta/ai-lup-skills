# Plan (as-built): CLI — Comandos (add/list/remove)

**Feature ID:** 001-cli-commands
**Phase:** documented
**Spec:** ./spec.md
**Last updated:** 2026-06-13

> Notas as-built reconstruídas do código existente. Atualizar antes de planejar trabalho *novo*.

## Estrutura Existente

- `cli/src/commands/add.js` — Comando add (teste `cli/test/add.test.js`)
- `cli/src/commands/list.js` — Comando list (teste `cli/test/list.test.js`)
- `cli/src/commands/remove.js` — Comando remove (teste `cli/test/remove.test.js`)

## Notas

- Stack Node.js (ESM); apenas módulos nativos + commander no CLI.
- Trabalho novo nesta feature deve adicionar ACs forward-looking em spec.md e tasks correspondentes.
