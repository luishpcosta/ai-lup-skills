import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  analyzeTraceability,
  applyRegistryUpdate,
  findFeature,
  formatFeatureDetail,
  formatOpenCriteria,
  formatRegistryStatus,
  listOpenCriteria,
  parseArgs,
  scoreSddHarness,
  summarizeRegistry,
  verificationCommands
} from '../scripts/lib/sdd-utils.mjs';

test('parseArgs handles flags, inline values, and positionals', () => {
  const args = parseArgs(['--target', '/tmp/x', '--force', '--agent-file=CLAUDE.md', 'pos']);
  assert.equal(args.target, '/tmp/x');
  assert.equal(args.force, true);
  assert.equal(args.agentFile, 'CLAUDE.md');
  assert.deepEqual(args._, ['pos']);
});

test('verificationCommands picks stack-specific commands', () => {
  assert.deepEqual(verificationCommands({ stack: 'go' }), ['go test ./...']);
  assert.deepEqual(verificationCommands({ stack: 'python' }), ['python -m pytest', 'python -m compileall .']);
});

test('analyzeTraceability passes for a fully linked registry', () => {
  const registry = {
    features: [{
      id: 'f1', name: 'F1', phase: 'tasked', spec: 'specs/f1/spec.md',
      acceptance_criteria: [{ id: 'AC-1', description: 'x', tasks: ['T-1'], status: 'covered' }],
      tasks_index: [{ id: 'T-1', status: 'todo' }]
    }]
  };
  const result = analyzeTraceability(registry, { 'specs/f1/spec.md': 'clean spec' });
  assert.equal(result.ok, true);
  assert.equal(result.stats.acTotal, 1);
  assert.equal(result.stats.acCovered, 1);
});

test('analyzeTraceability flags orphan AC', () => {
  const registry = {
    features: [{
      id: 'f1', name: 'F1', phase: 'tasked',
      acceptance_criteria: [{ id: 'AC-1', description: 'x', tasks: [], status: 'pending' }],
      tasks_index: []
    }]
  };
  const result = analyzeTraceability(registry);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.type === 'orphan-ac' && p.id === 'AC-1'));
});

test('analyzeTraceability flags orphan task', () => {
  const registry = {
    features: [{
      id: 'f1', name: 'F1', phase: 'tasked',
      acceptance_criteria: [{ id: 'AC-1', description: 'x', tasks: ['T-1'], status: 'covered' }],
      tasks_index: [{ id: 'T-1' }, { id: 'T-2' }]
    }]
  };
  const result = analyzeTraceability(registry);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.type === 'orphan-task' && p.id === 'T-2'));
});

test('analyzeTraceability flags open clarification past draft', () => {
  const registry = {
    features: [{
      id: 'f1', name: 'F1', phase: 'specified', spec: 'specs/f1/spec.md',
      acceptance_criteria: [{ id: 'AC-1', description: 'x', tasks: ['T-1'], status: 'covered' }],
      tasks_index: [{ id: 'T-1' }]
    }]
  };
  const result = analyzeTraceability(registry, { 'specs/f1/spec.md': 'has [NEEDS CLARIFICATION: foo]' });
  assert.ok(result.problems.some((p) => p.type === 'open-clarification'));
});

test('analyzeTraceability flags verified AC without evidence and unverified AC on done feature', () => {
  const registry = {
    features: [{
      id: 'f1', name: 'F1', phase: 'done',
      acceptance_criteria: [
        { id: 'AC-1', description: 'x', tasks: ['T-1'], status: 'verified', evidence: '' },
        { id: 'AC-2', description: 'y', tasks: ['T-2'], status: 'covered' }
      ],
      tasks_index: [{ id: 'T-1' }, { id: 'T-2' }]
    }]
  };
  const result = analyzeTraceability(registry);
  assert.ok(result.problems.some((p) => p.type === 'missing-evidence'));
  assert.ok(result.problems.some((p) => p.type === 'unverified-ac'));
});

test('scoreSddHarness rewards a complete harness and finds bottleneck on a bare one', () => {
  const bare = scoreSddHarness([{ path: 'AGENTS.md', content: '# hi' }]);
  assert.ok(bare.overall < 60, `expected low score, got ${bare.overall}`);
  assert.ok(typeof bare.bottleneck === 'string');
});

test('scoreSddHarness accepts Portuguese instruction/constitution text', () => {
  const files = [
    { path: 'CLAUDE.md', content: 'Usa a constituição. Fluxo com gates por fase: Specify, Plan. Rastreabilidade: toda task referencia um AC. Definition of Done.' },
    { path: 'constitution.md', content: '## Princípios\nProjeto com regras inegociáveis e restrições técnicas que se deve cumprir.' }
  ];
  const result = scoreSddHarness(files);
  const principles = result.subsystems.constitution.checks.find((c) => c.message.includes('principles/constraints'));
  const gates = result.subsystems.constitution.checks.find((c) => c.message.includes('phase gates'));
  const trace = result.subsystems.traceability.checks.find((c) => c.message.includes('Traceability rule'));
  assert.equal(principles.pass, true, 'PT principles should be recognized');
  assert.equal(gates.pass, true, 'PT gates/fase should be recognized');
  assert.equal(trace.pass, true, 'PT rastreabilidade should be recognized');
});

function sampleRegistry() {
  return {
    features: [
      {
        id: '001-a', name: 'Feature A', phase: 'tasked',
        acceptance_criteria: [
          { id: 'AC-1', description: 'first', tasks: ['T-1'], status: 'covered' },
          { id: 'AC-2', description: 'second', tasks: ['T-2'], status: 'verified', evidence: 'tests pass' }
        ],
        tasks_index: [{ id: 'T-1' }, { id: 'T-2' }]
      },
      {
        id: '002-b', name: 'Feature B', phase: 'draft',
        acceptance_criteria: [
          { id: 'AC-1', description: 'pending one', tasks: [], status: 'pending' }
        ],
        tasks_index: []
      }
    ]
  };
}

test('summarizeRegistry counts AC verified/covered per feature', () => {
  const summary = summarizeRegistry(sampleRegistry());
  assert.deepEqual(summary.features[0], { id: '001-a', name: 'Feature A', phase: 'tasked', acTotal: 2, acVerified: 1, acCovered: 2 });
  assert.deepEqual(summary.features[1], { id: '002-b', name: 'Feature B', phase: 'draft', acTotal: 1, acVerified: 0, acCovered: 0 });
});

test('summarizeRegistry returns empty array for registry with no features', () => {
  assert.deepEqual(summarizeRegistry({}), { features: [] });
});

test('findFeature returns the matching feature with all ACs by default', () => {
  const result = findFeature(sampleRegistry(), '001-a');
  assert.equal(result.feature.id, '001-a');
  assert.equal(result.feature.acceptance_criteria.length, 2);
});

test('findFeature with openOnly filters out verified ACs', () => {
  const result = findFeature(sampleRegistry(), '001-a', { openOnly: true });
  assert.equal(result.feature.acceptance_criteria.length, 1);
  assert.equal(result.feature.acceptance_criteria[0].id, 'AC-1');
});

test('findFeature returns error not-found for unknown id', () => {
  const result = findFeature(sampleRegistry(), '999-nope');
  assert.deepEqual(result, { error: 'not-found' });
});

test('listOpenCriteria lists non-verified ACs across all features', () => {
  const open = listOpenCriteria(sampleRegistry());
  assert.equal(open.length, 2);
  assert.deepEqual(open.map((o) => `${o.featureId}/${o.ac.id}`), ['001-a/AC-1', '002-b/AC-1']);
});

test('formatRegistryStatus and formatOpenCriteria produce one line per entry', () => {
  const statusText = formatRegistryStatus(summarizeRegistry(sampleRegistry()), '/proj');
  assert.match(statusText, /001-a \[tasked\] Feature A — AC 1\/2 verified \(2\/2 covered\)/);
  const openText = formatOpenCriteria(listOpenCriteria(sampleRegistry()), '/proj');
  assert.match(openText, /001-a\/AC-1 \[covered\] first/);
});

test('formatFeatureDetail lists each AC with tasks and evidence', () => {
  const { feature } = findFeature(sampleRegistry(), '001-a');
  const text = formatFeatureDetail(feature, '/proj');
  assert.match(text, /AC-2 \[verified\].*evidence: tests pass/);
});

test('applyRegistryUpdate set-phase updates the feature and leaves the input untouched', () => {
  const registry = sampleRegistry();
  const result = applyRegistryUpdate(registry, { type: 'set-phase', featureId: '001-a', phase: 'verified' });
  assert.equal(result.ok, true);
  assert.equal(result.registry.features[0].phase, 'verified');
  assert.equal(registry.features[0].phase, 'tasked', 'original registry must not be mutated');
});

test('applyRegistryUpdate rejects unknown feature id', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-phase', featureId: '999-nope', phase: 'verified' });
  assert.deepEqual(result.ok, false);
  assert.equal(result.error, 'unknown-feature');
});

test('applyRegistryUpdate rejects unknown phase', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-phase', featureId: '001-a', phase: 'shipped' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unknown-phase');
});

test('applyRegistryUpdate set-ac-status rejects unknown AC id', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-ac-status', featureId: '001-a', acId: 'AC-99', status: 'verified', evidence: 'x' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unknown-ac');
});

test('applyRegistryUpdate set-ac-status rejects unknown status value', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-ac-status', featureId: '001-a', acId: 'AC-1', status: 'bogus' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unknown-status');
});

test('applyRegistryUpdate rejects verified status without evidence', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-ac-status', featureId: '001-a', acId: 'AC-1', status: 'verified' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing-evidence');
});

test('applyRegistryUpdate accepts verified status with evidence and stores it', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'set-ac-status', featureId: '001-a', acId: 'AC-1', status: 'verified', evidence: 'ran tests' });
  assert.equal(result.ok, true);
  const ac = result.registry.features[0].acceptance_criteria[0];
  assert.equal(ac.status, 'verified');
  assert.equal(ac.evidence, 'ran tests');
});

test('applyRegistryUpdate add-ac-task appends a task id', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'add-ac-task', featureId: '002-b', acId: 'AC-1', taskId: 'T-9' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.registry.features[1].acceptance_criteria[0].tasks, ['T-9']);
});

test('applyRegistryUpdate add-ac-task rejects a duplicate task id', () => {
  const result = applyRegistryUpdate(sampleRegistry(), { type: 'add-ac-task', featureId: '001-a', acId: 'AC-1', taskId: 'T-1' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'duplicate-task');
});
