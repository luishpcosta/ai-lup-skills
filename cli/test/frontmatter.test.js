import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSkillMetadata } from '../src/utils/frontmatter.js';

function makeSkill(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-fm-'));
  if (content !== null) {
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
  }
  return dir;
}

test('lê language e tags inline aninhados sob metadata', () => {
  const dir = makeSkill('---\nname: x\nmetadata:\n  language: python\n  tags: [linting, ci]\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, 'python');
  assert.deepEqual(meta.tags, ['linting', 'ci']);
});

test('lê language com aspas e tags em bloco sob metadata', () => {
  const dir = makeSkill('---\nname: x\nmetadata:\n  language: "agnostic"\n  tags:\n    - sdd\n    - repo-setup\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, 'agnostic');
  assert.deepEqual(meta.tags, ['sdd', 'repo-setup']);
});

test('também tolera language e tags no topo do frontmatter', () => {
  const dir = makeSkill('---\nname: x\nlanguage: python\ntags: [linting]\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, 'python');
  assert.deepEqual(meta.tags, ['linting']);
});

test('campos ausentes retornam valores neutros', () => {
  const dir = makeSkill('---\nname: x\ndescription: só isso\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, null);
  assert.deepEqual(meta.tags, []);
});

test('sem frontmatter retorna valores neutros', () => {
  const dir = makeSkill('# Skill sem frontmatter');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, null);
  assert.deepEqual(meta.tags, []);
});

test('sem arquivo SKILL.md retorna valores neutros', () => {
  const dir = makeSkill(null);
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, null);
  assert.deepEqual(meta.tags, []);
});

test('tags em bloco param na primeira linha que não é item', () => {
  const dir = makeSkill('---\ntags:\n  - a\n  - b\nname: x\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.deepEqual(meta.tags, ['a', 'b']);
});

test('language vazio é tratado como ausente', () => {
  const dir = makeSkill('---\nname: x\nlanguage: ""\n---\n# x');
  const meta = readSkillMetadata(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(meta.language, null);
});
