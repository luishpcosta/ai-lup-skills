// Question bank + pure validators for the greenfield elicitation ("grilling").
//
// The bank is data, and the validators are mechanical: that is what lets a
// lighter model run the interview. The model never decides whether an answer
// is good enough — validateAnswer() does, and it always says why.

const VAGUE_TERMS = [
  'works well', 'work well', 'good ux', 'user friendly', 'user-friendly',
  'easy to use', 'fast', 'performant', 'scalable', 'robust', 'clean',
  'high quality', 'best practices', 'modern', 'nice', 'simple',
  'funciona bem', 'facil de usar', 'fácil de usar', 'rapido', 'rápido',
  'boa experiencia', 'boa experiência', 'boas praticas', 'boas práticas',
  'de qualidade', 'bonito', 'melhor possivel', 'melhor possível'
];

const RUNNER_WORDS = [
  'npm', 'pnpm', 'yarn', 'bun', 'npx', 'node', 'deno', 'python', 'python3', 'py',
  'pytest', 'tox', 'poetry', 'uv', 'go', 'cargo', 'mvn', 'gradle', './gradlew',
  'dotnet', 'make', 'bash', 'sh', 'ruby', 'rake', 'bundle', 'composer', 'php',
  'jest', 'vitest', 'mocha', 'eslint', 'prettier', 'ruff', 'black', 'mypy', 'tsc',
  'docker', 'just', 'task', 'swift', 'xcodebuild'
];

const TECH_LEAK_WORDS = [
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'express', 'fastify',
  'django', 'flask', 'rails', 'spring', 'postgres', 'postgresql', 'mysql',
  'sqlite', 'mongodb', 'redis', 'kafka', 'rabbitmq', 'graphql', 'grpc',
  'docker', 'kubernetes', 'terraform', 'lambda', 's3', 'dynamodb', 'typescript',
  'javascript', 'python', 'golang', 'rust'
];

const FILE_HINT = /(^|\s|\/|`)[\w.-]+\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|rb|php|sql|yml|yaml|json)\b/i;
const PATH_HINT = /(^|\s|`)(src|lib|app|packages|internal)\//i;

function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/[`*_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstToken(text) {
  return String(text ?? '').trim().replace(/^[`$\s]+/, '').split(/\s+/)[0] ?? '';
}

// ---------------------------------------------------------------------------
// Validators — each returns null when the answer passes, or a reason string.
// ---------------------------------------------------------------------------

export function nonEmpty(text) {
  return normalize(text).length >= 3 ? null : 'the answer is empty or too short';
}

export function minWords(text, min = 4) {
  const words = normalize(text).split(' ').filter(Boolean);
  return words.length >= Number(min)
    ? null
    : `the answer has ${words.length} word(s); at least ${min} are needed to be actionable`;
}

export function isSpecificEnough(text) {
  const lower = normalize(text);
  const hit = VAGUE_TERMS.find((term) => lower.includes(term));
  return hit ? `"${hit}" is not observable — say what is measurably true instead` : null;
}

export function isCommandLike(text) {
  const vague = isSpecificEnough(text);
  if (vague) return vague;
  const raw = String(text ?? '').trim();
  if (!raw) return 'the answer is empty';
  const token = firstToken(raw).toLowerCase();
  const looksLikeRunner = RUNNER_WORDS.includes(token) || RUNNER_WORDS.includes(token.replace(/^\.\//, ''));
  const looksLikePath = token.startsWith('./') || token.startsWith('/') || token.includes('/');
  const hasFlag = /\s-{1,2}\w/.test(raw);
  return looksLikeRunner || looksLikePath || hasFlag
    ? null
    : 'this is not a runnable command — give the exact command line an agent can execute';
}

export function isGivenWhenThen(text) {
  const lower = normalize(text);
  const has = (...markers) => markers.some((marker) => lower.includes(marker));
  const missing = [];
  if (!has('given', 'dado ')) missing.push('a starting context (Given)');
  if (!has('when', 'quando')) missing.push('an action (When)');
  if (!has('then', 'então', 'entao')) missing.push('an observable outcome (Then)');
  return missing.length === 0
    ? null
    : `the criterion is missing ${missing.join(' and ')} — write it as "Given …, when …, then …"`;
}

export function hasNoImplementationLeak(text) {
  const raw = String(text ?? '');
  if (FILE_HINT.test(raw)) return 'a file name leaked into a WHAT/WHY answer — keep file names for plan.md';
  if (PATH_HINT.test(raw)) return 'a source path leaked into a WHAT/WHY answer — keep paths for plan.md';
  const lower = normalize(raw);
  const hit = TECH_LEAK_WORDS.find((word) => new RegExp(`\\b${word.replace('.', '\\.')}\\b`).test(lower));
  return hit ? `"${hit}" is an implementation choice — it belongs in plan.md, not in the spec` : null;
}

export const VALIDATORS = {
  nonEmpty,
  minWords,
  isSpecificEnough,
  isCommandLike,
  isGivenWhenThen,
  hasNoImplementationLeak
};

/**
 * Run a question's validator chain against a candidate answer.
 * Returns { ok } or { ok: false, reason, reAsk }.
 */
export function validateAnswer(question, text) {
  for (const spec of question.validate ?? ['nonEmpty']) {
    const [name, arg] = String(spec).split(':');
    const validator = VALIDATORS[name];
    if (!validator) throw new Error(`Unknown validator: ${name}`);
    const reason = arg === undefined ? validator(text) : validator(text, arg);
    if (reason) {
      return {
        ok: false,
        reason,
        reAsk: `${question.ask} (${question.accept}${question.goodExample ? ` Example: ${question.goodExample}` : ''})`
      };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------------

export const QUESTIONS = [
  // ---- constitution.md ----
  {
    id: 'Q-CONST-PURPOSE',
    artifact: 'constitution',
    fills: 'PROJECT_PURPOSE',
    renderAs: 'text',
    ask: 'In one sentence: what does this project do, and for whom?',
    why: 'It anchors every spec — a feature that does not serve this is out of scope.',
    accept: 'One sentence naming a concrete user and a concrete outcome.',
    reject: '"a modern platform", "a good tool" — no user, no outcome.',
    goodExample: 'A CLI that installs shared AI skills into a developer\'s local project.',
    badExample: 'A modern, scalable developer platform.',
    validate: ['nonEmpty', 'minWords:5', 'isSpecificEnough']
  },
  {
    id: 'Q-CONST-STACK',
    artifact: 'constitution',
    fills: 'TECH_STACK',
    renderAs: 'text',
    ask: 'What language, runtime and framework must every change stay within?',
    why: 'Plans that reach outside this must be escalated instead of improvised.',
    accept: 'Named language/runtime, plus any framework or "no external dependencies".',
    reject: '"whatever fits" — the constraint has to be checkable.',
    goodExample: 'Node.js 20 (ESM), no external runtime dependencies.',
    badExample: 'Modern JavaScript.',
    defaultFrom: 'stack',
    validate: ['nonEmpty', 'isSpecificEnough']
  },
  {
    id: 'Q-CONST-TEST',
    artifact: 'constitution',
    fills: 'TEST_FRAMEWORK',
    renderAs: 'text',
    ask: 'Which test runner proves a change works, and how is it invoked?',
    why: 'Every acceptance criterion has to be provable by this command.',
    accept: 'A runnable command line.',
    reject: '"unit tests", "we test manually" — not commands.',
    goodExample: '`npm test` (node --test)',
    badExample: 'We run the tests.',
    defaultFrom: 'testCommand',
    validate: ['nonEmpty', 'isCommandLike']
  },
  {
    id: 'Q-CONST-STYLE',
    artifact: 'constitution',
    fills: 'STYLE_LINT',
    renderAs: 'text',
    ask: 'How is style enforced — linter, formatter, or an explicit "none"?',
    why: 'Without this an agent reformats files on every touch and buries the real diff.',
    accept: 'A tool (ideally with its command), or an explicit "none".',
    reject: 'Silence — "none" is a valid answer, blank is not.',
    goodExample: '`npm run lint` (eslint) + prettier on commit',
    badExample: '(blank)',
    validate: ['nonEmpty']
  },
  {
    id: 'Q-CONST-QUALITY',
    artifact: 'constitution',
    fills: 'QUALITY_BAR',
    renderAs: 'text',
    ask: 'Which command(s) must pass before any change counts as done, and at what threshold?',
    why: 'This becomes the mechanical definition of done for every feature.',
    accept: 'Command(s) with an explicit threshold when one applies.',
    reject: '"code review", "make sure it is good" — not executable.',
    goodExample: '`npm run test:coverage` with coverage above 90% on src/**',
    badExample: 'High quality code.',
    defaultFrom: 'qualityCommand',
    validate: ['nonEmpty', 'isCommandLike']
  },
  {
    id: 'Q-CONST-BOUNDARIES',
    artifact: 'constitution',
    fills: 'ARCH_BOUNDARIES',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Name one architectural boundary an agent must never cross (a layer that must not import another, a directory that must stay dependency-free, data that must not leave a module). Add them one at a time.',
    why: 'Boundaries are what agents violate first when they improvise.',
    accept: 'A rule stated as "X must not Y".',
    reject: '"keep it clean", "good separation" — not checkable.',
    goodExample: 'Command modules must not import each other; shared logic lives in utils.',
    badExample: 'Keep a clean architecture.',
    validate: ['nonEmpty', 'isSpecificEnough', 'minWords:4']
  },
  {
    id: 'Q-CONST-PRINCIPLE',
    artifact: 'constitution',
    fills: 'EXTRA_PRINCIPLES',
    renderAs: 'bullets',
    repeats: true,
    minItems: 0,
    ask: 'Any other non-negotiable rule specific to this project (commit convention, security rule, review rule)? Add them one at a time, or finish this question if there are none.',
    why: 'Recorded rules get honored; unrecorded ones get rediscovered the hard way.',
    accept: 'An imperative rule an agent can obey or violate.',
    reject: 'A wish rather than a rule.',
    goodExample: 'Commits follow Conventional Commits, in the imperative, atomic.',
    badExample: 'Write good commits.',
    validate: ['nonEmpty', 'minWords:4']
  },

  // ---- spec.md (first feature) ----
  {
    id: 'Q-SPEC-NAME',
    artifact: 'spec',
    fills: 'FEATURE_NAME',
    renderAs: 'text',
    ask: 'What is the first feature called? A short noun phrase.',
    why: 'It becomes the feature folder and the title of every artifact.',
    accept: 'Two to five words naming a capability.',
    reject: 'A whole sentence, or a technology name.',
    goodExample: 'Skill install command',
    badExample: 'We need to build the thing that installs stuff with React.',
    validate: ['nonEmpty', 'hasNoImplementationLeak']
  },
  {
    id: 'Q-SPEC-PROBLEM',
    artifact: 'spec',
    fills: 'PROBLEM',
    renderAs: 'text',
    ask: 'What problem does this feature solve, and what happens today without it?',
    why: 'WHY comes before WHAT; a spec without a problem cannot be cut down when scope grows.',
    accept: 'A concrete pain plus the current workaround or cost.',
    reject: 'Any mention of files, frameworks or APIs — that is plan.md.',
    goodExample: 'Users copy skill folders by hand into every project and they drift out of sync.',
    badExample: 'We need an Express endpoint in src/api.js.',
    validate: ['nonEmpty', 'minWords:6', 'isSpecificEnough', 'hasNoImplementationLeak']
  },
  {
    id: 'Q-SPEC-USER',
    artifact: 'spec',
    fills: 'USER_STORIES',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Give one user story: as <role>, I want <capability>, so that <benefit>. Add them one at a time.',
    why: 'Every acceptance criterion has to trace back to someone who wanted it.',
    accept: 'Role, capability and benefit, all three present.',
    reject: 'A feature description with no role or no benefit.',
    goodExample: 'As a developer, I want to install a skill with one command, so that every project uses the same version.',
    badExample: 'Add an install command.',
    validate: ['nonEmpty', 'minWords:8', 'hasNoImplementationLeak']
  },
  {
    id: 'Q-SPEC-FR',
    artifact: 'spec',
    fills: 'FUNCTIONAL_REQUIREMENTS',
    renderAs: 'requirements',
    repeats: true,
    minItems: 1,
    ask: 'State one observable requirement — something the system must do that you could point at. Add them one at a time.',
    why: 'Requirements are what the plan has to cover, one by one.',
    accept: 'A single observable behavior, no implementation.',
    reject: 'Two requirements in one sentence, or a technical design.',
    goodExample: 'The command reports which agents received the skill.',
    badExample: 'Use fs.cpSync to copy the folder recursively.',
    validate: ['nonEmpty', 'minWords:5', 'isSpecificEnough', 'hasNoImplementationLeak']
  },
  {
    id: 'Q-SPEC-AC',
    artifact: 'spec',
    fills: 'ACCEPTANCE_CRITERIA',
    renderAs: 'criteria',
    repeats: true,
    minItems: 1,
    ask: 'Give one acceptance criterion in the form: Given <context>, when <action>, then <observable outcome>. Add them one at a time.',
    why: 'This is the only thing verification is measured against.',
    accept: 'All three parts present, with an outcome someone could check.',
    reject: 'A criterion whose outcome cannot be observed from outside.',
    goodExample: 'Given the skill is not installed, when the user runs add, then the folder appears under .claude/skills and the command exits 0.',
    badExample: 'The install works well.',
    validate: ['nonEmpty', 'isGivenWhenThen', 'isSpecificEnough']
  },
  {
    id: 'Q-SPEC-EDGE',
    artifact: 'spec',
    fills: 'EDGE_CASES',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Name one edge case — empty input, missing file, conflict, permission denied, concurrent run — and what should happen. Add them one at a time.',
    why: 'Unstated edge cases are where agents invent behavior.',
    accept: 'A boundary condition plus the expected behavior.',
    reject: 'A condition with no stated expected behavior.',
    goodExample: 'If the skill is already installed, the command replaces it and says so instead of failing.',
    badExample: 'Handle errors.',
    validate: ['nonEmpty', 'minWords:6', 'isSpecificEnough']
  },
  {
    id: 'Q-SPEC-NONGOAL',
    artifact: 'spec',
    fills: 'NON_GOALS',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Name something this feature explicitly will NOT do, that a reader might otherwise assume. Add them one at a time.',
    why: 'Non-goals are the cheapest defense against an agent overreaching.',
    accept: 'A capability deliberately excluded.',
    reject: '"nothing" — there is always at least one nearby thing you are not building.',
    goodExample: 'It does not resolve version conflicts between two installed copies.',
    badExample: 'Nothing.',
    validate: ['nonEmpty', 'minWords:4']
  },

  // ---- plan.md ----
  {
    id: 'Q-PLAN-APPROACH',
    artifact: 'plan',
    fills: 'TECHNICAL_APPROACH',
    renderAs: 'text',
    ask: 'How will the acceptance criteria be satisfied, in two or three sentences? Now implementation detail is welcome.',
    why: 'The plan is where HOW belongs; the spec stays free of it.',
    accept: 'A strategy naming the moving parts.',
    reject: 'A restatement of the spec.',
    goodExample: 'A command module resolves the skill folder, then copies it into each selected agent directory, reporting per agent.',
    badExample: 'Implement the feature.',
    validate: ['nonEmpty', 'minWords:8', 'isSpecificEnough']
  },
  {
    id: 'Q-PLAN-COMPONENTS',
    artifact: 'plan',
    fills: 'COMPONENTS',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Name one component/module this feature adds or changes, and its single responsibility. Add them one at a time.',
    why: 'A component without a stated responsibility grows into a dumping ground.',
    accept: 'Name plus one responsibility.',
    reject: 'A name with no responsibility.',
    goodExample: 'commands/add.js — resolves the skill and copies it per selected agent.',
    badExample: 'The main module.',
    validate: ['nonEmpty', 'minWords:4']
  },
  {
    id: 'Q-PLAN-CONTRACTS',
    artifact: 'plan',
    fills: 'CONTRACTS',
    renderAs: 'text',
    ask: 'What interface does this expose or change — function signatures, CLI flags, endpoints, events, file formats?',
    why: 'Contracts are what other code depends on; changing them silently breaks callers.',
    accept: 'Concrete signatures, flags or schema names.',
    reject: '"the usual interface".',
    goodExample: 'add(skillName, { agents, prompt }) -> Promise<{ installed: string[] }>; CLI: lup-skills add <skill>',
    badExample: 'A normal API.',
    validate: ['nonEmpty', 'minWords:4', 'isSpecificEnough']
  },
  {
    id: 'Q-PLAN-DATA',
    artifact: 'plan',
    fills: 'DATA_MODEL',
    renderAs: 'text',
    ask: 'What data does this feature read or write — entities, fields, files, migrations? Say "none" if it is stateless.',
    why: 'State is where features leak into each other.',
    accept: 'Named entities/files, or an explicit "none".',
    reject: 'Silence — "none" is an answer, blank is not.',
    goodExample: 'None — the command is stateless; it only touches the target skill folder.',
    badExample: '(blank)',
    validate: ['nonEmpty']
  },
  {
    id: 'Q-PLAN-DECISION',
    artifact: 'plan',
    fills: 'KEY_DECISIONS',
    renderAs: 'decisions',
    repeats: true,
    minItems: 1,
    ask: 'Give one key decision as: decision | choice | alternatives considered | rationale. Add them one at a time.',
    why: 'The next session needs to know what was already ruled out, and why.',
    accept: 'All four parts, separated by |.',
    reject: 'A choice with no alternative and no rationale.',
    goodExample: 'Copy strategy | full recursive copy | symlink, sparse copy | works on every OS and survives skill deletion',
    badExample: 'We chose the best option.',
    validate: ['nonEmpty', 'minWords:5']
  },
  {
    id: 'Q-PLAN-RISK',
    artifact: 'plan',
    fills: 'RISKS',
    renderAs: 'bullets',
    repeats: true,
    minItems: 1,
    ask: 'Name one risk and its mitigation. Add them one at a time.',
    why: 'A risk with no mitigation is a surprise waiting for the verify phase.',
    accept: 'Risk plus what reduces it.',
    reject: 'A risk with no mitigation.',
    goodExample: 'Overwriting a locally edited skill — mitigated by asking before replacing.',
    badExample: 'It might break.',
    validate: ['nonEmpty', 'minWords:5']
  },

  // ---- tasks.md ----
  {
    id: 'Q-TASKS-LIST',
    artifact: 'tasks',
    fills: 'TASKS_TABLE',
    renderAs: 'tasks',
    repeats: true,
    minItems: 1,
    ask: 'Give one task as: task description | AC-ids it satisfies. Add them one at a time, in the order they should be done.',
    why: 'The Tasks gate needs every AC covered by at least one task.',
    accept: 'A task small enough to finish in one sitting, plus the AC it proves.',
    reject: 'A task that references no AC.',
    goodExample: 'Copy the skill folder into each selected agent path | AC-1, AC-2',
    badExample: 'Build the feature',
    validate: ['nonEmpty', 'minWords:4']
  }
];

export const ARTIFACT_ORDER = ['constitution', 'spec', 'plan', 'tasks'];

export function questionsFor(artifact) {
  if (artifact === 'all' || artifact === undefined) return [...QUESTIONS];
  return QUESTIONS.filter((question) => question.artifact === artifact);
}

export function questionById(id) {
  return QUESTIONS.find((question) => question.id === id);
}

/** A question is complete when it has an answer (or, when repeating, was closed). */
export function isComplete(question, entry) {
  if (!entry) return false;
  if (question.repeats) return entry.done === true;
  return typeof entry.restated === 'string' && entry.restated.length > 0;
}

/** The next question to ask for this interview state, or null when finished. */
export function nextQuestion(state) {
  for (const id of state.order) {
    const question = questionById(id);
    if (!question) continue;
    if (!isComplete(question, state.answers[id])) return question;
  }
  return null;
}

function itemsOf(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.items)) return entry.items.map((item) => item.restated);
  return entry.restated ? [entry.restated] : [];
}

function renderEntry(question, entry) {
  const items = itemsOf(entry);
  if (items.length === 0) return '';
  switch (question.renderAs) {
    case 'bullets':
      return items.map((item) => `- ${item}`).join('\n');
    case 'requirements':
      return items.map((item, i) => `- FR-${i + 1}: ${item}`).join('\n');
    case 'criteria':
      return items.map((item, i) => `- **AC-${i + 1}** — ${item}`).join('\n');
    case 'decisions':
      return items.map((item) => {
        const [decision = '', choice = '', alternatives = '', rationale = ''] = item.split('|').map((part) => part.trim());
        return `| ${decision} | ${choice} | ${alternatives} | ${rationale} |`;
      }).join('\n');
    case 'tasks':
      return items.map((item, i) => {
        const [task = '', satisfies = ''] = item.split('|').map((part) => part.trim());
        return `| T-${i + 1} | ${task} | ${satisfies || 'AC-1'} | todo | |`;
      }).join('\n');
    default:
      return items.join('\n\n');
  }
}

/** Map of template placeholder -> rendered markdown, from a finished interview. */
export function renderValues(state) {
  const values = {};
  for (const id of state.order) {
    const question = questionById(id);
    if (!question) continue;
    const rendered = renderEntry(question, state.answers[id]);
    if (rendered) values[question.fills] = rendered;
  }
  return values;
}
