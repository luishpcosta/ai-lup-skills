// Pure, testable helpers for brownfield reverse-engineering:
// turn an existing codebase into reconstructed (retro) specs + registry entries.

const TEST_HINTS = ['.test.', '.spec.', '__tests__/', '/tests/', '/test/'];
const SOURCE_EXTS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java']);

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'module';
}

export function isTestFile(file) {
  const lower = file.toLowerCase();
  return TEST_HINTS.some((hint) => lower.includes(hint)) || /(^|\/)test_[^/]+\.py$/.test(lower);
}

export function extOf(file) {
  const dot = file.lastIndexOf('.');
  return dot === -1 ? '' : file.slice(dot).toLowerCase();
}

/** Pick the most likely source root from a file listing. */
export function detectSourceRoot(files) {
  for (const candidate of ['src', 'lib', 'app']) {
    if (files.some((file) => file.startsWith(`${candidate}/`))) return candidate;
  }
  return '';
}

/**
 * Group source files into modules by their first path segment under the
 * source root. Returns [{ name, sourceFiles[], testFiles[] }] sorted by name.
 */
export function groupIntoModules(files, sourceRoot) {
  const prefix = sourceRoot ? `${sourceRoot}/` : '';
  const modules = new Map();

  for (const file of files) {
    if (!SOURCE_EXTS.has(extOf(file))) continue;
    if (prefix && !file.startsWith(prefix)) continue;
    const rest = prefix ? file.slice(prefix.length) : file;
    const segments = rest.split('/');
    const name = segments.length > 1 ? segments[0] : (sourceRoot || rest.replace(/\.[^.]+$/, ''));
    if (!modules.has(name)) modules.set(name, { name, sourceFiles: [], testFiles: [] });
    const bucket = modules.get(name);
    if (isTestFile(file)) bucket.testFiles.push(file);
    else bucket.sourceFiles.push(file);
  }

  return [...modules.values()]
    .filter((module) => module.sourceFiles.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Best-effort extraction of exported/public symbols from source text. */
export function extractExports(content, ext) {
  const names = new Set();
  if (ext === '.py') {
    for (const match of content.matchAll(/^(?:async\s+)?def\s+([a-zA-Z_]\w*)\s*\(/gm)) names.add(match[1]);
    for (const match of content.matchAll(/^class\s+([a-zA-Z_]\w*)/gm)) names.add(match[1]);
    return [...names].filter((name) => !name.startsWith('_'));
  }
  if (ext === '.go') {
    for (const match of content.matchAll(/^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)\s*\(/gm)) names.add(match[1]);
    for (const match of content.matchAll(/^type\s+([A-Z]\w*)\s/gm)) names.add(match[1]);
    return [...names];
  }
  // JS / TS family
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of content.matchAll(/export\s+(?:abstract\s+)?class\s+([a-zA-Z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of content.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of content.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const token = part.trim().split(/\s+as\s+/).pop().trim();
      if (token) names.add(token);
    }
  }
  for (const match of content.matchAll(/(?:module\.)?exports\.([a-zA-Z_$][\w$]*)\s*=/g)) names.add(match[1]);
  return [...names];
}

/** Best-effort extraction of test names (used as candidate acceptance criteria). */
export function extractTestNames(content) {
  const names = [];
  for (const match of content.matchAll(/\b(?:it|test|describe)\s*\(\s*(['"`])([\s\S]*?)\1/g)) {
    const name = match[2].trim();
    if (name) names.push(name);
  }
  for (const match of content.matchAll(/^\s*(?:async\s+)?def\s+(test_[a-zA-Z0-9_]+)\s*\(/gm)) {
    names.push(match[1].replace(/^test_/, '').replace(/_/g, ' '));
  }
  return [...new Set(names)];
}

/**
 * Build a reverse-engineered feature: reconstructed spec/plan/tasks markdown.
 *
 * AC derivation prefers existing tests (they state intent), then declaration
 * lines, then exported symbols. `confirmedBy`/`corrections` record that a human
 * reviewed the draft before it was written.
 */
export function buildReverseFeature({
  module,
  index,
  exportsByFile = {},
  testNames = [],
  evidence = null,
  maxCriteria = 15,
  date = todayISO(),
  confirmedBy = '',
  confirmedOn = '',
  corrections = []
}) {
  const slug = slugify(module.name);
  const id = `${String(index).padStart(3, '0')}-${slug}`;
  const allExports = evidence?.exports?.length ? evidence.exports : Object.values(exportsByFile).flat();
  const names = testNames.length > 0 ? testNames : (evidence?.testNames ?? []);
  const signatures = evidence?.signatures ?? [];

  let criteria;
  let acSource;
  if (names.length > 0) {
    acSource = 'tests';
    criteria = names.slice(0, maxCriteria).map((name, i) => ({
      id: `AC-${i + 1}`,
      description: name,
      evidence: module.testFiles[0] ? `existing test: ${module.testFiles[0]}` : ''
    }));
  } else if (allExports.length > 0) {
    acSource = 'exports';
    criteria = allExports.slice(0, maxCriteria).map((name, i) => ({
      id: `AC-${i + 1}`,
      description: `\`${name}\` behaves as currently implemented`,
      evidence: ''
    }));
  } else if (signatures.length > 0) {
    acSource = 'signatures';
    criteria = signatures.slice(0, maxCriteria).map((signature, i) => ({
      id: `AC-${i + 1}`,
      description: `\`${signature}\` behaves as currently implemented`,
      evidence: ''
    }));
  } else {
    acSource = 'module';
    criteria = [{
      id: 'AC-1',
      description: `Module \`${module.name}\` behaves as currently implemented`,
      evidence: ''
    }];
  }

  const meta = { confirmedBy, confirmedOn: confirmedOn || (confirmedBy ? date : ''), corrections, evidence };

  return {
    id,
    acSource,
    criteria,
    specMarkdown: renderSpec(module, id, criteria, allExports, acSource, date, meta),
    planMarkdown: renderPlan(module, id, date, meta),
    tasksMarkdown: renderTasks(module, id, criteria, date)
  };
}

function renderList(items, empty = '_(none detected)_') {
  if (!items || items.length === 0) return empty;
  return items.map((item) => `- ${item}`).join('\n');
}

function confirmationLines(meta) {
  if (!meta.confirmedBy) return '';
  return `**Confirmed-by:** ${meta.confirmedBy}\n**Confirmed-on:** ${meta.confirmedOn}\n`;
}

function correctionsSection(meta) {
  if (!meta.corrections || meta.corrections.length === 0) return '';
  return `\n## Corrections from review\n\n${renderList(meta.corrections)}\n`;
}

function evidenceSection(meta) {
  const evidence = meta.evidence;
  if (!evidence) return '';
  const blocks = [];
  if (evidence.headDocs?.length) blocks.push(`Declared intent (head doc comments):\n${renderList(evidence.headDocs)}`);
  if (evidence.signatures?.length) blocks.push(`Declarations (signature lines only):\n${renderList(evidence.signatures)}`);
  if (evidence.gitSubjects?.length) blocks.push(`Commit subjects:\n${renderList(evidence.gitSubjects)}`);
  return blocks.length ? `\n${blocks.join('\n\n')}\n` : '';
}

function renderSpec(module, id, criteria, allExports, acSource, date, meta = { corrections: [] }) {
  const acLines = criteria.map((ac) => `- **${ac.id}** — ${ac.description}${ac.evidence ? ` _(${ac.evidence})_` : ''}`).join('\n');
  const reviewed = meta.confirmedBy
    ? '> Reviewed and confirmed by a human before being written.'
    : '> Not yet reviewed by a human — confirm the criteria before advancing this feature.';
  return `# Spec (reverse-engineered): ${module.name}

**Feature ID:** ${id}
**Phase:** documented
**Origin:** reverse-engineered from existing code
${confirmationLines(meta)}**Last updated:** ${date}

> Reconstructed from the current implementation. Acceptance criteria were derived from ${acSource}.
${reviewed}
> Review and correct these against intended behavior, then advance the feature toward \`verified\`/\`done\`.

## Current Behavior (as observed in code)

Source files:
${renderList(module.sourceFiles)}

Public surface (exported/public symbols):
${renderList(allExports)}

Tests covering this module:
${renderList(module.testFiles)}
${evidenceSection(meta)}
## Acceptance Criteria (reconstructed)

${acLines}
${correctionsSection(meta)}
## Assumptions / To Confirm

- [ ] Confirm each AC matches *intended* behavior, not just current behavior.
- [ ] Identify any undocumented behavior or dead code not captured above.
- [ ] Note edge cases the existing tests do not cover.

## Out of Scope (Non-Goals)

- _(fill in once intended scope is confirmed)_
`;
}

function renderPlan(module, id, date, meta = { corrections: [] }) {
  return `# Plan (as-built): ${module.name}

**Feature ID:** ${id}
**Phase:** documented
**Spec:** ./spec.md
${confirmationLines(meta)}**Last updated:** ${date}

> As-built notes reconstructed from existing code. Update before planning *new* work on this module.

## Existing Structure

${renderList(module.sourceFiles)}

## Notes

- This plan was generated by reverse-engineering. Capture the real architecture,
  data model, and contracts here as you learn them.
- New work on this module should add forward-looking acceptance criteria to spec.md
  and corresponding tasks below.
`;
}

function renderTasks(module, id, criteria, date) {
  const rows = criteria.map((ac, i) => `| T-${i + 1} | Existing implementation (reverse-engineered) | ${ac.id} | done | code present |`).join('\n');
  return `# Tasks (reverse-engineered): ${module.name}

**Feature ID:** ${id}
**Phase:** documented
**Plan:** ./plan.md
**Last updated:** ${date}

> The implementation already exists, so each task below is marked done — one per
> acceptance criterion. Add new tasks here for forward work, each linked to an
> acceptance criterion in spec.md.

| ID | Task | Satisfies | Status | Evidence |
|---|---|---|---|---|
${rows}
`;
}
