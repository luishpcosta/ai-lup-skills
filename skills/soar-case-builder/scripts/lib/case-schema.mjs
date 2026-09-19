// Validação ESTRUTURAL de um case SOAR já escrito.
//
// Fronteira que não deve ser cruzada: aqui só entram checagens decidíveis
// sobre a forma do arquivo — seção existe? campo do cabeçalho está lá?
// sobrou placeholder? O julgamento semântico ("isso é específico?", "essa
// métrica quer dizer alguma coisa?") é da revisão da IA, nunca daqui.
//
// A diferença em relação a validar o texto cru do usuário é o que torna isto
// seguro: o alvo é um arquivo que a própria LLM gerou contra um template
// conhecido, então um falso positivo custa uma correção do agente — não
// ensina uma pessoa a escrever para burlar o validador.

export const REQUIRED_SECTIONS = ['Situation', 'Obstacle', 'Action', 'Result', 'Evidência'];
export const OPTIONAL_SECTIONS = ['Aprendizado / O que faria diferente'];
export const REQUIRED_HEADER_FIELDS = ['Squad/Papel', 'Quando', 'Método', 'Verificação', 'Última atualização'];

export const VERIFICATION_VOCABULARY = [
  'verificado',
  'parcialmente verificado',
  'não verificado'
];

const PLACEHOLDER_PATTERNS = [
  { pattern: /\{\{[A-Z0-9_]+\}\}/, label: 'placeholder de template não substituído' },
  { pattern: /<(fill in|preencher)>/i, label: 'marcador de preenchimento' },
  // Sem /i de propósito: o marcador de rascunho é TODO maiúsculo. "todo" é
  // palavra comum em português — e, como \b em JS é ASCII-only, ela aparece
  // até dentro de "Método" (o é conta como fronteira de palavra).
  { pattern: /\b(TODO|FIXME|XXX)\b/, label: 'marcador de rascunho' },
  { pattern: /lorem ipsum/i, label: 'texto de preenchimento' }
];

const NOT_INFORMED = '_(não informado)_';
const UNVERIFIED_MARKER = /\[NÃO VERIFICADO:/;

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIMEFRAME = /\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\b.*\b(19|20)\d{2}\b|\bq[1-4]\b.*\b(19|20)\d{2}\b|\b(19|20)\d{2}\b/i;
const HAS_DIGIT = /\d/;
const NO_METRIC_MARKER = /\[sem métrica:[^\]]+\]/i;
const EVIDENCE_REF = /(https?:\/\/\S+)|(\b[A-Z][A-Z0-9]*-\d+\b)|(\bPR\s?#?\d+\b)|(\bissue\s?#?\d+\b)/i;
const NO_EVIDENCE_PHRASE = /sem evidência disponível/i;

const MIN_SECTION_WORDS = 6;

/** Quebra o markdown em título, campos de cabeçalho e seções. */
export function parseCase(markdown) {
  const text = String(markdown ?? '');
  const lines = text.split('\n');

  const titleLine = lines.find((line) => /^#\s+\S/.test(line));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : '';

  const header = {};
  for (const line of lines) {
    if (/^##\s/.test(line)) break;
    const match = /^\*\*(.+?):\*\*\s*(.*)$/.exec(line.trim());
    if (match) header[match[1].trim()] = match[2].trim();
  }

  const sections = {};
  let current = null;
  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].join('\n').trim();
  }

  return { title, header, sections, raw: text };
}

function wordCount(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean).length;
}

/**
 * Valida um case SOAR.
 * Retorna { ok, errors[], warnings[] } — erros bloqueiam, avisos não.
 */
export function validateCase(markdown) {
  const { title, header, sections, raw } = parseCase(markdown);
  const errors = [];
  const warnings = [];

  if (!title) errors.push('falta o título (linha `# <título>` no topo)');

  for (const field of REQUIRED_HEADER_FIELDS) {
    if (!(field in header)) {
      errors.push(`falta o campo de cabeçalho **${field}:**`);
    } else if (header[field] === '' || header[field] === NOT_INFORMED) {
      errors.push(`o campo **${field}:** está vazio`);
    }
  }

  if (header['Método'] && header['Método'] !== 'SOAR') {
    errors.push(`**Método:** deve ser "SOAR", encontrado "${header['Método']}"`);
  }

  if (header['Verificação']) {
    const value = header['Verificação'].toLowerCase();
    const known = VERIFICATION_VOCABULARY.some((allowed) => value.startsWith(allowed.toLowerCase()));
    if (!known) {
      errors.push(`**Verificação:** deve começar com um de: ${VERIFICATION_VOCABULARY.join(' | ')} — encontrado "${header['Verificação']}"`);
    }
  }

  if (header['Quando'] && !TIMEFRAME.test(header['Quando'])) {
    errors.push(`**Quando:** não tem um período datável (mês/trimestre + ano) — encontrado "${header['Quando']}"`);
  }

  if (header['Última atualização'] && !DATE_ISO.test(header['Última atualização'])) {
    errors.push(`**Última atualização:** deve estar em YYYY-MM-DD — encontrado "${header['Última atualização']}"`);
  }

  for (const name of REQUIRED_SECTIONS) {
    if (!(name in sections)) {
      errors.push(`falta a seção obrigatória "## ${name}"`);
      continue;
    }
    const body = sections[name];
    if (!body) {
      errors.push(`a seção "## ${name}" está vazia`);
      continue;
    }
    if (body.includes(NOT_INFORMED)) {
      errors.push(`a seção obrigatória "## ${name}" está marcada como não informada`);
    }
    if (name !== 'Evidência' && wordCount(body) < MIN_SECTION_WORDS) {
      warnings.push(`a seção "## ${name}" tem ${wordCount(body)} palavra(s) — provavelmente ficou pela metade`);
    }
  }

  // Contrato de formato do Result: ou tem número, ou declara explicitamente a
  // ausência. Os dois marcadores honestos valem — [sem métrica: ...] e
  // [NÃO VERIFICADO: ...] dizem a mesma coisa para efeito deste contrato, e
  // obrigar a LLM a acertar qual dos dois usar só geraria falha à toa.
  // Se a métrica *significa* alguma coisa é problema da revisão, não daqui.
  const result = sections['Result'];
  const declaresAbsence = NO_METRIC_MARKER.test(result ?? '') || UNVERIFIED_MARKER.test(result ?? '');
  if (result && !HAS_DIGIT.test(result) && !declaresAbsence) {
    errors.push('"## Result" não tem número nem marcador explícito de ausência (`[sem métrica: ...]` ou `[NÃO VERIFICADO: ...]`)');
  }

  const evidence = sections['Evidência'];
  if (evidence && !EVIDENCE_REF.test(evidence) && !NO_EVIDENCE_PHRASE.test(evidence)) {
    errors.push('"## Evidência" não tem referência verificável (link/ticket/PR) nem a frase "sem evidência disponível"');
  }

  for (const { pattern, label } of PLACEHOLDER_PATTERNS) {
    const match = pattern.exec(raw);
    if (match) errors.push(`${label} encontrado no arquivo: "${match[0]}"`);
  }

  // Consistência interna: o carimbo do cabeçalho não pode dizer "verificado"
  // enquanto o corpo carrega uma ressalva [NÃO VERIFICADO:].
  const hasUnverifiedMarker = UNVERIFIED_MARKER.test(raw);
  const stamp = (header['Verificação'] ?? '').toLowerCase();
  if (hasUnverifiedMarker && stamp.startsWith('verificado')) {
    errors.push('o cabeçalho diz "verificado" mas o corpo tem uma ressalva [NÃO VERIFICADO:] — o carimbo contradiz o conteúdo');
  }
  if (!hasUnverifiedMarker && stamp.startsWith('parcialmente verificado')) {
    warnings.push('o cabeçalho diz "parcialmente verificado" mas não há nenhuma ressalva [NÃO VERIFICADO:] no corpo');
  }

  return { ok: errors.length === 0, errors, warnings };
}
