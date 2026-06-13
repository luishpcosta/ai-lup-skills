import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addCommand } from '../src/commands/add.js';

async function withCapturedLog(fn) {
  const lines = [];
  const original = { log: console.log, error: console.error };
  console.log = (msg) => lines.push(msg);
  console.error = (msg) => lines.push(msg);
  try {
    await fn();
  } finally {
    console.log = original.log;
    console.error = original.error;
  }
  return lines;
}

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-add-'));
  const skillsSourceDir = path.join(root, 'skills');
  const cwd = path.join(root, 'projeto');
  fs.mkdirSync(path.join(skillsSourceDir, 'minha-skill', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(skillsSourceDir, 'minha-skill', 'SKILL.md'), '# Minha Skill');
  fs.writeFileSync(path.join(skillsSourceDir, 'minha-skill', 'scripts', 'run.js'), '// script');
  // skill aninhada dentro de uma pasta de categoria
  fs.mkdirSync(path.join(skillsSourceDir, 'python', 'nested-skill'), { recursive: true });
  fs.writeFileSync(path.join(skillsSourceDir, 'python', 'nested-skill', 'SKILL.md'), '---\nname: nested-skill\nmetadata:\n  language: python\n---\n');
  fs.mkdirSync(cwd, { recursive: true });
  return { root, skillsSourceDir, cwd };
}

test('addCommand exibe erro quando a skill não existe', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  let promptCalled = false;

  const lines = await withCapturedLog(() =>
    addCommand('skill-inexistente', {
      skillsSourceDir,
      cwd,
      prompt: async () => {
        promptCalled = true;
        return [];
      },
    }),
  );

  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(promptCalled, false);
  assert.match(lines[0], /não encontrada/);
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
});

test('addCommand não copia nada quando nenhum agente é selecionado', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();

  const lines = await withCapturedLog(() =>
    addCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => [],
    }),
  );

  const claudeTarget = path.join(cwd, '.claude/skills/minha-skill');
  const exists = fs.existsSync(claudeTarget);
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(exists, false);
  assert.match(lines[0], /Nenhum agente selecionado/);
});

test('addCommand copia a skill para os agentes selecionados', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();

  const lines = await withCapturedLog(() =>
    addCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => ['claude', 'devin'],
    }),
  );

  const claudeTarget = path.join(cwd, '.claude/skills/minha-skill');
  const devinTarget = path.join(cwd, '.agents/skills/minha-skill');

  const claudeFiles = fs.existsSync(path.join(claudeTarget, 'SKILL.md'));
  const claudeScript = fs.existsSync(path.join(claudeTarget, 'scripts', 'run.js'));
  const devinFiles = fs.existsSync(path.join(devinTarget, 'SKILL.md'));

  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(claudeFiles, true);
  assert.equal(claudeScript, true);
  assert.equal(devinFiles, true);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Claude/);
  assert.match(lines[1], /Devin/);
});

test('addCommand encontra skill aninhada em categoria e instala de forma plana', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();

  await withCapturedLog(() =>
    addCommand('nested-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => ['claude'],
    }),
  );

  // destino é plano (.claude/skills/nested-skill), sem a pasta de categoria "python"
  const flatTarget = path.join(cwd, '.claude/skills/nested-skill', 'SKILL.md');
  const noCategoryFolder = fs.existsSync(path.join(cwd, '.claude/skills/python'));
  const installed = fs.existsSync(flatTarget);
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(installed, true);
  assert.equal(noCategoryFolder, false);
});
