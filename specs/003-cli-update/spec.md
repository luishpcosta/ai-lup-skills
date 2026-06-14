# Spec: CLI — Comando update

**Feature ID:** 003-cli-update
**Phase:** verified
**Origin:** spec-first
**Last updated:** 2026-06-14

## Problema / Contexto

Quando uma skill do repositório central evolui, o usuário precisa propagar a nova
versão para os projetos onde a usa. Hoje isso exige `remove` seguido de `add`, manualmente.
O comando `update` automatiza a troca: para cada agente selecionado, garante que a skill
fique na versão atual do repositório central — substituindo a versão antiga (removendo
arquivos obsoletos) ou instalando do zero se ainda não existir naquele agente.

## Escopo

- Novo comando `lup-skills update <skill-name>`.
- Oferece **todos** os agentes suportados na seleção (instalados ou não).
- Por agente selecionado, a operação é uma troca limpa: apaga o diretório de destino
  (se existir) e copia a versão atual de forma plana e recursiva (mesma semântica do `add`),
  garantindo que arquivos que não existem mais na nova versão sejam removidos.
- Mensagem distingue "atualizada" (já existia) de "instalada" (não existia).

## Fora de Escopo (Não-objetivos)

- Comparação de versões / detecção de "já está atualizado" (a troca é sempre incondicional).
- Atualizar todas as skills de uma vez (`update --all`).

## Critérios de Aceite

Fonte `cli/src/commands/update.js`, teste `cli/test/update.test.js`:

- **AC-1** — updateCommand exibe erro e encerra com `exitCode 1` quando a skill não existe
  no repositório central (e não pergunta agentes). _(satisfaz T-1)_
- **AC-2** — updateCommand oferece todos os agentes suportados na seleção, estejam a skill
  instalada neles ou não. _(satisfaz T-1)_
- **AC-3** — updateCommand não altera nada quando nenhum agente é selecionado. _(satisfaz T-1)_
- **AC-4** — updateCommand substitui a versão antiga pela nova nos agentes onde a skill já
  existe, removendo arquivos obsoletos. _(satisfaz T-1)_
- **AC-5** — updateCommand instala a skill no agente selecionado que ainda não a possui.
  _(satisfaz T-1)_

## Edge cases

- Skill inexistente no repositório central → erro (AC-1).
- Arquivos que existiam só na versão antiga devem desaparecer após o update (AC-4).
- Agente selecionado sem a skill → instalação limpa, sem erro (AC-5).
