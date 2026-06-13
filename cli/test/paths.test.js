import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { AGENT_TARGETS, getSkillTargetPath } from '../src/utils/paths.js';

test('getSkillTargetPath resolve o caminho para o agente Claude', () => {
  const result = getSkillTargetPath('claude', 'minha-skill', '/tmp/projeto');
  assert.equal(result, path.join('/tmp/projeto', '.claude/skills', 'minha-skill'));
});

test('getSkillTargetPath resolve o caminho para o agente Devin', () => {
  const result = getSkillTargetPath('devin', 'minha-skill', '/tmp/projeto');
  assert.equal(result, path.join('/tmp/projeto', '.agents/skills', 'minha-skill'));
});

test('getSkillTargetPath lança erro para agente desconhecido', () => {
  assert.throws(
    () => getSkillTargetPath('inexistente', 'minha-skill', '/tmp/projeto'),
    /Agente desconhecido: inexistente/,
  );
});

test('AGENT_TARGETS contém claude e devin', () => {
  assert.deepEqual(Object.keys(AGENT_TARGETS).sort(), ['claude', 'devin']);
});
