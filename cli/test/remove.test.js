import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removeCommand } from '../src/commands/remove.js';

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

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-remove-'));
  const cwd = path.join(root, 'projeto');
  fs.mkdirSync(cwd, { recursive: true });
  return { root, cwd };
}

test('removeCommand informa quando a skill não está instalada', async () => {
  const { root, cwd } = setupFixture();

  const lines = await withCapturedLog(() =>
    removeCommand('minha-skill', {
      cwd,
      prompt: async () => [],
    }),
  );

  fs.rmSync(root, { recursive: true, force: true });

  assert.match(lines[0], /não está instalada/);
});

test('removeCommand não remove nada quando nenhum agente é selecionado', async () => {
  const { root, cwd } = setupFixture();
  const claudeTarget = path.join(cwd, '.claude/skills/minha-skill');
  fs.mkdirSync(claudeTarget, { recursive: true });

  const lines = await withCapturedLog(() =>
    removeCommand('minha-skill', {
      cwd,
      prompt: async () => [],
    }),
  );

  const exists = fs.existsSync(claudeTarget);
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(exists, true);
  assert.match(lines[0], /Nenhum agente selecionado/);
});

test('removeCommand remove a skill dos agentes selecionados', async () => {
  const { root, cwd } = setupFixture();
  const claudeTarget = path.join(cwd, '.claude/skills/minha-skill');
  const devinTarget = path.join(cwd, '.agents/skills/minha-skill');
  fs.mkdirSync(claudeTarget, { recursive: true });
  fs.mkdirSync(devinTarget, { recursive: true });

  const lines = await withCapturedLog(() =>
    removeCommand('minha-skill', {
      cwd,
      prompt: async () => ['claude', 'devin'],
    }),
  );

  const claudeExists = fs.existsSync(claudeTarget);
  const devinExists = fs.existsSync(devinTarget);
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(claudeExists, false);
  assert.equal(devinExists, false);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Claude/);
  assert.match(lines[1], /Devin/);
});
