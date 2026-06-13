#!/usr/bin/env node
import path from 'node:path';
import {
  analyzeTraceability,
  exists,
  formatTraceabilityReport,
  parseArgs,
  readJson,
  readText
} from './lib/sdd-utils.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/check-traceability.mjs [--target DIR]

Verifies spec-driven traceability from spec-registry.json:
  - every acceptance criterion is linked to at least one task (no orphan ACs)
  - every task is linked to an acceptance criterion (no orphan tasks)
  - no open [NEEDS CLARIFICATION] markers in active specs
  - verified ACs have evidence; verified/done features have all ACs verified

Exits non-zero when any gap is found (suitable for init.sh).`);
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

const specTexts = {};
for (const feature of registry.features ?? []) {
  if (feature.spec) {
    const specPath = path.join(target, feature.spec);
    if (await exists(specPath)) specTexts[feature.spec] = await readText(specPath);
  }
}

const result = analyzeTraceability(registry, specTexts);
console.log(formatTraceabilityReport(result, target));
process.exit(result.ok ? 0 : 1);
