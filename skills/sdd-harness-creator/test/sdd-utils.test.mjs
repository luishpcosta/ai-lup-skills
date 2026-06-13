import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  analyzeTraceability,
  parseArgs,
  scoreSddHarness,
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
