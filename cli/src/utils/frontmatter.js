import fs from 'node:fs';
import path from 'node:path';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseTags(block) {
  const inlineMatch = block.match(/^\s*tags:\s*\[(.*)\]\s*$/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((tag) => stripQuotes(tag))
      .filter(Boolean);
  }

  const blockMatch = block.match(/^\s*tags:\s*$/m);
  if (!blockMatch) {
    return [];
  }

  const lines = block.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*tags:\s*$/.test(line));
  const tags = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const itemMatch = lines[i].match(/^\s*-\s+(.*)$/);
    if (!itemMatch) {
      break;
    }
    const tag = stripQuotes(itemMatch[1]);
    if (tag) {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Lê o frontmatter do SKILL.md de uma skill e extrai os metadados de
 * categorização (language e tags). A convenção é colocá-los sob `metadata:`
 * (campo suportado pelo schema do SKILL.md), mas o parser também tolera os
 * campos no topo. Campos ausentes retornam valores neutros.
 */
export function readSkillMetadata(skillDir) {
  const empty = { language: null, tags: [] };
  const skillFile = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    return empty;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return empty;
  }

  const block = match[1];
  const languageMatch = block.match(/^\s*language:\s*(.+)\s*$/m);
  const language = languageMatch ? stripQuotes(languageMatch[1]) || null : null;

  return { language, tags: parseTags(block) };
}
