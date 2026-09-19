import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VALIDATE = path.resolve(HERE, '..', 'scripts', 'validate-case.mjs');
const TEMPLATE = path.resolve(HERE, '..', 'templates', 'case.md');

const FILLED = `# Circuit breaker no worker de estorno

**Squad/Papel:** Squad Pagamentos, como dev backend
**Quando:** Q1 2026
**Método:** SOAR
**Verificação:** verificado
**Revisão:** sem ressalvas
**Última atualização:** 2026-09-19

## Situation

A fila de estornos estava crescendo sem controle nos fins de semana.

## Obstacle

O worker entrava em retry infinito quando a API do banco respondia 503, sem limite.

## Action

Eu mapeei o retry infinito como causa raiz e implementei um circuit breaker com backoff.

## Result

A fila caiu de 12 mil para 200 itens em 3 dias.

## Evidência

JIRA PAY-991

## Aprendizado / O que faria diferente

_(não informado)_
`;

async function withTempFile(contents, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'soar-validate-'));
  try {
    const file = path.join(dir, 'case.md');
    await writeFile(file, contents, 'utf8');
    await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('um case válido sai 0 e aponta o próximo passo', async () => {
  await withTempFile(FILLED, async (file) => {
    const { stdout } = await run('node', [VALIDATE, file]);
    assert.match(stdout, /estrutura OK/);
    assert.match(stdout.trim().split('\n').at(-1), /^NEXT:/);
  });
});

test('o NEXT respeita o estado da revisão em vez de mandar refazer', async () => {
  const pendente = FILLED.replace('**Revisão:** sem ressalvas', '**Revisão:** pendente');
  await withTempFile(pendente, async (file) => {
    const { stdout } = await run('node', [VALIDATE, file]);
    assert.match(stdout, /NEXT: a estrutura passou — agora faça a revisão/);
  });

  const revisado = FILLED.replace('**Revisão:** sem ressalvas', '**Revisão:** 2 em aberto');
  await withTempFile(revisado, async (file) => {
    const { stdout } = await run('node', [VALIDATE, file]);
    assert.match(stdout, /NEXT: nada a fazer/);
    assert.match(stdout, /"2 em aberto"/);
  });
});

test('um case quebrado sai ≠0 listando cada erro', async () => {
  const quebrado = FILLED
    .replace('JIRA PAY-991', '{{EVIDENCE}}')
    .replace('A fila caiu de 12 mil para 200 itens em 3 dias.', 'A fila melhorou bastante.');
  await withTempFile(quebrado, async (file) => {
    await assert.rejects(run('node', [VALIDATE, file]), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /ERRO {3}"## Result" não tem número/);
      assert.match(error.stderr, /ERRO {3}"## Evidência" não tem referência/);
      assert.match(error.stderr, /placeholder de template não substituído/);
      assert.match(error.stderr, /erro\(s\) de estrutura/);
      return true;
    });
  });
});

test('--json devolve o resultado estruturado', async () => {
  await withTempFile(FILLED, async (file) => {
    const { stdout } = await run('node', [VALIDATE, file, '--json']);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.file, file);
  });
});

test('sem argumento imprime o uso e sai ≠0', async () => {
  await assert.rejects(run('node', [VALIDATE]), (error) => {
    assert.equal(error.code, 2);
    assert.match(error.stdout, /Uso: node scripts\/validate-case\.mjs/);
    return true;
  });
});

test('arquivo inexistente falha com mensagem clara', async () => {
  await assert.rejects(run('node', [VALIDATE, '/caminho/que/nao/existe.md']), (error) => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /Não consegui ler/);
    return true;
  });
});

test('o template em branco é reprovado — ele não é um case', async () => {
  // Garante que os placeholders do template batem com o que o validador procura:
  // se alguém renomear um {{CAMPO}}, este teste quebra em vez de passar calado.
  const template = await readFile(TEMPLATE, 'utf8');
  await withTempFile(template, async (file) => {
    await assert.rejects(run('node', [VALIDATE, file]), (error) => {
      assert.match(error.stderr, /placeholder de template não substituído/);
      return true;
    });
  });
});
