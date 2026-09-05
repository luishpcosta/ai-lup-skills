import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  QUESTIONS,
  isComplete,
  nextQuestion,
  questionById,
  questionsFor,
  renderValues,
  validateAnswer
} from '../scripts/lib/questions.mjs';

test('isSpecificEnough rejects vague terms in either language', () => {
  const question = questionById('Q-CONST-PURPOSE');
  const english = validateAnswer(question, 'A modern platform that works well for everyone');
  assert.equal(english.ok, false);
  assert.match(english.reason, /works well/);

  const portuguese = validateAnswer(question, 'Uma ferramenta que funciona bem para o time todo');
  assert.equal(portuguese.ok, false);
  assert.match(portuguese.reason, /funciona bem/);
});

test('isCommandLike rejects prose and accepts a real command line', () => {
  const question = questionById('Q-CONST-TEST');
  assert.equal(validateAnswer(question, 'we run the tests by hand').ok, false);
  assert.equal(validateAnswer(question, 'npm test').ok, true);
  assert.equal(validateAnswer(question, './gradlew test').ok, true);
  assert.equal(validateAnswer(question, 'python -m pytest').ok, true);
});

test('isGivenWhenThen names every missing part', () => {
  const question = questionById('Q-SPEC-AC');
  const verdict = validateAnswer(question, 'When the user clicks it saves');
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /Given/);
  assert.match(verdict.reason, /Then/);
  assert.equal(
    validateAnswer(question, 'Given a saved draft, when the user clicks save, then the row count grows by one.').ok,
    true
  );
});

test('isGivenWhenThen accepts a Portuguese rewrite', () => {
  const question = questionById('Q-SPEC-AC');
  const verdict = validateAnswer(question, 'Dado um rascunho salvo, quando o usuário clica em salvar, então a contagem sobe em um.');
  assert.equal(verdict.ok, true);
});

test('hasNoImplementationLeak keeps tech out of the spec', () => {
  const question = questionById('Q-SPEC-PROBLEM');
  assert.match(
    validateAnswer(question, 'We need a Postgres table so the data survives a restart between sessions').reason,
    /postgres/i
  );
  assert.match(
    validateAnswer(question, 'The handler in src/api/routes.js keeps drifting away from what the team expects').reason,
    /file name|source path/
  );
  assert.equal(
    validateAnswer(question, 'People copy the folders by hand and the copies drift out of sync over time').ok,
    true
  );
});

test('a rejection always carries a re-ask the model can read out loud', () => {
  const verdict = validateAnswer(questionById('Q-CONST-QUALITY'), 'good code');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reAsk.includes(questionById('Q-CONST-QUALITY').ask));
});

test('every question in the bank has a rubric and a working validator chain', () => {
  for (const question of QUESTIONS) {
    for (const field of ['ask', 'why', 'accept', 'reject', 'goodExample', 'badExample', 'fills', 'artifact']) {
      assert.ok(question[field], `${question.id} is missing ${field}`);
    }
    // The bad example is there to be rejected — it must actually fail the chain.
    assert.doesNotThrow(() => validateAnswer(question, question.goodExample));
    assert.equal(validateAnswer(question, question.goodExample).ok, true, `${question.id} rejects its own good example`);
  }
});

test('questionsFor filters by artifact and every artifact has questions', () => {
  for (const artifact of ['constitution', 'spec', 'plan', 'tasks']) {
    const questions = questionsFor(artifact);
    assert.ok(questions.length > 0, `${artifact} has no questions`);
    assert.ok(questions.every((question) => question.artifact === artifact));
  }
  assert.equal(questionsFor('all').length, QUESTIONS.length);
});

test('nextQuestion walks the order and stops on the first incomplete question', () => {
  const state = {
    order: ['Q-CONST-PURPOSE', 'Q-CONST-STACK'],
    answers: { 'Q-CONST-PURPOSE': { restated: 'A CLI for developers that installs skills.' } }
  };
  assert.equal(nextQuestion(state).id, 'Q-CONST-STACK');
  state.answers['Q-CONST-STACK'] = { restated: 'Node.js 20 ESM' };
  assert.equal(nextQuestion(state), null);
});

test('a repeating question is only complete once it is closed', () => {
  const question = questionById('Q-SPEC-AC');
  assert.equal(isComplete(question, { items: [{ restated: 'x' }] }), false);
  assert.equal(isComplete(question, { items: [{ restated: 'x' }], done: true }), true);
});

test('renderValues formats each answer for its template slot', () => {
  const state = {
    order: ['Q-SPEC-AC', 'Q-SPEC-FR', 'Q-PLAN-DECISION', 'Q-TASKS-LIST', 'Q-SPEC-PROBLEM'],
    answers: {
      'Q-SPEC-AC': { done: true, items: [{ restated: 'Given a, when b, then c.' }] },
      'Q-SPEC-FR': { done: true, items: [{ restated: 'The command reports the result.' }] },
      'Q-PLAN-DECISION': { done: true, items: [{ restated: 'Copy | recursive | symlink | portable' }] },
      'Q-TASKS-LIST': { done: true, items: [{ restated: 'Copy the folder | AC-1' }] },
      'Q-SPEC-PROBLEM': { restated: 'Folders drift out of sync.' }
    }
  };
  const values = renderValues(state);
  assert.equal(values.ACCEPTANCE_CRITERIA, '- **AC-1** — Given a, when b, then c.');
  assert.equal(values.FUNCTIONAL_REQUIREMENTS, '- FR-1: The command reports the result.');
  assert.equal(values.KEY_DECISIONS, '| Copy | recursive | symlink | portable |');
  assert.equal(values.TASKS_TABLE, '| T-1 | Copy the folder | AC-1 | todo | |');
  assert.equal(values.PROBLEM, 'Folders drift out of sync.');
});
