# Research merged

Slug: pi-qrspi-package
Sources merged: `research/1-package-loading.md` (Q1-Q9), `research/2-tests-and-reads.md` (Q10-Q16), `research/3-release-and-rules.md` (Q17-Q23), cross-checked against `questions.md`.

Short roots used below:

- `DOCS` = `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent/docs`
- `DIST` = `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent/dist`
- `GATE` = `/home/maverock24/.pi/agent/extensions/qrspi-gate.ts`
- `SKILL` = `/home/maverock24/.agents/skills/qrspi/SKILL.md`
- `PM` = `/home/maverock24/github/prompt-manager`, `PM_INSTALLED` = `/home/maverock24/.pi/agent/git/github.com/maverock24/prompt-manager`

Repo state at merge time: `/home/maverock24/github/pi-qrspi` has no commits, holds only `.scratch/` (`.gitignore` absent, `.scratch/ACTIVE` untracked). The gate and its tests exist only under `~/.pi/agent/extensions/`.

## Facts the design needs

- **Manifest discovery rule.** Conventional `extensions/`, `skills/`, `prompts/`, `themes/` directories are walked only when `package.json` has no `pi` object; any truthy `pi` object becomes the sole source for all four types (`DIST/core/pi-manifest.js:7-20`, `DIST/core/package-manager.js:1865-1885`, fallback at `:1887-1902` reachable only without a manifest). Live counter-example: `pi-mcp-adapter` ships `skills/mcp-scripting/SKILL.md` but declares only `pi.extensions` and `pi.video`, and the skill is not in this session (`/home/maverock24/.pi/agent/npm/node_modules/pi-mcp-adapter/package.json:75-80`).
- **No build step.** Extensions are imported through jiti at runtime (`DOCS/extensions.md:38`, `DIST/core/extensions/loader.js:471-484`), and host specifiers (`@earendil-works/pi-coding-agent`, typebox, pi-ai) resolve through an injected alias map, not the package's own `node_modules` (`loader.js:38-87`, `:474-484`; dependency install at `DIST/core/package-manager.js:1483-1499` omits peers).
- **Skill path stability.** Skills are never copied; the model receives the absolute `SKILL.md` path in `<location>` (`DIST/core/skills.js:278-302`, `DIST/core/package-manager.js:2102-2108`, no cp call in that file). User-scope git installs therefore advertise a fixed `~/.pi/agent/git/<host>/<owner>/<repo>/skills/<name>/SKILL.md`, while `-e` paths are hash and ref derived (`package-manager.js:1795-1799`, `:1816-1824`).
- **Collision precedence.** Packages first, then settings-declared paths, then auto-discovered dirs including `~/.pi/agent/skills` and `~/.agents/skills`; the first skill per name wins and the loser gets a `collision` diagnostic (`DIST/core/package-manager.js:708-736`, `:2057-2064`; `DIST/core/skills.js:320-347`; `DOCS/skills.md:85`).
- **Release-path dependency.** `releasedSlug` is set at one line only, from a `questionnaire` or `question` result whose `details.answers[]` carries `id: "qrspi_release"` and a `value` starting with `release` (`GATE:200`, `:213`, `:220-227`, `:289`). `question` never emits an `answers` array, so only `questionnaire` can release; builtin tools carry no such field (`DIST/core/tools/index.js:19-28`, `DIST/core/extensions/types.d.ts:1002-1039`).
- **Test runner options.** `bin/pi-ext-tests` loops `~/.pi/agent/extensions/tests/*.test.ts` and runs each with bare `node --experimental-strip-types` (`bin/pi-ext-tests:5-18`). Type stripping is on by default from node 22.18 and pi requires `>=22.19.0`, so the flag is optional; pi ships no test command (`pi --help`) and its package docs never mention tests (`grep -c test` = 0 over `DOCS/packages.md`, `DOCS/extensions.md`).
- **Instruction-file limits.** Context files load from `<agent-dir>` plus `cwd` and each ancestor only (`DOCS/configuration.md:18`, `:43-45`, `DIST/core/resource-loader.js:116`, `:166-195`), and the manifest has no instructions/context key (`DOCS/packages.md:63-74`). `APPEND_SYSTEM.md` has exactly two locations, `<agent-dir>` and a trusted `.pi/` (`DOCS/configuration.md:20`, `:33-39`, `resource-loader.js:955-967`). Text can still be injected from package code (`before_agent_start` returning `systemPrompt`, mutable `systemPromptOptions`, `context_with_system`), per `DIST/core/extensions/types.d.ts:720-726`, `:1125-1129`.
- **Install and pinning.** `pi install git:<host>/<owner>/<repo>` writes the source string verbatim into `~/.pi/agent/settings.json` and checks out to `~/.pi/agent/git/<host>/<owner>/<repo>` on the remote default branch; without a configured ref `pi update` resets it to the branch tip (`package-manager.js:623-653`, `:1160-1164`, `:1795-1815`, `:1641-1663`).
- **Gate surface.** Three optional files, read with `readFileSync` in a `try`, all resolved from `ctx.cwd` upward: `<root>/.scratch/ACTIVE` (24 hops, no repo-root stop), `<root>/.scratch/<slug>/state.md`, `<root>/.qrspi-sensitive-paths` (`GATE:136-183`). The gate writes nothing.
- **Zero-runtime-dependency shape.** `GATE:29-31` imports pi types with `import type` plus `node:fs` and `node:path`; only entries in `dependencies` trigger a host-package warning, and `peerDependencies` is never checked (`DIST/core/resource-loader.js:18-63`, `DOCS/packages.md:88-90`).

## Answers

### Q1

Conventional discovery works only while `package.json` has no `pi` object; the moment one exists it is the sole source for all four resource types and the conventional walk is skipped (`DIST/core/pi-manifest.js:7-20`, `DIST/core/package-manager.js:1865-1872` versus `:1873-1885`). A per-type fallback to `join(packageRoot, resourceType)` exists but is reachable only without a manifest (`package-manager.js:1887-1902`). Live example: `pi-mcp-adapter` ships `skills/mcp-scripting/SKILL.md`, declares only `pi.extensions` and `pi.video`, and that skill is absent from this session (`/home/maverock24/.pi/agent/npm/node_modules/pi-mcp-adapter/package.json:75-80`). `pi list` prints package paths, not resources, so it cannot confirm per-resource discovery (`DOCS/cli.md:263`).

### Q2

No build step: pi imports extension files through jiti at runtime (`DOCS/extensions.md:38`, `DIST/core/extensions/loader.js:471-484`). Host specifiers resolve through an alias map covering the pi packages, the `pi-ai` entrypoints and typebox (`loader.js:38-87`, `:474-484`), so a clone with no `node_modules` still loads; installs fetch `dependencies` but deliberately omit peers (`DIST/core/package-manager.js:1483-1499`, `:1566-1572`). `PM_INSTALLED` holds a `package-lock.json` and no `node_modules`, and `PM/extensions/index.ts:20-21` mixes `import type` with a runtime `typebox` import. unresolved: no doc or loader code states a minimum pi version for the `pi` manifest; nothing on the load path reads `engines` or checks a peer version, so the `>=0.84.0` at `@tintinweb/pi-subagents/package.json:26-32` is an author claim.

### Q3

A type-only import survives, and `peerDependencies` is not required to load. The only manifest check warns when a host package appears in `dependencies` (`DIST/core/resource-loader.js:18-63`; `DOCS/packages.md:88-90`). `PM/package.json:1-13` lists neither field, sits in `~/.pi/agent/settings.json:3`, and resolves in `pi list`. `GATE:29-31` is the zero-runtime-dependency shape and needs no package-local resolution at all.

### Q4

The checkout lands at `~/.pi/agent/git/<host>/<owner>/<repo>` for user scope, or `.pi/git/...` for project scope (`DIST/core/package-manager.js:1795-1815`), as `pi list` confirms for `prompt-manager`. With no `@ref` the clone stays on the remote default branch and `pi update` resets it to the fetched tip (`:1549-1573`, `:1581-1595`, `:1283-1322`, `:1641-1663`). `DOCS/packages.md:38` describes only the pinned case. `-e` temporary paths are hash and ref derived and therefore differ between refs (`:1796-1799`, `:1816-1824`).

### Q5

`pi install` appends the source string, normalized only for local paths, to the `packages` array (`DIST/core/package-manager.js:806-809`, `:623-653`, `:1160-1164`); `settings.json:2-6` shows three such strings. `pi update` reads those entries and writes nothing (`:833-859`), and every configured git source joins the update candidates regardless of pinning (`:876-878`). The tagless `prompt-manager` clone (`git tag` empty) is still configured and resolved, so tags are not required. `DOCS/cli.md:276` and `DOCS/packages.md:19` document the target.

### Q6

Skills are not copied anywhere: the package skill stays in its checkout and only its absolute `SKILL.md` path reaches the model, inside `<location>` (`DOCS/skills.md:43`, `DIST/core/skills.js:278-302`, `DIST/core/package-manager.js:207-224`, `:2102-2108`; no copy call in that file). Only entries named exactly `SKILL.md` are collected, walked recursively (`package-manager.js:217`). So the advertised path for a git package skill is `~/.pi/agent/git/<host>/<owner>/<repo>/skills/<name>/SKILL.md`, or the manifest-declared directory, since manifest paths are relative to the package root (`DOCS/packages.md:72`). unresolved: no package on this machine currently loads a package skill, so the printed `<location>` line was never observed live.

### Q7

`ctx.cwd` is the session working directory, not the package root (`DIST/core/extensions/types.d.ts:213-221`, `DOCS/extensions.md:326`). `findActiveEffort` climbs 24 hops from `ctx.cwd` with no repo-root stop and every call site passes `ctx.cwd` (`GATE:136-151`, `:227`, `:237`, `:255`, `:354`). Pi never chdirs into `~/.pi/agent/git/...`, so a package-shipped `.scratch/ACTIVE` would only be found by a session started inside that checkout or a descendant. unresolved: no fixture run of `session_start` with such a `cwd` was performed.

### Q8

No. `SKILL.md:134` names `~/.agents/skills/grilling/SKILL.md` and then a bare `codebase-design/SKILL.md`, and `SKILL.md:144` names `~/.agents/skills/code-review/SKILL.md`. On this machine `grilling`, `codebase-design` and `code-review` are symlinks into `/home/maverock24/github/skills`, a separate clone, while `qrspi` is a real directory (`ls -la ~/.agents/skills`). A package-only install has nothing at those paths, and the bare token resolves against whatever directory the reader assumes. `~/.agents/skills` is a pi skill root (`DOCS/skills.md:61`, `DIST/core/package-manager.js:2023`, `:2064`), but that is machine state, not something the package brings.

### Q9

The package skill wins and the user copy is dropped with a collision diagnostic (`DOCS/skills.md:85`, `DIST/core/skills.js:320-347`); only exact duplicate real paths are skipped (`skills.js:328-331`). Order is packages first (`DIST/core/package-manager.js:718`), then settings entries (`:721-736`), then auto-discovery (`:736`, `:2057`, `:2064`), preserved by insertion order (`:2102-2108`) and passed through to `loadSkills` (`DIST/core/resource-loader.js:630-635`); within packages, project scope precedes user scope (`package-manager.js:708-717`). Preferring the user copy requires stopping the package skill from loading, via a package filter or `-ns` (`DOCS/packages.md:96-119`, `DOCS/cli.md:202`). unresolved: the TUI rendering of the collision diagnostic was not observed.

### Q10

Nothing in the environment supplies the pi root: `PI_PKG` has exactly one hit, `extensions/tests/load.ts:15`, and no writer anywhere in the agent dir. `load.ts:15-17` defaults to the `v22.19.0` nvm path, which holds pi **1.0.3**, while the running node is `v22.23.4` with pi 1.4.0; `load.ts:20-27` builds jiti and the aliases inside whichever root that is. Bare-specifier resolution fails from a test file (`import.meta.resolve` of both the pi package and `typebox` throws `ERR_MODULE_NOT_FOUND`, no `node_modules` under `~/.pi/agent`). Working alternatives measured: deriving from `path.dirname(process.execPath)/../lib/node_modules` (matches the nvm layout), or the version-independent `~/.pi/agent/npm/node_modules` root, which exists here only because `settings.json` declares npm packages. unresolved: whether a machine with only `git:` packages has any `node_modules` a test could resolve against; the `prompt-manager` clone has none.

### Q11

Only `rm-guard.test.ts` uses the loader (`rm-guard.test.ts:16`, `:60`). `qrspi-gate.test.ts:6-10` imports `node:fs`, `node:os`, `node:path` and then the gate by file URL, with its own inline fake pi (`:11-18`), and runs green under plain `node --experimental-strip-types` (observed, exit 0). That works because the gate's only pi import is type-only and it imports nothing else but node builtins (`GATE:29-31`), whereas `rule-enforcement.ts:23` imports `Type` from `typebox` as a value and fails to load without the alias loader (observed `ERR_MODULE_NOT_FOUND`). Relative sibling `.ts` imports carry through type stripping, so a relative-import test is viable today.

### Q12

Minimum is node 22.19.0, which already strips types by default, so `bin/pi-ext-tests`'s `node --experimental-strip-types "$f"` runs on every node pi supports (`bin/pi-ext-tests:5-18`; both pi installs declare `engines.node >= 22.19.0`; `DOCS/quickstart.md:15`). The runner uses bare `node` from `PATH`, takes an optional basename substring filter, exits 1 when nothing matched, and exits non-zero on failure (`bin/pi-ext-tests:8-18`). Pi itself has no test command (`pi --help`) and no test reference in its package docs, and install runs no scripts beyond dependency install (`DOCS/packages.md:78`). unresolved: whether `--experimental-strip-types` is still accepted on node newer than the 22.19.0 and 22.23.4 present here.

### Q13

Exactly three `readFileSync` sites, all inside a `try`, all legitimately absent, and no other fs call: `<dir>/.scratch/ACTIVE` walked from `ctx.cwd` (`GATE:140`), `<root>/.scratch/<slug>/state.md` (`:153-155`, read at `:159`), and `<root>/.qrspi-sensitive-paths` (`:177`). Absent `ACTIVE` makes the gate inert by returning at `:238` (ask) and `:256` (write); absent or unreadable `state.md` yields `""` (`:160-162`), so stage is unknown, `aligning` is false at `:263-264`, and writes are allowed; absent `.qrspi-sensitive-paths` falls back to the built-in list (`:181-184`). Roots differ: `ACTIVE` is searched in every ancestor of `ctx.cwd`, while `state.md` and the sensitive-paths file resolve against the root where `ACTIVE` was found (`:142`, `:154`, `:177`). `state.md` is read twice per write, uncached (`:263`, `:265`).

### Q14

Nothing does. The skill prose is the only writer, and it never calls mkdir (`SKILL:48`, `:49`, `:52`, `:144`; `grep -n mkdir SKILL` returns nothing). The gate writes nothing, so it cannot bootstrap its own state, and a `.scratch` grep across `~/.pi/agent/bin` and `extensions` finds only gate reads and message strings (`GATE:22`, `:135`, `:140`, `:312`, `:358`). Only the test fixture creates the files, in a temp dir (`qrspi-gate.test.ts:20-31`). `~/.pi/agent/.scratch/ACTIVE` does not exist.

### Q15

`parseStage` matches `/\bstage\b\**\s*:\s*([^\n(]+)/i` on the first hit and cuts at `(`, then lowercases, strips everything outside `[a-z ]` and matches `ALL_STAGES` or the alias table (`GATE:93-110`, `:34`, `:41-64`). Accepted: `Design`, `design`, `D`, `d`, `**Design**`, `` `Design` ``, `Design (next to run)`; rejected: `Design - next`, `Design: extra`, `Work Tree`, `WT`, `Implement`, `Review`, `PR` (`normalizeStage` turns the hyphen form into `design next`, which matches nothing). `parseCritical` tolerates bold on the key but not on the value: `yes`, `Yes`, `YES`, `true`, `y`, `critical` count, while `**yes**`, `maybe`, empty and missing do not (`GATE:113-117`). First line wins for both, and an empty, title-only or missing `state.md` behaves identically: write allowed, no notice (`GATE:160-162`). The skill's own template parses (`SKILL:89-90`), but `SKILL:94` says stage is never a letter while `:41-64` accepts `d`, `s`, `p`, `r`, `q`, `i`, `w`, `wt`.

### Q16

Trailing content is ignored: only the first whitespace token of `ACTIVE` is used, so `demo extra`, `demo # live effort` and `demo/` all still block (`GATE:141`, `:153-155`; observed). A slug with no matching directory silently disables the gate: `state.md` is unreadable, stage is unknown, and every write is allowed, including a write of `state.md` itself (`GATE:159-162`, `:263-264`, `:289`; observed with `nope`). An empty `ACTIVE` does not match, so the walk continues to parent directories and may find another (`GATE:142`). The slug is neither validated nor sanitised, so `../demo` reaches outside `.scratch` and `/qrspi status` reports `unknown stage`, `not critical` (`GATE:141`, `:154`, `:355-358`; observed).

### Q17

Only `questionnaire` does. Builtins are exactly eight and carry no `answers` field (`DIST/core/tools/index.js:19-28`, `DIST/core/extensions/types.d.ts:1002-1039`). `questionnaire` returns `QuestionnaireResult { questions, answers, cancelled }` with each `Answer { id, value, label, wasCustom, index? }`, where `id` is the caller's question id, delivered as `details` on both success and cancel (`questionnaire.ts:38-50`, `:182`, `:457-476`; `answers: []` on error or non-tui, `:78-99`). `question` returns `QuestionDetails { question, options, answer, wasCustom? }` with no `answers` key on any path (`question.ts:27-32`, `:54-69`, `:266-292`). The gate reads only `(event.details as any)?.answers`, matches `id === "qrspi_release"` and a `value` starting with `release`, and ignores `label` (`GATE:221-225`).

### Q18

Yes, by several routes, none owned by the release logic. `releasedSlug` is declared at `GATE:200`, reset at `:213`, assigned only at `:227` and compared at `:289`, so with neither tool installed no tool result carries the required shape. Remaining routes: never create or delete `.scratch/ACTIVE` (`GATE:136-151`, `:238`, `:256`); `/qrspi off` (`GATE:364`, `:232`); write outside `effort.root` (`GATE:260`); write `state.md` with a `Critical: no` while `next !== "Implement"`, since the state.md branch derives `next` from `Stage:` only (`GATE:120-133`, `:288`, `:298`); edit via shell, since only `edit` and `write` are gated (`GATE:88`, `:249`); or keep the effort past alignment, since non-alignment stages return allow at `:301-302`. unresolved: no fixture run of the `tool_call` handler with both extensions absent was executed; the reading is from source.

### Q19

It can fire but never release, because the filter accepts `question` (`GATE:220`) and the next line requires an `answers` array (`GATE:221-222`) that `question` never sets (`question.ts:27-32`, `:266-292`); `question` survives only as a Research-stage warning trigger (`GATE:89`, `:235-249`). A tool-independent human signal does exist: the `input` event carries `text`, `images`, `source: "interactive" | "rpc" | "extension"` and `streamingBehavior` (`DIST/core/extensions/types.d.ts:908-920`, `DOCS/extensions.md:151`), with `source` set by the caller (`DIST/core/agent-session.js:1652`, `:1744-1753`, `DIST/core/modes/rpc/rpc-mode.js:306`, `DIST/core/extensions/runner.js:1201-1213`). The gate subscribes to four events only and has no `input` handler (`GATE:211`, `:219`, `:231`, `:328`), and its own `pi.sendUserMessage` produces `source: "extension"` (`GATE:341-345`). Nested tool calls also reach `tool_result` and the gate does not inspect `parentToolCallId`, so a nested `questionnaire` call would set `releasedSlug` (`DOCS/extensions.md:261`, `types.d.ts:985-1001`, `GATE:219-228`).

### Q20

Only a QRSPI skill convention. `grep -rn "\.scratch"` over all 42 files in `DOCS/` and over `DIST/core/` returns nothing; the definition lives in the skill (`SKILL:3`, `:30`, `:48`, `:83`) and its two consumers are outside pi core, namely the gate's `ACTIVE` read and `stagePath`/`readStateFile` (`GATE:140`, `:153-163`), plus the undocumented `Stage:`/`Critical:` field names (`GATE:107`, `:114`). unresolved: no other machine's docs were reachable, so the claim is bounded by this pi 1.4.0 install and `~/.pi/agent`.

### Q21

No repo on this machine ignores any `.scratch` path: `pi-qrspi` has no `.gitignore`, `check-ignore -v .scratch/ACTIVE` returns nothing in either `pi-qrspi` or Quizzy, and Quizzy's `.gitignore` has no `scratch` line. Nothing enforces the rule either; the only statement is `SKILL:120` ("Commit the artifacts with the work. Never commit `ACTIVE`.") with `SKILL:144` deleting `ACTIVE` at PR. The gate contains no git invocation and no gitignore reference, its only git-matching string being the sensitive-path entry `".github/workflows"` (`GATE:84`), and it reads whatever first token `ACTIVE` holds (`GATE:141`). The artifacts are currently untracked (`git status --short` = `?? .scratch/`).

### Q22

Not the only mechanism, but a package cannot ship a context file pi loads by convention: the AGENTS.md family is read from `<agent-dir>` plus `cwd` and each ancestor only, one file per directory, with no package or `node_modules` path in the walk (`DOCS/configuration.md:18`, `:43-45`, `DIST/core/resource-loader.js:116`, `:170`, `:176-195`), and the manifest has no instructions/context key (`DOCS/packages.md:63-74`, plus optional `pi.image`/`pi.video` at `:74`). The two real channel families are `APPEND_SYSTEM.md` at `<agent-dir>` or a trusted `.pi/` (`DOCS/configuration.md:20`, `:33-39`, `resource-loader.js:955-967`, `DIST/core/trust-manager.js:16`) and package code that injects prompt text at runtime via `before_agent_start` returning `systemPrompt`, mutable `systemPromptOptions`, or `context_with_system` (`types.d.ts:720-726`, `:1125-1129`, `DOCS/extensions.md:156`, `:208`, `:216`, `:228`). The gate injects no prompt text, only `ctx.ui.notify` and `pi.sendUserMessage` (`GATE:206-207`, `:341-345`); the QRSPI rules on this machine ride in `~/.pi/agent/AGENTS.md:9-14`, `:41`, `:43` and `APPEND_SYSTEM.md:3`.

### Q23

Only the prose. The gate's three imports are the type-only pi import plus `node:fs` and `node:path` (`GATE:29-31`), the `pi` object is a function parameter (`GATE:196`), and the module imports cleanly under plain node with no subagents package in the resolution path (observed: `loaded, default is function`). The skill requires subagents without naming a package (`SKILL:8`, `:25`, `:27`, `:77-79`), and `@tintinweb/pi-subagents` appears only as a settings entry (`~/.pi/agent/settings.json:5`). unresolved: no live session with that package disabled was run.

## Disagreements between the sources

- **Gate import range.** R1 says the type import plus `node:fs` sit at `GATE:29-30`; R3 says `GATE:29-31`. Source has the type import at 29, `node:fs` at 30 and `node:path` at 31, so R3's range is the correct one.
- **Count of fs reads.** R2 gives three `readFileSync` sites at `qrspi-gate.ts:140`, `:159`, `:177`; `questions.md` says "Four `readFileSync` sites" and then lists three, at `:107`, `:152`, `:172`. Source confirms three, at 140, 159 and 177.
- **Parser and readStateFile lines.** `questions.md` cites `parseStage` at `:85-92`, `parseCritical` at `:95-100` and `readStateFile` at `:152-160`; R2 cites `:105-110`, `:113-117` and `:160-162`. Source has the functions at 106, 113 and 157, so R2 tracks the file and `questions.md` was written against an older gate.
- **release block lines.** `questions.md` puts `releasedSlug` assignment at `:203-216` and the block at `:223-241`; R3 puts the declaration at `:200`, assignment at `:227` and block at `:289`. Source matches R3.
- **The skill contradicts itself about `ACTIVE`.** `SKILL:83` lists `ACTIVE` among the `.scratch/<slug>/` artifacts, while `SKILL:48` writes it at `.scratch/ACTIVE` and `GATE:140` reads only that. A slug-nested `ACTIVE` would never be found.
- **Which pi the tests run against.** R1 states its work was done against the installed pi 1.4.0; R2 shows `load.ts:15-17` defaults to the `v22.19.0` install, which is pi 1.0.3, so the one loader-backed test exercises 1.0.3 unless `PI_PKG` is set.
- **Minor line drift in R3.** R3 places `WRITE_TOOLS` at `GATE:87`; source has it at `:88`. This is an off-by-one in one file, not a disagreement between two.

## Unresolved

- **Q2 minimum pi version for the `pi` manifest.** unresolved: no doc, changelog entry or loader check states one; only author-declared `peerDependencies` exist. Settled by a doc statement or a version gate in `package-manager.js`/`pi-manifest.js`, or by installing the package against an older pi and observing the load.
- **Q6 live `<location>` path for a package skill.** unresolved: no installed package currently loads a skill, since `pi-mcp-adapter`'s manifest suppresses its own. Settled by installing a package that declares `pi.skills` or ships `skills/`, then reading the skills block of its system prompt.
- **Q7 `ACTIVE` discovery from inside a package checkout.** unresolved: no fixture run of `session_start` with `cwd` under `~/.pi/agent/git/...`. Settled by that fixture run, reading what `findActiveEffort` returns.
- **Q9 collision diagnostic rendering.** unresolved: no run with two same-named skills. Settled by duplicating a skill name and reading the startup diagnostic, or by reading the diagnostic renderer.
- **Q10 `node_modules` for a git-only install.** unresolved: whether a `git:` package on a machine with no npm packages still has a resolvable host root; `prompt-manager` has no `node_modules`. Settled by installing a git package on a clean agent dir and listing the clone.
- **Q12 `--experimental-strip-types` on newer node.** unresolved: only node 22.19.0 and 22.23.4 are present; the docs describe `--no-strip-types` as the newer name. Settled by running the test under node 24 or later.
- **Q18 critical effort with both question tools absent.** unresolved: no fixture run of the `tool_call` handler in that configuration. Settled by that run, recording whether any input flips the block.
- **Q20 `.scratch` outside this machine.** unresolved: no external docs were reachable, so the "skill convention only" claim is bounded by this install. Settled by grepping another machine's pi docs and core, or the upstream repo at a second version.
- **Q23 live session with `@tintinweb/pi-subagents` disabled.** unresolved: no interactive session was available. Settled by disabling that package in settings and confirming the gate still registers its command.
