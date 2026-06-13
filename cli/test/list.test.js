import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listCommand } from '../src/commands/list.js';

async function withCapturedLog(fn) {
  const lines = [];
  const original = console.log;
  console.log = (msg) => lines.push(msg);
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines;
}

function writeSkill(dir, frontmatter = '') {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${path.basename(dir)}\n${frontmatter}---\n`);
}

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-list-'));
  writeSkill(path.join(root, 'skill-creator'), 'metadata:\n  language: agnostic\n  tags: [meta, sdd]\n');
  writeSkill(path.join(root, 'python', 'py-linter'), 'metadata:\n  language: python\n  tags: [linting]\n');
  writeSkill(path.join(root, 'sem-meta'), '');
  return root;
}

test('listCommand mostra "Nenhuma skill disponível." quando o diretório não existe', async () => {
  const skillsDir = path.join(os.tmpdir(), 'lup-skills-test-nao-existe');
  const lines = await withCapturedLog(() => listCommand({ skillsDir }));
  assert.deepEqual(lines, ['Nenhuma skill disponível.']);
});

test('listCommand agrupa por language seguindo o frontmatter, não as pastas', async () => {
  const root = setupRepo();
  const lines = await withCapturedLog(() => listCommand({ skillsDir: root }));
  fs.rmSync(root, { recursive: true, force: true });

  const text = lines.join('\n');
  // grupos por language, "sem categoria" por último
  assert.match(text, /agnostic:/);
  assert.match(text, /python:/);
  assert.match(text, /sem categoria:/);
  // py-linter aparece sob python apesar de estar na pasta python/ (frontmatter manda)
  assert.match(text, /python:\n {2}- py-linter {8}\[linting\]/);
  assert.match(text, /agnostic:\n {2}- skill-creator {8}\[meta, sdd\]/);
  // grupo sem categoria vem por último
  assert.ok(text.lastIndexOf('sem categoria:') > text.indexOf('python:'));
});

test('listCommand filtra por --language', async () => {
  const root = setupRepo();
  const lines = await withCapturedLog(() => listCommand({ skillsDir: root, language: 'python' }));
  fs.rmSync(root, { recursive: true, force: true });

  const text = lines.join('\n');
  assert.match(text, /python:/);
  assert.doesNotMatch(text, /agnostic:/);
  assert.doesNotMatch(text, /sem categoria:/);
});

test('listCommand filtra por --tag', async () => {
  const root = setupRepo();
  const lines = await withCapturedLog(() => listCommand({ skillsDir: root, tag: 'sdd' }));
  fs.rmSync(root, { recursive: true, force: true });

  const text = lines.join('\n');
  assert.match(text, /skill-creator/);
  assert.doesNotMatch(text, /py-linter/);
});

test('listCommand informa quando o filtro não retorna nada', async () => {
  const root = setupRepo();
  const lines = await withCapturedLog(() => listCommand({ skillsDir: root, tag: 'inexistente' }));
  fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(lines, ['Nenhuma skill encontrada para o filtro informado.']);
});

test('listCommand mostra "Nenhuma skill disponível." quando o diretório está vazio', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-list-vazio-'));
  const lines = await withCapturedLog(() => listCommand({ skillsDir: root }));
  fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(lines, ['Nenhuma skill disponível.']);
});
