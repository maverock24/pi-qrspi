# Outline

- **Slug**: pi-qrspi-package
- **Stage**: Structure (next to run)
- **Critical**: no
- **Done**: Design

Six slices. Package root is `/home/maverock24/github/pi-qrspi`; every path below is relative to it.

## Why this order

The work is a copy plus two small gate patches plus documentation, so the ordering risk is not in the code, it is in the checks: a behavioural change made before the suite exists cannot be proven. Slices 1 and 2 therefore bring the package into existence and get the existing suite green from its new home, and slices 3 to 6 each land one deliverable on top of a suite that already passes.

No refactor prefactor. D6 rules out restructuring the gate, and the two patches are local (one new helper, one new guard), so a preparatory extraction would be a change nobody asked for. The only sequencing prefactor is the copy-first pair above.

## Traceability

| Decision | Slice |
|---|---|
| D1 manifest, explicit `pi.extensions` and `pi.skills` | 1 |
| D2 gate copied into `extensions/` | 1 |
| D3 skill copied with three corrections | 3 |
| D4 `docs/AGENTS-snippet.md` and the paste instructions | 6 |
| D5 `.gitignore` ignores `.scratch/ACTIVE` only | 1, restated in README in 6 |
| D6 release path recognises both tools, message names both | 4, known limits documented in 6 |
| D7 skill self-containment | 3 |
| D8 `npm test` = `node tests/qrspi-gate.test.ts` | 2 |
| D9 one startup warning when neither question tool exists | 5 |

## Slice 1. Skeleton that pi can load

**Files**: `package.json` (new), `.gitignore` (new), `extensions/qrspi-gate.ts` (new, byte copy of `/home/maverock24/.pi/agent/extensions/qrspi-gate.ts`).

**Change**: the manifest carries `name: pi-qrspi`, `version: 0.1.0`, `keywords: ["pi-package", "qrspi"]`, `author`, `license: MIT`, `engines.node: >=22.19.0`, and `pi: { "extensions": ["./extensions"], "skills": ["./skills"] }` listed explicitly so the manifest rule cannot drop either type (D1). No `dependencies`, no `devDependencies`. One addition beyond D1's list: `"type": "module"`, so bare `node` reads both `.ts` files as ESM instead of relying on syntax detection. `.gitignore` holds exactly one line, `.scratch/ACTIVE`, so artifacts stay committable and `ACTIVE` never is (D5); nothing else needs ignoring because the package has no dependency tree. The gate is copied verbatim (D2) and gets no behaviour change until slices 4 and 5.

**Automated check**, run from the package root:

```bash
diff ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts && echo "copy identical"
node -e 'const p=require("./package.json"),j=JSON.stringify;const ok=p.name==="pi-qrspi"&&p.version==="0.1.0"&&p.keywords?.includes("pi-package")&&p.engines?.node&&j(p.pi?.extensions)==="[\"./extensions\"]"&&j(p.pi?.skills)==="[\"./skills\"]"&&!p.dependencies&&!p.devDependencies;console.log(ok?"manifest ok":"manifest BAD");process.exit(ok?0:1)'
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads, default is a function":"gate BAD")'
git check-ignore -v .scratch/ACTIVE; echo "exit=$?"
git check-ignore -v .scratch/pi-qrspi-package/tree.md; echo "exit=$?"
```

Expected: no diff output then `copy identical`, exit 0; `manifest ok`, exit 0; `gate loads, default is a function`, exit 0 (this command was run against the source file in this session and prints that line); `.gitignore:1:.scratch/ACTIVE	.scratch/ACTIVE` followed by `exit=0`; no output followed by `exit=1`.

**Manual check**: `pi -e "$PWD"` starts with no extension load error, and `/qrspi status` answers `no active effort (.scratch/ACTIVE not found)`.

## Slice 2. The suite runs from its new home

**Files**: `tests/qrspi-gate.test.ts` (new, copy of `/home/maverock24/.pi/agent/extensions/tests/qrspi-gate.test.ts`), `package.json` (touch: add `scripts.test`).

**Change**: two edits to the copy, the import on line 5 becomes `new URL("../extensions/qrspi-gate.ts", import.meta.url)` and the header comment names `npm test` instead of the `/tmp` path. `scripts.test` is `node tests/qrspi-gate.test.ts`, no flag and no loader (D8: node 22.19+ strips types, and the gate's only pi import is type-only). Placement is fixed by D8; it also keeps the file outside every declared resource root, one hop from the extension.

**Automated check**:

```bash
npm test
echo "exit=$?"
```

Expected: one `PASS` line per assertion with no `FAIL` (the source suite printed 44 checks per ticket finding 1), then `all checks passed`, then `exit=0`.

**Manual check**: `diff ~/.pi/agent/extensions/tests/qrspi-gate.test.ts tests/qrspi-gate.test.ts` shows only the import line and the header comment.

## Slice 3. The skill, corrected in three places

**Files**: `skills/qrspi/SKILL.md` (new, copy of `/home/maverock24/.agents/skills/qrspi/SKILL.md`).

**Change**: only the corrections D3 and D7 name, nothing else, so the frontmatter, the stage table and the schema samples stay as written. (1) The `Files` paragraph files `ACTIVE` under `.scratch/<slug>/`, contradicting line 48 and the gate's read, so it moves into the top-level list as `.scratch/ACTIVE`. (2) The bare `codebase-design/SKILL.md` token becomes `~/.agents/skills/codebase-design/SKILL.md`. (3) The three pointers (grilling, codebase-design, code-review) each gain "if installed", plus one fallback sentence: without them, Design and PR do the same steps inline. Stage text stays a full word because that is what `parseStage` accepts.

**Automated check**:

```bash
grep -c '\.scratch/ACTIVE' skills/qrspi/SKILL.md
grep -c 'ACTIVE' skills/qrspi/SKILL.md
grep -c 'codebase-design/SKILL.md' skills/qrspi/SKILL.md
grep -c '~/.agents/skills/codebase-design/SKILL.md' skills/qrspi/SKILL.md
grep -c 'if installed' skills/qrspi/SKILL.md
grep -c '^name: qrspi$' skills/qrspi/SKILL.md
```

Expected, in order: `2`, `2` (no third mention inside the slug directory), `1` (the full path, which the next line proves), `1`, `3`, `1`, every command exit 0.

**Manual check**: read `## Files` and `## Stages` once; no sentence points at a file the package does not ship without saying "if installed".

## Slice 4. Release recognises both question tools

**Files**: `extensions/qrspi-gate.ts` (touch), `tests/qrspi-gate.test.ts` (touch).

**Change**: one new module-level helper beside `stageFromInput` deciding "did this tool result carry the human's release answer", true for an `answers[]` entry with `id: "qrspi_release"` and a value starting with `release`, and true for a `question` result whose trimmed `details.answer` starts with `release` **and** whose `details.question` mentions `release` case-insensitively, the second condition so an unrelated free-text answer cannot release an effort. The `tool_result` handler keeps its toolName guard and calls the helper instead of the inline predicate. The release block reason names both routes: `questionnaire` with id `qrspi_release`, or a `question` whose answer starts with Release. Nothing else in the gate changes (D6). The suite's `answer()` helper takes a toolName, and four checks are added: a `question` answer releases; a `question` whose question text never says release does not; a `question` answered "keep aligning" does not; the existing questionnaire decline still does not.

**Automated check**:

```bash
npm test
```

Expected: the four new labels print `PASS`, no `FAIL`, `all checks passed`, exit 0.

**Manual check**: at a Plan/yes effort, put the release to the human with `question` instead of `questionnaire` and watch the notice plus the `Stage: Implement` write go through.

## Slice 5. One warning when no question tool is installed

**Files**: `extensions/qrspi-gate.ts` (touch), `tests/qrspi-gate.test.ts` (touch).

**Change**: the `session_start` handler takes `(_event, ctx)` and, after its resets, when `ctx.hasUI` is true and `pi.getAllTools()` (`types.d.ts:1284`, entries keyed by `name`) holds neither `question` nor `questionnaire`, notifies once: the release path needs one of them (D9). No ACTIVE precondition, no other new behaviour, the reset and toggle logic untouched. The fake pi in the suite gains a mutable `getAllTools` and three checks: neither tool present warns once, a session start with `questionnaire` present stays silent, `question` alone stays silent.

**Automated check**:

```bash
npm test
```

Expected: the three new labels print `PASS`, no `FAIL`, `all checks passed`, exit 0.

**Manual check**: `diff -u ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts` shows hunks for the helper, the `tool_result` predicate and message, and the `session_start` warning, and nothing else.

## Slice 6. README, the snippet file, and the dry run

**Files**: `docs/AGENTS-snippet.md` (new), `README.md` (new).

**Change**: `docs/AGENTS-snippet.md` holds two labelled blocks with the path each belongs in: the QRSPI block for `~/.pi/agent/AGENTS.md` (tier line, full-tier pipeline, branch owner, commit trailer) and the question-tool block for `APPEND_SYSTEM.md`, each with one line on why a package cannot install it itself (Q22: instruction files load from the agent dir and cwd ancestors only, and the manifest has no instructions key). `README.md` carries the install line, the prerequisites that stay unbundled (`question.ts`/`questionnaire.ts`, `@tintinweb/pi-subagents` plus the custom agent files), where each snippet gets pasted, the `.scratch` state format and the "never commit ACTIVE" rule, and the three known limits D6 says to document rather than fix.

**Automated check**:

```bash
grep -c '^## ' docs/AGENTS-snippet.md
grep -c 'pi install git:github.com/maverock24/pi-qrspi' README.md
grep -c '\.scratch/ACTIVE' README.md
npm test
(git ls-files; git ls-files --others --exclude-standard) | grep -v '^\.scratch/' | sort -u | wc -l
```

Expected: `2`, `1`, at least `1`, `all checks passed` with exit 0, and `7` from the file audit (tracked plus untracked, so it holds whether or not the tasks are already committed), one line each for `.gitignore`, `README.md`, `docs/AGENTS-snippet.md`, `extensions/qrspi-gate.ts`, `package.json`, `skills/qrspi/SKILL.md`, `tests/qrspi-gate.test.ts`.

**Manual check**: `pi -e "$PWD"` lists the qrspi skill, `/qrspi status` answers, and the diff a reviewer reads contains no file outside the package; the real `git push` and `pi install git:...` stay with the human, since the push is out of scope.
