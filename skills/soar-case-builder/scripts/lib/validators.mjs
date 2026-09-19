// Validadores puros do grilling SOAR.
//
// Nada aqui depende de julgamento do modelo: cada função recebe um texto e
// devolve null (passou) ou o motivo da rejeição. É isso que torna a
// entrevista mecânica em vez de depender do modelo "lembrar" de ser rigoroso —
// um modelo mais leve não perde essa disciplina no meio da conversa porque
// ele não é quem decide.

const VAGUE_CLAIMS = [
  'melhorei a performance', 'melhorou a performance', 'trouxe valor',
  'trouxe mais valor', 'impacto positivo', 'ajudei o time', 'ajudei a equipe',
  'otimizei o processo', 'otimizamos o processo', 'aumentei a eficiência',
  'aumentamos a eficiência', 'entreguei com qualidade', 'entregamos com qualidade',
  'colaborei ativamente', 'colaboramos ativamente', 'fiz a diferença',
  'trabalhei duro', 'trabalhamos duro', 'melhorei muito', 'ficou muito melhor',
  'deu tudo certo', 'correu bem', 'foi um sucesso', 'superou as expectativas',
  'agreguei valor', 'gerei valor', 'contribuí bastante', 'tive um papel importante',
  'fui essencial', 'fiz o meu melhor', 'busquei sempre', 'sempre me esforcei'
];

const VAGUE_TIME = [
  'recentemente', 'há um tempo', 'faz um tempo', 'faz tempo', 'ano passado',
  'esses dias', 'outro dia', 'em algum momento', 'não lembro exatamente quando'
];

const VAGUE_OBSTACLE_REASONS = [
  'era complicado', 'tinha muita coisa pra fazer', 'tinha muita coisa para fazer',
  'faltou tempo', 'não tinha tempo', 'era difícil', 'era desafiador',
  'tinha muita pressão', 'estava tudo bagunçado', 'era complexo'
];

const VAGUE_DIFFICULTY_ADJECTIVES = /\b(dificil|complicad[oa]s?|desafiador(a)?|complex[oa]s?|puxad[oa]s?|corrid[oa]s?|trabalhos[oa]s?|complicando)\b/;
const CONCRETE_CONSTRAINT_HINTS = /\b(prazo|deploy|dependencia|sistema|producao|staging|janela|recurso|acesso|aprovacao|limite|capacidade|equipe|time|infraestrutura|dados|ambiente|licenca|budget|orcamento|ferramenta|api|integracao|versao|migracao|legado|compliance|seguranca|contrato|fornecedor|regulat[óo]ri[oa])\b/;

const TEAM_ONLY_PRONOUNS = /\b(n[óo]s|nosso|nossa|nossos|nossas|a (squad|equipe|time)|o time|a gente)\b/i;
const FIRST_PERSON_VERB = /\b(eu\s+\w+|propus|decidi|implementei|escrevi|liderei|identifiquei|desenhei|priorizei|negociei|automatizei|refatorei|investiguei|mapeei|conduzi|medi|criei|construí|revertí|reverti|reduzi|elimin(ei|ou)|migrei|substitu[íi])\b/i;

const METRIC_PATTERN = /(-?\d+([.,]\d+)?\s?(%|x|vezes|ms|s(eg(undos)?)?|min(utos)?|h(oras)?|dias?|semanas?|meses|pp|p\.p\.))|(\bde\s+\d+[\d.,]*\s+(para|pra)\s+\d+[\d.,]*\b)|(\bR\$\s?\d)/i;
const EXPLICIT_NO_METRIC = /^\s*\[sem m[ée]trica:.+\]\s*$/i;

const TIMEFRAME_PATTERN = /\b(jan(eiro)?|fev(ereiro)?|mar(ço)?|abr(il)?|mai(o)?|jun(ho)?|jul(ho)?|ago(sto)?|set(embro)?|out(ubro)?|nov(embro)?|dez(embro)?|q[1-4]|trimestre|semestre)\b.*\b(20\d{2})\b|\b(20\d{2})\b/i;

const URL_OR_REF_PATTERN = /(https?:\/\/\S+)|(\b[A-Z][A-Z0-9]*-\d+\b)|(\bPR\s?#?\d+\b)|(\bissue\s?#?\d+\b)/i;
const EXPLICIT_NO_EVIDENCE = /^\s*sem evid[êe]ncia dispon[íi]vel\s*$/i;

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos p/ casar variações
    .replace(/\s+/g, ' ')
    .trim();
}

function findSubstring(haystackNorm, list) {
  return list.find((term) => haystackNorm.includes(normalize(term)));
}

export function isNonEmpty(text) {
  return normalize(text).length >= 3 ? null : 'a resposta está vazia ou curta demais';
}

export function minWords(text, min = 5) {
  const words = normalize(text).split(' ').filter(Boolean);
  return words.length >= Number(min)
    ? null
    : `a resposta tem ${words.length} palavra(s); precisa de pelo menos ${min} para ter conteúdo verificável`;
}

export function isVagueClaim(text) {
  const hit = findSubstring(normalize(text), VAGUE_CLAIMS);
  return hit ? `"${hit}" é discurso corporativo genérico — diga o que aconteceu de fato, em termos concretos` : null;
}

export function hasTimeframe(text) {
  const norm = normalize(text);
  const vague = findSubstring(norm, VAGUE_TIME);
  if (vague) return `"${vague}" não é um período verificável — dê mês/trimestre e ano (ex.: "Q2 2026", "março de 2026")`;
  return TIMEFRAME_PATTERN.test(text) ? null : 'não encontrei um período datável (mês/trimestre + ano) na resposta';
}

/**
 * Detecta obstáculo circular: quando a resposta reaproveita literalmente boa
 * parte da situação (não diz nada novo sobre o que tornava difícil) ou usa só
 * um motivo genérico do banco de frases vagas.
 */
export function isConcreteObstacle(text, situationText = '') {
  const norm = normalize(text);
  const vague = findSubstring(norm, VAGUE_OBSTACLE_REASONS);
  if (vague) return `"${vague}" não explica o obstáculo real — qual era a restrição técnica, organizacional ou de prazo específica?`;

  if (VAGUE_DIFFICULTY_ADJECTIVES.test(norm) && !CONCRETE_CONSTRAINT_HINTS.test(norm)) {
    return 'descreve a dificuldade em termos genéricos ("difícil", "complicado"...) sem nomear a restrição real por trás dela';
  }

  const situationNorm = normalize(situationText);
  if (situationNorm.length > 15) {
    const obstacleWords = new Set(norm.split(' ').filter((w) => w.length > 3));
    const situationWords = new Set(situationNorm.split(' ').filter((w) => w.length > 3));
    const overlap = [...obstacleWords].filter((w) => situationWords.has(w));
    const ratio = obstacleWords.size > 0 ? overlap.length / obstacleWords.size : 0;
    if (ratio > 0.7 && obstacleWords.size > 0) {
      return 'isso praticamente repete a situação — o obstáculo é o que especificamente tornava a situação difícil, não a situação em si';
    }
  }
  return null;
}

/**
 * A ação precisa distinguir o que a PESSOA fez do que "o time" fez — é a
 * checagem central do dossiê: proteger contra atribuir trabalho coletivo a si
 * mesmo sem deixar claro qual foi a contribuição individual.
 */
export function hasFirstPersonOwnership(text) {
  if (FIRST_PERSON_VERB.test(text)) return null;
  if (TEAM_ONLY_PRONOUNS.test(text)) {
    return 'a resposta descreve o que o time fez, não o que você especificamente fez — qual foi a sua contribuição distinta?';
  }
  return 'não encontrei um verbo em primeira pessoa (decidi, implementei, propus, liderei...) — descreva sua ação, não o resultado ou o contexto';
}

export function hasMetricOrExplicitQualitative(text) {
  if (EXPLICIT_NO_METRIC.test(text)) return null;
  if (METRIC_PATTERN.test(text)) return null;
  const vague = isVagueClaim(text);
  if (vague) return vague;
  return 'não encontrei um número (métrica, %, antes/depois) — se genuinamente não existe métrica, registre como "[sem métrica: <justificativa honesta>]"';
}

export function hasEvidenceOrFlag(text) {
  if (EXPLICIT_NO_EVIDENCE.test(text)) return null;
  return URL_OR_REF_PATTERN.test(text)
    ? null
    : 'não encontrei um link, ticket ou referência verificável — se não existir, escreva exatamente "sem evidência disponível" (isso fica marcado como não verificado no case)';
}

export const VALIDATORS = {
  isNonEmpty,
  minWords,
  isVagueClaim,
  hasTimeframe,
  isConcreteObstacle,
  hasFirstPersonOwnership,
  hasMetricOrExplicitQualitative,
  hasEvidenceOrFlag
};

/**
 * Roda a cadeia de validadores de uma pergunta contra um texto.
 * `context` carrega respostas de campos anteriores (ex.: isConcreteObstacle
 * precisa do texto da situação).
 */
export function validateAnswer(question, text, context = {}) {
  for (const spec of question.validate ?? ['isNonEmpty']) {
    const [name, argKey] = String(spec).split(':');
    const validator = VALIDATORS[name];
    if (!validator) throw new Error(`Validador desconhecido: ${name}`);
    // Um "arg" depois de ":" é um número literal (ex.: minWords:6) ou a chave
    // de outra resposta no contexto (ex.: isConcreteObstacle:SITUATION) —
    // nunca as duas coisas, então a forma decide qual é.
    let reason;
    if (argKey === undefined) {
      reason = validator(text);
    } else if (/^-?\d+$/.test(argKey)) {
      reason = validator(text, Number(argKey));
    } else {
      reason = validator(text, context[argKey]);
    }
    if (reason) {
      return {
        ok: false,
        reason,
        reAsk: `${question.ask} (${question.accept})`
      };
    }
  }
  return { ok: true };
}
