# Detectando validação existente que ainda não roda por hook

Objetivo: antes de propor guardrails novos, verifique se o repositório-alvo **já tem** um
processo de validação (teste, cobertura, lint, type-check) que só roda manualmente ou só na CI —
nunca automaticamente antes de o agente empurrar código pro remoto. Se existir, é um guardrail
"de graça": o trabalho de configurá-lo já foi feito, só falta conectar num hook de pré-push (ver
abaixo — o gate é sempre antes do `git push`, nunca a cada edição). Se não existir nenhum, diga
isso também — não force a criação de testes/lint que o usuário não pediu.

**Restrição inegociável**: esta skill só adiciona hooks de agente (`.claude/settings.json`,
`.devin/hooks.v1.json` — arquivos que controlam Claude Code/Devin CLI). **Nunca edite
`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, ou qualquer outro arquivo de CI/CD do
repositório-alvo.** Mesmo que a CI rode o mesmo comando (`npm test`, por exemplo), o objetivo é
fazer a *sessão do agente* rodar essa validação antes de terminar — não mexer no pipeline que já
existe. Se notar que a CI faz algo que nenhum hook faz, isso é só evidência de que o comando é
válido — proponha o hook, não uma mudança na CI.

## Onde procurar, por ecossistema

Rode estas checagens no repo-alvo (leitura, nunca escrita nesta etapa) e anote o que encontrar:

| Ecossistema | Sinal de teste | Sinal de cobertura | Sinal de lint/type-check |
|---|---|---|---|
| Node.js | `package.json` → `scripts.test` | `scripts["test:coverage"]`, `nyc`/`c8`/`jest --coverage` em `scripts` ou devDependencies, `.nycrc`/`c8` config em `package.json` | `scripts.lint` (eslint/biome), `scripts.typecheck` (`tsc --noEmit`) |
| Python | `pytest.ini`/`pyproject.toml [tool.pytest]`/`tox.ini`, ou `unittest` usado no CI | `.coveragerc`, `pyproject.toml [tool.coverage]`, `pytest-cov` em requirements/pyproject | `ruff`/`flake8`/`pylint` config, `mypy.ini`/`pyproject.toml [tool.mypy]` |
| Go | qualquer `_test.go` + `go test` documentado (README/Makefile) | `go test -cover`/`-coverprofile` em Makefile/CI | `golangci-lint` config (`.golangci.yml`) |
| .NET/C# | projeto de teste (`*.Tests.csproj`) + `dotnet test` | `coverlet`/`--collect:"XPlat Code Coverage"` em Makefile/CI | `.editorconfig` com analisadores, `dotnet format` |
| Genérico | `Makefile`/`justfile` com alvo `test` | alvo `coverage` no mesmo arquivo | `.pre-commit-config.yaml`, alvo `lint` |

Também vale ler `CLAUDE.md`/`AGENTS.md`/`CONTRIBUTING.md` do repo-alvo — muitos projetos (este
próprio `ai-lup-skills`, por exemplo) documentam ali o comando de verificação e um limiar de
cobertura em texto, mesmo sem nenhum script rodando automaticamente. Esse texto já é a permissão
implícita do que instalar como hook — não é preciso inventar um limiar novo.

## Cruzando com o que já é hook

Leia `.claude/settings.json` (chaves `PreToolUse`/`PostToolUse`, campo `command` de cada hook) e
`.devin/hooks.v1.json` do repo-alvo, se existirem. Para cada comando de validação encontrado no
passo anterior, pergunte: **algum hook já invoca esse comando (ou um `init.sh`/script que o
invoca por baixo)?**

- Se sim → nada a propor, já está coberto. Diga isso ao usuário como confirmação, não como lacuna.
- Se não → é uma lacuna. Proponha um hook, seguindo o padrão abaixo.

## O padrão de hook a propor: sempre um gate pré-push, nunca por edição

Toda lacuna encontrada aqui vira o **mesmo** guardrail: `scripts/automate-validation-gate/` (mais
um vendorizado desta skill, ao lado dos quatro de `ai-lup-toolling`). Ele intercepta `git push`
via `PreToolUse` — **antes** de o push acontecer, não depois — roda o comando de validação
detectado, e bloqueia o push (exit 2) se ele falhar. Leia
`scripts/automate-validation-gate/README.md` para o mecanismo completo; aqui vai só o que muda
por repositório.

**Por que sempre pré-push, nunca `PostToolUse` em `Write|Edit|MultiEdit`**: rodar a suíte inteira
a cada edição fica caro e ruidoso em repositórios grandes, e um `PostToolUse` comum não impede a
próxima ação do agente mesmo se o comando falhar — só mostra o resultado depois. Gatear
especificamente o `git push` do agente é o ponto certo: é a ação que de fato manda código para o
remoto, é pouco frequente comparado a edições, e bloquear ali (exit 2) tem efeito real — o push
não acontece.

Para instalar, configure `VALIDATION_GATE_COMMAND` no `config.env` vendorizado com o comando real
encontrado na varredura — nunca invente um comando que o repositório não tem:

```bash
# Node, com script de cobertura já declarado
VALIDATION_GATE_COMMAND="npm run test:coverage"

# Repositório com harness SDD (init.sh já roda a verificação certa)
VALIDATION_GATE_COMMAND="./init.sh"

# Python
VALIDATION_GATE_COMMAND="pytest --cov --cov-fail-under=90"
```

Pontos a decidir com o usuário antes de escrever `config.env`, nunca por conta própria:

1. **Qual comando exatamente.** Use o que a varredura encontrou (script de `package.json`, alvo de
   `Makefile`, comando documentado em `CLAUDE.md`/`AGENTS.md`) — se houver mais de um candidato
   (teste E lint, por exemplo), pergunte se ambos devem rodar (`"npm test && npm run lint"`) ou só
   um.
2. **Cobertura mínima**: se o repositório já declara um limiar (ex.: `--check-coverage --lines
   90` no `c8`, ou texto em `CLAUDE.md`), reuse esse limiar no comando proposto — não invente um
   número novo.
3. **`VALIDATION_GATE_CWD`**: se o código-fonte fica numa subpasta (monorepo com `cli/` como em
   `ai-lup-skills`, por exemplo), configure para rodar lá, não na raiz.
4. **Efeito quando falha**: o guard sempre bloqueia (exit 2) quando o comando configurado sai
   diferente de zero — isso não é negociável, é o propósito da ferramenta. O que é negociável é
   *qual* comando roda; se o usuário quiser um efeito mais brando para parte da validação, isso é
   uma decisão sobre o comando (ex.: separar lint, que só avisa, de teste, que bloqueia, em dois
   guards distintos), não sobre o guard em si.

## Reportando ao usuário

Ao final da varredura, apresente uma lista curta: o que já está coberto por hook, o que existe
mas não está coberto (com o comando exato encontrado), e o que não existe no repositório (para
não sugerir instalar um guard de cobertura onde não há suíte de testes nenhuma). Só escreva o
hook depois que o usuário confirmar qual lacuna quer fechar.
