#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from './src/commands/add.js';
import { removeCommand } from './src/commands/remove.js';
import { updateCommand } from './src/commands/update.js';
import { listCommand } from './src/commands/list.js';

const program = new Command();

program
  .name('lup-skills')
  .description('Gerenciador de skills de IA para projetos locais')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('Lista as skills disponíveis no repositório central, agrupadas por linguagem')
  .option('--language <language>', 'Filtra skills por linguagem (ex.: agnostic, python)')
  .option('--tag <tag>', 'Filtra skills por tag')
  .action((options) => listCommand(options));

program
  .command('add <skill-name>')
  .description('Instala uma skill do repositório central no projeto atual')
  .action(addCommand);

program
  .command('remove <skill-name>')
  .description('Remove uma skill instalada no projeto atual')
  .action(removeCommand);

program
  .command('update <skill-name>')
  .description('Atualiza uma skill instalada: remove a versão antiga e reinstala a nova do repositório central')
  .action(updateCommand);

program.parse();
