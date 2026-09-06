// Cheap, bounded reconnaissance for brownfield adoption.
//
// The point is to reconstruct specs WITHOUT reading the codebase into the
// model's context. These extractors only ever emit declarations, doc comments,
// test names and commit subjects — never a function body — and applyBudget()
// caps how much of that reaches the digest.

import { extOf, isTestFile } from './reverse.mjs';

function stemOf(file) {
  const base = file.split('/').pop() ?? '';
  return base
    .replace(/\.(test|spec)\.[^.]+$/, '')
    .replace(/^test_/, '')
    .replace(/_test\.[^.]+$/, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase();
}

/**
 * Test files usually live outside the source root (test/, __tests__/), so
 * groupIntoModules never sees them. Attach them to the module whose source
 * files they are named after — tests are the strongest evidence available and
 * losing them would rank a well-tested module as if it had none.
 */
export function attachExternalTests(files, modules) {
  const assigned = new Set(modules.flatMap((module) => module.testFiles));
  const byStem = new Map();
  for (const module of modules) {
    for (const file of module.sourceFiles) {
      const stem = stemOf(file);
      if (!byStem.has(stem)) byStem.set(stem, module);
    }
    const moduleStem = module.name.toLowerCase();
    if (!byStem.has(moduleStem)) byStem.set(moduleStem, module);
  }

  for (const file of files) {
    if (assigned.has(file) || !isTestFile(file)) continue;
    const module = byStem.get(stemOf(file));
    if (module) module.testFiles.push(file);
  }
  return modules;
}

/**
 * The evidence ladder, cheapest rung first. A module starts at rung 1 and is
 * escalated one rung at a time, on demand, when its draft spec is too thin.
 */
export const RUNGS = [
  { rung: 1, signals: ['testNames', 'exports'], describes: 'de-facto specs and public surface' },
  { rung: 2, signals: ['testNames', 'exports', 'signatures', 'headDocs'], describes: 'contracts and declared intent' },
  { rung: 3, signals: ['testNames', 'exports', 'signatures', 'headDocs', 'gitSubjects'], describes: 'why the module changed over time' }
];

export const SIGNAL_PRIORITY = ['testNames', 'headDocs', 'signatures', 'exports', 'gitSubjects'];

export function signalsForRung(rung) {
  const entry = RUNGS.find((candidate) => candidate.rung === Number(rung)) ?? RUNGS[0];
  return entry.signals;
}

const JS_SIGNATURE = /^\s*(export\s+)?(export\s+default\s+)?(async\s+)?(function\s*\*?\s+[\w$]+\s*\([^)]*\)|class\s+[\w$]+(\s+extends\s+[\w$.]+)?|(const|let|var)\s+[\w$]+\s*=\s*(async\s*)?\([^)]*\)\s*=>)/;
const PY_SIGNATURE = /^\s*(async\s+)?(def\s+\w+\s*\([^)]*\)|class\s+\w+\s*(\([^)]*\))?)\s*:/;
const GO_SIGNATURE = /^\s*(func\s+(\([^)]*\)\s*)?\w+\s*\([^)]*\)|type\s+\w+\s+\w+)/;

/**
 * Declaration lines only — the signature, never the body. A line is kept as-is
 * minus its trailing brace, so nothing below the declaration can leak.
 */
export function extractSignatures(content, ext, { maxLines = 40 } = {}) {
  const pattern = ext === '.py' ? PY_SIGNATURE : ext === '.go' ? GO_SIGNATURE : JS_SIGNATURE;
  const signatures = [];
  for (const line of String(content ?? '').split('\n')) {
    if (signatures.length >= maxLines) break;
    if (line.length > 200) continue;
    if (!pattern.test(line)) continue;
    const cleaned = line.trim().replace(/\s*[{:]\s*$/, '').replace(/\s*=>\s*$/, ' => …');
    if (cleaned) signatures.push(cleaned);
  }
  return [...new Set(signatures)];
}

/** The doc comment at the top of a file — declared intent, capped. */
export function extractHeadDoc(content, ext, { maxLines = 6 } = {}) {
  const lines = String(content ?? '').split('\n');
  const collected = [];
  let index = 0;

  while (index < lines.length && lines[index].trim() === '') index += 1;
  if (index >= lines.length) return [];

  const first = lines[index].trim();
  const isPython = ext === '.py';

  if (isPython && /^("""|''')/.test(first)) {
    const quote = first.slice(0, 3);
    let line = first.slice(3);
    while (index < lines.length && collected.length < maxLines) {
      const end = line.indexOf(quote);
      collected.push((end === -1 ? line : line.slice(0, end)).trim());
      if (end !== -1) break;
      index += 1;
      line = lines[index] ?? '';
    }
  } else if (first.startsWith('/*')) {
    while (index < lines.length && collected.length < maxLines) {
      const line = lines[index].trim().replace(/^\/\*+/, '').replace(/\*+\/$/, '').replace(/^\*\s?/, '');
      collected.push(line.trim());
      if (lines[index].includes('*/')) break;
      index += 1;
    }
  } else {
    const commentStart = isPython ? '#' : '//';
    while (index < lines.length && collected.length < maxLines && lines[index].trim().startsWith(commentStart)) {
      collected.push(lines[index].trim().replace(/^(\/\/|#)\s?/, ''));
      index += 1;
    }
  }

  return collected.filter(Boolean);
}

/** Parse `git log --format=%s` output into unique, non-noise subjects. */
export function parseGitSubjects(stdout, { max = 8 } = {}) {
  const subjects = String(stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Merge (branch|pull request)/i.test(line));
  return [...new Set(subjects)].slice(0, max);
}

/**
 * Evidence strength, so the user is offered the modules worth documenting
 * first. Tests dominate: they are the only signal that states intent.
 */
export function scoreModule(module, evidence = {}) {
  const count = (key) => (evidence[key] ?? []).length;
  return (count('testNames') > 0 ? 40 : 0)
    + Math.min(count('testNames'), 10)
    + (count('headDocs') > 0 ? 20 : 0)
    + Math.min(count('signatures'), 10)
    + Math.min(count('exports'), 10)
    + (module.sourceFiles.length > 1 ? 5 : 0);
}

/**
 * Cap total evidence lines for one module, spending the budget in priority
 * order. Returns the trimmed evidence plus whether anything was dropped.
 */
export function applyBudget(evidence, budget = 40) {
  const limited = {};
  let remaining = Math.max(0, Number(budget));
  let truncated = false;

  for (const signal of SIGNAL_PRIORITY) {
    const items = evidence[signal] ?? [];
    if (items.length === 0) {
      limited[signal] = [];
      continue;
    }
    const take = Math.min(items.length, remaining);
    limited[signal] = items.slice(0, take);
    if (take < items.length) truncated = true;
    remaining -= take;
  }

  return { evidence: limited, truncated };
}

export function countEvidence(evidence) {
  return SIGNAL_PRIORITY.reduce((total, signal) => total + (evidence[signal] ?? []).length, 0);
}

const SIGNAL_LABELS = {
  testNames: 'test names (de-facto specs)',
  headDocs: 'declared intent (head doc comments)',
  signatures: 'declarations (signature lines only)',
  exports: 'public surface',
  gitSubjects: 'commit subjects'
};

/** Human-readable digest for one module — this is all the model ever reads. */
export function renderDigest(entry) {
  const lines = [
    `MODULE ${entry.name}  (score ${entry.score}, rung ${entry.rung}, ${entry.sourceFiles.length} source file(s), ${entry.testFiles.length} test file(s))`,
    `  files: ${entry.sourceFiles.slice(0, 8).join(', ')}${entry.sourceFiles.length > 8 ? ` (+${entry.sourceFiles.length - 8} more)` : ''}`
  ];
  for (const signal of SIGNAL_PRIORITY) {
    const items = entry.evidence[signal] ?? [];
    if (items.length === 0) continue;
    lines.push(`  ${SIGNAL_LABELS[signal]}:`);
    for (const item of items) lines.push(`    - ${item}`);
  }
  if (entry.truncated) lines.push('  (evidence truncated by budget)');
  if (entry.rung < RUNGS.length) {
    lines.push(`  more evidence available at rung ${entry.rung + 1}: ${RUNGS[entry.rung].describes}`);
  }
  return lines.join('\n');
}

/** Build one module entry from already-read file contents. */
export function buildModuleEntry({ module, contents = {}, testNames = [], exports: exported = [], gitSubjects = [], rung = 1, budget = 40 }) {
  const signals = signalsForRung(rung);
  const signatures = [];
  const headDocs = [];

  for (const [file, content] of Object.entries(contents)) {
    const ext = extOf(file);
    if (signals.includes('signatures')) signatures.push(...extractSignatures(content, ext));
    if (signals.includes('headDocs')) headDocs.push(...extractHeadDoc(content, ext));
  }

  const full = {
    testNames: signals.includes('testNames') ? [...new Set(testNames)] : [],
    headDocs: [...new Set(headDocs)],
    signatures: [...new Set(signatures)],
    exports: signals.includes('exports') ? [...new Set(exported)] : [],
    gitSubjects: signals.includes('gitSubjects') ? gitSubjects : []
  };

  const { evidence, truncated } = applyBudget(full, budget);
  return {
    name: module.name,
    sourceFiles: module.sourceFiles,
    testFiles: module.testFiles,
    rung: Number(rung),
    budget: Number(budget),
    evidence,
    truncated,
    score: scoreModule(module, evidence)
  };
}
