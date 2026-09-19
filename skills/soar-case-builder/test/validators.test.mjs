import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hasEvidenceOrFlag,
  hasFirstPersonOwnership,
  hasMetricOrExplicitQualitative,
  hasTimeframe,
  isConcreteObstacle,
  isVagueClaim,
  minWords,
  validateAnswer
} from '../scripts/lib/validators.mjs';

test('isVagueClaim rejects corporate-speak and accepts concrete claims', () => {
  assert.match(isVagueClaim('Ajudei o time a entregar com qualidade.'), /discurso corporativo/);
  assert.equal(isVagueClaim('Implementei o feature flag que trocava a estratégia de lock.'), null);
});

test('hasTimeframe rejects vague dates and accepts a real period', () => {
  assert.match(hasTimeframe('recentemente'), /não é um período verificável/);
  assert.match(hasTimeframe('há um tempo'), /não é um período verificável/);
  assert.equal(hasTimeframe('Q4 2025'), null);
  assert.equal(hasTimeframe('março de 2026'), null);
  assert.match(hasTimeframe('numa terça-feira'), /não encontrei um período/);
});

test('isConcreteObstacle rejects the vague-phrase bank verbatim', () => {
  assert.match(isConcreteObstacle('era complicado'), /não explica o obstáculo real/);
  assert.match(isConcreteObstacle('faltou tempo'), /não explica o obstáculo real/);
});

test('isConcreteObstacle rejects a paraphrase via the adjective+no-concrete-noun check', () => {
  // Regressão: "era difícil" (banco exato) era pego, mas "era muito difícil de
  // resolver" (paráfrase) passava direto — não batia substring nem tinha
  // checagem semântica alguma.
  const verdict = isConcreteObstacle('era muito difícil de resolver');
  assert.notEqual(verdict, null);
});

test('isConcreteObstacle accepts a genuinely concrete restriction', () => {
  const obstacle = 'O timeout só reproduzia sob carga real de Black Friday, que não dava pra simular em staging, e o deploy de correção tinha janela de 40 minutos antes do pico.';
  assert.equal(isConcreteObstacle(obstacle), null);
});

test('isConcreteObstacle rejects an obstacle that just repeats the situation', () => {
  const situation = 'O checkout do app estava com timeout em cerca de 8% das compras nos horários de pico.';
  const circular = 'O checkout estava com timeout nos horários de pico';
  assert.match(isConcreteObstacle(circular, situation), /praticamente repete a situação/);
});

test('hasFirstPersonOwnership rejects team-only language and accepts a personal verb', () => {
  assert.match(hasFirstPersonOwnership('Nós resolvemos o problema como time.'), /o que o time fez/);
  assert.match(hasFirstPersonOwnership('A squad entregou a correção.'), /o que o time fez/);
  assert.equal(hasFirstPersonOwnership('Eu identifiquei a causa raiz e implementei a correção.'), null);
  assert.equal(hasFirstPersonOwnership('Propus a solução e liderei a implementação.'), null);
});

test('hasMetricOrExplicitQualitative requires a number or the explicit escape hatch', () => {
  assert.match(hasMetricOrExplicitQualitative('A performance melhorou bastante.'), /não encontrei um número/);
  assert.equal(hasMetricOrExplicitQualitative('Timeout caiu de 8% para 0.3%.'), null);
  assert.equal(hasMetricOrExplicitQualitative('Latência caiu de 800ms para 120ms.'), null);
  assert.equal(hasMetricOrExplicitQualitative('[sem métrica: o time não media essa fila antes da mudança]'), null);
});

test('hasEvidenceOrFlag requires a verifiable reference or the exact opt-out phrase', () => {
  assert.match(hasEvidenceOrFlag('deve ter em algum lugar'), /não encontrei um link/);
  assert.equal(hasEvidenceOrFlag('sem evidência disponível'), null);
  assert.equal(hasEvidenceOrFlag('JIRA CHK-4213'), null);
  assert.equal(hasEvidenceOrFlag('https://github.com/org/repo/pull/892'), null);
  assert.equal(hasEvidenceOrFlag('PR #892'), null);
});

test('minWords honors the requested count instead of a hidden default', () => {
  // Regressão: validateAnswer("minWords:3") caía sempre no default (5) porque
  // o argumento depois de ":" era tratado como chave de contexto, nunca como
  // número literal.
  assert.equal(minWords('Squad Teste, como QA', 3), null);
  assert.match(minWords('Squad Teste', 3), /pelo menos 3/);
});

test('validateAnswer passes a numeric arg as a literal, not a context lookup', () => {
  const question = { ask: 'x', accept: 'y', validate: ['minWords:3'] };
  assert.equal(validateAnswer(question, 'Squad Teste, QA', {}).ok, true);
  assert.equal(validateAnswer(question, 'Squad', {}).ok, false);
});

test('validateAnswer passes a non-numeric arg as a context key', () => {
  const question = { ask: 'x', accept: 'y', validate: ['isConcreteObstacle:SITUATION'] };
  const context = { SITUATION: 'O checkout estava com timeout nos horários de pico.' };
  const verdict = validateAnswer(question, 'O checkout estava com timeout nos horários de pico', context);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /repete a situação/);
});

test('validateAnswer stops at the first failing validator and carries a re-ask', () => {
  const question = {
    ask: 'Pergunta?', accept: 'aceite', validate: ['isNonEmpty', 'minWords:5', 'isVagueClaim']
  };
  const verdict = validateAnswer(question, 'tudo certo por aqui', {});
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /pelo menos 5/);
  assert.ok(verdict.reAsk.includes('Pergunta?'));
});
