import fs from 'node:fs';
import { checkbox } from '@inquirer/prompts';
import {
  AGENT_TARGETS,
  getSkillTargetPath,
} from '../utils/paths.js';

export async function removeCommand(skillName, { prompt = checkbox, cwd = process.cwd() } = {}) {
  const installedAgents = Object.keys(AGENT_TARGETS).filter((agent) =>
    fs.existsSync(getSkillTargetPath(agent, skillName, cwd)),
  );

  if (installedAgents.length === 0) {
    console.log(`Skill "${skillName}" não está instalada em nenhum agente neste projeto.`);
    return;
  }

  const agents = await prompt({
    message: `De quais agentes deseja remover a skill "${skillName}"? (espaço para marcar)`,
    choices: installedAgents.map((value) => ({
      value,
      name: AGENT_TARGETS[value].label,
    })),
  });

  if (agents.length === 0) {
    console.log('Nenhum agente selecionado. Operação cancelada.');
    return;
  }

  for (const agent of agents) {
    const targetPath = getSkillTargetPath(agent, skillName, cwd);
    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`✔ Skill "${skillName}" removida de ${AGENT_TARGETS[agent].label} (${targetPath})`);
  }
}
