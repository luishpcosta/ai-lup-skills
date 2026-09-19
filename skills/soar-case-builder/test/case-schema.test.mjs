import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCase, validateCase } from '../scripts/lib/case-schema.mjs';

const VALID = `# Circuit breaker no worker de estorno

**Squad/Papel:** Squad Pagamentos, como dev backend
**Quando:** Q1 2026
**Método:** SOAR
**Verificação:** verificado
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

/** Troca o corpo de uma seção, preservando o resto do arquivo. */
function withSection(markdown, name, body) {
  return markdown.replace(
    new RegExp(`(## ${name}\\n\\n)[^#]*`),
    `$1${body}\n\n`
  );
}

function withHeader(markdown, field, value) {
  return markdown.replace(new RegExp(`\\*\\*${field}:\\*\\* .*`), `**${field}:** ${value}`);
}

test('um case bem formado passa sem erro nem aviso', () => {
  const { ok, errors, warnings } = validateCase(VALID);
  assert.equal(ok, true, `erros inesperados: ${errors.join('; ')}`);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('parseCase separa título, cabeçalho e seções', () => {
  const { title, header, sections } = parseCase(VALID);
  assert.equal(title, 'Circuit breaker no worker de estorno');
  assert.equal(header['Método'], 'SOAR');
  assert.equal(header['Quando'], 'Q1 2026');
  assert.match(sections['Result'], /12 mil para 200 itens/);
  assert.ok('Evidência' in sections);
});

test('seção obrigatória faltando é erro', () => {
  const semResult = VALID.replace(/## Result\n\n.*\n\n/, '');
  const { ok, errors } = validateCase(semResult);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => /falta a seção obrigatória "## Result"/.test(e)));
});

test('campo de cabeçalho faltando é erro', () => {
  const semQuando = VALID.replace(/\*\*Quando:\*\* .*\n/, '');
  const { errors } = validateCase(semQuando);
  assert.ok(errors.some((e) => /falta o campo de cabeçalho \*\*Quando/.test(e)));
});

test('seção obrigatória marcada como não informada é erro, mas a opcional pode', () => {
  const semAction = withSection(VALID, 'Action', '_(não informado)_');
  const { errors } = validateCase(semAction);
  assert.ok(errors.some((e) => /"## Action" está marcada como não informada/.test(e)));
  // A opcional já vem como _(não informado)_ no VALID e não gera erro.
  assert.equal(validateCase(VALID).ok, true);
});

test('placeholder de template esquecido é erro', () => {
  const comPlaceholder = withSection(VALID, 'Evidência', '{{EVIDENCE}}');
  const { errors } = validateCase(comPlaceholder);
  assert.ok(errors.some((e) => /placeholder de template não substituído/.test(e)));
});

test('TODO maiúsculo é marcador de rascunho, "todo" em português não é', () => {
  // Regressão: /\b(TODO)\b/i casava dentro de "Método" — em JS o \b é ASCII-only,
  // então o "é" conta como fronteira de palavra. E "todo" é palavra comum em pt-BR.
  const comTodo = withSection(VALID, 'Evidência', 'TODO: pegar o link do dashboard');
  assert.ok(validateCase(comTodo).errors.some((e) => /marcador de rascunho/.test(e)));

  const portugues = withSection(VALID, 'Situation', 'Todo mundo no time sofria com a fila crescendo todo fim de semana.');
  assert.equal(validateCase(portugues).ok, true, 'português legítimo não pode virar erro');
});

test('Result precisa de número ou do marcador explícito de ausência', () => {
  const semNumero = withSection(VALID, 'Result', 'A fila melhorou bastante depois da mudança.');
  assert.ok(validateCase(semNumero).errors.some((e) => /"## Result" não tem número/.test(e)));

  const comMarcador = withSection(VALID, 'Result', '[sem métrica: não medíamos a fila antes da mudança]');
  assert.equal(validateCase(comMarcador).ok, true);
});

test('Result sem número mas com ressalva honesta é aceito', () => {
  // Os dois marcadores de ausência valem: obrigar a LLM a escolher entre
  // [sem métrica:] e [NÃO VERIFICADO:], que dizem a mesma coisa aqui, só
  // produziria falha à toa num case que já está sendo honesto.
  const comRessalva = withSection(
    VALID,
    'Result',
    'Os dois últimos devs subiram o ambiente no primeiro dia. _[NÃO VERIFICADO: não cronometrávamos o onboarding antes]_'
  );
  const coerente = withHeader(comRessalva, 'Verificação', 'parcialmente verificado');
  assert.equal(validateCase(coerente).ok, true, validateCase(coerente).errors.join('; '));

  // Mas mão-de-vaca sem marcador nenhum continua reprovando.
  const semNada = withSection(VALID, 'Result', 'O resultado foi muito positivo pra todo mundo.');
  assert.equal(validateCase(semNada).ok, false);
});

test('Evidência precisa de referência ou da frase explícita de ausência', () => {
  const vaga = withSection(VALID, 'Evidência', 'deve ter registro em algum lugar');
  assert.ok(validateCase(vaga).errors.some((e) => /"## Evidência" não tem referência/.test(e)));

  for (const ref of ['JIRA PAY-991', 'PR #892', 'https://exemplo.com/dash', 'sem evidência disponível']) {
    assert.equal(validateCase(withSection(VALID, 'Evidência', ref)).ok, true, `deveria aceitar: ${ref}`);
  }
});

test('Evidência curta não vira aviso de seção pela metade', () => {
  // "JIRA PAY-991" tem 2 palavras por natureza — referência não é prosa.
  assert.deepEqual(validateCase(VALID).warnings, []);
});

test('o carimbo de Verificação não pode contradizer o corpo', () => {
  const comRessalva = withSection(VALID, 'Result', 'A fila caiu para 200 itens. _[NÃO VERIFICADO: sem dashboard]_');
  const { ok, errors } = validateCase(comRessalva);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => /carimbo contradiz o conteúdo/.test(e)));

  const coerente = withHeader(comRessalva, 'Verificação', 'parcialmente verificado');
  assert.equal(validateCase(coerente).ok, true);
});

test('"parcialmente verificado" sem nenhuma ressalva no corpo vira aviso', () => {
  const { ok, warnings } = validateCase(withHeader(VALID, 'Verificação', 'parcialmente verificado'));
  assert.equal(ok, true, 'é aviso, não erro');
  assert.ok(warnings.some((w) => /não há nenhuma ressalva/.test(w)));
});

test('vocabulário de Verificação é controlado', () => {
  const invalido = withHeader(VALID, 'Verificação', 'mais ou menos conferido');
  assert.ok(validateCase(invalido).errors.some((e) => /\*\*Verificação:\*\* deve começar com/.test(e)));
});

test('Quando exige período datável e Última atualização exige ISO', () => {
  assert.ok(validateCase(withHeader(VALID, 'Quando', 'recentemente')).errors.some((e) => /não tem um período datável/.test(e)));
  assert.equal(validateCase(withHeader(VALID, 'Quando', 'novembro de 2025')).ok, true);
  assert.ok(validateCase(withHeader(VALID, 'Última atualização', '19/09/2026')).errors.some((e) => /YYYY-MM-DD/.test(e)));
});

test('Método diferente de SOAR é erro', () => {
  assert.ok(validateCase(withHeader(VALID, 'Método', 'STAR')).errors.some((e) => /deve ser "SOAR"/.test(e)));
});

test('seção obrigatória curta demais vira aviso, não erro', () => {
  const curta = withSection(VALID, 'Obstacle', 'Era complicado.');
  const { ok, warnings } = validateCase(curta);
  assert.equal(ok, true, 'conteúdo fraco é problema da revisão, não da validação estrutural');
  assert.ok(warnings.some((w) => /"## Obstacle" tem \d+ palavra/.test(w)));
});

test('arquivo vazio acumula os erros em vez de estourar', () => {
  const { ok, errors } = validateCase('');
  assert.equal(ok, false);
  assert.ok(errors.length >= 6);
  assert.ok(errors.some((e) => /falta o título/.test(e)));
});
