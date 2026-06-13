#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from './src/commands/add.js';
import { removeCommand } from './src/commands/remove.js';
import { listCommand } from './src/commands/list.js';

const program = new Command();

program
  .name('lup-skills')
  .description('Gerenciador de skills de IA para projetos locais')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('Lista as skills disponíveis no repositório central')
  .action(listCommand);

program
  .command('add <skill-name>')
  .description('Instala uma skill do repositório central no projeto atual')
  .action(addCommand);

program
  .command('remove <skill-name>')
  .description('Remove uma skill instalada no projeto atual')
  .action(removeCommand);

program.parse();
