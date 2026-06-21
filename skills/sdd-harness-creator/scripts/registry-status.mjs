#!/usr/bin/env node
import path from 'node:path';
import {
  exists,
  findFeature,
  formatFeatureDetail,
  formatOpenCriteria,
  formatRegistryStatus,
  listOpenCriteria,
  parseArgs,
  readJson,
  summarizeRegistry
} from './lib/sdd-utils.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/registry-status.mjs [--target DIR] [--feature ID] [--open] [--json]

Prints a compact summary of spec-registry.json without loading the full file
into the caller's context:
  (no flags)            one line per feature: phase + AC verified/covered count
  --feature ID          that feature's acceptance criteria only
  --open                only non-verified ACs (all features, or just --feature's)
  --json                same data as JSON instead of formatted text`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const registryPath = path.join(target, 'spec-registry.json');

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

if (args.feature) {
  const result = findFeature(registry, args.feature, { openOnly: Boolean(args.open) });
  if (result.error === 'not-found') {
    console.error(`Unknown feature id: ${args.feature}`);
    process.exit(2);
  }
  console.log(args.json ? JSON.stringify(result.feature, null, 2) : formatFeatureDetail(result.feature, target));
  process.exit(0);
}

if (args.open) {
  const open = listOpenCriteria(registry);
  console.log(args.json ? JSON.stringify(open, null, 2) : formatOpenCriteria(open, target));
  process.exit(0);
}

const summary = summarizeRegistry(registry);
console.log(args.json ? JSON.stringify(summary, null, 2) : formatRegistryStatus(summary, target));
process.exit(0);
