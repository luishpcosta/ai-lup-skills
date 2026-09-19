// Banco de perguntas do case SOAR (Situation, Obstacle, Action, Result),
// adaptado para casos de squad que alimentam um dossiê individual.
//
// Ordem fixa: metadados → Situation → Obstacle → Action → Result → evidência
// → aprendizado (opcional). Cada pergunta carrega sua própria rubrica — é o
// que o script imprime, o modelo só lê em voz alta.

export const QUESTIONS = [
  {
    id: 'Q-TITLE',
    fills: 'TITLE',
    ask: 'Título curto do case (vira o nome do arquivo).',
    why: 'Um dossiê com "Melhoria de performance" repetido cinco vezes não navega. Precisa distinguir este case dos outros.',
    accept: 'Um substantivo específico, não uma categoria genérica.',
    reject: '"Melhoria de performance", "Projeto X" — dá pra usar em qualquer case.',
    goodExample: 'Redução de timeout no checkout durante a Black Friday',
    badExample: 'Melhoria de performance',
    validate: ['isNonEmpty', 'minWords:3']
  },
  {
    id: 'Q-SQUAD',
    fills: 'SQUAD',
    ask: 'Qual squad/time, e qual seu papel nele nessa época?',
    why: 'O dossiê é lido por alguém que pode não saber seu papel exato no time naquele momento.',
    accept: 'Nome do squad + papel (ex.: "Squad Checkout, como dev backend sênior").',
    reject: 'Só o nome do squad sem o papel, ou vice-versa.',
    goodExample: 'Squad Checkout, como dev backend sênior',
    badExample: 'Squad Checkout',
    validate: ['isNonEmpty', 'minWords:3']
  },
  {
    id: 'Q-WHEN',
    fills: 'WHEN',
    ask: 'Quando isso aconteceu? Mês/trimestre e ano.',
    why: 'Sem data, ninguém consegue verificar contra sprints, releases ou tickets.',
    accept: 'Mês ou trimestre + ano.',
    reject: '"recentemente", "ano passado", "faz um tempo" — não são verificáveis.',
    goodExample: 'Q4 2025 (novembro)',
    badExample: 'Faz uns meses',
    validate: ['isNonEmpty', 'hasTimeframe']
  },
  {
    id: 'Q-SITUATION',
    fills: 'SITUATION',
    artifact: 'situation',
    ask: 'Qual era a situação? Descreva o contexto objetivo: o que estava acontecendo, em qual sistema ou processo, para quem.',
    why: 'É a base contra a qual o obstáculo e a ação vão ser cobrados — se ficar vaga, tudo depois fica sem chão.',
    accept: 'Contexto concreto: sistema/processo, quem era afetado, o que estava em jogo.',
    reject: 'Cenário genérico sem sujeito nem sistema identificável.',
    goodExample: 'O checkout do app estava com timeout em ~8% das compras nos horários de pico, direto afetando conversão no time de pagamentos.',
    badExample: 'Tínhamos um problema de performance.',
    validate: ['isNonEmpty', 'minWords:8']
  },
  {
    id: 'Q-OBSTACLE',
    fills: 'OBSTACLE',
    ask: 'O que especificamente tornava isso difícil? Não repita a situação — diga a restrição real: técnica, de prazo, de dependência, de informação.',
    why: 'É a parte que normalmente vira "era complicado" — sem o obstáculo real, a ação parece trivial ou parece mágica.',
    accept: 'Uma restrição nomeada, diferente da situação.',
    reject: 'Reafirmar a situação com outras palavras, ou um motivo genérico ("faltou tempo").',
    goodExample: 'O timeout só reproduzia sob carga real de Black Friday, que não dava pra simular em staging, e o deploy de correção tinha janela de 40 minutos antes do pico.',
    badExample: 'Era muito difícil de resolver.',
    validate: ['isNonEmpty', 'minWords:6', 'isConcreteObstacle:SITUATION']
  },
  {
    id: 'Q-ACTION',
    fills: 'ACTION',
    ask: 'O que você especificamente fez — não o time, você? Que decisão tomou, o que descartou e por quê?',
    why: 'É o ponto central do dossiê: separar sua contribuição do trabalho coletivo do time.',
    accept: 'Verbo em primeira pessoa (decidi, implementei, propus...) descrevendo uma ação sua, idealmente com a alternativa descartada.',
    reject: '"nós fizemos", "o time decidiu" sem apontar sua parte específica.',
    goodExample: 'Eu identifiquei que o timeout vinha do lock otimista na tabela de estoque, propus trocar para lock pessimista só na janela de pico (descartei cache distribuído por não dar tempo de testar) e implementei o feature flag pra ligar/desligar sem deploy.',
    badExample: 'Trabalhamos juntos pra resolver o problema.',
    validate: ['isNonEmpty', 'minWords:10', 'hasFirstPersonOwnership']
  },
  {
    id: 'Q-RESULT',
    fills: 'RESULT',
    ask: 'Qual foi o resultado mensurável? Número, percentual, antes/depois — e o impacto pra quem (time/produto/negócio).',
    why: '"Melhorou muito" não sobrevive a uma pergunta de acompanhamento em entrevista ou avaliação — precisa de algo que se possa checar.',
    accept: 'Um número real, ou "[sem métrica: <justificativa honesta>]" quando genuinamente não existe.',
    reject: '"melhorou muito", "ficou mais rápido" sem número, e sem justificar a ausência dele.',
    goodExample: 'Timeout caiu de 8% para 0.3% das compras no pico da Black Friday, evitando perda estimada de R$ 40 mil em conversão.',
    badExample: 'A performance melhorou bastante.',
    validate: ['isNonEmpty', 'hasMetricOrExplicitQualitative']
  },
  {
    id: 'Q-EVIDENCE',
    fills: 'EVIDENCE',
    ask: 'Tem como comprovar isso depois? Link de ticket, PR, dashboard, mensagem — ou registre que não tem.',
    why: 'Um dossiê sem evidência vira palavra contra palavra numa avaliação. Melhor marcar honestamente o que não dá pra provar do que inventar.',
    accept: 'Uma referência verificável, ou a frase exata "sem evidência disponível".',
    reject: 'Uma alegação vaga de que "existe em algum lugar" sem apontar onde.',
    goodExample: 'JIRA CHK-4213, PR #892, dashboard de conversão do checkout (print salvo)',
    badExample: 'Deve ter registro em algum lugar.',
    validate: ['isNonEmpty', 'hasEvidenceOrFlag']
  },
  {
    id: 'Q-LEARNING',
    fills: 'LEARNING',
    optional: true,
    ask: 'Opcional: o que você faria diferente, ou o que aprendeu? (Responda "pular" se não quiser incluir.)',
    why: 'Uma reflexão honesta costuma pesar mais numa avaliação do que só o resultado positivo.',
    accept: 'Uma frase concreta sobre o que mudaria ou aprendeu, ou "pular".',
    reject: 'Um clichê genérico ("aprendi muito").',
    goodExample: 'Eu testaria o feature flag em produção com tráfego espelhado antes, em vez de confiar só no staging.',
    badExample: 'Aprendi bastante com essa experiência.',
    validate: ['isNonEmpty']
  }
];

export function questionById(id) {
  return QUESTIONS.find((question) => question.id === id);
}

export function isSkippedOptional(question, rawText) {
  return Boolean(question.optional) && String(rawText ?? '').trim().toLowerCase() === 'pular';
}

/** A pergunta seguinte não respondida, ou null quando o case está completo. */
export function nextQuestion(state) {
  for (const question of QUESTIONS) {
    const entry = state.answers[question.id];
    if (!entry) return question;
  }
  return null;
}

/** Contexto usado pelos validadores que dependem de outra resposta (ex.: obstáculo vs. situação). */
export function contextFor(state) {
  const ctx = {};
  for (const question of QUESTIONS) {
    if (state.answers[question.id]?.restated) ctx[question.fills] = state.answers[question.id].restated;
  }
  return ctx;
}

/** Placeholder -> texto final, pronto para o template. */
export function renderValues(state) {
  const values = {};
  for (const question of QUESTIONS) {
    const entry = state.answers[question.id];
    if (!entry) continue;
    values[question.fills] = entry.skipped ? '_(não informado)_' : entry.restated;
  }
  return values;
}
