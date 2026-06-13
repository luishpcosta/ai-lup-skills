import fs from 'node:fs';
import { checkbox } from '@inquirer/prompts';
import {
  AGENT_TARGETS,
  getSkillSourcePath,
  getSkillTargetPath,
} from '../utils/paths.js';

export async function addCommand(skillName, { prompt = checkbox, cwd = process.cwd(), skillsSourceDir } = {}) {
  const sourcePath = getSkillSourcePath(skillName, skillsSourceDir);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Skill "${skillName}" não encontrada em ${sourcePath}`);
    process.exitCode = 1;
    return;
  }

  const agents = await prompt({
    message: `Para quais agentes deseja instalar a skill "${skillName}"? (espaço para marcar)`,
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
    fs.mkdirSync(targetPath, { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true });
    console.log(`✔ Skill "${skillName}" instalada para ${AGENT_TARGETS[agent].label} em ${targetPath}`);
  }
}
