# Spec (reverse-engineered): CLI — Comandos (add/list/remove)

**Feature ID:** 001-cli-commands
**Phase:** documented
**Origin:** reverse-engineered from existing code
**Last updated:** 2026-06-13

> Reconstruído do comportamento atual (critérios derivados dos testes existentes).
> Revisar contra o comportamento *pretendido* antes de avançar para `verified`/`done`.

## Problema / Contexto

Comandos do CLI lup-skills para instalar, listar e remover skills em um projeto.

## Comportamento Atual (observado no código)

Arquivos-fonte:
- `cli/src/commands/add.js`
- `cli/src/commands/list.js`
- `cli/src/commands/remove.js`

Superfície pública:
- `addCommand`
- `listCommand`
- `removeCommand`

Testes que cobrem esta feature:
- `cli/test/add.test.js`
- `cli/test/list.test.js`
- `cli/test/remove.test.js`

## Critérios de Aceite (reconstruídos)

_Comando add_ — fonte `cli/src/commands/add.js`, teste `cli/test/add.test.js`:
- **AC-1** — addCommand exibe erro quando a skill não existe _(satisfaz T-1)_
- **AC-2** — addCommand não copia nada quando nenhum agente é selecionado _(satisfaz T-1)_
- **AC-3** — addCommand copia a skill para os agentes selecionados _(satisfaz T-1)_
- **AC-4** — addCommand encontra skill aninhada em categoria e instala de forma plana _(satisfaz T-1)_

_Comando list_ — fonte `cli/src/commands/list.js`, teste `cli/test/list.test.js`:
- **AC-5** — listCommand mostra "Nenhuma skill disponível." quando o diretório não existe _(satisfaz T-2)_
- **AC-6** — listCommand agrupa por language seguindo o frontmatter, não as pastas _(satisfaz T-2)_
- **AC-7** — listCommand filtra por --language _(satisfaz T-2)_
- **AC-8** — listCommand filtra por --tag _(satisfaz T-2)_
- **AC-9** — listCommand informa quando o filtro não retorna nada _(satisfaz T-2)_
- **AC-10** — listCommand mostra "Nenhuma skill disponível." quando o diretório está vazio _(satisfaz T-2)_

_Comando remove_ — fonte `cli/src/commands/remove.js`, teste `cli/test/remove.test.js`:
- **AC-11** — removeCommand informa quando a skill não está instalada _(satisfaz T-3)_
- **AC-12** — removeCommand não remove nada quando nenhum agente é selecionado _(satisfaz T-3)_
- **AC-13** — removeCommand remove a skill dos agentes selecionados _(satisfaz T-3)_

## Assumptions / To Confirm

- [ ] Confirmar que cada AC reflete o comportamento *pretendido*, não apenas o atual.
- [ ] Verificar edge cases não cobertos pelos testes existentes.

## Fora de Escopo (Não-objetivos)

- Novos comandos/utilitários ainda não implementados (entram como specs novas, spec-first).
