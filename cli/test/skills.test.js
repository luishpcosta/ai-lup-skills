import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverSkills, findSkill } from '../src/utils/skills.js';

function writeSkill(dir, frontmatter = '') {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${path.basename(dir)}\n${frontmatter}---\n`);
}

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-disc-'));
  // skill na raiz
  writeSkill(path.join(root, 'skill-creator'), 'metadata:\n  language: agnostic\n  tags: [meta]\n');
  // skill aninhada em pasta de categoria
  writeSkill(path.join(root, 'python', 'py-linter'), 'metadata:\n  language: python\n  tags: [linting]\n');
  // skill com subpastas internas (não devem virar skills)
  const nested = path.join(root, 'js', 'eslint-setup');
  writeSkill(nested, 'metadata:\n  language: javascript\n');
  fs.mkdirSync(path.join(nested, 'scripts'));
  fs.writeFileSync(path.join(nested, 'scripts', 'run.js'), '// não é uma skill');
  return root;
}

test('discoverSkills retorna [] quando o diretório não existe', () => {
  const result = discoverSkills(path.join(os.tmpdir(), 'lup-nao-existe-xyz'));
  assert.deepEqual(result, []);
});

test('discoverSkills acha skills na raiz e aninhadas em categorias', () => {
  const root = setupRepo();
  const skills = discoverSkills(root);
  fs.rmSync(root, { recursive: true, force: true });

  const names = skills.map((s) => s.name);
  assert.deepEqual(names, ['eslint-setup', 'py-linter', 'skill-creator']);

  const byName = Object.fromEntries(skills.map((s) => [s.name, s]));
  assert.equal(byName['py-linter'].language, 'python');
  assert.deepEqual(byName['skill-creator'].tags, ['meta']);
});

test('discoverSkills não desce dentro de uma skill (ignora scripts/)', () => {
  const root = setupRepo();
  const skills = discoverSkills(root);
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(skills.some((s) => s.name === 'scripts'), false);
});

test('findSkill encontra a skill pelo nome', () => {
  const root = setupRepo();
  const skill = findSkill('py-linter', root);
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(skill.name, 'py-linter');
  assert.equal(path.basename(path.dirname(skill.dir)), 'python');
});

test('findSkill retorna undefined quando não existe', () => {
  const root = setupRepo();
  const skill = findSkill('inexistente', root);
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(skill, undefined);
});

test('findSkill lança erro em caso de nome ambíguo', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-amb-'));
  writeSkill(path.join(root, 'a', 'dup'));
  writeSkill(path.join(root, 'b', 'dup'));
  assert.throws(() => findSkill('dup', root), /Mais de uma skill chamada "dup"/);
  fs.rmSync(root, { recursive: true, force: true });
});
