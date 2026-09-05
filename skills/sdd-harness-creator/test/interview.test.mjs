import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

const run = promisify(execFile);
const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const INTERVIEW = path.join(SCRIPTS, 'interview.mjs');

async function withTempProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'sdd-interview-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const interview = (dir, ...rest) => run('node', [INTERVIEW, ...rest, '--target', dir]);

/** Answer a question, using the same text as both the raw reply and the rewrite. */
const answer = (dir, id, text) => interview(dir, 'answer', '--id', id, '--raw', text, '--restated', text);
const close = (dir, id) => interview(dir, 'answer', '--id', id, '--done');

const ANSWERS = [
  ['Q-CONST-PURPOSE', "A CLI that installs shared AI skills into a developer's local project."],
  ['Q-CONST-STACK', 'Node.js 20 (ESM), no external runtime dependencies.'],
  ['Q-CONST-TEST', 'npm test (node --test)'],
  ['Q-CONST-STYLE', 'npm run lint (eslint)'],
  ['Q-CONST-QUALITY', 'npm run test:coverage above 90 percent'],
  ['Q-CONST-BOUNDARIES', 'Command modules must not import each other; shared logic lives in utils.', true],
  ['Q-CONST-PRINCIPLE', 'Commits follow Conventional Commits, imperative and atomic.', true],
  ['Q-SPEC-NAME', 'Skill install command'],
  ['Q-SPEC-PROBLEM', 'Users copy folders by hand into every project and the copies drift out of sync.'],
  ['Q-SPEC-USER', 'As a developer, I want to install a skill with one command, so that every project uses the same version.', true],
  ['Q-SPEC-FR', 'The command reports which agents received the skill.', true],
  ['Q-SPEC-AC', 'Given the skill is not installed, when the user runs add, then the folder appears and the command exits zero.', true],
  ['Q-SPEC-EDGE', 'If the skill is already installed the command replaces it and says so instead of failing.', true],
  ['Q-SPEC-NONGOAL', 'It does not resolve version conflicts between two installed copies.', true],
  ['Q-PLAN-APPROACH', 'A command module resolves the skill folder and copies it into each selected agent directory.'],
  ['Q-PLAN-COMPONENTS', 'commands/add.js — resolves the skill and copies it per selected agent.', true],
  ['Q-PLAN-CONTRACTS', 'add(skillName, options) returns the installed agent list; CLI flag --agent.'],
  ['Q-PLAN-DATA', 'None — the command is stateless.'],
  ['Q-PLAN-DECISION', 'Copy strategy | recursive copy | symlink, sparse copy | portable across systems', true],
  ['Q-PLAN-RISK', 'Overwriting a locally edited skill — mitigated by asking before replacing.', true],
  ['Q-TASKS-LIST', 'Copy the skill folder into each selected agent path | AC-1', true]
];

async function completeInterview(dir) {
  await interview(dir, 'init');
  for (const [id, text, repeats] of ANSWERS) {
    await answer(dir, id, text);
    if (repeats) await close(dir, id);
  }
}

test('the interview asks one question at a time and survives a restart', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    const first = await interview(dir, 'next');
    assert.match(first.stdout, /QUESTION Q-CONST-PURPOSE/);
    assert.match(first.stdout, /ASK: /);
    assert.match(first.stdout, /ACCEPT: /);

    // Nothing was answered, so a fresh process must return the same question.
    const again = await interview(dir, 'next');
    assert.match(again.stdout, /QUESTION Q-CONST-PURPOSE/);

    await answer(dir, 'Q-CONST-PURPOSE', 'A CLI that installs shared skills for developers.');
    const third = await interview(dir, 'next');
    assert.match(third.stdout, /QUESTION Q-CONST-STACK/);
  });
});

test('every command ends with a NEXT: or DONE line', async () => {
  await withTempProject(async (dir) => {
    for (const argv of [['init'], ['next'], ['status']]) {
      const { stdout } = await interview(dir, ...argv);
      const lines = stdout.trim().split('\n').filter(Boolean);
      assert.match(lines.at(-1), /^(NEXT:|DONE)/, `${argv.join(' ')} does not end with NEXT:/DONE`);
    }
  });
});

test('a vague answer is rejected with a reason and a re-ask', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    await assert.rejects(
      answer(dir, 'Q-CONST-PURPOSE', 'A modern platform that works well'),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /REJECTED: .*works well/);
        assert.match(error.stderr, /RE-ASK: /);
        assert.match(error.stderr, /Attempt 1 of 3/);
        return true;
      }
    );
    // The question stays open after a rejection.
    const { stdout } = await interview(dir, 'next');
    assert.match(stdout, /QUESTION Q-CONST-PURPOSE/);
  });
});

test('an acceptance criterion without Given/When/Then is rejected', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init', '--artifact', 'spec');
    await assert.rejects(
      answer(dir, 'Q-SPEC-AC', 'The install works'),
      (error) => {
        assert.match(error.stderr, /Given|When|Then/);
        return true;
      }
    );
    await answer(dir, 'Q-SPEC-AC', 'Given no install, when add runs, then the folder exists and the exit code is zero.');
  });
});

test('the third attempt is recorded as a clarification instead of blocking', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await assert.rejects(answer(dir, 'Q-CONST-PURPOSE', 'a fast and modern tool that works well'));
    }
    const { stdout } = await answer(dir, 'Q-CONST-PURPOSE', 'a fast and modern tool that works well');
    assert.match(stdout, /ACCEPTED WITH CLARIFICATION/);

    const state = JSON.parse(await readFile(path.join(dir, '.sdd', 'interview.json'), 'utf8'));
    assert.equal(state.answers['Q-CONST-PURPOSE'].needsClarification, true);
  });
});

test('an answer keeps both the raw reply and the accepted rewrite', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    await interview(
      dir, 'answer', '--id', 'Q-CONST-PURPOSE',
      '--raw', 'eh um cli pra instalar skill',
      '--restated', 'A CLI that installs shared AI skills into a local project for developers.'
    );
    const state = JSON.parse(await readFile(path.join(dir, '.sdd', 'interview.json'), 'utf8'));
    assert.equal(state.answers['Q-CONST-PURPOSE'].raw, 'eh um cli pra instalar skill');
    assert.match(state.answers['Q-CONST-PURPOSE'].restated, /^A CLI that installs/);
  });
});

test('a repeating question stays open until it is closed', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init', '--artifact', 'spec');
    await answer(dir, 'Q-SPEC-NAME', 'Skill install command');
    await answer(dir, 'Q-SPEC-PROBLEM', 'Folders are copied by hand and drift out of sync over time.');
    await answer(dir, 'Q-SPEC-USER', 'As a developer, I want one command, so that every project matches.');

    const still = await interview(dir, 'next');
    assert.match(still.stdout, /QUESTION Q-SPEC-USER/);
    assert.match(still.stdout, /COLLECTED SO FAR: 1 item/);

    await close(dir, 'Q-SPEC-USER');
    const moved = await interview(dir, 'next');
    assert.match(moved.stdout, /QUESTION Q-SPEC-FR/);
  });
});

test('closing a repeating question with nothing collected is rejected', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init', '--artifact', 'spec');
    await assert.rejects(close(dir, 'Q-SPEC-AC'), (error) => {
      assert.match(error.stderr, /REJECTED: .*at least 1 item/);
      return true;
    });
  });
});

test('render refuses to run while the interview is unfinished', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    await assert.rejects(interview(dir, 'render'), (error) => {
      assert.match(error.stderr, /REJECTED: the interview is not finished/);
      return true;
    });
  });
});

test('a finished interview renders artifacts with no placeholders left', async () => {
  await withTempProject(async (dir) => {
    await completeInterview(dir);
    const { stdout } = await interview(dir, 'render');
    assert.match(stdout, /DONE/);

    const featureDir = path.join(dir, 'specs', '001-skill-install-command');
    for (const rel of ['constitution.md', 'AGENTS.md']) {
      const content = await readFile(path.join(dir, rel), 'utf8');
      assert.doesNotMatch(content, /\{\{/, `${rel} still has a template placeholder`);
      assert.doesNotMatch(content, /<fill in>/, `${rel} still has a fill-in marker`);
    }
    for (const rel of ['spec.md', 'plan.md', 'tasks.md']) {
      const content = await readFile(path.join(featureDir, rel), 'utf8');
      assert.doesNotMatch(content, /\{\{/, `${rel} still has a template placeholder`);
      assert.doesNotMatch(content, /<fill in>/, `${rel} still has a fill-in marker`);
    }

    const spec = await readFile(path.join(featureDir, 'spec.md'), 'utf8');
    assert.match(spec, /# Spec: Skill install command/);
    assert.match(spec, /- \*\*AC-1\*\* — Given the skill is not installed/);
    assert.match(spec, /- FR-1: The command reports which agents/);
    assert.doesNotMatch(spec, /NEEDS CLARIFICATION/, 'a clean interview should leave no open clarification');

    const constitution = await readFile(path.join(dir, 'constitution.md'), 'utf8');
    assert.match(constitution, /Command modules must not import each other/);
    assert.match(constitution, /npm run test:coverage above 90 percent/);

    const tasks = await readFile(path.join(featureDir, 'tasks.md'), 'utf8');
    assert.match(tasks, /\| T-1 \| Copy the skill folder into each selected agent path \| AC-1 \| todo \|/);
  });
});

test('an unfinished answer surfaces as an open clarification in the rendered spec', async () => {
  await withTempProject(async (dir) => {
    await completeInterview(dir);
    // Force a clarification on an already-answered question by exhausting the retries.
    await rm(path.join(dir, '.sdd', 'interview.json'));
    await completeInterview(dir);
    const state = JSON.parse(await readFile(path.join(dir, '.sdd', 'interview.json'), 'utf8'));
    state.answers['Q-SPEC-EDGE'].items[0].needsClarification = true;
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(path.join(dir, '.sdd', 'interview.json'), JSON.stringify(state)));

    await interview(dir, 'render', '--force');
    const spec = await readFile(path.join(dir, 'specs', '001-skill-install-command', 'spec.md'), 'utf8');
    assert.match(spec, /\[NEEDS CLARIFICATION: Q-SPEC-EDGE/);
  });
});

test('a corrupt or unsupported state file fails loudly instead of rendering', async () => {
  await withTempProject(async (dir) => {
    await interview(dir, 'init');
    const statePath = path.join(dir, '.sdd', 'interview.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    state.version = 99;
    await import('node:fs/promises').then(({ writeFile }) => writeFile(statePath, JSON.stringify(state)));
    await assert.rejects(interview(dir, 'next'), (error) => {
      assert.match(error.stderr, /version 99 is not supported/);
      return true;
    });
  });
});
