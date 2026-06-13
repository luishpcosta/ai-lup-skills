import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Raiz do repositório central ai-lup-skills, calculada a partir
 * da localização deste arquivo (cli/src/utils/paths.js).
 */
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const SKILLS_SOURCE_DIR = path.join(REPO_ROOT, 'skills');

/**
 * Mapa de agentes suportados para o diretório onde suas skills
 * devem ser instaladas dentro do projeto do usuário.
 */
export const AGENT_TARGETS = {
  claude: {
    label: 'Claude',
    skillsDir: '.claude/skills',
  },
  devin: {
    label: 'Devin',
    skillsDir: '.agents/skills',
  },
};

export function getSkillTargetPath(agent, skillName, cwd = process.cwd()) {
  const agentConfig = AGENT_TARGETS[agent];
  if (!agentConfig) {
    throw new Error(`Agente desconhecido: ${agent}`);
  }
  return path.join(cwd, agentConfig.skillsDir, skillName);
}
