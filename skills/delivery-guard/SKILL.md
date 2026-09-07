---
name: delivery-guard
description: >-
  Interview the user on which guardrail automations to install as agent hooks
  (credential/DB-exfiltration blocking, subagent budget limits, session
  checkpoint/warmup, async PR review) for Claude Code, Devin CLI, or both, then
  vendor the chosen scripts into the target repo and wire them into
  .claude/settings.json / .devin/hooks.v1.json. Also scans the target repo for
  validation already in place (tests, coverage thresholds, linters,
  type-checkers) that no hook triggers yet, and wires it in as a PreToolUse
  gate that always runs right before the agent's own "git push" and blocks
  the push if validation fails — never on every edit. Use whenever the user
  wants to add guardrails, safety hooks, PreToolUse/PostToolUse blocking, a
  subagent budget limit, an auto-checkpoint, an automated PR review pipeline,
  a pre-push test/coverage/lint gate, or asks to "set up Delivery Guard" /
  "adicionar guardrails" / "travar comandos perigosos" / "bloquear push sem
  passar nos testes" in a repository.
metadata:
  language: agnostic
  tags: [guardrails, hooks, security, devin, claude-code, ci, delivery-guard]
---

# Delivery Guard

Instala guardrails de agente (hooks `PreToolUse`/`PostToolUse`/ciclo de vida) num repositório-alvo,
para Claude Code e/ou Devin CLI. Quatro das cinco automações vendorizadas em `scripts/` —
segurança, orçamento de subagentes, ciclo de vida de sessão, e revisão de PR assíncrona — foram
originalmente desenvolvidas em `ai-lup-toolling` e já validadas em produção num repositório real
(`ai-lup-poc-target-cli`); a quinta, o gate de validação pré-push, foi criada dentro desta skill
especificamente para fechar a lacuna entre "o repositório já tem validação" (teste, cobertura,
lint) e "essa validação roda sozinha antes de um push". Esta skill não inventa novos mecanismos de
bloqueio além desse: ela guia a escolha e adapta o que já existe para viver dentro do repo-alvo (em
vez de um checkout compartilhado de máquina).

**Nunca edite arquivos de CI/CD do repo-alvo** (`.github/workflows/`, `.gitlab-ci.yml`,
`Jenkinsfile`, etc.). O escopo desta skill é só hooks de agente
(`.claude/settings.json`/`.devin/hooks.v1.json`) — a CI do repositório, se existir, continua
exatamente como está.

## Fluxo

1. **Questionar quais guardrails** — leia [guardrails-catalog.md](references/guardrails-catalog.md)
   e pergunte ao usuário, um bloco por vez, quais das quatro categorias ele quer:
   - Segurança (credencial/exfiltração + DB remoto)
   - Orçamento de subagentes
   - Ciclo de vida de sessão (checkpoint + warmup de MCP)
   - Revisão de PR assíncrona

   Para cada categoria escolhida, faça as perguntas específicas listadas na seção "Perguntas
   específicas por guardrail" do catálogo antes de assumir os defaults — principalmente o aviso
   do checkpoint git (`git add -A && commit --no-verify`) e o de `automate-review` vir desligado
   por padrão. Não avance para instalação com uma categoria "capturada" só porque o usuário disse
   "tudo" — confirme cada uma rapidamente, é barato e evita instalar um guard que trava um fluxo
   legítimo do repositório (ex.: alguém que realmente precisa de `psql -h` de vez em quando).

2. **Questionar a plataforma** — Claude Code, Devin CLI, ou ambos. Se Devin entrar (sozinho ou
   junto), leia [devin-reflection.md](references/devin-reflection.md) **antes** de gerar qualquer
   config: mecanismos de Claude Code sem equivalente documentado no Devin (allowlist granular,
   skills) precisam ser refletidos como prompt de agente autocontido (`devin -p '<prompt>'`), não
   simplesmente comentados como "não suportado". Onde isso implica um risco maior (hoje, só
   `automate-review`, que cai para `--permission-mode bypass` no Devin), diga isso ao usuário
   explicitamente e peça confirmação antes de escrever o `config.env` com bypass.

3. **Detectar validação existente sem hook** — siga
   [validation-gap-detection.md](references/validation-gap-detection.md): procure testes,
   cobertura, lint e type-check já configurados no repo-alvo (por ecossistema), cruze com os hooks
   já presentes em `.claude/settings.json`/`.devin/hooks.v1.json`, e reporte o que já está coberto
   e o que não está. Toda lacuna confirmada vira **sempre** o mesmo guardrail —
   `scripts/automate-validation-gate/` — configurado para rodar o comando detectado **antes de um
   `git push` do agente**, nunca a cada edição: é um `PreToolUse` que intercepta o push e bloqueia
   (exit 2) se a validação falhar. Nunca proponha rodar a validação em `Write`/`Edit`/`MultiEdit` —
   fica caro e ruidoso, e o ponto que realmente importa proteger é o push pro remoto. Só escreva o
   `config.env` depois de o usuário confirmar qual comando usar (ver "Pontos a decidir com o
   usuário" na referência).

4. **Vendorizar e ligar** — para cada guardrail confirmado:
   - Copie a pasta correspondente de `scripts/<tool>/hooks/` (e `config.env`) para dentro do
     repo-alvo, em `.agent-guards/<tool>/` na raiz do repositório (uma cópia única, referenciada
     tanto por `.claude/settings.json` quanto por `.devin/hooks.v1.json` quando ambas as
     plataformas forem escolhidas — não duplique a cópia por plataforma). Se o usuário preferir
     seguir exatamente o precedente já usado em `ai-lup-poc-target-cli`
     (`.claude/hooks/<tool>/`), isso também é válido quando só Claude Code for escolhido; não é
     válido como nome quando Devin é a única plataforma ou uma das duas, porque o nome ficaria
     enganoso.
   - Não copie `examples/` nem `README.md` para o repo-alvo (ficam só nesta skill, como
     referência) — copie apenas `config.env` e `hooks/`.
   - Abra o fragmento correspondente em `scripts/<tool>/examples/claude-settings.json` e/ou
     `devin-hooks.json` e substitua o placeholder `{{HOOKS_DIR}}` pelo caminho relativo real da
     cópia (ex.: `./.agent-guards/automate-security`).
   - **Mescle** esse fragmento no `.claude/settings.json`/`.devin/hooks.v1.json` do repo-alvo —
     nunca sobrescreva o arquivo inteiro. Se o arquivo já tiver hooks, acrescente ao array do
     evento correspondente preservando a ordem existente (hook roda na ordem do arquivo). Leia o
     arquivo primeiro; se não existir, crie com só a chave necessária. Para Devin, confira se o
     `shape` esperado é `flat` (raiz do JSON) ou `nested` (dentro de `"hooks"`) — `examples/*.json`
     de cada ferramenta já mostra a forma para cada plataforma; **não invente uma forma nova**.
   - Se o guardrail escolhido for `automate-review`, confirme que `AGENT_PR_REVIEW_SKILL_PATH` no
     `config.env` vendorizado usa a expressão relativa por `git rev-parse --show-toplevel` (já vem
     assim no template desta skill) — nunca troque de volta para um path absoluto de máquina, isso
     quebraria em CI ou em outro clone do repositório.

5. **Registrar o que falta versionar** — lembre o usuário de adicionar ao `.gitignore` do
   repo-alvo: `.agent-guards/*/data/` (ou `.claude/hooks/*/data/`, conforme o caminho escolhido) e,
   se `automate-review` foi instalado, `.claude/logs/`. Esses diretórios são runtime (trace log,
   SQLite de gate de revisão) e não devem ser commitados.

6. **Reportar** — resuma o que foi instalado (guardrail, plataforma(s), caminho vendorizado), o
   que foi detectado como lacuna de validação e a decisão tomada sobre ela (hook adicionado, ou
   deixado como está por escolha do usuário), e quaisquer riscos que exigiram confirmação (Devin
   bypass, `db-connect-guard` bloqueando um fluxo legítimo, checkpoint commitando arquivo não
   rastreado, automerge sem branch protection). Rode o `hooks/tests/run-tests.sh` de cada
   guardrail vendorizado (a partir de `scripts/<tool>/` nesta skill, não da cópia no repo-alvo —
   os testes já cobrem o script em si) se o usuário quiser confirmar que a versão vendorizada
   ainda passa antes de instalar.

## Estrutura desta skill

```
delivery-guard/
├── SKILL.md
├── references/
│   ├── guardrails-catalog.md       # o que cada guardrail bloqueia, perguntas por categoria
│   ├── devin-reflection.md         # como traduzir um mecanismo de Claude Code pro Devin CLI
│   └── validation-gap-detection.md # como achar validação sem hook, sem tocar CI/CD
└── scripts/
    ├── automate-security/          # credential-exfil-guard.sh, db-connect-guard.sh
    ├── automate-resource-guards/   # subagent-budget-guard.sh
    ├── automate-session-lifecycle/ # compact-checkpoint.sh, mcp-warmup-wait.sh
    ├── automate-review/            # post-push-review.sh, poll-and-review.sh, review-db.py, ...
    └── automate-validation-gate/   # pre-push-validation-gate.sh — gate de teste/cobertura/lint antes do push (não vem de ai-lup-toolling, criado nesta skill)
```

Cada pasta em `scripts/` tem seu próprio `README.md` e `hooks/tests/run-tests.sh` (bash puro,
mais `test_review_db.py`/`unittest` para `automate-review`) — leia o README antes de instalar
qualquer guardrail que o catálogo não cubra em detalhe suficiente, e rode os testes se alterar
qualquer script vendorizado.

Se `automate-review` for instalado e a skill `review-pr` (deste mesmo repositório
`ai-lup-skills`) ainda não estiver no repo-alvo, sugira `lup-skills add review-pr` — a automação
funciona sem ela (revisa o diff sozinha via prompt), mas fica mais forte com a skill dedicada.

## Regras

- Nunca instale um guardrail sem confirmar as perguntas específicas dele — os defaults têm efeitos
  colaterais reais (commit automático, bloqueio de conexão de banco, bypass total de permissão no
  Devin).
- Nunca sobrescreva `.claude/settings.json`/`.devin/hooks.v1.json` — sempre leia e mescle,
  preservando hooks já existentes na mesma posição.
- Nunca toque em arquivos de CI/CD do repo-alvo — o gap de validação vira um hook de agente, não
  uma mudança de pipeline.
- Nunca apresente um comportamento do Devin CLI como confirmado quando o catálogo ou a referência
  de reflexão o marca como "não confirmado" — repasse essa incerteza ao usuário.
- Ao vendorizar, copie só `config.env` e `hooks/` para o repo-alvo — `examples/` e `README.md`
  ficam nesta skill.
