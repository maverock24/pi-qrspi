# R2 — how the gate tests run, and what the gate reads

Child R2. Questions Q10–Q16 of `questions.md`. Every claim carries a `file:line`
or a command's output. No recommendations.

## Environment measured

- Running node: `v22.23.4` (`node -v`, `which node` → `/home/maverock24/.nvm/versions/node/v22.23.4/bin/node`).
- Two pi installs on disk:
  - `/home/maverock24/.nvm/versions/node/v22.19.0/lib/node_modules/@earendil-works/pi-coding-agent` → `package.json` `version` **1.0.3**, `engines.node` `>=22.19.0`.
  - `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent` → `version` **1.4.0**, `engines.node` `>=22.19.0`.
- Pi's managed npm root also holds a 1.4.0 copy: `~/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent` (1.4.0, `dist/index.js` present), with `typebox` 1.3.35 and `jiti` 2.7.0 beside it.
- A pi shell tool exports `PI_CACHE_RETENTION`, `PI_CODING_AGENT`, `PI_MODEL`, `PI_PROVIDER`, `PI_REASONING_LEVEL`, `PI_SESSION_FILE`, `PI_SESSION_ID` (`env | grep ^PI_`). No variable points at the pi install root.

## Q10

**How can a test resolve the pi package root without the hardcoded nvm path at `load.ts:15-17`, and is anything in the environment already providing it?**
Today nothing supplies it. The loader's only source is `process.env.PI_PKG` with an absolute nvm default; no file in the agent dir writes `PI_PKG`. Bare-specifier resolution from a test file fails. Four mechanisms exist and were measured: env var (unset), `import.meta.resolve` (fails), derivation from `process.execPath` (works on the nvm layout), and the version-independent `~/.pi/agent/npm/node_modules` root (exists here).

- `load.ts:15-17` — `PI = process.env.PI_PKG ?? "/home/maverock24/.nvm/versions/node/v22.19.0/lib/node_modules/@earendil-works/pi-coding-agent"`.
- `load.ts:20` — jiti is imported from `path.join(PI, "node_modules/jiti/lib/jiti.mjs")`, i.e. from inside that root.
- `load.ts:23-27` — aliases point at `PI/node_modules/typebox/build/index.mjs` and `PI/dist/index.js`.
- `grep -rn PI_PKG extensions/ bin/ AGENTS.md APPEND_SYSTEM.md` → the single hit is `extensions/tests/load.ts:15`. No writer.
- The default path resolves to pi **1.0.3**, not the installed 1.4.0, because the two nvm versions hold different pi versions. The loader test still passes against it (see Q11).
- `import.meta.resolve("@earendil-works/pi-coding-agent")` and `import.meta.resolve("typebox")` from `/tmp` and from a file placed in `~/.pi/agent/extensions` both throw `ERR_MODULE_NOT_FOUND` (observed). No `node_modules` exists at `~/.pi/agent` or `~/.pi/agent/extensions` (`ls`).
- Pi itself resolves those specifiers by alias injection, not by node resolution: `dist/core/extensions/loader.js:37-87` builds the alias table (`typebox` via `require.resolve("typebox")`, pi via `path.resolve(__dirname, "../..", "index.js")`), applied at `loader.js:474-484`.
- `path.resolve(path.dirname(process.execPath), "..", "lib", "node_modules", "@earendil-works", "pi-coding-agent")` → the v22.23.4 install, `dist/index.js` exists (observed). This depends on node and pi sharing one nvm prefix.
- `npm root -g` → `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules` (observed).
- `createRequire("<pi>/package.json").resolve("typebox")` → `<pi>/node_modules/typebox/build/index.mjs`; `.resolve("jiti")` → `<pi>/node_modules/jiti/lib/jiti.cjs`; `.resolve("@earendil-works/pi-coding-agent")` → `ERR_PACKAGE_PATH_NOT_EXPORTED` (observed, all three).
- `docs/environment-variables.md:83` documents `PI_PACKAGE_DIR` ("Override the package directory, useful for Nix/Guix store paths"); pi reads it in `dist/config.js:317` via `getPackageDir()`. Pi never assigns it (`grep "PI_PACKAGE_DIR"` over extensions, bin and settings.json: no hit; it is absent from the shell env dump above).
- `docs/environment-variables.md:7,26-30` — the `PI_*` variables exported to shell tools are session descriptors only, no install path.
- `~/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent` exists with 1.4.0 and `dist/index.js`, and `typebox`/`jiti` sit at the same level (observed). It exists because `settings.json` declares npm packages; `git:` package clones do not get it (see next bullet).
- `~/.pi/agent/git/github.com/maverock24/prompt-manager` contains `package-lock.json` but no `node_modules` (observed).
- unresolved: whether a `git:` package installed by `pi install` on a machine with no npm packages still has any `node_modules` a test could resolve against. Not verified, and the prompt-manager clone has none.

## Q11

**Do the shipped tests need `load.ts` at all, or does each test import its target directly under node's type stripping?**
Only `rm-guard.test.ts` uses the loader. `qrspi-gate.test.ts` imports the gate by file URL and runs under plain node with no aliases, because the gate has no runtime dependency. Any target that imports `typebox` as a value cannot be loaded that way.

- `qrspi-gate.test.ts:6-10` — imports `node:fs`, `node:os`, `node:path`, then `await import(new URL("../qrspi-gate.ts", import.meta.url).href)`. No import of `./load.ts`.
- `qrspi-gate.test.ts:11-18` — its own inline fake pi (`on`, `registerCommand`, `sendUserMessage`), not `fakePi()`.
- `grep -rn "loadExtension\|fakePi"` → only `rm-guard.test.ts:16` (import) and `:60` (`await loadExtension("rule-enforcement.ts")`).
- `qrspi-gate.ts:29` — `import type { ExtensionAPI }`, erased by type stripping; `qrspi-gate.ts:30-31` — `node:fs`, `node:path` only.
- `rule-enforcement.ts:23` — `import { Type } from "typebox"`, a runtime value import, which is why it needs the alias loader.
- `env -u PI_PKG node --experimental-strip-types ~/.pi/agent/extensions/tests/qrspi-gate.test.ts` → `all checks passed`, exit 0 (observed).
- A direct `node --experimental-strip-types` import of `rule-enforcement.ts` → `ERR_MODULE_NOT_FOUND` (observed).
- `env -u PI_PKG node --experimental-strip-types ~/.pi/agent/extensions/tests/rm-guard.test.ts` → `all checks passed` (observed), so the loader's stale default path still works on this machine.
- `load.ts:24-27` explains why jiti is used: typebox is ESM-only with no `require` condition, so the alias must point at a file.
- Equivalent to a relative-import test working today: `qrspi-gate.test.ts:10` uses `new URL(..., import.meta.url)`, which is relative to the test file, and `ok.ts`-style sibling `.ts` imports carry through type stripping (observed: `import(new URL("./d.ts", import.meta.url).href)` prints `rel import ok function`).

## Q12

**What is the minimum node version and invocation the tests need, and does pi itself run package tests?**
`bin/pi-ext-tests` needs nothing but `node` with type stripping. Every node pi supports (>=22.19.0) has stripping on by default, so the flag is optional there. Pi has no test command and its package docs never mention tests.

- `bin/pi-ext-tests:8-15` — loops `"$DIR"/*.test.ts` where `DIR="$HOME/.pi/agent/extensions/tests"` (`:5`), and runs `node --experimental-strip-types "$f"` (`:14`).
- `bin/pi-ext-tests:11` — an optional substring filter on the test basename.
- `bin/pi-ext-tests:16-18` — exits 1 when no test matched, and exits non-zero when any test failed.
- `bin/pi-ext-tests:14` invokes bare `node` from `PATH`, so the version is whatever the user's shell has, not pi's bundled runtime.
- Node's own docs: type stripping "Added in: v22.6.0"; "v23.6.0, v22.18.0 Type stripping is enabled by default"; disable with `--no-strip-types`; `tsconfig.json` is ignored; enums, runtime namespaces, parameter properties and import aliases error with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; `.tsx` unsupported; file extensions mandatory in import specifiers (https://nodejs.org/api/typescript.html).
- `node --help` on both v22.19.0 and v22.23.4 lists `--no-experimental-strip-types`, i.e. stripping is on by default in both (observed).
- `node --experimental-strip-types ok.ts` and `node ok.ts` both print `ts ok 1` on v22.19.0 and on v22.23.4, with no deprecation warning (observed).
- `…/v22.19.0/bin/node qrspi-gate.test.ts` with no flag → `all checks passed`; the same under v22.23.4 with no flag → `all checks passed` (observed).
- Both pi installs declare `engines: {"node": ">=22.19.0"}` in `package.json`; `docs/quickstart.md:15` says "This requires Node.js 22.19 or newer".
- `pi --help` lists `install`, `remove`, `uninstall`, `update`, `list`, `config`, `auth`, `mcp` — no `test` (observed).
- `grep -c test docs/packages.md docs/extensions.md` → `0` and `0`.
- `docs/packages.md:78` — pi installs a package's `dependencies` on install; no script execution is described anywhere in the doc.
- unresolved: whether `--experimental-strip-types` is still accepted on node versions newer than 22.23.4/24. The installed toolchain here has only 22.19.0 and 22.23.4; node's docs describe the newer name as `--no-strip-types` and record removal of `--experimental-transform-types` in v26.0.0, not of this flag.

## Q13

**What is the complete set of filesystem paths the gate reads, and which of them may legitimately be absent?**
Three files, all read with `fs.readFileSync` inside a `try`, all legitimately absent. No other fs call exists in the file. `state.md` is read twice per write.

- `qrspi-gate.ts:140` — `<dir>/.scratch/ACTIVE`, walked from `ctx.cwd` upward, at most 24 hops (`:136-151`).
- `qrspi-gate.ts:153-155` — `statePath()` builds `<root>/.scratch/<slug>/state.md`.
- `qrspi-gate.ts:159` — the only `state.md` read, called twice per write: `readStage` (`:165-166`) and `readCritical` (`:169-170`).
- `qrspi-gate.ts:177` — `<root>/.qrspi-sensitive-paths`.
- `grep -n "fs\.[a-zA-Z]*"` over the file returns exactly those three lines. No `writeFileSync`, `mkdirSync`, `existsSync` or `statSync` anywhere; the gate writes nothing.
- `qrspi-gate.ts:143-145` — a missing `ACTIVE` is swallowed and the walk continues; after 24 hops or at the filesystem root (`:146-147`) `findActiveEffort` returns `undefined` (`:150`).
- `qrspi-gate.ts:160-162` — any `state.md` read error returns `""`.
- `qrspi-gate.ts:181-183` — a missing `.qrspi-sensitive-paths` yields the built-in list only (`:184`), so the file is optional by construction.
- Behaviour when `ACTIVE` is absent: the ask branch returns at `:238`, the write branch at `:256`; the gate is inert.
- Behaviour when `state.md` is absent or unreadable: `stage` is `undefined`, so `aligning` is false (`:263-264`); the sensitive-path block requires `aligning` (`:270`), both the critical block (`:305`) and the non-critical warning (`:316`) sit after `if (!aligning) return` (`:302`), so writes are allowed. `/qrspi status` reports `unknown stage` (`:356`).
- The roots differ: `ACTIVE` is looked for in every ancestor of `ctx.cwd`, while `state.md` and `.qrspi-sensitive-paths` are always resolved against the `root` where `ACTIVE` was found (`:142`, `:154`, `:177`).
- Writes are classified against `path.relative(effort.root, path.resolve(ctx.cwd, target))` (`:258-262`); anything resolving outside `effort.root` returns early at `:260`.
- `state.md` reads are counted per tool call, not cached: a single `write` triggers `sensitivePatterns` (`:269`), `readStage` (`:263`) and `readCritical` (`:265`).

## Q14

**Does anything today create `.scratch/ACTIVE` or `.scratch/<slug>/state.md`, other than the agent following the skill's prose?**
No. The skill's prose is the only writer, and the skill has no `mkdir`.

- `~/.agents/skills/qrspi/SKILL.md:48` — "Write `.scratch/ACTIVE` with the slug."
- `SKILL.md:49` — "Write `state.md` at stage Questions."
- `SKILL.md:52` — on resume, "rewrite `ACTIVE` if it is missing" (implying the agent may find it missing).
- `SKILL.md:144` — at PR, "delete `.scratch/ACTIVE`".
- `SKILL.md:83` — the Files section lists `ACTIVE` among the artifacts in `.scratch/<slug>/`, which conflicts with `ACTIVE` living at `.scratch/ACTIVE` as the gate reads it (`qrspi-gate.ts:140`).
- `grep -n mkdir ~/.agents/skills/qrspi/SKILL.md` → no hit, so even the directory creation is implicit in the `write` tool.
- `grep -rn "\.scratch"` over `~/.pi/agent/bin` and `~/.pi/agent/extensions` (excluding tests) returns only `qrspi-gate.ts` reads and message strings (`:22`, `:135`, `:140`, `:312`, `:358`). No creator.
- The gate itself writes nothing (see Q13), so it cannot bootstrap its own state.
- Only the test fixture creates them, in a temp dir: `qrspi-gate.test.ts:20-24` (`mkdtempSync`, `mkdirSync(.scratch/demo)`, `ACTIVE` path), `:26-31` (`writeState`, `setActive`).
- `ACTIVE` is absent from this very effort's tree in a different form: `~/.pi/agent/.scratch/ACTIVE` does not exist (`ls` of `~/.pi/agent` shows `bin`, `extensions`, `agents`, `skills`, `sessions`, `npm`, `git`, `projects-memory`, settings files, no `.scratch`).

## Q15

**Which spellings of `Stage:` and `Critical:` does the gate actually accept, and what happens to a malformed or empty `state.md`?**
Both parsers take the first matching line, capture everything up to a newline or `(`, and normalise. Stage tolerates bold/backticks/case and the alias table; a hyphen or extra colon after the stage word breaks it. Critical tolerates bold on the key but not on the value. A malformed or empty `state.md` disables the gate silently.

- `qrspi-gate.ts:105-110` — `parseStage`: `/\bstage\b\**\s*:\s*([^\n(]+)/i`, first match only; the capture stops at `(`.
- `qrspi-gate.ts:93-103` — `normalizeStage`: trim, lowercase, strip everything outside `[a-z ]`, collapse spaces, then exact match against `ALL_STAGES` (`:34`), else `ALIASES`.
- `qrspi-gate.ts:41-64` — alias keys: `q`, `question`, `questions`, `r`, `research`, `d`, `design`, `s`, `structure`, `p`, `plan`, `w`, `wt`, `work tree`, `worktree`, `i`, `implement`, `pr`, `review`.
- `qrspi-gate.ts:113-117` — `parseCritical`: `/\bcritical\b\**\s*:\s*([^\n(]+)/i`, then `/^(yes|true|y|critical)\b/i` on the trimmed capture. Anything else, or a missing line, is `false` (`:115`).
- `qrspi-gate.ts:34` — `ALL_STAGES = ["Questions","Research","Design","Structure","Plan","Work Tree","Implement","PR"]`; only the first five are alignment (`:33`).
- Fixture runs (observed, temp dirs, `Critical: yes` unless stated). Blocking stage values: `Design`, `design`, `D`, `d`, `**Design**`, `` `Design` ``, `Design (next to run)`. Non-blocking: `Design - next`, `Design — next`, `Design: extra`, `Work Tree`, `WT`, `Implement`, `Review`, `PR`, `nonsense`.
- `Design - next` normalises to `design next`, which matches neither `ALL_STAGES` nor `ALIASES` (`:97-102`), so the effort reads as stage-unknown and every write is allowed.
- `Critical` values that count: `yes`, `Yes`, `YES`, `true`, `y`, `critical`. Values that do not: `no`, `false`, `maybe`, empty, and `**yes**` — a bolded value keeps its `**`, so the anchored test at `:116` fails (observed).
- First line wins for both fields: a file with `Critical: no` before `Critical: yes` parses as not critical (observed).
- Empty `state.md`, a title-only `state.md`, and a missing `state.md` all behave identically: write allowed, no notice (observed), because `readStateFile` returns `""` (`:160-162`).
- The skill's template writes `- **Stage**: Research (next to run)` and `- **Critical**: yes` (`SKILL.md:89-90`), both of which parse.
- `SKILL.md:94` says "Stage is a full word, never a letter", while `:41-64` accepts `d`, `s`, `p`, `r`, `q`, `i`, `w`, `wt`.
- `parseStage` requires a word boundary after `stage`; the fixture in the test writes `- **Stage**: X (next to run)` (`qrspi-gate.test.ts:29`) and relies on the `(` cut.

## Q16

**What does the gate do when `.scratch/ACTIVE` names a slug whose directory does not exist, or names a slug with trailing content?**
Trailing content is not a problem: only the first whitespace-delimited token is used, so extra words and comments are ignored. A slug with no matching directory silently disables the gate: `state.md` is unreadable, stage is unknown, and every write is allowed.

- `qrspi-gate.ts:141` — `const slug = raw.trim().split(/\s+/)[0]`; a `#` comment becomes a second token that is discarded.
- `qrspi-gate.ts:142` — `if (slug) return { root: dir, slug }`; an empty or whitespace-only `ACTIVE` does not match, so the walk continues to the parent directories and may find another `ACTIVE`.
- `qrspi-gate.ts:153-155` — `path.join(root, ".scratch", slug, "state.md")`; `path.join` normalises a trailing slash, so `demo/` resolves to `.scratch/demo/state.md`.
- Observed with a valid `state.md` at `Design`/`Critical: yes` and `src/a.ts` as the write target: `ACTIVE` = `demo extra` → BLOCK; `demo # live effort` → BLOCK; `demo/` → BLOCK.
- Observed, same fixture: `ACTIVE` = `nope` (no such directory) → allow; `ACTIVE` empty → allow (no effort found); `ACTIVE` = `  Demo  ` → allow, because the slug is case-sensitive and `.scratch/Demo` does not exist.
- Observed: writing `.scratch/nope/state.md` with `content: "Stage: Implement"` while `ACTIVE` = `nope` → allow; no stage is read, so the release check at `:289` is never reached.
- `qrspi-gate.ts:283-286` — the bookkeeping-file exemption requires the slug to appear as a path segment: `abs.split(path.sep).includes(effort.slug)`. With slug `demo/` that test fails, so the write is still allowed, but by the `inScratch` return at `:301` rather than the state-file return at `:298`.
- The slug is not validated or sanitised: `raw.trim().split(/\s+/)[0]` (`:141`) goes straight into `path.join` (`:154`), so `ACTIVE` containing `../demo` makes the gate read `<root>/demo/state.md` outside `.scratch`. Observed: with only `.scratch/demo/state.md` present, slug `../demo` → allow (no stage found).
- `/qrspi status` on a slug with no directory prints `unknown stage`, `not critical` (`:355-358`).
