# Catálogo de guardrails

Cada linha abaixo é uma automação vendorizada em `scripts/<pasta>/` desta skill. O README
dentro de cada pasta é a fonte completa (mecanismo, config, limites conhecidos, trace log) —
esta tabela é só o resumo para a fase de questionamento. Leia o README da automação escolhida
antes de instalá-la.

| Categoria | Pasta | Mecanismo | Bloqueia por padrão? | O que faz |
|---|---|---|---|---|
| Segurança | `automate-security` | `PreToolUse`, exit 2 | Sim | Bloqueia caça/exfiltração de credencial (`cat ~/.ssh/id_rsa`, `env\|grep SECRET`, upload de credencial via curl/wget, keychain macOS) e conexão direta com banco remoto (`mysql -h`, `psql -h`, `prisma db push`, etc.) |
| Orçamento | `automate-resource-guards` | `PreToolUse`, exit 2 | Sim | Bloqueia spawn de subagente (`Agent`) acima de um limite de paralelismo configurável, com TTL por subagente |
| Ciclo de vida de sessão | `automate-session-lifecycle` | `PreCompact`/`PostCompaction`, `SessionStart` — nunca bloqueia | Sim | Checkpoint git automático antes da compactação de contexto; espera de warmup quando há MCP configurado |
| Revisão de PR | `automate-review` | `PostToolUse` (detecta `git push`) → poller em background → invoca a plataforma agêntica | **Não** (`AGENT_PR_REVIEW_ENABLED=false` no template) | Acompanha a CI da PR e, quando passa, roda `claude -p`/`devin -p` para popular a descrição e revisar o código |
| Gate de validação pré-push | `automate-validation-gate` | `PreToolUse` (detecta `git push`), exit 2 | Sim, mas sem efeito sem `VALIDATION_GATE_COMMAND` configurado | Roda a validação já existente no repositório (teste/cobertura/lint detectados — ver [validation-gap-detection.md](validation-gap-detection.md)) **antes** do push, e bloqueia o push se ela falhar |

## Por que segurança e orçamento são pastas separadas

Ambas usam o mesmo mecanismo de bloqueio (exit 2 num `PreToolUse`), mas a categoria de risco é
diferente: uma é sobre segurança (vazamento de credencial, acesso a dado sensível), a outra é
sobre custo/paralelismo. Manter a separação ajuda quem for revisar `config.env`/trace log a saber
por que algo foi bloqueado sem precisar ler o script.

## Perguntas específicas por guardrail (usar na fase de questionamento)

Ao perguntar ao usuário quais guardrails aplicar, para cada um que ele escolher, confirme o que
o README da pasta documenta como configurável — não assuma o default:

- **`automate-security`**: os dois guards (`credential-exfil-guard.sh`, `db-connect-guard.sh`)
  vêm juntos, ligados por padrão. Pergunte só se o repositório tem algum caso legítimo de conexão
  direta com banco remoto (`db-connect-guard.sh` bloquearia até um `psql -h` de manutenção) — se
  sim, avise que o guard vai bloquear e pergunte se mesmo assim deve entrar.
- **`automate-resource-guards`**: pergunte o limite de subagentes simultâneos
  (`RESOURCE_GUARD_MAX_SUBAGENTS`, default 5) e o TTL (`RESOURCE_GUARD_TTL_SECONDS`, default
  1800s) — repositórios com subagentes de vida curta devem baixar o TTL, senão o guard superestima
  quantos estão "ativos".
- **`automate-session-lifecycle`**: o checkpoint roda `git add -A && git commit --no-verify` na
  branch atual — isso commita **tudo** que não está no `.gitignore`, inclusive arquivo não
  rastreado, e pula hooks de pré-commit. Avise isso explicitamente antes de ligar; pergunte se o
  usuário quer só o warmup de MCP sem o checkpoint
  (`SESSION_LIFECYCLE_CHECKPOINT_ENABLED=false`).
- **`automate-review`**: vem desligado por padrão — confirme que o usuário realmente quer ligar
  (`AGENT_PR_REVIEW_ENABLED=true`) nesta instalação. Pergunte: (a) qual branch pattern reage
  (default `feature/*`, hardcoded no script — avise se o repositório usa outra convenção, o script
  precisaria ser ajustado); (b) se o repositório tem CI expondo check-runs via
  `gh api repos/{owner}/{repo}/commits/{sha}/check-runs` (qualquer GitHub Actions já serve) — sem
  isso a automação nunca sai de `timeout`; (c) se a skill `review-pr` (deste repositório
  `ai-lup-skills`) já está instalada no repo-alvo — se não, sugira `lup-skills add review-pr`
  junto, ou confirme que o prompt genérico ("revise você mesmo o diff") é aceitável; (d) nunca
  sugira `AGENT_PR_REVIEW_AUTOMERGE_REPOS` sem confirmar explicitamente que nenhuma proteção de
  branch depende de aprovação humana — é merge imediato sem esperar branch protection.
- **`automate-validation-gate`**: não vem de `ai-lup-toolling` — é o guardrail que fecha a lacuna
  descrita em [validation-gap-detection.md](validation-gap-detection.md). Nunca ofereça este
  guardrail com um `VALIDATION_GATE_COMMAND` adivinhado — ele só deve entrar depois da varredura
  confirmar qual comando de validação o repositório já usa de verdade. Pergunte também
  `VALIDATION_GATE_CWD` (monorepo?) e deixe claro que o bloqueio é sempre no `git push` do agente,
  nunca a cada edição — ver a seção "O padrão de hook a propor" da referência.

## Diferenças Claude Code × Devin CLI por guardrail

| Guardrail | Claude Code | Devin CLI | Observação |
|---|---|---|---|
| `automate-security` | matcher `"Bash\|PowerShell"` | matcher `"exec"` | Devin cobre qualquer shell num matcher só; Claude precisa dos dois nomes |
| `automate-resource-guards` | matcher `"Agent"` (confirmado) | matcher `"Agent"` (**não confirmado** — doc pública não lista o nome da ferramenta de spawn) | Avise o usuário para rodar `/hooks` numa sessão Devin real após spawnar um subagente, se for depender disso em produção |
| `automate-session-lifecycle` | evento `PreCompact` | evento `PostCompaction` | Mesmo script nos dois — só muda o nome do evento no config, porque a compactação só afeta memória conversacional, nunca o disco |
| `automate-review` | `claude -p` + `--permission-mode dontAsk` + `--allowedTools` (allowlist granular) | `devin -p` + `--permission-mode bypass` (sem allowlist documentada) | Ver [Reflexão para Devin](devin-reflection.md) — risco maior no Devin por falta de allowlist |
| `automate-validation-gate` | matcher `"Bash\|PowerShell"` | matcher `"exec"` | Mesmo script nos dois — só bloqueio simples via exit 2, sem depender de prompt de agente, então não precisa de reflexão especial |

Veja [Reflexão para Devin](devin-reflection.md) para o texto completo de como adaptar um
guardrail pensado para Claude Code de forma que funcione (ou falhe de forma segura) no Devin CLI.
