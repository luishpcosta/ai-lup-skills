// A prosa é onde vive o valor desta skill, e prosa não quebra sozinha quando
// o código muda — ela só passa a mentir em silêncio. Estes testes amarram os
// documentos ao validador: se alguém mudar um lado sem o outro, falha aqui.
//
// Já aconteceu uma vez nesta skill: um reference descrevia em detalhe
// validadores que tinham sido deletados. Foi pego no olho; devia ter sido
// pego por teste.
//
// Limite honesto: isto verifica que a prosa é *consistente*, nunca que ela é
// *boa*. Rubrica bem escrita que produz entrevista morna não aparece aqui.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  OPTIONAL_SECTIONS,
  REQUIRED_HEADER_FIELDS,
  REQUIRED_SECTIONS,
  REVIEW_STATUS,
  VERIFICATION_VOCABULARY,
  parseCase,
  validateCase
} from '../scripts/lib/case-schema.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFile(path.join(ROOT, rel), 'utf8');

/** Valores em `crase` dentro de uma tabela markdown logo após um cabeçalho-âncora. */
function tableValues(markdown, anchor) {
  const start = markdown.indexOf(anchor);
  assert.notEqual(start, -1, `não achei a âncora "${anchor}" — o documento mudou de forma`);
  const block = markdown.slice(start).split('\n\n').slice(0, 2).join('\n\n');
  return [...block.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]);
}

test('todo link relativo em SKILL.md e README.md aponta para arquivo existente', async () => {
  let total = 0;
  for (const doc of ['SKILL.md', 'README.md']) {
    const content = await read(doc);
    const links = [...content.matchAll(/\]\((?!https?:)([^)#]+)\)/g)].map((m) => m[1]);
    total += links.length;
    for (const link of links) {
      await assert.doesNotReject(read(link), `${doc} aponta para "${link}", que não existe`);
    }
  }
  assert.ok(total > 0, 'os documentos deveriam se referenciar por link em algum lugar');
});

test('nenhum documento cita um arquivo .mjs que não existe mais', async () => {
  const existing = new Set();
  for (const dir of ['scripts', 'scripts/lib', 'test']) {
    for (const entry of await readdir(path.join(ROOT, dir))) {
      if (entry.endsWith('.mjs')) existing.add(entry);
    }
  }
  for (const doc of ['SKILL.md', 'README.md', 'references/entrevista.md', 'references/revisao.md']) {
    const content = await read(doc);
    for (const [full, name] of content.matchAll(/\*?[\w.-]*?([\w-]+\.mjs)/g)) {
      if (full.includes('*')) continue; // glob de comando (ex.: test/*.test.mjs), não uma citação
      assert.ok(existing.has(name), `${doc} cita "${name}", que não existe mais`);
    }
  }
});

test('o vocabulário de Verificação documentado é o que o validador aceita', async () => {
  const documented = tableValues(await read('SKILL.md'), '| `verificado` |');
  assert.deepEqual(
    documented,
    VERIFICATION_VOCABULARY,
    'a tabela do SKILL.md e VERIFICATION_VOCABULARY divergiram'
  );
});

test('os valores de Revisão documentados são os que o validador aceita', async () => {
  const documented = tableValues(await read('SKILL.md'), '| `pendente` |');
  for (const value of documented) {
    // `<N> em aberto` é a forma genérica; testa com um número concreto.
    const concrete = value.replace('<N>', '2');
    assert.ok(REVIEW_STATUS.test(concrete), `SKILL.md documenta "${value}", que REVIEW_STATUS recusa`);
  }
  assert.equal(documented.length, 3, 'SKILL.md deveria documentar exatamente os três estados de Revisão');
});

test('o template tem exatamente as seções e os campos que o validador exige', async () => {
  const { header, sections } = parseCase(await read('templates/case.md'));

  for (const field of REQUIRED_HEADER_FIELDS) {
    assert.ok(field in header, `o template não tem o campo obrigatório **${field}:**`);
  }
  for (const name of [...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS]) {
    assert.ok(name in sections, `o template não tem a seção "## ${name}"`);
  }
  // E o contrário: nada de seção órfã que o validador ignora em silêncio.
  const known = new Set([...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS]);
  for (const name of Object.keys(sections)) {
    assert.ok(known.has(name), `o template tem a seção "## ${name}", que o validador não conhece`);
  }
});

test('as saídas honestas citadas na prosa são as que o validador reconhece', async () => {
  // Round-trip de verdade: pega a frase literal como está escrita nos
  // documentos e passa pelo validador. Comparar regex com regex não provaria
  // nada — o que importa é a frase que o usuário vai ver e copiar funcionar.
  const base = await read('templates/case.md');
  const fill = (values) => {
    let out = base;
    for (const [key, value] of Object.entries(values)) out = out.split(`{{${key}}}`).join(value);
    return out.replace(/\{\{[A-Z_]+\}\}/g, 'Texto suficientemente longo para a seção passar.');
  };

  const semEvidencia = fill({
    TITLE: 'Case de teste de consistência',
    WHEN: 'Q1 2026',
    VERIFICATION_STATUS: 'não verificado',
    REVIEW_STATUS: 'sem ressalvas',
    DATE: '2026-09-19',
    RESULT: '[sem métrica: não medíamos isso antes da mudança]',
    EVIDENCE: 'sem evidência disponível'
  });
  const verdict = validateCase(semEvidencia);
  assert.equal(
    verdict.ok,
    true,
    `as frases de escapatória documentadas foram recusadas: ${verdict.errors.join('; ')}`
  );

  // E as mesmas frases aparecem escritas assim nos documentos.
  const skill = await read('SKILL.md');
  const entrevista = await read('references/entrevista.md');
  for (const frase of ['sem evidência disponível', '[sem métrica:']) {
    assert.ok(
      skill.includes(frase) || entrevista.includes(frase),
      `a frase "${frase}" sumiu da prosa, mas o validador ainda depende dela`
    );
  }
});

test('entrevista.md documenta os 9 campos, cada um com a rubrica completa', async () => {
  const content = await read('references/entrevista.md');
  const fields = [...content.matchAll(/^## \d+\.\s+(.+)$/gm)].map((m) => m[1].trim());

  assert.equal(fields.length, 9, `esperava 9 campos, achei ${fields.length}: ${fields.join(', ')}`);

  // Os campos do SOAR propriamente ditos têm de casar com as seções do artefato.
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(
      fields.some((f) => f === section || f.startsWith(section)),
      `nenhum campo da entrevista corresponde à seção obrigatória "## ${section}"`
    );
  }

  // Cada campo carrega as partes que tornam a rubrica utilizável.
  const blocks = content.split(/^## \d+\.\s+/m).slice(1);
  for (const [i, block] of blocks.entries()) {
    for (const part of ['**Pergunte:**', '**Por quê:**', '- **Aceita:**', '- **Rejeita:**']) {
      assert.ok(block.includes(part), `o campo ${i + 1} (${fields[i]}) não tem "${part}"`);
    }
    assert.match(
      block,
      /\| Ruim \| Bom \|/,
      `o campo ${i + 1} (${fields[i]}) não tem a tabela de exemplo ruim/bom`
    );
  }
});

test('revisao.md mantém as partes que a etapa 4 do SKILL.md promete', async () => {
  const revisao = await read('references/revisao.md');
  for (const parte of ['contexto limpo', 'Pontos fortes', 'Pontos fracos', '**Revisão:**']) {
    assert.ok(revisao.includes(parte), `references/revisao.md perdeu a parte "${parte}"`);
  }
  // A regra anti-nitpick é o que impede a revisão de virar moedor infinito.
  assert.match(revisao, /fraqueza inventada/i, 'a regra contra a fraqueza inventada sumiu');
});

test('o frontmatter do SKILL.md bate com a pasta e declara metadata', async () => {
  const content = await read('SKILL.md');
  assert.match(content, /^---\n/, 'SKILL.md deveria começar com frontmatter');
  assert.match(content, /\nname: soar-case-builder\n/, 'o name do frontmatter tem de bater com a pasta');
  assert.match(content, /\n {2}language: /, 'metadata.language é exigido pelo CONTRIBUTING.md');
  assert.match(content, /\n {2}tags: \[/, 'metadata.tags é exigido pelo CONTRIBUTING.md');
});
