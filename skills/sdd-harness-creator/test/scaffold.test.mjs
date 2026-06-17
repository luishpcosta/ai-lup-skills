import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
      'AGENTS.md', 'constitution.md', 'spec-registry.json',
      'progress.md', 'init.sh',
      'specs/001-example/spec.md', 'specs/001-example/plan.md', 'specs/001-example/tasks.md'
    ]) {
      const content = await readFile(path.join(dir, rel), 'utf8');
      assert.ok(content.length > 0, `${rel} should exist and be non-empty`);
    }
  });
});

test('scaffold fills date placeholders (no YYYY-MM-DD masks left)', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    for (const rel of ['progress.md', 'specs/001-example/spec.md', 'specs/001-example/plan.md', 'specs/001-example/tasks.md']) {
      const content = await readFile(path.join(dir, rel), 'utf8');
      assert.doesNotMatch(content, /YYYY-MM-DD/, `${rel} still has a date mask`);
      assert.match(content, /\*\*Last [Uu]pdated:\*\* \d{4}-\d{2}-\d{2}/, `${rel} should carry a real date`);
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

test('reverse-engineer adds a documented feature and keeps traceability clean', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    // Seed an existing module with code + a test.
    await mkdir(path.join(dir, 'src', 'auth'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'auth', 'login.ts'), 'export function login() { return true; }\n');
    await writeFile(
      path.join(dir, 'src', 'auth', 'login.test.ts'),
      "import { it } from 'node:test';\nit('logs the user in', () => {});\n"
    );

    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir]);
    assert.match(stdout, /002-auth/);

    const registry = JSON.parse(await readFile(path.join(dir, 'spec-registry.json'), 'utf8'));
    const auth = registry.features.find((f) => f.id === '002-auth');
    assert.ok(auth, 'expected reverse-engineered feature 002-auth');
    assert.equal(auth.phase, 'documented');
    assert.equal(auth.origin, 'reverse-engineered');

    const spec = await readFile(path.join(dir, 'specs', '002-auth', 'spec.md'), 'utf8');
    assert.match(spec, /reverse-engineered/);
    assert.doesNotMatch(spec, /YYYY-MM-DD/, 'retro-spec should not keep the date mask');
    assert.match(spec, /\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/);

    const trace = await run('node', [path.join(SCRIPTS, 'check-traceability.mjs'), '--target', dir]);
    assert.match(trace.stdout, /OK/);
  });
});

test('reverse-engineer --dry-run writes nothing', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    await mkdir(path.join(dir, 'src', 'billing'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'billing', 'charge.ts'), 'export function charge() {}\n');

    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--dry-run']);
    assert.match(stdout, /Dry run/);

    const registry = JSON.parse(await readFile(path.join(dir, 'spec-registry.json'), 'utf8'));
    assert.equal(registry.features.some((f) => f.name === 'billing'), false);
  });
});
