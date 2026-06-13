#!/usr/bin/env node
// Valida o padrão do projeto para skills: nenhuma skill pode ser criada com o
// nome de outra já existente. Reaproveita discoverSkills do CLI (mesma lógica
// usada por `lup-skills`) e confere também que o campo `name` do frontmatter
// bate com o nome da pasta. Sai com código != 0 quando há qualquer problema.
import fs from 'node:fs';
import path from 'node:path';
import { discoverSkills } from '../cli/src/utils/skills.js';

function frontmatterName(dir) {
  let text;
  try {
    text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  } catch {
    return null;
  }
  const fmMatch = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fmMatch) return null;
  const nameMatch = /^name:\s*["']?(.+?)["']?\s*$/m.exec(fmMatch[1]);
  return nameMatch ? nameMatch[1].trim() : null;
}

const skills = discoverSkills();
const problems = [];
const byName = new Map();

for (const skill of skills) {
  const dirs = byName.get(skill.name) ?? [];
  dirs.push(skill.dir);
  byName.set(skill.name, dirs);

  const declared = frontmatterName(skill.dir);
  if (declared === null) {
    problems.push(`Skill em "${skill.dir}": SKILL.md sem campo \`name\` no frontmatter.`);
  } else if (declared !== skill.name) {
    problems.push(`Skill em "${skill.dir}": \`name: ${declared}\` no frontmatter difere do nome da pasta "${skill.name}".`);
  }
}

for (const [name, dirs] of byName) {
  if (dirs.length > 1) {
    problems.push(`Nome de skill duplicado "${name}" — nomes devem ser únicos:\n${dirs.map((d) => `      - ${d}`).join('\n')}`);
  }
}

console.log(`Skills encontradas: ${skills.length}`);
for (const skill of skills) console.log(`  - ${skill.name}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problema(s) no padrão de skills:`);
  for (const problem of problems) console.error(`  • ${problem}`);
  process.exit(1);
}

console.log('\nOK — nomes de skill únicos e consistentes com o frontmatter.');
