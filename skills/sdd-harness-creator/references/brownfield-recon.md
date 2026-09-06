# Brownfield recon — reconstructing specs without reading the codebase

## The constraint

Reverse-engineering a repository by reading it is the obvious approach and the wrong one. A mid-sized repo does not fit in context; a large one does not fit in budget; and the model that survives the reading has spent everything it had on files that produced no acceptance criteria. Lighter models fail at this before the first module is done.

So the split is: **the script reads the code, the model reads a digest.** `scripts/recon.mjs` walks the repo and emits only extracts — declarations, doc comments, test names, commit subjects. A function body never becomes part of the digest, and the extractors are shaped so that it *cannot*: `extractSignatures` keeps the declaration line and drops everything after it.

## The evidence ladder

Signals, cheapest first. Every module starts at rung 1; a module is escalated only when its draft spec is too thin to confirm.

| Rung | Signals | What it buys |
|---|---|---|
| 0 (always) | manifest name/description/scripts, README headings, `docs/` filenames, OpenAPI/proto/migration files | what the project is and where its edges are |
| 1 (default) | **test names**, public/exported surface | test names are de-facto acceptance criteria — the only signal that states *intent* rather than *shape* |
| 2 | + declaration lines, head doc comments | contracts, and whatever intent the authors wrote down |
| 3 | + commit subjects for the module's paths | why the module changed over time |

Rung 1 alone is usually enough for a tested module. Escalate the untested ones.

Test files that live outside the source root (`test/`, `__tests__/`) are matched back to their module by filename stem, so `test/add.test.js` counts as evidence for `src/commands/add.js`. Without that, a well-tested repo ranks as if it had no tests at all.

## Budget

`--budget N` (default 40) caps evidence lines per module. The budget is spent in priority order — test names, head docs, declarations, exports, commit subjects — so what survives truncation is what carries the most intent. A truncated digest says so, and `--more-evidence` is how you buy more, one rung at a time, for one module.

## Ranking

`--list` sorts by evidence strength: a module with tests scores far above one without. This is scope triage, not bookkeeping. Documenting the well-tested modules first produces specs the user can actually confirm, and gets the vaguest reconstructions in front of them last, when they have context for judging them.

## The approval loop

One module per turn, always:

```bash
reverse-engineer.mjs --module <name> --propose        # prints digest + draft, writes nothing
```

Show the user the draft acceptance criteria, then ask which of four applies:

| The user says | Command | Effect |
|---|---|---|
| approve | `--module <name> --write` | writes the three files, stamped `Confirmed-by: user` |
| correct | `--module <name> --write --notes "<what's wrong>"` | same, plus a `Corrections from review` section carrying their words |
| skip | `--module <name> --skip` | recorded; never offered again |
| not enough to judge | `--module <name> --more-evidence` | climbs one rung, proposes again |

Approvals and rungs live in `.sdd/recon.json`, so an interrupted session resumes without re-asking about modules already settled.

## Why approval is not optional

Generated criteria describe **current** behavior. Current behavior includes every bug nobody has noticed. A retro-spec written without a human confirming it does something worse than being wrong: it makes the wrong behavior authoritative, and the next agent will defend it against a correct change.

Hence the two headers. `**Origin:** reverse-engineered` says where it came from; `**Confirmed-by:**` says whether anyone checked. A spec with the first and not the second is a draft, whatever its phase line says.

Uncertainties belong under "Assumptions / To Confirm" rather than as `[NEEDS CLARIFICATION]` markers, so the Coverage Check stays clean while the backlog of triage remains visible.

## The constitution is not in the code

Principles, quality bars, and architectural boundaries cannot be read off an implementation — at best you would recover what the code currently does, which is the thing the constitution is supposed to constrain. After the modules are documented, run the greenfield interview for that one artifact:

```bash
interview.mjs init --target /path/to/project --artifact constitution
```

## Batch mode

`--all [--dry-run] [--max-features N]` documents every remaining module without asking. It exists for non-interactive use — a CI job, a first pass on a repo the user will review wholesale — and it is the only path here that writes without approval. Specs it produces carry no `Confirmed-by`. Run `--dry-run` first.
