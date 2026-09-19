// Extração barata de candidatos SOAR a partir de anotações cruas (Slack,
// ticket, notas soltas). Puramente heurístico e determinístico: nenhuma
// linha é aceita silenciosamente — toda candidata passa pelos mesmos
// validadores mecânicos do grilling e sai marcada OK ou DESCARTADA com o
// motivo, para o usuário confirmar ou resgatar, nunca para o script decidir
// sozinho o que fica de fora.

import {
  hasEvidenceOrFlag,
  hasFirstPersonOwnership,
  hasMetricOrExplicitQualitative,
  isConcreteObstacle,
  isNonEmpty,
  isVagueClaim,
  minWords
} from './validators.mjs';

const BUCKET_CUES = {
  action: /\b(eu|decidi|implementei|propus|lider(ei|ou)|identifiquei|cri(ei|amos)|corrigi|resolvi|ajustei|configurei|escrevi|desenhei|priorizei|negociei|automatizei|refatorei|investiguei|mapeei|conduzi|migrei|ajudei|contribui|colaborei|participei|fiz|realizei)\b/i,
  result: /\b(resultado|reduziu|reduzi|aumentou|aumentei|caiu|subiu|melhorou|impacto|economizou|gerou|%|de\s+\d+\s+(para|pra)\s+\d+)\b/i,
  obstacle: /\b(problema|dificuldade|risco|bloqueio|impedimento|n[ãa]o dava|limita[çc][ãa]o|gargalo|restri[çc][ãa]o|desafio|dif[íi]cil|complicad[oa]|desafiador|complex[oa]|puxad[oa]|corrid[oa])\b/i,
  evidence: /(https?:\/\/\S+)|(\bPR\s?#?\d+\b)|(\bticket\b)|(\bjira\b)|(\b[A-Z]{2,}-\d+\b)/i,
  situation: /\b(estava|estavamos|t[íi]nhamos|hav[ia]a|contexto|cen[áa]rio|situa[çc][ãa]o|no in[íi]cio)\b/i
};

// Ordem de desempate quando várias pistas batem na mesma linha.
const BUCKET_PRIORITY = ['action', 'result', 'evidence', 'obstacle', 'situation'];

const BUCKET_LABEL = {
  action: 'Action (o que você fez)',
  result: 'Result (resultado mensurável)',
  obstacle: 'Obstacle (o que dificultava)',
  situation: 'Situation (contexto)',
  evidence: 'Evidência',
  unclassified: 'Não classificado'
};

/** Quebra o texto cru em candidatas: por linha, depois por frase dentro de linhas longas. */
export function splitIntoCandidates(rawText) {
  const lines = String(rawText ?? '').split('\n');
  const candidates = [];
  for (const line of lines) {
    const trimmed = line.replace(/^[-*•>\d.)\s]+/, '').trim();
    if (!trimmed) continue;
    if (trimmed.length <= 220) {
      candidates.push(trimmed);
      continue;
    }
    for (const sentence of trimmed.split(/(?<=[.!?])\s+/)) {
      if (sentence.trim()) candidates.push(sentence.trim());
    }
  }
  return candidates;
}

/** Classifica uma candidata num bucket SOAR por contagem de pistas de palavras-chave. */
export function classifyCandidate(text) {
  let best = null;
  let bestScore = 0;
  for (const bucket of BUCKET_PRIORITY) {
    const matches = text.match(new RegExp(BUCKET_CUES[bucket].source, `${BUCKET_CUES[bucket].flags}g`)) ?? [];
    const score = matches.length;
    if (score > bestScore) {
      best = bucket;
      bestScore = score;
    }
  }
  return best ?? 'unclassified';
}

function grillBucket(bucket, text) {
  switch (bucket) {
    case 'situation':
      return isVagueClaim(text) ?? minWords(text, 6);
    case 'obstacle':
      return isVagueClaim(text) ?? isConcreteObstacle(text);
    case 'action':
      return hasFirstPersonOwnership(text) ?? isVagueClaim(text);
    case 'result':
      return hasMetricOrExplicitQualitative(text);
    case 'evidence':
      return hasEvidenceOrFlag(text);
    default:
      return isVagueClaim(text) ?? isNonEmpty(text);
  }
}

/**
 * Processa um texto cru inteiro: cada candidata sai classificada, grillada, e
 * marcada ok/descartada com o motivo. Nada é descartado silenciosamente.
 */
export function extractCandidates(rawText) {
  const candidates = splitIntoCandidates(rawText);
  const results = candidates.map((text) => {
    const bucket = classifyCandidate(text);
    const reason = grillBucket(bucket, text);
    return { text, bucket, ok: reason === null, reason };
  });

  const byBucket = {};
  for (const bucket of [...BUCKET_PRIORITY, 'unclassified']) {
    byBucket[bucket] = results.filter((r) => r.bucket === bucket);
  }
  return { results, byBucket };
}

export function renderReport({ byBucket }) {
  const lines = [];
  for (const bucket of [...BUCKET_PRIORITY, 'unclassified']) {
    const items = byBucket[bucket] ?? [];
    if (items.length === 0) continue;
    lines.push(`## ${BUCKET_LABEL[bucket]}`);
    for (const item of items) {
      lines.push(item.ok ? `  OK        ${item.text}` : `  DESCARTADO ${item.text}`);
      if (!item.ok) lines.push(`             motivo: ${item.reason}`);
    }
    lines.push('');
  }
  const total = Object.values(byBucket).flat().length;
  const ok = Object.values(byBucket).flat().filter((r) => r.ok).length;
  lines.push(`${ok}/${total} candidata(s) passaram no grilling automático sem ressalva.`);
  lines.push('As DESCARTADAs não somem: mostre ao usuário e deixe ele confirmar, corrigir ou descartar de verdade.');
  return lines.join('\n');
}
