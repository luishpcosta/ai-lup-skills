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

test('create-sdd-harness scaffolds all expected files (no spec-registry.json)', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    for (const rel of [
      'AGENTS.md', 'constitution.md',
      'progress.md', 'init.sh',
      'specs/001-example/spec.md', 'specs/001-example/plan.md', 'specs/001-example/tasks.md'
    ]) {
      const content = await readFile(path.join(dir, rel), 'utf8');
      assert.ok(content.length > 0, `${rel} should exist and be non-empty`);
    }
    await assert.rejects(readFile(path.join(dir, 'spec-registry.json')));
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

test('reverse-engineer adds a documented feature with phase/origin in the markdown', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    await mkdir(path.join(dir, 'src', 'auth'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'auth', 'login.ts'), 'export function login() { return true; }\n');
    await writeFile(
      path.join(dir, 'src', 'auth', 'login.test.ts'),
      "import { it } from 'node:test';\nit('logs the user in', () => {});\n"
    );

    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--all']);
    assert.match(stdout, /002-auth/);

    const spec = await readFile(path.join(dir, 'specs', '002-auth', 'spec.md'), 'utf8');
    assert.match(spec, /\*\*Phase:\*\* documented/);
    assert.match(spec, /\*\*Origin:\*\* reverse-engineered/);
    assert.doesNotMatch(spec, /YYYY-MM-DD/, 'retro-spec should not keep the date mask');
    assert.match(spec, /\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}/);

    const tasks = await readFile(path.join(dir, 'specs', '002-auth', 'tasks.md'), 'utf8');
    assert.match(tasks, /AC-1/);
  });
});

test('reverse-engineer --dry-run writes nothing', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    await mkdir(path.join(dir, 'src', 'billing'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'billing', 'charge.ts'), 'export function charge() {}\n');

    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--all', '--dry-run']);
    assert.match(stdout, /Dry run/);

    await assert.rejects(readFile(path.join(dir, 'specs', '003-billing', 'spec.md')));
  });
});

test('reverse-engineer skips a module that already has a specs/ entry', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'create-sdd-harness.mjs'), '--target', dir]);
    await mkdir(path.join(dir, 'src', 'example'), { recursive: true });
    await writeFile(path.join(dir, 'src', 'example', 'thing.ts'), 'export function thing() {}\n');

    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--all']);
    assert.doesNotMatch(stdout, /001-example/);
  });
});

test('check-traceability.mjs shim exits 0 and points at migrate-from-registry.mjs when spec-registry.json exists', async () => {
  await withTempProject(async (dir) => {
    await writeFile(path.join(dir, 'spec-registry.json'), JSON.stringify({ features: [] }));
    const { stderr } = await run('node', [path.join(SCRIPTS, 'check-traceability.mjs'), '--target', dir]);
    assert.match(stderr, /removed/i);
    assert.match(stderr, /migrate-from-registry\.mjs/);
  });
});

test('check-traceability.mjs shim exits 0 with no spec-registry.json present', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'check-traceability.mjs'), '--target', dir]);
  });
});

test('validate-sdd-harness.mjs shim exits 0', async () => {
  await withTempProject(async (dir) => {
    await run('node', [path.join(SCRIPTS, 'validate-sdd-harness.mjs'), '--target', dir]);
  });
});

test('migrate-from-registry reports nothing to migrate when there is no spec-registry.json', async () => {
  await withTempProject(async (dir) => {
    const { stdout } = await run('node', [path.join(SCRIPTS, 'migrate-from-registry.mjs'), '--target', dir]);
    assert.match(stdout, /Nothing to migrate/);
  });
});

test('migrate-from-registry summarizes and backs up an existing spec-registry.json', async () => {
  await withTempProject(async (dir) => {
    const registry = {
      features: [{
        id: '001-example', name: 'Example Feature', phase: 'tasked',
        acceptance_criteria: [
          { id: 'AC-1', description: 'x', tasks: ['T-1'], status: 'verified', evidence: 'tests pass' },
          { id: 'AC-2', description: 'y', tasks: ['T-1'], status: 'pending' }
        ]
      }]
    };
    await writeFile(path.join(dir, 'spec-registry.json'), JSON.stringify(registry));

    const { stdout } = await run('node', [path.join(SCRIPTS, 'migrate-from-registry.mjs'), '--target', dir]);
    assert.match(stdout, /001-example \[tasked\]/);
    assert.match(stdout, /AC 1\/2 verified/);
    assert.match(stdout, /Renamed spec-registry\.json/);

    await assert.rejects(readFile(path.join(dir, 'spec-registry.json')));
    const backup = JSON.parse(await readFile(path.join(dir, 'spec-registry.json.bak'), 'utf8'));
    assert.deepEqual(backup, registry);
  });
});

test('migrate-from-registry does not overwrite an existing backup', async () => {
  await withTempProject(async (dir) => {
    await writeFile(path.join(dir, 'spec-registry.json'), JSON.stringify({ features: [] }));
    await writeFile(path.join(dir, 'spec-registry.json.bak'), 'previous backup');

    const { stderr } = await run('node', [path.join(SCRIPTS, 'migrate-from-registry.mjs'), '--target', dir]);
    assert.match(stderr, /already exists/);

    const original = await readFile(path.join(dir, 'spec-registry.json'), 'utf8');
    assert.equal(JSON.parse(original).features.length, 0);
    const backup = await readFile(path.join(dir, 'spec-registry.json.bak'), 'utf8');
    assert.equal(backup, 'previous backup');
  });
});

// --- brownfield: recon + one-module-at-a-time approval -----------------------

async function brownfieldFixture(dir) {
  await mkdir(path.join(dir, 'src', 'auth'), { recursive: true });
  await mkdir(path.join(dir, 'src', 'util'), { recursive: true });
  await mkdir(path.join(dir, 'test'), { recursive: true });
  await writeFile(
    path.join(dir, 'src', 'auth', 'login.js'),
    '// Authentication for the public API.\nexport function login(user, password) {\n  const BODY_ONLY_MARKER = 1;\n  return BODY_ONLY_MARKER;\n}\n'
  );
  await writeFile(path.join(dir, 'src', 'util', 'format.js'), 'export function format(value) { return String(value); }\n');
  await writeFile(
    path.join(dir, 'test', 'login.test.js'),
    "import { test } from 'node:test';\ntest('rejects an expired token', () => {});\n"
  );
}

test('recon writes a bounded digest and never emits a function body', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'recon.mjs'), '--target', dir, '--budget', '3']);
    assert.match(stdout, /MODULE auth/);
    assert.match(stdout, /rejects an expired token/);
    assert.ok(!stdout.includes('BODY_ONLY_MARKER'), 'a function body reached the digest');
    assert.match(stdout.trim().split('\n').at(-1), /^NEXT:/);

    const recon = JSON.parse(await readFile(path.join(dir, '.sdd', 'recon.json'), 'utf8'));
    assert.equal(recon.budget, 3);
    for (const module of recon.modules) {
      const lines = Object.values(module.evidence).reduce((total, items) => total + items.length, 0);
      assert.ok(lines <= 3, `${module.name} exceeded the evidence budget`);
    }
  });
});

test('--list ranks a tested module above an untested one', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--list']);
    assert.ok(stdout.indexOf('auth') < stdout.indexOf('util'), 'the tested module should be offered first');
    assert.match(stdout, /\[pending\] auth/);
    assert.match(stdout.trim().split('\n').at(-1), /^NEXT:/);
  });
});

test('--propose writes nothing outside .sdd/', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    const { stdout } = await run('node', [
      path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'auth', '--propose'
    ]);
    assert.match(stdout, /NOTHING WAS WRITTEN/);
    assert.match(stdout, /approve\s+->/);
    assert.match(stdout, /more evidence\s+->/);
    await assert.rejects(readFile(path.join(dir, 'specs', '001-auth', 'spec.md')));
  });
});

test('--write stamps the confirmation and records the user correction', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    await run('node', [
      path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir,
      '--module', 'auth', '--write', '--notes', 'Tokens expire after one hour, not one day'
    ]);
    const spec = await readFile(path.join(dir, 'specs', '001-auth', 'spec.md'), 'utf8');
    assert.match(spec, /\*\*Confirmed-by:\*\* user/);
    assert.match(spec, /\*\*Confirmed-on:\*\* \d{4}-\d{2}-\d{2}/);
    assert.match(spec, /## Corrections from review/);
    assert.match(spec, /Tokens expire after one hour, not one day/);
    assert.ok(!spec.includes('BODY_ONLY_MARKER'));

    const recon = JSON.parse(await readFile(path.join(dir, '.sdd', 'recon.json'), 'utf8'));
    assert.equal(recon.approvals.auth.status, 'corrected');

    // Writing an untouched module must not disturb the one already written.
    await assert.rejects(readFile(path.join(dir, 'specs', '002-util', 'spec.md')));
  });
});

test('--more-evidence escalates one rung and keeps the budget', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    const before = await run('node', [
      path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'auth', '--propose'
    ]);
    assert.doesNotMatch(before.stdout, /declared intent \(head doc comments\)/);

    const after = await run('node', [
      path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'auth', '--more-evidence'
    ]);
    assert.match(after.stdout, /Escalated auth to rung 2/);
    assert.match(after.stdout, /declared intent \(head doc comments\)/);
    assert.match(after.stdout, /Authentication for the public API/);
    assert.ok(!after.stdout.includes('BODY_ONLY_MARKER'));

    const recon = JSON.parse(await readFile(path.join(dir, '.sdd', 'recon.json'), 'utf8'));
    assert.equal(recon.rungs.auth, 2);
  });
});

test('a skipped module is not offered again', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'util', '--skip']);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--list']);
    assert.match(stdout, /\[skipped\] util/);
    assert.match(stdout, /pending: 1/);
    assert.match(stdout.trim().split('\n').at(-1), /--module auth --propose/);
  });
});

test('--write refuses a module that already has a specs/ entry', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'auth', '--write']);
    await assert.rejects(
      run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir, '--module', 'auth', '--write']),
      (error) => {
        assert.match(error.stderr, /REJECTED: specs\/ already has an entry/);
        return true;
      }
    );
  });
});

test('reverse-engineer with no mode flag lists instead of writing', async () => {
  await withTempProject(async (dir) => {
    await brownfieldFixture(dir);
    const { stdout } = await run('node', [path.join(SCRIPTS, 'reverse-engineer.mjs'), '--target', dir]);
    assert.match(stdout, /Reverse-engineering candidates/);
    await assert.rejects(readFile(path.join(dir, 'specs', '001-auth', 'spec.md')));
  });
});
