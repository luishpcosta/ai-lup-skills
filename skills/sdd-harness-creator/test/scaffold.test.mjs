import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

const run = promisify(execFile);
const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

async function withTempProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'sdd-harness-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('create-sdd-harness scaffolds all expected files', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    for (const rel of [
      'AGENTS.md', 'constitution.md', 'spec-registry.json', 'spec-registry.schema.json',
      'progress.md', 'session-handoff.md', 'init.sh',
      'specs/001-example/spec.md', 'specs/001-example/plan.md', 'specs/001-example/tasks.md'
    ]) {
      const content = await readFile(path.join(dir, rel), 'utf8');
      assert.ok(content.length > 0, `${rel} should exist and be non-empty`);
    }
  });
});

test('scaffolded harness passes the traceability gate', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'check-traceability.mjs'), '--target', dir]);
    assert.match(stdout, /OK/);
  });
});

test('check-traceability fails on an orphan AC', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    const registryPath = path.join(dir, 'spec-registry.json');
    const registry = JSON.parse(await readFile(registryPath, 'utf8'));
    registry.features[0].acceptance_criteria[0].tasks = [];
    await import('node:fs/promises').then((fs) => fs.writeFile(registryPath, JSON.stringify(registry)));
    await assert.rejects(
      run('node', [path.join(SCRIPTS, 'check-traceability.mjs'), '--target', dir]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /orphan-ac/);
        return true;
      }
    );
  });
});

test('validate-sdd-harness scores a scaffolded harness at or above 60', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'validate-sdd-harness.mjs'), '--target', dir, '--json']);
    const result = JSON.parse(stdout);
    assert.ok(result.overall >= 60, `expected overall >= 60, got ${result.overall}`);
  });
});
