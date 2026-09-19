#!/usr/bin/env node
// Grilling SOAR: entrevista guiada por script para montar um case de dossiê.
//
// O script guarda o estado e diz a próxima pergunta — o modelo só lê a
// pergunta, reescreve a resposta do usuário na forma canônica e pede o
// aceite. A validação de "isso é vago/dúbio/mal formatado" é mecânica
// (scripts/lib/validators.mjs), não depende do modelo lembrar de ser rigoroso.

import path from 'node:path';
import { exists, isoDate, parseArgs, readJson, renderTemplate, slugify, writeJson, writeText } from './lib/soar-utils.mjs';
import { QUESTIONS, contextFor, isSkippedOptional, nextQuestion, questionById, renderValues } from './lib/questions.mjs';
import { validateAnswer } from './lib/validators.mjs';

const STATE_VERSION = 1;
const MAX_REJECTIONS = 2;
const SELF = path.join(import.meta.dirname, 'case.mjs');

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'next';

if (args.help || command === 'help') {
  console.log(`Uso: node scripts/case.mjs <comando> [--target DIR] --case <slug-ou-titulo>

Comandos:
  init --case "<título>" [--target DIR]
                      Começa um case novo, cria .soar/<slug>.json
  next --case <slug>  Imprime a próxima pergunta não respondida (com a rubrica)
  answer --case <slug> --id Q-ID --raw "<palavras do usuário>" --restated "<sua reescrita>"
                      Registra uma resposta. Rejeitada sai ≠0 com REJECTED/RE-ASK.
  answer --case <slug> --id Q-ID --skip
                      Pula uma pergunta opcional (o usuário respondeu "pular")
  status --case <slug> Mostra respondidas / pendentes
  render --case <slug> [--force]
                      Escreve cases/<slug>.md a partir das respostas aceitas

O grilling é mecânico: uma resposta vaga, sem métrica, sem dono em 1ª pessoa,
ou sem data verificável é recusada com o motivo — não é o modelo que decide.`);
  process.exit(0);
}

const target = path.resolve(args.target || process.cwd());
const caseArg = args.case;
if (!caseArg && command !== 'help') {
  console.error('REJECTED: informe --case <slug-ou-título>.');
  process.exit(2);
}
const slug = command === 'init' ? slugify(caseArg) : slugify(caseArg);
const statePath = path.join(target, '.soar', `${slug}.json`);
const outputPath = path.join(target, 'cases', `${slug}.md`);

function printNext(line) {
  console.log('');
  console.log(`NEXT: ${line}`);
}

function selfCmd(rest) {
  return `node ${SELF} ${rest} --case ${slug} --target ${target}`;
}

async function loadState() {
  if (!await exists(statePath)) {
    console.error(`Nenhum case "${slug}" encontrado em ${statePath}.`);
    printNext(selfCmd(`init --case "${caseArg}"`));
    process.exit(2);
  }
  let state;
  try {
    state = await readJson(statePath);
  } catch (error) {
    console.error(`Estado ilegível (${error.message}). Corrija ou apague ${statePath}.`);
    process.exit(2);
  }
  if (state.version !== STATE_VERSION) {
    console.error(`Versão de estado ${state.version} não suportada por esta versão da skill (${STATE_VERSION}).`);
    console.error(`Apague ${statePath} e comece de novo com "init".`);
    process.exit(2);
  }
  return state;
}

async function saveState(state) {
  await writeJson(statePath, state);
}

// ---------------------------------------------------------------------------

async function cmdInit() {
  if (await exists(statePath) && !args.force) {
    console.error(`Já existe um case "${slug}" em ${statePath} (use --force para reiniciar).`);
    printNext(selfCmd('next'));
    process.exit(2);
  }
  const state = {
    version: STATE_VERSION,
    slug,
    createdAt: new Date().toISOString(),
    answers: {},
    rejections: {}
  };
  await saveState(state);
  console.log(`Case "${caseArg}" iniciado (slug: ${slug}).`);
  console.log(`Perguntas: ${QUESTIONS.length}`);
  console.log('');
  console.log('Faça UMA pergunta por turno. Não invente a próxima — rode "next".');
  printNext(selfCmd('next'));
}

async function cmdNext() {
  const state = await loadState();
  const question = nextQuestion(state);
  if (!question) {
    console.log('Todas as perguntas foram respondidas.');
    console.log('DONE');
    printNext(selfCmd('render'));
    return;
  }

  const position = QUESTIONS.indexOf(question) + 1;
  console.log(`PERGUNTA ${question.id}  [${position}/${QUESTIONS.length}]${question.optional ? '  (opcional)' : ''}`);
  console.log('');
  console.log(`PERGUNTE: ${question.ask}`);
  console.log(`POR QUÊ: ${question.why}`);
  console.log(`ACEITA SE: ${question.accept}`);
  console.log(`REJEITA SE: ${question.reject}`);
  console.log(`EXEMPLO BOM: ${question.goodExample}`);
  console.log(`EXEMPLO RUIM: ${question.badExample}`);
  console.log('');
  console.log('COMO REGISTRAR:');
  console.log('  1. Leia a linha PERGUNTE ao usuário, literalmente.');
  console.log('  2. Reescreva a resposta dele na forma que ACEITA SE pede, mostre as duas e peça confirmação explícita.');
  console.log('  3. Registre com o comando abaixo, depois rode "next" de novo.');
  if (question.optional) {
    console.log(`     Se o usuário disser "pular": ${selfCmd(`answer --id ${question.id} --skip`)}`);
  }
  printNext(selfCmd(`answer --id ${question.id} --raw "<palavras do usuário>" --restated "<sua reescrita>"`));
}

async function cmdAnswer() {
  const state = await loadState();
  const id = args.id;
  const question = questionById(id);
  if (!question) {
    console.error(`Pergunta desconhecida: ${id}`);
    printNext(selfCmd('next'));
    process.exit(2);
  }

  if (args.skip) {
    if (!question.optional) {
      console.error(`REJECTED: ${id} não é opcional — não pode ser pulada.`);
      process.exit(2);
    }
    state.answers[id] = { skipped: true, at: new Date().toISOString() };
    state.rejections[id] = 0;
    await saveState(state);
    console.log(`PULADO ${id}.`);
    printNext(selfCmd('next'));
    return;
  }

  const raw = args.raw;
  const restated = args.restated ?? raw;
  if (typeof restated !== 'string' || restated.trim() === '') {
    console.error('Nada para registrar: passe --restated (a reescrita que o usuário aceitou).');
    process.exit(2);
  }

  if (isSkippedOptional(question, restated)) {
    state.answers[id] = { skipped: true, at: new Date().toISOString() };
    state.rejections[id] = 0;
    await saveState(state);
    console.log(`PULADO ${id} (usuário respondeu "pular").`);
    printNext(selfCmd('next'));
    return;
  }

  const context = contextFor(state);
  const rejections = state.rejections[id] ?? 0;
  const verdict = validateAnswer(question, restated, context);
  let flagged = false;

  if (!verdict.ok) {
    if (rejections < MAX_REJECTIONS) {
      state.rejections[id] = rejections + 1;
      await saveState(state);
      console.error(`REJECTED: ${verdict.reason}`);
      console.error(`RE-ASK: ${verdict.reAsk}`);
      console.error(`Tentativa ${rejections + 1} de ${MAX_REJECTIONS + 1}. Explique o motivo ao usuário e pergunte de novo.`);
      printNext(selfCmd(`answer --id ${id} --raw "<palavras do usuário>" --restated "<sua reescrita>"`));
      process.exit(1);
    }
    flagged = true;
    console.log(`ACEITO COM RESSALVA: ${verdict.reason}`);
    console.log('Registrado marcado como [NÃO VERIFICADO] em vez de travar a entrevista.');
  }

  state.answers[id] = {
    raw: typeof raw === 'string' ? raw.trim() : restated.trim(),
    restated: flagged ? `${restated.trim()} _[NÃO VERIFICADO: ${verdict.reason}]_` : restated.trim(),
    at: new Date().toISOString(),
    ...(flagged ? { flagged: true } : {})
  };
  state.rejections[id] = 0;
  await saveState(state);
  console.log(`REGISTRADO ${id}: ${state.answers[id].restated}`);
  printNext(selfCmd('next'));
}

async function cmdStatus() {
  const state = await loadState();
  let answered = 0;
  for (const question of QUESTIONS) {
    const entry = state.answers[question.id];
    const done = Boolean(entry);
    if (done) answered += 1;
    console.log(`[${done ? 'x' : ' '}] ${question.id}${question.optional ? ' (opcional)' : ''}`);
  }
  console.log('');
  console.log(`${answered}/${QUESTIONS.length} respondidas`);
  const pending = nextQuestion(state);
  printNext(pending ? selfCmd('next') : selfCmd('render'));
}

async function cmdRender() {
  const state = await loadState();
  const pending = nextQuestion(state);
  if (pending && !args.force) {
    console.error(`REJECTED: a entrevista não terminou — ${pending.id} ainda está em aberto.`);
    console.error('Termine, ou use --force para renderizar com o que já foi respondido.');
    printNext(selfCmd('next'));
    process.exit(1);
  }

  const values = renderValues(state);
  const flaggedCount = Object.values(state.answers).filter((entry) => entry.flagged).length;
  values.VERIFICATION_STATUS = flaggedCount > 0
    ? `parcialmente verificado (${flaggedCount} resposta(s) marcada(s) [NÃO VERIFICADO])`
    : 'verificado no grilling';
  values.DATE = isoDate();

  if (!args.force && await exists(outputPath)) {
    console.error(`REJECTED: ${path.relative(target, outputPath)} já existe (use --force para sobrescrever).`);
    process.exit(1);
  }

  const rendered = await renderTemplate('case.md', values);
  await writeText(outputPath, rendered);

  console.log(`Case escrito em ${path.relative(target, outputPath)}`);
  if (flaggedCount > 0) {
    console.log(`${flaggedCount} resposta(s) ficaram marcadas [NÃO VERIFICADO] — revise antes de usar no dossiê.`);
  }
  console.log('');
  console.log('DONE');
}

const COMMANDS = { init: cmdInit, next: cmdNext, answer: cmdAnswer, status: cmdStatus, render: cmdRender };
const handler = COMMANDS[command];
if (!handler) {
  console.error(`Comando desconhecido: ${command}. Use --help.`);
  process.exit(2);
}
await handler();
