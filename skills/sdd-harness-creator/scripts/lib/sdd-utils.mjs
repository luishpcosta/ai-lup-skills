import { existsSync } from 'node:fs';
import { access, chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATE_DIR = path.join(SKILL_ROOT, 'templates');
export const SUBSYSTEMS = ['constitution', 'specification', 'planning', 'traceability', 'verification', 'lifecycle'];

// ---------------------------------------------------------------------------
// Generic helpers (vendored from harness-creator so this skill is standalone)
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[key] = argv[i + 1];
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

export async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

export async function writeText(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}

export async function copyTemplate(templateName, targetPath, replacements = {}, { force = false } = {}) {
  if (!force && await exists(targetPath)) {
    return { path: targetPath, status: 'skipped', reason: 'exists' };
  }
  let contents = await readText(path.join(TEMPLATE_DIR, templateName));
  for (const [key, value] of Object.entries(replacements)) {
    contents = contents.split(`{{${key}}}`).join(value);
  }
  await writeText(targetPath, contents);
  if (templateName.endsWith('.sh')) {
    await chmod(targetPath, 0o755);
  }
  return { path: targetPath, status: 'written' };
}

export function detectPackageManager(root, explicit) {
  if (explicit) return explicit;
  if (existsSync(path.join(root, 'bun.lockb')) || existsSync(path.join(root, 'bun.lock'))) return 'bun';
  if (existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export async function listFiles(root, { maxFiles = 1000 } = {}) {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__']);
  const results = [];

  async function walk(current, relative) {
    if (results.length >= maxFiles) return;
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      if (ignored.has(entry.name)) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        results.push(rel);
      }
    }
  }

  await walk(root, '');
  return results.sort();
}

export async function detectProject(root) {
  const files = await listFiles(root, { maxFiles: 800 });
  const has = (name) => files.some((file) => file === name || file.endsWith(`/${name}`));
  const hasPrefix = (prefix) => files.some((file) => file.startsWith(prefix));
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = await exists(packageJsonPath).then((ok) => ok ? readJson(packageJsonPath) : null);

  let stack = 'generic';
  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.react || hasPrefix('src/renderer')) stack = 'typescript-react';
    else if (deps.typescript || has('tsconfig.json')) stack = 'typescript';
    else stack = 'node';
  } else if (has('pyproject.toml') || has('requirements.txt')) {
    stack = 'python';
  } else if (has('go.mod')) {
    stack = 'go';
  } else if (has('Cargo.toml')) {
    stack = 'rust';
  } else if (has('pom.xml')) {
    stack = 'java-maven';
  } else if (has('build.gradle') || has('build.gradle.kts')) {
    stack = 'java-gradle';
  } else if (files.some((file) => file.endsWith('.csproj') || file.endsWith('.sln'))) {
    stack = 'dotnet';
  }

  return { root, stack, packageJson, files, packageManager: detectPackageManager(root) };
}

export function dedupe(values) {
  return [...new Set(values)];
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Local-date stamp YYYY-MM-DD. */
export function isoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local datetime stamp YYYY-MM-DD HH:MM. */
export function isoDateTime(date = new Date()) {
  return `${isoDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function verificationCommands(project, explicitPackageManager) {
  const pm = explicitPackageManager || project.packageManager || 'npm';
  const scripts = project.packageJson?.scripts ?? {};
  const run = (script) => {
    if (pm === 'npm') return `npm run ${script}`;
    if (pm === 'yarn') return `yarn ${script}`;
    return `${pm} run ${script}`;
  };

  if (project.stack === 'python') return ['python -m pytest', 'python -m compileall .'];
  if (project.stack === 'go') return ['go test ./...'];
  if (project.stack === 'rust') return ['cargo test'];
  if (project.stack === 'java-maven') return ['mvn test'];
  if (project.stack === 'java-gradle') return ['./gradlew test'];
  if (project.stack === 'dotnet') return ['dotnet test'];

  if (!project.packageJson) {
    return ['echo "No package manifest detected; replace this line with your project verification command."'];
  }

  const install = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn install' : `${pm} install`;
  const candidates = [
    scripts.check ? run('check') : null,
    scripts.typecheck ? run('typecheck') : null,
    scripts['type-check'] ? run('type-check') : null,
    scripts.lint ? run('lint') : null,
    scripts.test ? (pm === 'npm' ? 'npm test' : `${pm} test`) : null,
    scripts.build ? run('build') : null
  ].filter(Boolean);

  return [install, ...dedupe(candidates)];
}

function escapeForEcho(value) {
  return value.replaceAll('"', '\\"');
}

export function initScriptFromCommands(commands) {
  const body = commands.map((command) => `echo "=== ${escapeForEcho(command)} ==="\n${command}`).join('\n\n');
  return `#!/bin/bash
set -e

echo "=== SDD Harness Initialization ==="

${body}

echo "=== Traceability Gate ==="
node skills/sdd-harness-creator/scripts/check-traceability.mjs --target . || {
  echo "Traceability gate failed. Resolve orphans/clarifications before continuing." >&2
  exit 1
}

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read spec-registry.json to see each feature's SDD phase"
echo "2. Advance ONE feature through the flow (Specify -> Clarify -> Plan -> Tasks -> Implement -> Verify)"
echo "3. Do not start a phase before the previous gate passes"
echo "4. Re-run ./init.sh before claiming a feature done"
`;
}

// ---------------------------------------------------------------------------
// SDD-specific: registry, traceability, scoring
// ---------------------------------------------------------------------------

export const PHASES = ['draft', 'specified', 'clarified', 'planned', 'tasked', 'implementing', 'verified', 'done', 'documented'];
// Match the opening token so markers carrying a question still count:
// `[NEEDS CLARIFICATION: which currency?]`
const CLARIFICATION_MARKER = '[NEEDS CLARIFICATION';

/**
 * Analyze a spec-registry object for traceability gaps.
 * Returns { ok, problems[], stats } without throwing.
 */
export function analyzeTraceability(registry, specTexts = {}) {
  const problems = [];
  const features = Array.isArray(registry?.features) ? registry.features : [];

  let acTotal = 0;
  let acCovered = 0;
  let acVerified = 0;

  for (const feature of features) {
    const fid = feature.id ?? '(unknown)';
    const criteria = Array.isArray(feature.acceptance_criteria) ? feature.acceptance_criteria : [];
    const taskIds = new Set();
    for (const ac of criteria) {
      acTotal += 1;
      const linkedTasks = Array.isArray(ac.tasks) ? ac.tasks : [];
      for (const t of linkedTasks) taskIds.add(t);
      if (linkedTasks.length === 0) {
        problems.push({ feature: fid, type: 'orphan-ac', id: ac.id, message: `AC ${ac.id} has no task` });
      } else {
        acCovered += 1;
      }
      const status = ac.status ?? 'pending';
      if (status === 'verified') {
        acVerified += 1;
        if (!ac.evidence) {
          problems.push({ feature: fid, type: 'missing-evidence', id: ac.id, message: `AC ${ac.id} is verified but has no evidence` });
        }
      }
      if ((feature.phase === 'verified' || feature.phase === 'done') && status !== 'verified') {
        problems.push({ feature: fid, type: 'unverified-ac', id: ac.id, message: `Feature is ${feature.phase} but AC ${ac.id} is not verified` });
      }
    }

    // Orphan tasks: tasks declared on the feature but not linked from any AC.
    const declaredTasks = Array.isArray(feature.tasks_index) ? feature.tasks_index : [];
    for (const task of declaredTasks) {
      const taskId = typeof task === 'string' ? task : task.id;
      if (taskId && !taskIds.has(taskId)) {
        problems.push({ feature: fid, type: 'orphan-task', id: taskId, message: `Task ${taskId} is not linked to any AC` });
      }
    }

    // Open clarifications in the feature's spec text.
    const specText = specTexts[feature.spec] ?? '';
    if (specText.includes(CLARIFICATION_MARKER)) {
      const count = specText.split(CLARIFICATION_MARKER).length - 1;
      if (feature.phase !== 'draft') {
        problems.push({ feature: fid, type: 'open-clarification', id: feature.spec, message: `${count} open ${CLARIFICATION_MARKER} marker(s) in ${feature.spec}` });
      }
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    stats: { features: features.length, acTotal, acCovered, acVerified }
  };
}

/**
 * Load the SDD harness files (top-level + everything under specs/).
 */
export async function loadSddHarnessFiles(root) {
  const topLevel = [
    'AGENTS.md', 'CLAUDE.md', 'constitution.md',
    'spec-registry.json', 'spec-registry.schema.json',
    'progress.md', 'session-handoff.md', 'init.sh'
  ];
  const files = [];
  for (const candidate of topLevel) {
    const full = path.join(root, candidate);
    if (await exists(full)) files.push({ path: candidate, content: await readText(full) });
  }
  const specsDir = path.join(root, 'specs');
  if (await exists(specsDir)) {
    const nested = await listFiles(specsDir, { maxFiles: 400 });
    for (const rel of nested) {
      if (rel.endsWith('.md')) {
        files.push({ path: `specs/${rel}`, content: await readText(path.join(specsDir, rel)) });
      }
    }
  }
  return files;
}

export function scoreSddHarness(files) {
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  const allText = files.map((file) => `${file.path}\n${file.content}`).join('\n\n');
  const agents = byPath.get('AGENTS.md') || byPath.get('CLAUDE.md') || '';
  const constitution = byPath.get('constitution.md') || '';
  const registryText = byPath.get('spec-registry.json') || '';
  const progress = byPath.get('progress.md') || '';
  const handoff = byPath.get('session-handoff.md') || '';
  const init = byPath.get('init.sh') || '';

  const specFiles = [...byPath.keys()].filter((p) => p.startsWith('specs/') && p.endsWith('/spec.md'));
  const planFiles = [...byPath.keys()].filter((p) => p.startsWith('specs/') && p.endsWith('/plan.md'));
  const taskFiles = [...byPath.keys()].filter((p) => p.startsWith('specs/') && p.endsWith('/tasks.md'));
  const specText = specFiles.map((p) => byPath.get(p)).join('\n');

  let registry = null;
  try { registry = JSON.parse(registryText); } catch { /* invalid */ }
  const specTexts = Object.fromEntries(specFiles.map((p) => [p, byPath.get(p)]));
  const trace = registry ? analyzeTraceability(registry, specTexts) : { ok: false, problems: [{}], stats: {} };

  const checks = {
    constitution: [
      hasFile(byPath, ['constitution.md'], 'Constitution file exists'),
      textHas(constitution, ['principle', 'non-negotiable', 'invariant', 'must', 'constraint'], 'Constitution states principles/constraints'),
      textHas(agents, ['constitution'], 'Instructions route to the constitution'),
      hasFile(byPath, ['AGENTS.md', 'CLAUDE.md'], 'Agent instruction file exists'),
      textHas(agents, ['gate', 'phase'], 'Instructions describe phase gates')
    ],
    specification: [
      arrayHas(specFiles, 'At least one spec.md exists'),
      textHas(specText, ['acceptance criteria', 'AC-'], 'Spec defines acceptance criteria'),
      textHas(specText, ['out of scope', 'non-goals', 'edge case'], 'Spec bounds scope / edge cases'),
      textHas(agents, ['specify', 'specification'], 'Specify phase documented'),
      jsonRegistryValid(registryText, 'Spec registry is valid with feature fields')
    ],
    planning: [
      arrayHas(planFiles, 'At least one plan.md exists'),
      textHas(agents, ['plan'], 'Plan phase documented'),
      textHas(allText, ['architecture', 'data model', 'contract', 'approach', 'decision'], 'Plan captures technical approach'),
      textHas(allText, ['constitution'], 'Plan references the constitution'),
      textHas(registryText, ['"phase"', 'planned'], 'Registry tracks the planned phase')
    ],
    traceability: [
      arrayHas(taskFiles, 'At least one tasks.md exists'),
      textHas(registryText, ['acceptance_criteria', '"tasks"'], 'Registry links ACs to tasks'),
      { pass: Boolean(registry) && trace.problems.length === 0, message: 'Bidirectional AC<->task coverage holds' },
      textHas(agents, ['traceab', 'every task', 'every acceptance'], 'Traceability rule documented'),
      textHas(init + agents, ['check-traceability'], 'Traceability check is wired into verification')
    ],
    verification: [
      hasFile(byPath, ['init.sh'], 'Verification entrypoint exists'),
      textHas(init, ['set -e'], 'Verification fails fast'),
      textHas(init + agents, ['test', 'pytest', 'vitest', 'cargo test', 'go test', 'dotnet test'], 'Test command documented'),
      textHas(allText, ['evidence', 'verified'], 'Per-AC evidence is recorded'),
      textHas(agents, ['definition of done', 'every ac', 'every acceptance', 'against the spec'], 'Done is measured against the spec')
    ],
    lifecycle: [
      hasFile(byPath, ['progress.md'], 'Progress log exists'),
      hasFile(byPath, ['session-handoff.md'], 'Session handoff exists'),
      textHas(progress + handoff, ['Next', 'Recommended Next Step', 'Current'], 'Session restart markers exist'),
      textHas(registryText, ['"phase"'], 'Registry persists per-feature phase'),
      textHas(agents + init, ['restartable', 'clean', 'Next steps', 'End of Session'], 'Clean restart path documented')
    ]
  };

  const subsystems = Object.fromEntries(Object.entries(checks).map(([name, subsystemChecks]) => {
    const passed = subsystemChecks.filter((check) => check.pass).length;
    const score = Math.max(1, Math.round((passed / subsystemChecks.length) * 5));
    return [name, { score, passed, total: subsystemChecks.length, checks: subsystemChecks }];
  }));

  const total = Object.values(subsystems).reduce((sum, item) => sum + item.score, 0);
  const overall = Math.round((total / (SUBSYSTEMS.length * 5)) * 100);
  const bottleneck = Object.entries(subsystems).sort((a, b) => a[1].score - b[1].score)[0][0];
  return { overall, bottleneck, subsystems };
}

function hasFile(byPath, names, message) {
  return { pass: names.some((name) => byPath.has(name)), message };
}

function arrayHas(arr, message) {
  return { pass: Array.isArray(arr) && arr.length > 0, message };
}

function textHas(text, needles, message) {
  const lower = String(text).toLowerCase();
  return { pass: needles.some((needle) => lower.includes(needle.toLowerCase())), message };
}

function jsonRegistryValid(text, message) {
  try {
    const parsed = JSON.parse(text);
    const valid = Array.isArray(parsed.features) && parsed.features.every((feature) =>
      typeof feature.id === 'string'
      && typeof feature.name === 'string'
      && typeof feature.phase === 'string');
    return { pass: valid, message };
  } catch {
    return { pass: false, message };
  }
}

export function formatScoreReport(result, root = '.') {
  const lines = [
    `SDD harness validation for ${root}`,
    `Overall: ${result.overall}/100`,
    `Bottleneck: ${result.bottleneck}`,
    ''
  ];
  for (const [name, subsystem] of Object.entries(result.subsystems)) {
    lines.push(`${name}: ${subsystem.score}/5 (${subsystem.passed}/${subsystem.total})`);
    for (const check of subsystem.checks) {
      lines.push(`  ${check.pass ? 'PASS' : 'FAIL'} ${check.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function formatTraceabilityReport(result, root = '.') {
  const lines = [`Traceability check for ${root}`];
  const { features, acTotal, acCovered, acVerified } = result.stats;
  lines.push(`Features: ${features} | Acceptance criteria: ${acTotal} (covered ${acCovered}, verified ${acVerified})`);
  lines.push('');
  if (result.ok) {
    lines.push('OK — no traceability gaps.');
    return lines.join('\n');
  }
  lines.push(`Found ${result.problems.length} problem(s):`);
  for (const problem of result.problems) {
    lines.push(`  [${problem.type}] ${problem.feature}: ${problem.message}`);
  }
  return lines.join('\n');
}
