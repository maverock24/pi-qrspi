# Questions the code must answer

- **Slug**: pi-qrspi-package
- **Stage**: Research (next to run)
- **Critical**: no
- **Done**: Questions

Every question below asks what exists today, in pi 1.4.0 or in a local file. None asks what to build. Each names the evidence that settles it; an answer without a `file:line`, a command output or a doc quotation is not an answer.

Clusters: A package loading (Q1-Q5), B skill reachability (Q6-Q9), C tests (Q10-Q12), D what the gate reads (Q13-Q16), E release without a question tool (Q17-Q19), F conventions and rules delivery (Q20-Q23).

## A. How pi discovers and loads a package

**Q1. Does conventional discovery alone (`extensions/` + `skills/` directories, no `pi` key) load both resources from a git package in pi 1.4.0, or is an explicit `pi` manifest required for each?**
`docs/packages.md` says conventional directories work without a manifest, yet the local template declares `pi.extensions` explicitly. Settled by: the loader source that walks conventional dirs, plus one installed package whose resources are visible in `pi config`.

**Q2. Does a package extension need a build step, and how does pi resolve `@earendil-works/pi-coding-agent` and `typebox` for a git-installed package that ships no `node_modules`?**
`docs/extensions.md:38` says jiti compiles TypeScript with no separate step; `tests/load.ts:1-8` says a plain node or jiti load fails on `typebox` because pi injects aliases. Settled by: the alias injection in the package loader, plus the presence or absence of `node_modules` in `~/.pi/agent/git/github.com/maverock24/prompt-manager`.

**Q3. Does a type-only import (`import type { ExtensionAPI }`) survive that loader, i.e. is the gate's zero-runtime-dependency shape sufficient, or must `peerDependencies` still list the host packages?**
`docs/packages.md` requires host packages in `peerDependencies` with `"*"` and warns when they appear in `dependencies`; the gate imports pi types only (`qrspi-gate.ts:24`). Settled by: the manifest validation code that emits the warning, and prompt-manager's manifest, which lists neither `dependencies` nor `peerDependencies`.

**Q4. With `pi install git:github.com/maverock24/pi-qrspi` and no `@ref`, where is the checkout, and is it pinned or moved by `pi update`?**
`docs/packages.md` pins tags and commits; `~/.pi/agent/git/github.com/maverock24/prompt-manager` exists as a real clone. Settled by: that clone's `git status`/`git log`, `pi list` output, and the update reconciliation path in the loader.

**Q5. What does `pi install` write into `settings.json`, and does an entry survive `pi update --extensions` when the repo has no tags?**
The install target is `~/.pi/agent/settings.json`, which currently holds three sources in mixed forms (`git:`, `npm:`). Settled by: the settings entry prompt-manager produced, plus `pi list` after an update.

## B. How a package's skill becomes reachable

**Q6. Are skills declared under `pi.skills` (or discovered from `skills/`) installed into a location the model reads, and what absolute path is advertised to the model for a git package skill?**
`docs/skills.md` says pi adds each skill's name, description and path to the system prompt; `docs/settings.md:148-157` says paths resolve from the agent dir. Settled by: the skill-scan code's path list, plus a `pi -e <package>` session whose system prompt shows the advertised path.

**Q7. Is the gate's active work directory (`ctx.cwd` walk-up) ever inside `~/.pi/agent/git/...`, so that a package-shipped `.scratch/ACTIVE` would be found, or does the walk stop at the repo root?**
`findActiveEffort` climbs 24 hops from `ctx.cwd` with no repo-root stop (`qrspi-gate.ts:103-120`). Settled by: running the gate's `session_start` with `cwd` set to a clone symlink or a subdirectory, and reading what `findActiveEffort` returns.

**Q8. Do the qrspi skill's absolute references to `~/.agents/skills/qrspi/SKILL.md`, `grilling/`, `codebase-design/` and `code-review/` resolve on a machine that has only this package installed?**
`ls -la ~/.agents/skills` shows `qrspi` as a real directory but `grilling`, `codebase-design`, `code-review` as symlinks into `~/github/skills`. Settled by: that `ls` output plus the SKILL.md lines that name the absolute paths.

**Q9. When a package skill and `~/.agents/skills/qrspi` both define `qrspi`, which one wins, and does the collision warn?**
`docs/skills.md` says name collisions keep the first discovered skill and warn. Settled by: the documented discovery order and a startup diagnostic from a deliberately duplicated skill.

## C. Tests

**Q10. How can a test resolve the pi package root without the hardcoded nvm path at `tests/load.ts:15-17`, and is anything in the environment already providing it?**
`load.ts:15-17` defaults to a `v22.19.0` path while the running node is `v22.23.4`; `PI_PKG` has no writer anywhere in `~/.pi/agent/extensions`. Settled by: `grep -rn PI_PKG` across the agent dir, and one test run with the default path removed or overridden.

**Q11. Do the shipped tests need `load.ts` at all, or does each test import its target directly under node's type stripping?**
`tests/qrspi-gate.test.ts:9` imports `../qrspi-gate.ts` directly and never touches `load.ts`; only `rm-guard.test.ts:15` uses the loader. Settled by: reading both test files' imports and running each with `node --experimental-strip-types` from a clean environment.

**Q12. What is the minimum node version and invocation the tests need, and does pi itself run package tests?**
`bin/pi-ext-tests` shells out to bare `node --experimental-strip-types`; pi 1.4.0 declares `engines.node >= 22.19.0`; `docs/packages.md` never mentions tests and prompt-manager declares no `scripts`. Settled by: a run under the declared minimum, plus the absence of any test-runner reference in the docs.

## D. What the gate reads from disk

**Q13. What is the complete set of filesystem paths the gate reads, and which of them may legitimately be absent?**
Four `readFileSync` sites: `.scratch/ACTIVE` (`:107`), `.scratch/<slug>/state.md` (`:152`), `.qrspi-sensitive-paths` (`:172`), each wrapped in a `catch`. Settled by: enumerating every `fs` call in `qrspi-gate.ts` and the catch behaviour of each.

**Q14. Does anything today create `.scratch/ACTIVE` or `.scratch/<slug>/state.md`, other than the agent following the skill's prose?**
The skill's Start section says to write them; `~/.pi` contains no command that does. Settled by: searching every extension, bin script and skill for writers of `ACTIVE`, and a fresh-clone session with no `.scratch`.

**Q15. Which spellings of `Stage:` and `Critical:` does the gate actually accept, and what happens to a malformed or empty `state.md`?**
`parseStage` (`:85-92`) and `parseCritical` (`:95-100`) plus the `ALIASES` table (`:41-64`); `readStateFile` returns `""` on any error (`:152-160`). Settled by: the regexes, and a test run with a state file containing only a title.

**Q16. What does the gate do when `.scratch/ACTIVE` names a slug whose directory does not exist, or names a slug with trailing content?**
`findActiveEffort` takes the first whitespace-delimited token (`:109-111`). Settled by: that line and one fixture run for each case.

## E. The release path with no questionnaire tool installed

**Q17. Which pi 1.4.0 tools produce a `details.answers[]` array carrying an `id`, and what exactly is that shape?**
`questionnaire.ts:80-86,146` returns `{questions, answers: [{id, value, label}], cancelled}`; `question.ts:284-291` returns `{question, options, answer, wasCustom}` with no `answers`. Settled by: those two result objects and the builtin tool list under `dist/core/tools/`.

**Q18. With neither `question.ts` nor `questionnaire.ts` installed, can a critical effort ever leave alignment, and what is the only remaining path?**
The gate blocks writing `Stage: Implement` unless `releasedSlug === effort.slug` (`:223-241`), and `releasedSlug` is set only from `details.answers` (`:203-216`). Settled by: a fixture run of the `tool_call` handler with both tools absent, recording whether any input can flip the block.

**Q19. Can the gate's `question` subscription ever fire, and is there a tool-independent signal that a human (not the agent) answered?**
The subscription accepts `question` (`:203`) but that tool returns no `answers`; `docs/extensions.md:115,151` lists an `input` event for raw user input. Settled by: the `question` result shape plus the `input` event contract, specifically whether it can distinguish human-typed input from agent-sent messages.

## F. Conventions and rules delivery

**Q20. Is `.scratch` a pi convention or only a QRSPI skill convention, and where is it documented outside this machine?**
`grep -rn "\.scratch"` over `docs/` and `dist/core` returns nothing. Settled by: that grep and the skill's Files section, which is the only definition.

**Q21. Which `.scratch` paths do repos ignore, and does anything enforce "commit artifacts, never `ACTIVE`"?**
The skill says commit artifacts and never `ACTIVE`; no `.gitignore` handling appears in the gate. Settled by: `.gitignore` files in repos that have run QRSPI, and a `grep` for `ACTIVE` in any hook or extension.

**Q22. Can a package deliver rules to the model at all, or is an AGENTS.md snippet the only mechanism?**
`docs/configuration.md:18` loads `AGENTS.md` from the agent dir and working directories; no doc mentions package-supplied context files. Settled by: that table plus the absence of any `pi.instructions`/`pi.context` manifest key in `docs/packages.md`.

**Q23. Does the gate depend on the subagents package at runtime, or only the skill's orchestration prose?**
`qrspi-gate.ts` imports only `node:fs`, `node:path` and pi types; the skill's "One window per stage" requires the `Agent` tool. Settled by: the import block at `:24-26` and a session where `@tintinweb/pi-subagents` is disabled and the gate still loads.
