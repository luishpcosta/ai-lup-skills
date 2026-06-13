import { SKILLS_SOURCE_DIR } from '../utils/paths.js';
import { discoverSkills } from '../utils/skills.js';

const UNCATEGORIZED = 'sem categoria';

export async function listCommand({ skillsDir = SKILLS_SOURCE_DIR, language, tag } = {}) {
  let skills = discoverSkills(skillsDir);

  if (skills.length === 0) {
    console.log('Nenhuma skill disponível.');
    return;
  }

  if (language) {
    skills = skills.filter((skill) => skill.language === language);
  }
  if (tag) {
    skills = skills.filter((skill) => skill.tags.includes(tag));
  }

  if (skills.length === 0) {
    console.log('Nenhuma skill encontrada para o filtro informado.');
    return;
  }

  const groups = new Map();
  for (const skill of skills) {
    const key = skill.language || UNCATEGORIZED;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(skill);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b);
  });

  console.log('Skills disponíveis:');
  for (const key of sortedKeys) {
    console.log(`\n${key}:`);
    for (const skill of groups.get(key)) {
      const tags = skill.tags.length > 0 ? `        [${skill.tags.join(', ')}]` : '';
      console.log(`  - ${skill.name}${tags}`);
    }
  }
}
