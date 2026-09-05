#!/usr/bin/env node
// Brownfield adoption: reconstruct specs from an existing codebase.
//
// The default mode is non-destructive. Specs are proposed one module at a time
// and only written after the user approves, so nothing lands in specs/ that a
// human has not read.

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { exists, parseArgs, readJson, writeText } from './lib/sdd-utils.mjs';
import { buildReverseFeature, slugify } from './lib/reverse.mjs';
import { scanTarget } from './lib/recon-scan.mjs';
import { RUNGS, renderDigest } from './lib/recon.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/reverse-engineer.mjs [--target DIR] <mode>

Modes (nothing is written until --write or --all):
  --list                      rank the modules worth documenting (default)
  --module NAME --propose     print the evidence digest + the draft spec, writing nothing
  --module NAME --more-evidence
                              escalate that module one rung up the evidence ladder
  --module NAME --write [--notes "user correction"] [--force]
                              write specs/NNN-slug/{spec,plan,tasks}.md, stamped as confirmed
  --module NAME --skip        record that this module is not worth tracking
  --all [--dry-run] [--max-features N] [--force]
                              non-interactive batch: document every remaining module

Options: --src DIR (source root override), --budget N (evidence lines per module).

Modules that already have a specs/NNN-slug entry, or that were skipped, are left alone.`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
if (!await exists(target)) {
  console.error(`Target does not exist: ${target}`);
  process.exit(2);
}

const SELF = path.join(import.meta.dirname, 'reverse-engineer.mjs');
const reconPath = path.join(target, '.sdd', 'recon.json');

function printNext(line) {
  console.log('');
  console.log(`NEXT: ${line}`);
}

function selfCmd(rest) {
  return `node ${SELF} --target ${target} ${rest}`;
}

const stored = await exists(reconPath) ? await readJson(reconPath).catch(() => null) : null;
const budget = Number(args.budget ?? stored?.budget ?? 40);
const rungs = { ...(stored?.rungs ?? {}) };
const approvals = { ...(stored?.approvals ?? {}) };

if (args.moreEvidence && args.module) {
  const current = Number(rungs[args.module] ?? 1);
  rungs[args.module] = Math.min(current + 1, RUNGS.length);
}

const { sourceRoot, project, modules } = await scanTarget({
  target,
  src: args.src ?? stored?.sourceRoot,
  budget,
  rungs
});

// Slugs already covered by specs/, so a module is never documented twice.
const specsDir = path.join(target, 'specs');
let existingFeatureIds = [];
if (await exists(specsDir)) {
  const entries = await readdir(specsDir, { withFileTypes: true });
  existingFeatureIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
const existingSlugs = new Set(existingFeatureIds.map((id) => id.replace(/^\d+-/, '')));
let nextIndex = existingFeatureIds.reduce((acc, id) => {
  const match = /^(\d+)-/.exec(id);
  return match ? Math.max(acc, Number(match[1])) : acc;
}, 0) + 1;

const isPending = (entry) => {
  const slug = slugify(entry.name);
  return !existingSlugs.has(slug) && approvals[slug]?.status !== 'skipped';
};

async function saveRecon() {
  await writeText(reconPath, `${JSON.stringify({
    version: 1,
    target,
    sourceRoot,
    budget,
    generatedAt: new Date().toISOString(),
    project,
    rungs,
    approvals,
    modules
  }, null, 2)}\n`);
}

function featureFor(entry, index, { confirmedBy = '', corrections = [] } = {}) {
  return buildReverseFeature({
    module: { name: entry.name, sourceFiles: entry.sourceFiles, testFiles: entry.testFiles },
    index,
    evidence: entry.evidence,
    confirmedBy,
    corrections
  });
}

async function writeFeature(feature, force) {
  const dir = path.join(target, 'specs', feature.id);
  for (const [name, contents] of [
    ['spec.md', feature.specMarkdown],
    ['plan.md', feature.planMarkdown],
    ['tasks.md', feature.tasksMarkdown]
  ]) {
    const filePath = path.join(dir, name);
    if (!force && await exists(filePath)) {
      console.log(`  SKIP ${path.relative(target, filePath)} (exists)`);
      continue;
    }
    await writeText(filePath, contents);
    console.log(`  WRITE ${path.relative(target, filePath)}`);
  }
}

function findModule(name) {
  const entry = modules.find((candidate) => candidate.name === name);
  if (!entry) {
    console.error(`No module named "${name}". Known: ${modules.map((candidate) => candidate.name).join(', ')}`);
    process.exit(2);
  }
  return entry;
}

// ---------------------------------------------------------------------------

if (modules.length === 0) {
  console.log(`No source modules detected under ${sourceRoot ? `${sourceRoot}/` : target}. Nothing to reverse-engineer.`);
  console.log('DONE');
  process.exit(0);
}

if (args.all) {
  const created = [];
  const maxFeatures = Number(args.maxFeatures || 20);
  for (const entry of modules) {
    if (created.length >= maxFeatures) break;
    if (!isPending(entry)) continue;
    const feature = featureFor(entry, nextIndex);
    created.push({ entry, feature });
    existingSlugs.add(slugify(entry.name));
    nextIndex += 1;
  }

  if (created.length === 0) {
    console.log('All detected modules already have a specs/ entry. Nothing new to add.');
    console.log('DONE');
    process.exit(0);
  }

  console.log(`Reverse-engineering ${target}`);
  console.log(`Source root: ${sourceRoot || '(repo root)'} | modules detected: ${modules.length} | features ${args.dryRun ? 'to add' : 'added'}: ${created.length}`);
  console.log('');
  for (const { entry, feature } of created) {
    console.log(`${args.dryRun ? 'WOULD ADD' : 'ADD'} ${feature.id}  (${feature.criteria.length} AC from ${feature.acSource})`);
    if (args.dryRun) continue;
    await writeFeature(feature, Boolean(args.force));
    approvals[slugify(entry.name)] = { status: 'batch', at: new Date().toISOString() };
  }
  if (!args.dryRun) await saveRecon();
  console.log('');
  console.log(args.dryRun
    ? 'Dry run — no files written.'
    : 'Next: review each retro-spec\'s Acceptance Criteria and Assumptions/To Confirm checklist.');
  printNext(args.dryRun ? selfCmd('--all') : selfCmd('--list'));
  process.exit(0);
}

if (args.module) {
  const entry = findModule(args.module);
  const slug = slugify(entry.name);

  if (args.skip) {
    approvals[slug] = { status: 'skipped', at: new Date().toISOString(), notes: args.notes ?? '' };
    await saveRecon();
    console.log(`SKIPPED ${entry.name} — it will not be offered again.`);
    printNext(selfCmd('--list'));
    process.exit(0);
  }

  if (args.write) {
    if (existingSlugs.has(slug)) {
      console.error(`REJECTED: specs/ already has an entry for "${slug}".`);
      printNext(selfCmd('--list'));
      process.exit(1);
    }
    const corrections = [args.notes].filter(Boolean).map(String);
    const feature = featureFor(entry, nextIndex, { confirmedBy: args.confirmedBy || 'user', corrections });
    console.log(`ADD ${feature.id}  (${feature.criteria.length} AC from ${feature.acSource})`);
    await writeFeature(feature, Boolean(args.force));
    approvals[slug] = {
      status: corrections.length > 0 ? 'corrected' : 'approved',
      at: new Date().toISOString(),
      notes: corrections.join(' | ')
    };
    await saveRecon();
    printNext(selfCmd('--list'));
    process.exit(0);
  }

  // --propose (and --more-evidence, which proposes again at the new rung)
  if (args.moreEvidence) {
    await saveRecon();
    console.log(`Escalated ${entry.name} to rung ${entry.rung}: ${RUNGS[entry.rung - 1].describes}`);
    console.log('');
  }

  const feature = featureFor(entry, nextIndex);
  console.log(renderDigest(entry));
  console.log('');
  console.log(`DRAFT ${feature.id} — ${feature.criteria.length} acceptance criteria derived from ${feature.acSource}. NOTHING WAS WRITTEN.`);
  console.log('');
  console.log(feature.specMarkdown);
  console.log('---');
  console.log('Show the draft to the user and ask which one applies:');
  console.log(`  approve         -> ${selfCmd(`--module ${entry.name} --write`)}`);
  console.log(`  correct         -> ${selfCmd(`--module ${entry.name} --write --notes "<their correction>"`)}`);
  console.log(`  skip            -> ${selfCmd(`--module ${entry.name} --skip`)}`);
  console.log(`  more evidence   -> ${selfCmd(`--module ${entry.name} --more-evidence`)}`);
  printNext('ask the user, then run exactly one of the four commands above');
  process.exit(0);
}

// Default: --list. Non-destructive by design.
const pending = modules.filter(isPending);
console.log(`Reverse-engineering candidates in ${target}`);
console.log(`Source root: ${sourceRoot || '(repo root)'} | modules: ${modules.length} | pending: ${pending.length}`);
console.log('');
console.log('Ranked by evidence strength (a module with tests reconstructs far better than one without):');
console.log('');
for (const entry of modules) {
  const slug = slugify(entry.name);
  const state = existingSlugs.has(slug)
    ? 'documented'
    : approvals[slug]?.status === 'skipped' ? 'skipped' : 'pending';
  const testNames = entry.evidence.testNames?.length ?? 0;
  console.log(`  [${state}] ${entry.name}  score ${entry.score}  (${entry.testFiles.length} test file(s), ${testNames} test name(s), rung ${entry.rung})`);
}
await saveRecon();
console.log('');
if (pending.length === 0) {
  console.log('Every module is documented or skipped.');
  console.log('DONE');
  process.exit(0);
}
console.log('Work one module per turn: propose, let the user approve or correct, then write.');
printNext(selfCmd(`--module ${pending[0].name} --propose`));
