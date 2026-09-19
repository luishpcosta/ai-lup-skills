#!/usr/bin/env node
// Valida a ESTRUTURA de um case SOAR que a LLM escreveu.
//
// Não julga a qualidade do conteúdo — isso é da revisão (references/revisao.md).
// Aqui só: seção faltando, campo de cabeçalho faltando, placeholder esquecido,
// contrato de formato quebrado, carimbo contradizendo o corpo.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateCase } from './lib/case-schema.mjs';

const argv = process.argv.slice(2);
const args = {
  help: argv.includes('--help'),
  json: argv.includes('--json'),
  _: argv.filter((token) => !token.startsWith('--'))
};

if (args.help || args._.length === 0) {
  console.log(`Uso: node scripts/validate-case.mjs <cases/arquivo.md> [--json]

Checa se o case gerado respeita o contrato do template:
  - título e campos de cabeçalho (Squad/Papel, Quando, Método, Verificação, Última atualização)
  - as cinco seções obrigatórias (Situation, Obstacle, Action, Result, Evidência) preenchidas
  - nenhum placeholder/TODO esquecido
  - Result com número ou com [sem métrica: ...] explícito
  - Evidência com link/ticket ou "sem evidência disponível"
  - o carimbo de Verificação batendo com as ressalvas do corpo

Sai ≠0 quando há erro, listando exatamente o que corrigir.
NÃO avalia se o conteúdo é bom — isso é a revisão da IA.`);
  process.exit(args.help ? 0 : 2);
}

const filePath = path.resolve(String(args._[0]));
let markdown;
try {
  markdown = await readFile(filePath, 'utf8');
} catch (error) {
  console.error(`Não consegui ler ${filePath}: ${error.message}`);
  process.exit(2);
}

const { ok, errors, warnings } = validateCase(markdown);

if (args.json) {
  console.log(JSON.stringify({ file: filePath, ok, errors, warnings }, null, 2));
  process.exit(ok ? 0 : 1);
}

const name = path.basename(filePath);
for (const error of errors) console.error(`ERRO   ${error}`);
for (const warning of warnings) console.log(`AVISO  ${warning}`);

if (!ok) {
  console.error('');
  console.error(`${name}: ${errors.length} erro(s) de estrutura. Corrija o arquivo e rode de novo.`);
  process.exit(1);
}

console.log(`${name}: estrutura OK${warnings.length > 0 ? ` (${warnings.length} aviso(s))` : ''}.`);
console.log('');
console.log('NEXT: a estrutura passou — agora faça a revisão de conteúdo (references/revisao.md).');
