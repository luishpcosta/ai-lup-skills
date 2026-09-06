# Elicitation — the greenfield interview

## Why a script owns the interview

An interview held only in the model's head degrades in a predictable way: questions get skipped, the model decides on its own that it has asked enough, and a session that restarts starts over or, worse, invents what it thinks it already heard. Lighter models fail this way sooner and more often.

So the state lives in `.sdd/interview.json` and the script decides what comes next. The model's job shrinks to three things it is reliably good at: reading a question out loud, rewriting a free-form answer into a canonical form, and asking the user to accept that rewrite.

## The loop

```
interview.mjs next        -> one question + its rubric
  read ASK: to the user verbatim
  user answers however they like
  rewrite it into the ACCEPT: form, show both, get an explicit yes
interview.mjs answer --id <Q-ID> --raw "<their words>" --restated "<your rewrite>"
  accepted -> NEXT: next
  rejected -> REJECTED: <reason> + RE-ASK: <question>   (exit 1)
...
interview.mjs render
```

Both halves of the answer are stored. `raw` is what the user actually said — the audit trail if the rewrite turns out to have drifted. `restated` is what gets rendered into the artifact.

### Rewriting is not editorializing

The rewrite turns a free-form reply into the shape the rubric asks for. It does not add requirements, resolve ambiguity, or fill in gaps the user left. If the reply is missing a part the form needs, that is a question to ask, not a blank to fill:

| User said | Good rewrite | Bad rewrite |
|---|---|---|
| "it should error out if the file isn't there" | Given the target file does not exist, when the command runs, then it exits non-zero with "not found". | Given the target file does not exist, when the command runs, then it logs a warning, retries twice, and exits 2. |
| "tests have to pass" | `npm test` | `npm test && npm run lint && npm run build` |

The second column keeps exactly what the user committed to. The third invents.

## The grilling is mechanical

`scripts/lib/questions.mjs` validates every rewrite before it is recorded. Nothing here depends on the model's judgement:

| Validator | Rejects |
|---|---|
| `nonEmpty` / `minWords:N` | an answer too short to act on |
| `isSpecificEnough` | a bank of vague terms — "works well", "user-friendly", "funciona bem", "boas práticas" |
| `isCommandLike` | prose where a runnable command line was asked for ("we run the tests") |
| `isGivenWhenThen` | an acceptance criterion missing context, action, or observable outcome (English or Portuguese markers) |
| `hasNoImplementationLeak` | a file name, source path, or technology inside a WHAT/WHY answer |

A rejection always prints why and re-asks. Show the user the reason — "this was rejected because it is not observable" teaches the shape of a good answer far faster than silently accepting it.

**The two-round rule.** After two rejections, the third answer is recorded anyway and flagged `needsClarification`, surfacing in the rendered `spec.md` as `[NEEDS CLARIFICATION: …]`. The Clarify gate then catches it. An interview that cannot end is worse than one that ends with a known gap.

## The question bank

Questions are grouped by the artifact they fill, and asked in that order.

| Artifact | Asks about |
|---|---|
| `constitution` | project purpose, stack, test runner, style/lint, quality bar, architecture boundaries (repeating), extra principles (repeating) |
| `spec` | feature name, problem, user stories, functional requirements, acceptance criteria, edge cases, non-goals (all repeating except the first two) |
| `plan` | technical approach, components, contracts, data model, key decisions, risks |
| `tasks` | the ordered task list, each tagged with the AC it satisfies |

`interview.mjs init --artifact constitution` narrows the interview to one artifact — that is the brownfield case, where the specs come from the code but the principles cannot.

Repeating questions collect items until you close them:

```bash
interview.mjs answer --id Q-SPEC-AC --raw "…" --restated "…"   # adds an item
interview.mjs answer --id Q-SPEC-AC --done                     # closes the question
```

Closing below the question's minimum is rejected. Ask "any more?" after each item rather than deciding for the user that one is enough.

## What render does

`interview.mjs render` fills the templates from `restated` answers, derives the plan's Requirement Coverage table from the criteria collected, and writes the harness. Anything not asked falls back to the template's guidance text, so a partial interview (`--force`) still produces a valid harness — with the gaps visible as `<fill in>` rather than as confident-looking invented content.

The feature folder is named from the feature name: "Skill install command" becomes `specs/001-skill-install-command/`.

## Failure modes to watch for

- **Batching questions to save turns.** It produces shallow answers to every question but the first, and the user stops reading. One per turn.
- **Answering on the user's behalf** when they are slow or vague. A `DETECTED DEFAULT:` line is a suggestion to offer, not permission to record.
- **Paraphrasing the question.** The rubric and the question are calibrated together; a paraphrase drops the constraint that made the answer useful.
- **Treating a rejection as the script being wrong.** It is the one part of this that cannot be talked around. Take it back to the user.
