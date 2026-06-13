import fs from 'node:fs';
import { SKILLS_SOURCE_DIR } from '../utils/paths.js';

export async function listCommand({ skillsDir = SKILLS_SOURCE_DIR } = {}) {
  if (!fs.existsSync(skillsDir)) {
    console.log('Nenhuma skill disponível.');
    return;
  }

  const skills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (skills.length === 0) {
    console.log('Nenhuma skill disponível.');
    return;
  }

  console.log('Skills disponíveis:');
  for (const skill of skills) {
    console.log(`  - ${skill}`);
  }
}
