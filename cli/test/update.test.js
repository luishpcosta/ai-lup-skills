import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { updateCommand } from '../src/commands/update.js';

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lup-skills-update-'));
  const skillsSourceDir = path.join(root, 'skills');
  const cwd = path.join(root, 'projeto');
  // Versão "nova" no repositório central: SKILL.md atualizado + script novo.
  fs.mkdirSync(path.join(skillsSourceDir, 'minha-skill', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(skillsSourceDir, 'minha-skill', 'SKILL.md'), '# Minha Skill v2');
  fs.writeFileSync(path.join(skillsSourceDir, 'minha-skill', 'scripts', 'novo.js'), '// novo');
  fs.mkdirSync(cwd, { recursive: true });
  return { root, skillsSourceDir, cwd };
}

// Instala uma versão "antiga" da skill no destino do agente, com um arquivo obsoleto.
function installOldVersion(cwd, skillsDir, skillName) {
  const target = path.join(cwd, skillsDir, skillName);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'SKILL.md'), '# Minha Skill v1');
  fs.writeFileSync(path.join(target, 'obsoleto.js'), '// versão antiga');
  return target;
}

test('updateCommand exibe erro quando a skill não existe no repositório central', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  let promptCalled = false;

  const lines = await withCapturedLog(() =>
    updateCommand('skill-inexistente', {
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

test('updateCommand oferece todos os agentes, instalados ou não', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  // Nada instalado: ainda assim todos os agentes devem ser oferecidos.
  let offered;

  await withCapturedLog(() =>
    updateCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async ({ choices }) => {
        offered = choices.map((c) => c.value);
        return [];
      },
    }),
  );

  fs.rmSync(root, { recursive: true, force: true });

  assert.deepEqual(offered, ['claude', 'devin']);
});

test('updateCommand não altera nada quando nenhum agente é selecionado', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  const claudeTarget = installOldVersion(cwd, '.claude/skills', 'minha-skill');

  const lines = await withCapturedLog(() =>
    updateCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => [],
    }),
  );

  const stillOld = fs.readFileSync(path.join(claudeTarget, 'SKILL.md'), 'utf8');
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(stillOld, '# Minha Skill v1');
  assert.match(lines[0], /Nenhum agente selecionado/);
});

test('updateCommand substitui a versão antiga pela nova onde a skill já existe', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  const claudeTarget = installOldVersion(cwd, '.claude/skills', 'minha-skill');

  const lines = await withCapturedLog(() =>
    updateCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => ['claude'],
    }),
  );

  const claudeContent = fs.readFileSync(path.join(claudeTarget, 'SKILL.md'), 'utf8');
  const claudeHasNew = fs.existsSync(path.join(claudeTarget, 'scripts', 'novo.js'));
  const claudeHasStale = fs.existsSync(path.join(claudeTarget, 'obsoleto.js'));
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(claudeContent, '# Minha Skill v2');
  assert.equal(claudeHasNew, true);
  assert.equal(claudeHasStale, false);
  assert.match(lines[0], /atualizada/);
  assert.match(lines[0], /Claude/);
});

test('updateCommand instala a skill no agente selecionado que ainda não a possui', async () => {
  const { root, skillsSourceDir, cwd } = setupFixture();
  // Nada instalado em nenhum agente.

  const lines = await withCapturedLog(() =>
    updateCommand('minha-skill', {
      skillsSourceDir,
      cwd,
      prompt: async () => ['claude', 'devin'],
    }),
  );

  const claudeTarget = path.join(cwd, '.claude/skills/minha-skill');
  const devinTarget = path.join(cwd, '.agents/skills/minha-skill');
  const claudeInstalled = fs.existsSync(path.join(claudeTarget, 'SKILL.md'));
  const claudeHasNew = fs.existsSync(path.join(claudeTarget, 'scripts', 'novo.js'));
  const devinInstalled = fs.existsSync(path.join(devinTarget, 'SKILL.md'));
  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(claudeInstalled, true);
  assert.equal(claudeHasNew, true);
  assert.equal(devinInstalled, true);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /instalada/);
  assert.match(lines[0], /Claude/);
  assert.match(lines[1], /instalada/);
  assert.match(lines[1], /Devin/);
});
