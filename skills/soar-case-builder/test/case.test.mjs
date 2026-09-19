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
const CASE = path.join(SCRIPTS, 'case.mjs');
const SLUG = 'reducao-de-timeout';
const TITLE = 'Redução de timeout';

async function withTempProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'soar-case-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const c = (dir, ...rest) => run('node', [CASE, ...rest, '--case', SLUG, '--target', dir]);
const answer = (dir, id, text) => c(dir, 'answer', '--id', id, '--raw', text, '--restated', text);

const GOOD_ANSWERS = [
  ['Q-TITLE', TITLE],
  ['Q-SQUAD', 'Squad Checkout, dev backend'],
  ['Q-WHEN', 'Q4 2025'],
  ['Q-SITUATION', 'O checkout do app estava com timeout em cerca de 8% das compras nos horários de pico.'],
  ['Q-OBSTACLE', 'O timeout só reproduzia sob carga real de Black Friday, que não dava pra simular em staging.'],
  ['Q-ACTION', 'Eu identifiquei o lock otimista como causa e implementei um feature flag pra trocar a estratégia sob demanda.'],
  ['Q-RESULT', 'Timeout caiu de 8% para 0.3% das compras no pico.'],
  ['Q-EVIDENCE', 'JIRA CHK-4213'],
  ['Q-LEARNING', 'pular']
];

async function completeCase(dir) {
  await c(dir, 'init', '--case', TITLE);
  for (const [id, text] of GOOD_ANSWERS) await answer(dir, id, text);
}

test('init then next asks the first question and survives a restart', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    const first = await c(dir, 'next');
    assert.match(first.stdout, /PERGUNTA Q-TITLE/);

    const again = await c(dir, 'next');
    assert.match(again.stdout, /PERGUNTA Q-TITLE/, 'sem resposta registrada, a mesma pergunta deve voltar');
  });
});

test('every successful command ends with NEXT: or DONE', async () => {
  await withTempProject(async (dir) => {
    for (const argv of [['init', '--case', TITLE], ['next'], ['status']]) {
      const { stdout } = await c(dir, ...argv);
      const lastLine = stdout.trim().split('\n').filter(Boolean).at(-1);
      assert.match(lastLine, /^(NEXT:|DONE)/, `${argv.join(' ')} não termina em NEXT:/DONE`);
    }
  });
});

test('a vague answer is rejected with a reason and does not advance the interview', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    for (const [id, text] of GOOD_ANSWERS.slice(0, 3)) await answer(dir, id, text);
    await assert.rejects(
      answer(dir, 'Q-SITUATION', 'Tínhamos um problema de performance no geral.'),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /REJECTED:/);
        assert.match(error.stderr, /RE-ASK:/);
        return true;
      }
    );
    const { stdout } = await c(dir, 'next');
    assert.match(stdout, /PERGUNTA Q-SITUATION/);
  });
});

test('the third attempt is accepted with a ressalva instead of blocking the interview', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    for (let i = 0; i < 2; i += 1) {
      await assert.rejects(answer(dir, 'Q-TITLE', 'x'));
    }
    const { stdout } = await answer(dir, 'Q-TITLE', 'y');
    assert.match(stdout, /ACEITO COM RESSALVA/);
    assert.match(stdout, /NÃO VERIFICADO/);
  });
});

test('an optional question is skipped only with the exact "pular" answer or --skip', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    await assert.rejects(c(dir, 'answer', '--id', 'Q-TITLE', '--skip'), (error) => {
      assert.match(error.stderr, /REJECTED: .*não é opcional/);
      return true;
    });
    const skipped = await answer(dir, 'Q-LEARNING', 'pular');
    assert.match(skipped.stdout, /PULADO/);
  });
});

test('render refuses to run before the interview is finished', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    await assert.rejects(c(dir, 'render'), (error) => {
      assert.match(error.stderr, /REJECTED: a entrevista não terminou/);
      return true;
    });
  });
});

test('a completed case renders a file with no leftover placeholders', async () => {
  await withTempProject(async (dir) => {
    await completeCase(dir);
    const { stdout } = await c(dir, 'render');
    assert.match(stdout, /DONE/);

    const content = await readFile(path.join(dir, 'cases', `${SLUG}.md`), 'utf8');
    assert.doesNotMatch(content, /\{\{/, 'não deve sobrar placeholder cru');
    assert.match(content, new RegExp(`# ${TITLE}`));
    assert.match(content, /Timeout caiu de 8% para 0\.3%/);
    assert.match(content, /\*\*Verificação:\*\* verificado no grilling/);
    assert.match(content, /_\(não informado\)_/, 'Q-LEARNING pulado deve aparecer como não informado');
  });
});

test('render refuses silently overwriting an existing case file without --force', async () => {
  await withTempProject(async (dir) => {
    await completeCase(dir);
    await c(dir, 'render');
    // Rodar de novo sem --force deve recusar mesmo estando tudo respondido.
    await assert.rejects(c(dir, 'render'), (error) => {
      assert.match(error.stderr, /já existe/);
      return true;
    });
  });
});

test('a flagged answer surfaces in the rendered verification status', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    // Título fraco, aceito na 3a tentativa com ressalva.
    for (let i = 0; i < 2; i += 1) await assert.rejects(answer(dir, 'Q-TITLE', 'x'));
    await answer(dir, 'Q-TITLE', 'y');
    for (const [id, text] of GOOD_ANSWERS.slice(1)) await answer(dir, id, text);

    const { stdout } = await c(dir, 'render');
    assert.match(stdout, /marcada.*NÃO VERIFICADO/);
    const content = await readFile(path.join(dir, 'cases', `${SLUG}.md`), 'utf8');
    assert.match(content, /parcialmente verificado/);
    assert.match(content, /NÃO VERIFICADO/);
  });
});

test('state survives across process invocations (resumability)', async () => {
  await withTempProject(async (dir) => {
    await c(dir, 'init', '--case', TITLE);
    await answer(dir, 'Q-TITLE', TITLE);
    // Nova invocação do processo, sem nada em memória: status deve continuar de onde parou.
    const { stdout } = await c(dir, 'status');
    assert.match(stdout, /\[x\] Q-TITLE/);
    assert.match(stdout, /\[ \] Q-SQUAD/);
    assert.match(stdout, /1\/9 respondidas/);
  });
});
