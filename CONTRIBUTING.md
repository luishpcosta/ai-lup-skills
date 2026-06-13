# Contribuindo com skills

Obrigado por contribuir! Adicionar uma skill ao `ai-lup-skills` é simples.

## Adicionando uma skill

1. Crie a pasta da skill com um `SKILL.md` dentro. A pasta pode ficar na raiz de
   `skills/` ou dentro de uma pasta de categoria à sua escolha — as pastas servem
   **apenas para organização** e não influenciam a categorização nem a UX do CLI:

   ```
   skills/
     skill-creator/SKILL.md          # na raiz
     python/
       py-linter/SKILL.md            # organizada por linguagem
     agnostic/
       sdd-setup/SKILL.md
   ```

2. Preencha o frontmatter do `SKILL.md`. `name` e `description` são obrigatórios; a
   **categorização** vai sob o campo `metadata`:

   ```yaml
   ---
   name: py-linter
   description: Configura linting e formatação para projetos Python.
   metadata:
     language: python          # agnostic | python | javascript | go | ... (slug livre)
     tags: [linting, ci]       # opcional, lista livre de tópicos minúsculos
   ---
   ```

   - Use `language: agnostic` quando a skill for independente de linguagem
     (ex.: preparar o repositório para SDD).
   - `tags` é livre — crie as que fizerem sentido. Não há lista fixa em código.

3. Adicione os arquivos de apoio que quiser na pasta da skill (`scripts/`,
   `references/`, `assets/`…). Todo o conteúdo da pasta é copiado de forma bruta
   pelo `lup-skills add`.

## Regras

- **Nomes de pasta de skill devem ser únicos** em todo o repositório (o `add` resolve a
  skill pelo nome da pasta; nomes duplicados geram erro).
- A instalação é sempre plana: `lup-skills add <skill>` copia para
  `.claude/skills/<skill>/` e/ou `.agents/skills/<skill>/`, sem replicar a pasta de
  categoria de origem.

## Antes de abrir o PR

Rode os testes do CLI com cobertura (mínimo de 90%, conforme `CLAUDE.md`):

```bash
cd cli
npm test
npm run test:coverage
```

Se você mexeu no CLI (`cli/src/`), adicione/ajuste os testes correspondentes em
`cli/test/`.
