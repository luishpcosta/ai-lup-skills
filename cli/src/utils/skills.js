import fs from 'node:fs';
import path from 'node:path';
import { SKILLS_SOURCE_DIR } from './paths.js';
import { readSkillMetadata } from './frontmatter.js';

/**
 * Descobre skills recursivamente sob `skillsDir`. Uma pasta é considerada uma
 * skill quando contém um `SKILL.md` diretamente; ao encontrá-la, registramos
 * seus metadados e não descemos mais naquela subárvore. Pastas intermediárias
 * sem `SKILL.md` (as "categorias") são apenas atravessadas.
 */
export function discoverSkills(skillsDir = SKILLS_SOURCE_DIR) {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const skills = [];

  const visit = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const isSkill =
      dir !== skillsDir &&
      entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md');

    if (isSkill) {
      skills.push({
        name: path.basename(dir),
        dir,
        ...readSkillMetadata(dir),
      });
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        visit(path.join(dir, entry.name));
      }
    }
  };

  visit(skillsDir);

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Encontra uma skill pelo nome (basename da pasta). Lança erro se houver mais
 * de uma skill com o mesmo nome no repositório.
 */
export function findSkill(name, skillsDir = SKILLS_SOURCE_DIR) {
  const matches = discoverSkills(skillsDir).filter((skill) => skill.name === name);

  if (matches.length > 1) {
    const paths = matches.map((skill) => `  - ${skill.dir}`).join('\n');
    throw new Error(
      `Mais de uma skill chamada "${name}" foi encontrada. Nomes devem ser únicos:\n${paths}`,
    );
  }

  return matches[0];
}
