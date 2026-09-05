// Shared scaffolding used by both create-sdd-harness.mjs (plain scaffold) and
// interview.mjs render (scaffold filled with elicited answers).

import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  copyTemplate,
  detectPackageManager,
  detectProject,
  exists,
  initScriptFromCommands,
  isoDate,
  isoDateTime,
  verificationCommands,
  writeText
} from './sdd-utils.mjs';

/**
 * Guidance text every template placeholder falls back to when the interview
 * did not answer it. These are the `<fill in>` prompts the templates used to
 * carry inline, so a plain scaffold produces exactly what it always did.
 */
export const TEMPLATE_DEFAULTS = {
  OWNER: '<who>',
  PROJECT_PURPOSE: '<what this project does, and for whom>',
  EXTRA_PRINCIPLES: '- <project-specific non-negotiable rule>',
  TECH_STACK: '<fill in>',
  TEST_FRAMEWORK: '<fill in>',
  STYLE_LINT: '<fill in>',
  ARCH_BOUNDARIES: '- <fill in — e.g. layers that must not import each other>',
  QUALITY_BAR: '<fill in>',

  PROBLEM: '<Why does this feature exist? What user or business need does it serve?>',
  USER_STORIES: '- As a <role>, I want <capability>, so that <benefit>.',
  FUNCTIONAL_REQUIREMENTS: '- FR-1: <a single, observable requirement>\n- FR-2: <…>',
  ACCEPTANCE_CRITERIA: [
    '- **AC-1** — Given <context>, when <action>, then <observable outcome>. _(satisfies FR-1)_',
    '- **AC-2** — Given <context>, when <action>, then <observable outcome>. _(satisfies FR-2)_'
  ].join('\n'),
  EDGE_CASES: '- <boundary / error / empty / concurrency case and expected behavior>',
  NON_GOALS: '- <explicitly excluded behavior, so the agent does not overreach>',
  OPEN_QUESTIONS: '- `[NEEDS CLARIFICATION: <question>]`',

  TECHNICAL_APPROACH: '<High-level strategy. How does this satisfy the acceptance criteria?>',
  COMPONENTS: '- <component / module / service and its responsibility>',
  DATA_MODEL: '<New or changed entities, fields, migrations.>',
  CONTRACTS: '<APIs, function signatures, events, schemas this feature introduces or changes.>',
  REQUIREMENT_COVERAGE: '| FR-1 / AC-1 | <component / approach> |\n| FR-2 / AC-2 | <component / approach> |',
  CONSTITUTION_COMPLIANCE: '- <which principle/constraint applies and how this plan honors it>',
  KEY_DECISIONS: '|  |  |  |  |',
  RISKS: '- <risk and mitigation>',

  TASKS_TABLE: [
    '| T-1 | <atomic task> | AC-1 | todo | |',
    '| T-2 | <atomic task> | AC-1, AC-2 | todo | |',
    '| T-3 | <write test proving AC-2> | AC-2 | todo | |'
  ].join('\n')
};

/** Resolve stack, package manager and verification commands for a target repo. */
export async function resolveProject(target, { packageManager, commands } = {}) {
  const project = await detectProject(target);
  project.packageManager = detectPackageManager(target, packageManager);
  const resolved = commands && commands.length > 0
    ? commands
    : verificationCommands(project, packageManager);
  return { project, commands: resolved };
}

/**
 * Write the SDD harness into `target`.
 *
 * `values` carries elicited answers (placeholder -> markdown); anything absent
 * falls back to TEMPLATE_DEFAULTS.
 */
export async function scaffold({
  target,
  agentFile = 'AGENTS.md',
  packageManager,
  commands,
  force = false,
  values = {},
  featureId = '001-example',
  featureName = 'Example Feature'
}) {
  const { project, commands: verify } = await resolveProject(target, { packageManager, commands });
  await mkdir(target, { recursive: true });

  const purpose = values.PROJECT_PURPOSE
    ?? (project.stack === 'generic'
      ? 'Spec-driven harness for reliable agent-assisted development.'
      : `Spec-driven harness for reliable agent-assisted development in a ${project.stack} codebase.`);

  const dates = { DATE: isoDate(), DATETIME: isoDateTime() };
  const shared = { ...values, ...dates, PROJECT_PURPOSE: purpose };
  const options = { force, defaults: TEMPLATE_DEFAULTS };

  const results = [];
  results.push(await copyTemplate('agents.md', path.join(target, agentFile), {
    ...shared,
    AGENT_FILE_NAME: agentFile,
    VERIFICATION_COMMANDS: verify.map((command) => `- \`${command}\``).join('\n'),
    PRIMARY_VERIFICATION_COMMAND: './init.sh'
  }, options));
  results.push(await copyTemplate('constitution.md', path.join(target, 'constitution.md'), shared, options));
  results.push(await copyTemplate('progress.md', path.join(target, 'progress.md'), shared, options));

  const featureDir = path.join(target, 'specs', featureId);
  const featureValues = { ...shared, FEATURE_NAME: featureName, FEATURE_ID: featureId };
  for (const name of ['spec.md', 'plan.md', 'tasks.md']) {
    results.push(await copyTemplate(name, path.join(featureDir, name), featureValues, options));
  }

  const initPath = path.join(target, 'init.sh');
  if (force || !await exists(initPath)) {
    await writeText(initPath, initScriptFromCommands(verify));
    await chmod(initPath, 0o755);
    results.push({ path: initPath, status: 'written' });
  } else {
    results.push({ path: initPath, status: 'skipped', reason: 'exists' });
  }

  return { project, commands: verify, results };
}
