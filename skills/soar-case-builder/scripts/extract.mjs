#!/usr/bin/env node
// Extrai candidatas SOAR de anotações cruas (arquivo ou stdin) e mostra o que
// passou no grilling automático e o que foi descartado, com o motivo.
// Nunca escreve nada — é um relatório para o modelo revisar com o usuário
// antes de alimentar case.mjs answer.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from './lib/soar-utils.mjs';
import { extractCandidates, renderReport } from './lib/extract.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Uso: node scripts/extract.mjs --file <notas.txt>   (ou --text "...")

Quebra o texto em candidatas por linha/frase, classifica cada uma em
Situation/Obstacle/Action/Result/Evidência por pista de palavra-chave, e roda
o mesmo grilling mecânico do case.mjs em cada uma. Nada é descartado sem
motivo visível — revise a lista com o usuário antes de registrar respostas.`);
  process.exit(0);
}

let rawText;
if (args.file) {
  rawText = await readFile(path.resolve(String(args.file)), 'utf8');
} else if (args.text) {
  rawText = String(args.text);
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  rawText = Buffer.concat(chunks).toString('utf8');
}

if (!rawText || !rawText.trim()) {
  console.error('REJECTED: nada para extrair — passe --file, --text, ou envie por stdin.');
  process.exit(2);
}

const extracted = extractCandidates(rawText);
console.log(renderReport(extracted));
console.log('');
console.log('NEXT: revise cada linha com o usuário (aproveitar / corrigir / descartar), depois node scripts/case.mjs init --case "<título>"');
