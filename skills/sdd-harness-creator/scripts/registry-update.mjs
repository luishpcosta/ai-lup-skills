#!/usr/bin/env node
import path from 'node:path';
import { applyRegistryUpdate, exists, parseArgs, readJson, writeText } from './lib/sdd-utils.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/registry-update.mjs --target DIR --feature ID [options]

  --set-phase PHASE             Set the feature's SDD phase
  --ac AC-ID --status STATUS    Set one acceptance criterion's status (pending|covered|verified)
  --ac AC-ID --add-task TASK-ID Append a task id to that AC's tasks[] (mirror tasks.md links)
  --evidence "text"             Required alongside --status verified
  --status and --add-task may be combined in one call (same --ac)

Prints a one-line confirmation per change, never the full registry. Exits
non-zero on unknown feature/AC id, unknown phase/status, or verified status
without --evidence.`);
  process.exit(0);
}

const target = path.resolve(args.target || process.cwd());
const registryPath = path.join(target, 'spec-registry.json');

if (!args.feature) {
  console.error('Missing required --feature <id>');
  process.exit(2);
}
if (!await exists(registryPath)) {
  console.error(`No spec-registry.json found in ${target}`);
  process.exit(2);
}

let registry;
try {
  registry = await readJson(registryPath);
} catch (error) {
  console.error(`spec-registry.json is not valid JSON: ${error.message}`);
  process.exit(2);
}

const ops = [];
if (args.setPhase) {
  ops.push({ type: 'set-phase', featureId: args.feature, phase: args.setPhase });
}
if (args.ac && args.status) {
  ops.push({ type: 'set-ac-status', featureId: args.feature, acId: args.ac, status: args.status, evidence: args.evidence });
}
if (args.ac && args.addTask) {
  ops.push({ type: 'add-ac-task', featureId: args.feature, acId: args.ac, taskId: args.addTask });
}

if (ops.length === 0) {
  console.error('Specify --set-phase, or --ac with --status and/or --add-task');
  process.exit(2);
}

let current = registry;
const messages = [];
for (const op of ops) {
  const result = applyRegistryUpdate(current, op);
  if (!result.ok) {
    console.error(result.message);
    const structural = result.error === 'unknown-feature' || result.error === 'unknown-ac' || result.error === 'unknown-phase';
    process.exit(structural ? 2 : 1);
  }
  current = result.registry;
  messages.push(result.message);
}

await writeText(registryPath, `${JSON.stringify(current, null, 2)}\n`);
for (const message of messages) console.log(message);
process.exit(0);
