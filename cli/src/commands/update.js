import fs from 'node:fs';
import { checkbox } from '@inquirer/prompts';
import { AGENT_TARGETS, getSkillTargetPath } from '../utils/paths.js';
import { findSkill } from '../utils/skills.js';

export async function updateCommand(skillName, { prompt = checkbox, cwd = process.cwd(), skillsSourceDir } = {}) {
  const skill = findSkill(skillName, skillsSourceDir);

  if (!skill) {
    console.error(`Skill "${skillName}" não encontrada no repositório.`);
    process.exitCode = 1;
    return;
  }

  const agents = await prompt({
    message: `Em quais agentes deseja atualizar a skill "${skillName}"? (espaço para marcar)`,
    choices: Object.entries(AGENT_TARGETS).map(([value, { label }]) => ({
      value,
      name: label,
    })),
  });

  if (agents.length === 0) {
    console.log('Nenhum agente selecionado. Operação cancelada.');
    return;
  }

  for (const agent of agents) {
    const targetPath = getSkillTargetPath(agent, skillName, cwd);
    const existed = fs.existsSync(targetPath);
    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.mkdirSync(targetPath, { recursive: true });
    fs.cpSync(skill.dir, targetPath, { recursive: true });
    const verb = existed ? 'atualizada' : 'instalada';
    console.log(`✔ Skill "${skillName}" ${verb} para ${AGENT_TARGETS[agent].label} em ${targetPath}`);
  }
}
