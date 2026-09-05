#!/usr/bin/env node
// Greenfield elicitation: the script owns the interview state so a lighter
// model never has to remember what it already asked. Every command ends with
// the exact next command to run.

import path from 'node:path';
import { exists, parseArgs, readJson, readText, writeText } from './lib/sdd-utils.mjs';
import { resolveProject, scaffold } from './lib/scaffold.mjs';
import { slugify } from './lib/reverse.mjs';
import {
  ARTIFACT_ORDER,
  nextQuestion,
  questionById,
  questionsFor,
  renderValues,
  validateAnswer
} from './lib/questions.mjs';

const STATE_VERSION = 1;
const MAX_REJECTIONS = 2; // the third attempt is recorded as a clarification instead of blocking
const SELF = path.join(import.meta.dirname, 'interview.mjs');

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'next';

if (args.help || command === 'help') {
  console.log(`Usage: node scripts/interview.mjs <command> [--target DIR]

Commands:
  init [--artifact all|constitution|spec|plan|tasks] [--force]
                      Detect the project and start an interview in .sdd/interview.json
  next                Print the next unanswered question (verbatim text + rubric)
  answer --id Q-ID --raw "<user words>" --restated "<canonical rewrite>"
                      Record one answer. Rejected answers exit non-zero with REJECTED/RE-ASK.
  answer --id Q-ID --done
                      Close a repeating question once enough items were collected
  status              Show answered / remaining
  render [--force] [--owner NAME]
                      Scaffold the harness with the elicited answers

The interview is the "grilling": vague or malformed answers are rejected
mechanically, not by judgement. State lives on disk, so the session survives a
restart — always run "next" instead of guessing the next question.`);
  process.exit(0);
}

const target = path.resolve(args.target || process.cwd());
const statePath = path.join(target, '.sdd', 'interview.json');

function printNext(line) {
  console.log('');
  console.log(`NEXT: ${line}`);
}

function selfCmd(rest) {
  return `node ${SELF} ${rest} --target ${target}`;
}

async function loadState() {
  if (!await exists(statePath)) {
    console.error(`No interview found at ${statePath}.`);
    printNext(selfCmd('init'));
    process.exit(2);
  }
  let state;
  try {
    state = await readJson(statePath);
  } catch (error) {
    console.error(`Interview state is unreadable (${error.message}). Fix or delete ${statePath}.`);
    process.exit(2);
  }
  if (state.version !== STATE_VERSION) {
    console.error(`Interview state version ${state.version} is not supported by this skill version (${STATE_VERSION}).`);
    console.error(`Delete ${statePath} and start over with "init".`);
    process.exit(2);
  }
  return state;
}

async function saveState(state) {
  await writeText(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

// ---------------------------------------------------------------------------

async function cmdInit() {
  if (await exists(statePath) && !args.force) {
    console.error(`An interview already exists at ${statePath} (use --force to restart it).`);
    printNext(selfCmd('next'));
    process.exit(2);
  }
  const artifact = args.artifact || 'all';
  if (artifact !== 'all' && !ARTIFACT_ORDER.includes(artifact)) {
    console.error(`Unknown artifact "${artifact}". Use one of: all, ${ARTIFACT_ORDER.join(', ')}`);
    process.exit(2);
  }

  const { project, commands } = await resolveProject(target, { packageManager: args.packageManager });
  const questions = questionsFor(artifact);
  const defaults = {
    stack: project.stack === 'generic' ? '' : project.stack,
    testCommand: commands.find((entry) => /test/.test(entry)) ?? '',
    qualityCommand: commands.filter((entry) => !/install/.test(entry)).join(' && ')
  };

  const state = {
    version: STATE_VERSION,
    target,
    artifact,
    createdAt: new Date().toISOString(),
    project: { stack: project.stack, packageManager: project.packageManager, commands },
    detected: defaults,
    order: questions.map((question) => question.id),
    answers: {},
    rejections: {}
  };
  await saveState(state);

  console.log(`Interview started for ${target}`);
  console.log(`Detected stack: ${project.stack} | package manager: ${project.packageManager}`);
  console.log(`Questions to ask: ${state.order.length} (artifacts: ${artifact})`);
  console.log('');
  console.log('Ask ONE question per turn. Do not invent the next question — run "next".');
  printNext(selfCmd('next'));
}

function collectedCount(state, question) {
  const entry = state.answers[question.id];
  if (!entry) return 0;
  return Array.isArray(entry.items) ? entry.items.length : (entry.restated ? 1 : 0);
}

async function cmdNext() {
  const state = await loadState();
  const question = nextQuestion(state);
  if (!question) {
    console.log('All questions answered.');
    console.log('DONE');
    printNext(selfCmd('render'));
    return;
  }

  const position = state.order.indexOf(question.id) + 1;
  const fallback = question.defaultFrom ? state.detected?.[question.defaultFrom] : '';

  console.log(`QUESTION ${question.id}  [${position}/${state.order.length}]  -> ${question.artifact}.md`);
  console.log('');
  console.log(`ASK: ${question.ask}`);
  console.log(`WHY: ${question.why}`);
  console.log(`ACCEPT: ${question.accept}`);
  console.log(`REJECT: ${question.reject}`);
  console.log(`GOOD EXAMPLE: ${question.goodExample}`);
  console.log(`BAD EXAMPLE: ${question.badExample}`);
  if (fallback) console.log(`DETECTED DEFAULT: ${fallback}`);
  if (question.repeats) {
    console.log(`COLLECTED SO FAR: ${collectedCount(state, question)} item(s) (minimum ${question.minItems ?? 1})`);
  }
  console.log('');
  console.log('HOW TO RECORD IT:');
  console.log('  1. Paste the ASK line to the user verbatim (translate it if they are not writing in English).');
  console.log('  2. Rewrite their reply into the form ACCEPT describes, show them both, and get an explicit OK.');
  console.log('  3. Record it with the command below, then run "next" again.');
  if (question.repeats) {
    console.log(`     When they have no more items: ${selfCmd(`answer --id ${question.id} --done`)}`);
  }
  printNext(selfCmd(`answer --id ${question.id} --raw "<their words>" --restated "<your rewrite>"`));
}

async function cmdAnswer() {
  const state = await loadState();
  const id = args.id;
  const question = questionById(id);
  if (!question) {
    console.error(`Unknown question id: ${id}`);
    printNext(selfCmd('next'));
    process.exit(2);
  }
  if (!state.order.includes(id)) {
    console.error(`Question ${id} is not part of this interview (artifacts: ${state.artifact}).`);
    printNext(selfCmd('next'));
    process.exit(2);
  }

  if (args.done) {
    if (!question.repeats) {
      console.error(`${id} is not a repeating question; record an answer instead of --done.`);
      process.exit(2);
    }
    const count = collectedCount(state, question);
    const min = question.minItems ?? 1;
    if (count < min) {
      console.error(`REJECTED: ${id} needs at least ${min} item(s); ${count} recorded.`);
      console.error(`RE-ASK: ${question.ask}`);
      printNext(selfCmd(`answer --id ${id} --raw "<their words>" --restated "<your rewrite>"`));
      process.exit(1);
    }
    state.answers[id] = { ...(state.answers[id] ?? { items: [] }), done: true };
    await saveState(state);
    console.log(`CLOSED ${id} with ${count} item(s).`);
    printNext(selfCmd('next'));
    return;
  }

  const raw = args.rawFile ? await readText(path.resolve(args.rawFile)) : args.raw;
  const restated = args.restatedFile ? await readText(path.resolve(args.restatedFile)) : (args.restated ?? raw);
  if (typeof restated !== 'string' || restated.trim() === '') {
    console.error('Nothing to record: pass --restated (the canonical rewrite the user accepted).');
    process.exit(2);
  }

  const rejections = state.rejections[id] ?? 0;
  const verdict = validateAnswer(question, restated);
  let needsClarification = false;

  if (!verdict.ok) {
    if (rejections < MAX_REJECTIONS) {
      state.rejections[id] = rejections + 1;
      await saveState(state);
      console.error(`REJECTED: ${verdict.reason}`);
      console.error(`RE-ASK: ${verdict.reAsk}`);
      console.error(`Attempt ${rejections + 1} of ${MAX_REJECTIONS + 1}. Show the user why it was rejected and ask again.`);
      printNext(selfCmd(`answer --id ${id} --raw "<their words>" --restated "<your rewrite>"`));
      process.exit(1);
    }
    // Third attempt: record it, but flag it so the Clarify gate catches it.
    needsClarification = true;
    console.log(`ACCEPTED WITH CLARIFICATION: ${verdict.reason}`);
    console.log('Recorded as [NEEDS CLARIFICATION] so the interview is not blocked.');
  }

  const item = {
    raw: typeof raw === 'string' ? raw.trim() : restated.trim(),
    restated: restated.trim(),
    at: new Date().toISOString(),
    ...(needsClarification ? { needsClarification: true } : {})
  };

  if (question.repeats) {
    const entry = state.answers[id] ?? { items: [], done: false };
    entry.items = [...(entry.items ?? []), item];
    state.answers[id] = entry;
    console.log(`RECORDED ${id} item ${entry.items.length}: ${item.restated}`);
  } else {
    state.answers[id] = item;
    console.log(`RECORDED ${id}: ${item.restated}`);
  }
  state.rejections[id] = 0;
  await saveState(state);

  if (question.repeats) {
    console.log(`Ask whether they have another item. If not, close it: ${selfCmd(`answer --id ${id} --done`)}`);
    printNext(selfCmd(`answer --id ${id} --raw "<their words>" --restated "<your rewrite>"`));
    return;
  }
  printNext(selfCmd('next'));
}

async function cmdStatus() {
  const state = await loadState();
  let answered = 0;
  for (const id of state.order) {
    const question = questionById(id);
    const entry = state.answers[id];
    const complete = question.repeats ? entry?.done === true : Boolean(entry?.restated);
    if (complete) answered += 1;
    const mark = complete ? 'x' : ' ';
    const count = question.repeats ? ` (${collectedCount(state, question)} item(s))` : '';
    console.log(`[${mark}] ${id}  ${question.artifact}${count}`);
  }
  console.log('');
  console.log(`${answered}/${state.order.length} answered`);
  const pending = nextQuestion(state);
  printNext(pending ? selfCmd('next') : selfCmd('render'));
}

function clarificationsFrom(state) {
  const open = [];
  for (const id of state.order) {
    const entry = state.answers[id];
    if (!entry) continue;
    const items = Array.isArray(entry.items) ? entry.items : [entry];
    for (const item of items) {
      if (item?.needsClarification) open.push(`- \`[NEEDS CLARIFICATION: ${id} — ${item.restated}]\``);
    }
  }
  return open;
}

async function cmdRender() {
  const state = await loadState();
  const pending = nextQuestion(state);
  if (pending && !args.force) {
    console.error(`REJECTED: the interview is not finished — ${pending.id} is still open.`);
    console.error('Finish it, or pass --force to render with placeholder guidance for the rest.');
    printNext(selfCmd('next'));
    process.exit(1);
  }

  const values = renderValues(state);

  // Requirement coverage is derived, not asked: one row per acceptance criterion.
  const criteria = state.answers['Q-SPEC-AC']?.items ?? [];
  if (criteria.length > 0) {
    values.REQUIREMENT_COVERAGE = criteria
      .map((_, i) => `| FR-${i + 1} / AC-${i + 1} | <component / approach> |`)
      .join('\n');
  }

  const open = clarificationsFrom(state);
  values.OPEN_QUESTIONS = open.length > 0 ? open.join('\n') : '- _(none)_';

  const featureName = values.FEATURE_NAME ?? 'Example Feature';
  const featureId = values.FEATURE_NAME ? `001-${slugify(featureName)}` : '001-example';
  if (args.owner) values.OWNER = String(args.owner);

  const { results } = await scaffold({
    target,
    agentFile: args.agentFile || 'AGENTS.md',
    packageManager: args.packageManager,
    commands: state.project?.commands,
    force: Boolean(args.force),
    values,
    featureId,
    featureName
  });

  console.log(`Rendered SDD harness for ${target} from ${Object.keys(values).length} elicited value(s)`);
  for (const result of results) {
    console.log(`${result.status.toUpperCase()} ${path.relative(target, result.path)}${result.reason ? ` (${result.reason})` : ''}`);
  }
  if (open.length > 0) {
    console.log('');
    console.log(`${open.length} answer(s) landed as [NEEDS CLARIFICATION] — resolve them before leaving the Clarify phase.`);
  }
  console.log('');
  console.log('DONE');
  printNext(`review specs/${featureId}/spec.md, then advance the feature through the SDD gates`);
}

const COMMANDS = {
  init: cmdInit,
  next: cmdNext,
  answer: cmdAnswer,
  status: cmdStatus,
  render: cmdRender
};

const handler = COMMANDS[command];
if (!handler) {
  console.error(`Unknown command: ${command}. Try --help.`);
  process.exit(2);
}
await handler();
