#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from './lib/sdd-utils.mjs';
import { scaffold } from './lib/scaffold.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/create-sdd-harness.mjs [--target DIR] [--agent-file AGENTS.md|CLAUDE.md] [--package-manager npm|pnpm|yarn|bun] [--commands "a,b"] [--force]

Creates a spec-driven (SDD) harness:
  AGENTS.md or CLAUDE.md      (SDD flow + gates)
  constitution.md
  specs/001-example/{spec,plan,tasks}.md
  progress.md
  init.sh                     (verification)

Existing files are skipped unless --force is set.

The artifacts land with placeholder guidance. To fill them from an interview
instead, run scripts/interview.mjs (greenfield) — see SKILL.md, Mode 1.`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const { project, commands, results } = await scaffold({
  target,
  agentFile: args.agentFile || 'AGENTS.md',
  packageManager: args.packageManager,
  commands: args.commands
    ? String(args.commands).split(',').map((command) => command.trim()).filter(Boolean)
    : undefined,
  force: Boolean(args.force)
});

console.log(`Created SDD harness for ${target}`);
console.log(`Detected stack: ${project.stack}`);
console.log('Verification commands:');
for (const command of commands) console.log(`  - ${command}`);
console.log('');
for (const result of results) {
  console.log(`${result.status.toUpperCase()} ${path.relative(target, result.path)}${result.reason ? ` (${result.reason})` : ''}`);
}
console.log('');
console.log('Next: replace specs/001-example with your first real feature.');
console.log(`NEXT: node ${path.relative(process.cwd(), path.join(import.meta.dirname, 'interview.mjs'))} init --target ${target}`);
