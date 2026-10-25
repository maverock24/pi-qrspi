# Design tree

## End state

A public pi package at `~/github/pi-qrspi` that installs with
`pi install git:github.com/maverock24/pi-qrspi` and gives the installer the same
QRSPI gate this machine has, the eight-stage skill, and a one-page prerequisite
list. No build step, no runtime dependencies, no bundled question tools.

## Out of scope

- Bundling `question.ts`, `questionnaire.ts`, `@tintinweb/pi-subagents` or the
  custom agent definitions. They stay prerequisites and are documented.
- Pushing to GitHub. The remote and the push are the human's.
- Changing pi itself, opening upstream issues, or publishing to npm.
- A CLI, a wizard, or a config file of the package's own.
- Rewriting the gate's architecture. At most small, listed patches.

## Facts the design rests on

- Any `pi` object in `package.json` becomes the sole source for all four resource
  types, so the manifest must list `extensions` and `skills` explicitly
  (`research.md` Q1).
- Extensions load through jiti, no build step; host specifiers resolve through
  pi's alias map, so the package declares no dependencies (`research.md` Q2, Q3).
- A package skill is never copied; its absolute `SKILL.md` path is advertised,
  and a package skill beats a user skill of the same name (`research.md` Q6, Q9).
- Node >= 22.19 strips types by default, and the gate test runs under bare
  `node` because the gate's only pi import is type-only (`research.md` Q11, Q12).
- The gate reads exactly three optional files, all relative to `ctx.cwd` upward:
  `.scratch/ACTIVE`, `.scratch/<slug>/state.md`, `.qrspi-sensitive-paths`
  (`research.md` Q13). Nothing bootstraps them; the skill prose does (Q14).
- Only the `questionnaire` tool yields `details.answers[]` with ids; `question`
  yields a single `answer` (`research.md` Q17, Q19).
- A package cannot ship an AGENTS.md that pi loads; it can ship
  `APPEND_SYSTEM.md` only into the agent dir, not as a package resource
  (`research.md` Q22). So rules travel as documentation plus a paste step.
- Unpinned `git:` installs track the remote default branch; `pi update` resets to
  the tip (`research.md` Q4, Facts).

## Decisions

### D1. Package layout and manifest

- **Status**: settled
- **Blocked by**: none
- **Decision**: mirror `prompt-manager` but declare everything explicitly:
  `{ "name": "pi-qrspi", "version": "0.1.0", "keywords": ["pi-package", "qrspi"],
  "pi": { "extensions": ["./extensions"], "skills": ["./skills"] } }`, plus
  `author`, `license: "MIT"`, `engines.node >= 22.19.0`, and a `scripts.test`
  that runs the gate test. No `dependencies`, no `devDependencies`, no build
  output. Even though `./extensions` and `./skills` match the conventional names,
  they are listed so the manifest rule cannot silently drop them.

### D2. Where the gate code comes from

- **Status**: settled
- **Blocked by**: none
- **Decision**: copy `~/.pi/agent/extensions/qrspi-gate.ts` into
  `extensions/qrspi-gate.ts` as the package's extension entry. Behaviour changes
  are governed by D6.

### D3. Skill delivery

- **Status**: settled
- **Blocked by**: none
- **Decision**: ship `skills/qrspi/SKILL.md`, copied from
  `~/.agents/skills/qrspi/SKILL.md` with three corrections: the `ACTIVE`
  contradiction (`SKILL.md:83` files it under `.scratch/<slug>/`, while `:48` and
  the gate use `.scratch/ACTIVE`), removal of the bare `codebase-design/SKILL.md`
  token, and the origin note that the three referenced skills are the installer's
  own, not this package's. Stage text stays a full word, matching the parser.

### D4. Rules delivery

- **Status**: settled
- **Blocked by**: none
- **Decision**: `docs/AGENTS-snippet.md` holds two labelled blocks: the QRSPI
  block for `~/.pi/agent/AGENTS.md` (tier line, full-tier pipeline, branch owner,
  commit trailer) and the question-tool block for `APPEND_SYSTEM.md`. README says
  where each goes and why a package cannot install them itself (`research.md`
  Q22). No file is written outside the package by any script.

### D5. Per-repo state convention

- **Status**: settled
- **Blocked by**: none
- **Decision**: the skill remains the only thing that creates `.scratch/ACTIVE`
  and `state.md`; the README states the format in one short block. The package
  ships `.gitignore` with `.scratch/ACTIVE` ignored, because the skill says to
  commit the artifacts and never `ACTIVE` (`research.md` Q21).

### D6. Gate fidelity: release path only

- **Status**: settled
- **Blocked by**: none
- **Decision**: patch two things, leave the rest verbatim.
  1. Release recognises both tools. `questionnaire` keeps the current test:
     an `answers[]` entry with `id: "qrspi_release"` and a `value` starting with
     `release`. `question` releases too when its `details.answer` starts with
     `release` **and** `details.question` mentions `release` (case-insensitive),
     the second condition so an unrelated free-text answer cannot release an
     effort.
  2. The block message names both tools instead of only `questionnaire`.
- **Known limits, documented in the README, not fixed**: rewriting `state.md` to
  `Critical: no` ends the block without a human answer (`research.md` Q18); the
  sensitive-path list is a broad substring match, so `session`, `auth` and
  `crypto` can over-block unrelated repos, softened per repo with
  `.qrspi-sensitive-paths`; a `bash` write is not gated.

### D7. Skill self-containment

- **Status**: settled
- **Blocked by**: none
- **Decision**: keep the three pointers, qualify each with "if installed", and
  add one fallback line: without them, the Design and PR stages do the same steps
  inline. Also fix the `ACTIVE` contradiction and drop the bare
  `codebase-design/SKILL.md` token in favour of a full path under
  `~/.agents/skills/`.

### D8. Tests

- **Status**: settled
- **Blocked by**: none
- **Decision**: ship `tests/qrspi-gate.test.ts`, the existing loader-free suite,
  run with `npm test` = `node tests/qrspi-gate.test.ts`. Verified on this machine:
  plain node strips types and the suite passes with no `PI_PKG`, no jiti, no flag.
  No loader is shipped, because nothing in this package imports typebox at
  runtime (`research.md` Q11).

### D9. Startup warning when the prerequisites are missing

- **Status**: settled
- **Blocked by**: none
- **Decision**: on `session_start`, when `ctx.hasUI` and neither `question` nor
  `questionnaire` appears in `pi.getAllTools()` (`types.d.ts:1284`), notify once:
  the release path needs one of them. No other new behaviour; the check costs one
  call per session start.
