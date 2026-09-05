#!/usr/bin/env node
// Brownfield reconnaissance: build a bounded evidence digest so specs can be
// reconstructed without reading the codebase into the model's context.

import path from 'node:path';
import { exists, parseArgs, readJson, writeText } from './lib/sdd-utils.mjs';
import { scanTarget } from './lib/recon-scan.mjs';
import { countEvidence, renderDigest } from './lib/recon.mjs';

export const RECON_VERSION = 1;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/recon.mjs [--target DIR] [--src DIR] [--budget N] [--module NAME] [--json]

Scans an existing repository using only cheap signals — test names, public
surface, declaration lines, head doc comments and (at rung 3) commit subjects.
Function bodies are never emitted. Writes .sdd/recon.json and prints a digest
bounded by --budget evidence lines per module (default 40).

  --module NAME   print the digest for one module only
  --json          print the raw JSON instead of the digest`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const reconPath = path.join(target, '.sdd', 'recon.json');

if (!await exists(target)) {
  console.error(`Target does not exist: ${target}`);
  process.exit(2);
}

const previous = await exists(reconPath) ? await readJson(reconPath).catch(() => null) : null;
const budget = Number(args.budget ?? previous?.budget ?? 40);

const { sourceRoot, project, modules } = await scanTarget({
  target,
  src: args.src,
  budget,
  rungs: previous?.rungs ?? {}
});

const recon = {
  version: RECON_VERSION,
  target,
  sourceRoot,
  budget,
  generatedAt: new Date().toISOString(),
  project,
  rungs: previous?.rungs ?? {},
  approvals: previous?.approvals ?? {},
  modules
};
await writeText(reconPath, `${JSON.stringify(recon, null, 2)}\n`);

if (args.json) {
  console.log(JSON.stringify(recon, null, 2));
  process.exit(0);
}

console.log(`Recon of ${target}`);
console.log(`Source root: ${sourceRoot || '(repo root)'} | modules: ${modules.length} | budget: ${budget} evidence lines per module`);
if (project.name || project.description) console.log(`Project: ${project.name}${project.description ? ` — ${project.description}` : ''}`);
if (project.scripts?.length) console.log(`Scripts: ${project.scripts.join(', ')}`);
if (project.docs?.length) console.log(`Docs: ${project.docs.slice(0, 6).join(', ')}`);
console.log('');

const selected = args.module ? modules.filter((entry) => entry.name === args.module) : modules;
if (args.module && selected.length === 0) {
  console.error(`No module named "${args.module}". Known: ${modules.map((entry) => entry.name).join(', ')}`);
  process.exit(2);
}

for (const entry of selected) {
  console.log(renderDigest(entry));
  console.log('');
}

console.log(`Digest written to ${path.relative(target, reconPath)} (${selected.reduce((total, entry) => total + countEvidence(entry.evidence), 0)} evidence lines shown).`);
console.log('');
console.log(`NEXT: node ${path.join(import.meta.dirname, 'reverse-engineer.mjs')} --target ${target} --list`);
