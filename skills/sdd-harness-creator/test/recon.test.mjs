import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RUNGS,
  applyBudget,
  attachExternalTests,
  buildModuleEntry,
  countEvidence,
  extractHeadDoc,
  extractSignatures,
  parseGitSubjects,
  renderDigest,
  scoreModule,
  signalsForRung
} from '../scripts/lib/recon.mjs';

const JS_SOURCE = `// Authentication for the public API.
// Tokens expire after one hour.

export function login(user, password) {
  const BODY_ONLY_MARKER = 'must never reach the digest';
  return BODY_ONLY_MARKER;
}

export class TokenStore extends Base {
  refresh() { return ANOTHER_BODY_MARKER; }
}
`;

const PY_SOURCE = `"""Billing rules for invoices."""

def charge(amount):
    BODY_ONLY_MARKER = 1
    return BODY_ONLY_MARKER


class Invoice:
    pass
`;

test('extractSignatures emits declarations and never a function body', () => {
  const signatures = extractSignatures(JS_SOURCE, '.js');
  assert.deepEqual(signatures, [
    'export function login(user, password)',
    'export class TokenStore extends Base'
  ]);
  assert.ok(!JSON.stringify(signatures).includes('BODY_ONLY_MARKER'));
});

test('extractSignatures handles python and go declarations', () => {
  assert.deepEqual(extractSignatures(PY_SOURCE, '.py'), ['def charge(amount)', 'class Invoice']);
  assert.deepEqual(
    extractSignatures('func Login(u string) error {\n\tsecret := 1\n}\ntype Store struct {\n}\n', '.go'),
    ['func Login(u string) error', 'type Store struct']
  );
});

test('extractHeadDoc reads only the leading comment, capped', () => {
  assert.deepEqual(extractHeadDoc(JS_SOURCE, '.js'), [
    'Authentication for the public API.',
    'Tokens expire after one hour.'
  ]);
  assert.deepEqual(extractHeadDoc(PY_SOURCE, '.py'), ['Billing rules for invoices.']);
  assert.deepEqual(extractHeadDoc('/**\n * One.\n * Two.\n */\ncode();\n', '.js'), ['One.', 'Two.']);
  assert.equal(extractHeadDoc('a\n// not at the top\n', '.js').length, 0);

  const long = `${'// line\n'.repeat(20)}code();`;
  assert.equal(extractHeadDoc(long, '.js', { maxLines: 6 }).length, 6);
});

test('parseGitSubjects dedupes and drops merge noise', () => {
  const subjects = parseGitSubjects('feat: add login\nMerge branch "main"\nfeat: add login\nfix: expiry\n');
  assert.deepEqual(subjects, ['feat: add login', 'fix: expiry']);
});

test('applyBudget caps total evidence lines by priority', () => {
  const { evidence, truncated } = applyBudget(
    { testNames: ['a', 'b', 'c'], signatures: ['s1'], exports: ['x', 'y'] },
    4
  );
  assert.equal(countEvidence(evidence), 4);
  assert.deepEqual(evidence.testNames, ['a', 'b', 'c']); // highest priority keeps its items
  assert.equal(truncated, true);

  const roomy = applyBudget({ testNames: ['a'], exports: ['x'] }, 40);
  assert.equal(roomy.truncated, false);
});

test('scoreModule ranks a tested module above an untested one', () => {
  const tested = { sourceFiles: ['src/auth/a.js'], testFiles: ['test/a.test.js'] };
  const untested = { sourceFiles: ['src/util/b.js', 'src/util/c.js'], testFiles: [] };
  const testedScore = scoreModule(tested, { testNames: ['logs in'], exports: ['login'] });
  const untestedScore = scoreModule(untested, { exports: ['format', 'parse'], signatures: ['export function format(v)'] });
  assert.ok(testedScore > untestedScore, `${testedScore} should beat ${untestedScore}`);
});

test('attachExternalTests links tests that live outside the source root', () => {
  const modules = [
    { name: 'commands', sourceFiles: ['src/commands/add.js'], testFiles: [] },
    { name: 'utils', sourceFiles: ['src/utils/paths.js'], testFiles: [] }
  ];
  attachExternalTests(['src/commands/add.js', 'test/add.test.js', 'test/paths.test.js'], modules);
  assert.deepEqual(modules[0].testFiles, ['test/add.test.js']);
  assert.deepEqual(modules[1].testFiles, ['test/paths.test.js']);
});

test('the evidence ladder grows one rung at a time', () => {
  assert.deepEqual(signalsForRung(1), ['testNames', 'exports']);
  assert.ok(signalsForRung(2).includes('signatures'));
  assert.ok(signalsForRung(2).includes('headDocs'));
  assert.ok(signalsForRung(3).includes('gitSubjects'));
  for (let i = 1; i < RUNGS.length; i += 1) {
    assert.ok(RUNGS[i].signals.length > RUNGS[i - 1].signals.length, 'each rung must add signals');
  }
  assert.deepEqual(signalsForRung(99), signalsForRung(1), 'an unknown rung falls back to the cheapest');
});

test('buildModuleEntry respects the rung and keeps bodies out of the digest', () => {
  const module = { name: 'auth', sourceFiles: ['src/auth/login.js'], testFiles: ['test/login.test.js'] };
  const contents = { 'src/auth/login.js': JS_SOURCE };

  const rung1 = buildModuleEntry({ module, contents, testNames: ['logs in'], exports: ['login'], rung: 1 });
  assert.deepEqual(rung1.evidence.signatures, []);
  assert.deepEqual(rung1.evidence.headDocs, []);

  const rung2 = buildModuleEntry({ module, contents, testNames: ['logs in'], exports: ['login'], rung: 2 });
  assert.ok(rung2.evidence.signatures.length > 0);
  assert.ok(rung2.evidence.headDocs.length > 0);
  assert.ok(rung2.score > rung1.score, 'more evidence must raise the score');

  const digest = renderDigest(rung2);
  assert.ok(!digest.includes('BODY_ONLY_MARKER'), 'a function body leaked into the digest');
  assert.ok(!digest.includes('ANOTHER_BODY_MARKER'), 'a method body leaked into the digest');
  assert.match(digest, /MODULE auth/);
});

test('buildModuleEntry marks a digest truncated by the budget', () => {
  const module = { name: 'wide', sourceFiles: ['src/wide/a.js'], testFiles: [] };
  const entry = buildModuleEntry({
    module,
    contents: {},
    testNames: [],
    exports: ['a', 'b', 'c', 'd', 'e'],
    rung: 1,
    budget: 2
  });
  assert.equal(countEvidence(entry.evidence), 2);
  assert.equal(entry.truncated, true);
  assert.match(renderDigest(entry), /truncated by budget/);
});
