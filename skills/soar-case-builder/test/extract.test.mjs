import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyCandidate, extractCandidates, splitIntoCandidates } from '../scripts/lib/extract.mjs';

test('splitIntoCandidates strips list markers and splits long lines into sentences', () => {
  const raw = '- primeiro item\n* segundo item\n1. terceiro item\n\n   \n';
  assert.deepEqual(splitIntoCandidates(raw), ['primeiro item', 'segundo item', 'terceiro item']);

  const long = `${'palavra '.repeat(40)}. Frase curta.`;
  const parts = splitIntoCandidates(long);
  assert.ok(parts.length >= 2, 'uma linha longa deve virar mais de uma candidata');
});

test('classifyCandidate routes by keyword cue, action beating a weaker cue', () => {
  assert.equal(classifyCandidate('Eu decidi trocar a estratégia de lock.'), 'action');
  assert.equal(classifyCandidate('O timeout caiu de 8% para 0.3%.'), 'result');
  assert.equal(classifyCandidate('Estávamos no início do trimestre reformulando o checkout.'), 'situation');
  // Quando situação e obstáculo empatam na mesma frase, obstáculo (mais específico) vence o desempate.
  assert.equal(classifyCandidate('Tínhamos um problema de fila crescendo sem controle.'), 'obstacle');
  assert.equal(classifyCandidate('Ver PR #892 pra detalhes.'), 'evidence');
  assert.equal(classifyCandidate('Nada a ver com SOAR aqui.'), 'unclassified');
});

test('a vague-adjective-only line routes to obstacle and gets caught, not waved through as unclassified', () => {
  // Regressão: "Era complicado." não batia nenhuma pista de bucket (não tem
  // substantivo tipo "problema"/"risco") e caía em "unclassified", onde só
  // isNonEmpty rodava — passava como OK mesmo sendo o exemplo mais óbvio de
  // resposta vaga do banco de validadores.
  const { results } = extractCandidates('Era complicado.');
  assert.equal(results[0].bucket, 'obstacle');
  assert.equal(results[0].ok, false);
  assert.match(results[0].reason, /não explica o obstáculo real/);
});

test('team-only credit-taking is flagged even with no strong action verb', () => {
  // Regressão: "Ajudei o time..." não tinha nenhum verbo de ação da lista
  // original, caía em unclassified e passava como OK — exatamente o padrão
  // de "atribuir trabalho do time a si mesmo" que o grilling existe pra pegar.
  const { results } = extractCandidates('Ajudei o time a entregar com qualidade.');
  assert.equal(results[0].bucket, 'action');
  assert.equal(results[0].ok, false);
  assert.match(results[0].reason, /o que o time fez/);
});

test('a generic vague claim with no bucket cue at all is still caught by the fallback', () => {
  const { results } = extractCandidates('Fiz o meu melhor o tempo todo.');
  assert.equal(results[0].ok, false);
});

test('extractCandidates keeps every line, classified or not, none silently dropped', () => {
  const raw = 'O checkout estava com timeout no pico.\nEra complicado.\nEu implementei um feature flag.\nReduziu de 8% para 0.3%.\nJIRA CHK-4213';
  const { results, byBucket } = extractCandidates(raw);
  assert.equal(results.length, 5);
  const total = Object.values(byBucket).flat().length;
  assert.equal(total, results.length, 'todo item deve estar em exatamente um bucket');
});

test('a concrete, well-formed line in every bucket passes with no ressalva', () => {
  const raw = [
    'O checkout do app estava com timeout em cerca de 8% das compras nos horários de pico.',
    'O timeout só reproduzia sob carga real de Black Friday, que não dava pra simular em staging.',
    'Eu identifiquei o lock otimista como causa e implementei um feature flag pra trocar a estratégia.',
    'Timeout caiu de 8% para 0.3% das compras no pico.',
    'JIRA CHK-4213, PR #892'
  ].join('\n');
  const { results } = extractCandidates(raw);
  for (const item of results) {
    assert.equal(item.ok, true, `esperava OK para "${item.text}", motivo: ${item.reason}`);
  }
});
