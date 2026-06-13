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

test('listCommand mostra "Nenhuma skill disponível." quando o diretório não existe', async () => {
  const skillsDir = path.join(os.tmpdir(), 'lup-skills-test-nao-existe');
  const lines = await withCapturedLog(async () => {
    await listCommand({ skillsDir });
  });
  assert.deepEqual(lines, ['Nenhuma skill disponível.']);
});

test('listCommand mostra "Nenhuma skill disponível." quando o diretório está vazio', async () => {
  const skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-test-vazio-'));
  const lines = await withCapturedLog(async () => {
    await listCommand({ skillsDir });
  });
  fs.rmSync(skillsDir, { recursive: true, force: true });
  assert.deepEqual(lines, ['Nenhuma skill disponível.']);
});

test('listCommand lista skills disponíveis em ordem alfabética', async () => {
  const skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-test-list-'));
  fs.mkdirSync(path.join(skillsDir, 'skill-b'));
  fs.mkdirSync(path.join(skillsDir, 'skill-a'));
  fs.writeFileSync(path.join(skillsDir, 'um-arquivo.txt'), 'não é uma skill');

  const lines = await withCapturedLog(async () => {
    await listCommand({ skillsDir });
  });

  fs.rmSync(skillsDir, { recursive: true, force: true });

  assert.deepEqual(lines, ['Skills disponíveis:', '  - skill-a', '  - skill-b']);
});
