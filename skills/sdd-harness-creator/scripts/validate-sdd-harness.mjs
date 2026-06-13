#!/usr/bin/env node
import path from 'node:path';
import { formatScoreReport, loadSddHarnessFiles, parseArgs, scoreSddHarness } from './lib/sdd-utils.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/validate-sdd-harness.mjs [--target DIR] [--json]

Scores six SDD subsystems: constitution, specification, planning,
traceability, verification, lifecycle. Reports the bottleneck subsystem.`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const files = await loadSddHarnessFiles(target);
const result = scoreSddHarness(files);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatScoreReport(result, target));
}

process.exit(result.overall >= 60 ? 0 : 1);
