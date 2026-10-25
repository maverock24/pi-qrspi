# Work tree

- **Slug**: pi-qrspi-package
- **Stage**: Work Tree
- **Branch**: `qrspi/pi-qrspi-package` (created off unborn `master`, so the first commit lands on it)
- **Package root**: `/home/maverock24/github/pi-qrspi`; every check below runs there
- **Source of truth**: `plan.md`. This file only cuts its six phases into commit-sized tasks and pins a command plus an expected value to each one.

## Rules for every task

1. `.scratch/ACTIVE` is never committed, in this task or any later one. It stays untracked until `.gitignore` (T3) makes it ignored; if a `git add -A` stages it, run `git restore --staged .scratch/ACTIVE` before committing. T1, T23 and every `git status` check verify this.
2. One commit per task, exactly the message given, trailer `QRSPI: pi-qrspi-package` on the last line.
3. A check that prints an unexpected value stops the work. Do not adjust the expected value; fix the change or report the deviation.
4. Tasks run in id order, which is a topological order of the graph. Verification tasks (T5, T8, T12, T16, T19, T22, T23) change no deliverable; they tick the task list in this file and record the measured output, which is the commit.
5. `npm test` writes its log to `/tmp/qrspi-p<N>.log` in the checks so the `PASS`/`FAIL` counts can be read without re-running.

## Progress

A task's box is ticked once its check prints the expected values; the tick
lands in the next commit, since a task's own commit carries only its `Files`.

- [x] T1. Commit the alignment artifacts
- [x] T2. Add `package.json`, the manifest pi reads
- [x] T3. Add `.gitignore` that ignores `.scratch/ACTIVE` only
- [x] T4. Copy the gate into `extensions/`
- [x] T5. P1 gate: verify and record
- [x] T6. Copy the suite into `tests/` with two edits
- [x] T7. Add `scripts.test`
- [x] T8. P2 gate: suite green from its new home
- [x] T9. Copy the skill and move `ACTIVE` out of the slug list
- [x] T10. Give the `codebase-design` pointer its full path
- [x] T11. Mark the three external skills "if installed" and add the inline fallback
- [x] T12. P3 gate: skill greps
- [x] T13. Add `releaseAnswered` and collapse the `tool_result` predicate
- [x] T14. Name both release routes in the block message
- [ ] T15. Extend the suite for the `question` release route
- [ ] T16. P4 gate: 42 checks and a three-hunk review
- [ ] T17. Warn once at `session_start` when no question tool exists
- [ ] T18. Extend the suite for the startup warning
- [ ] T19. P5 gate: 46 checks and a four-hunk review
- [ ] T20. Write `docs/AGENTS-snippet.md`
- [ ] T21. Write `README.md`
- [ ] T22. P6 gate: docs counts, suite, file audit, live skill listing
- [ ] T23. Final gate: clean tree, trailers, `ACTIVE` never committed

## Dependency shape

`T1` is the trunk (the base commit). After it the graph opens three short fans and rejoins once per phase boundary:

```
T1
├─ T2 ─┬─ T4 ── T6
│      └─ T7
├─ T3
└─ T9 ─┬─ T10
       └─ T11

T5  <- T2, T3, T4          (P1 gate)
T8  <- T5, T6, T7          (P2 gate: suite green)
T12 <- T9, T10, T11        (P3 gate: skill)
T13 <- T8
T14 <- T13
T15 <- T6, T13, T14
T16 <- T15                 (P4 gate)
T17 <- T16
T18 <- T15, T17
T19 <- T18                 (P5 gate)
T20 <- T19
T21 <- T20
T22 <- T19, T21            (P6 gate)
T23 <- T22                 (final gate)
```

So: T1 opens T2, T3 and T9. T4 needs T2 for `"type": "module"`, T6 needs T4, T7 needs T2, and T5 closes P1 on all three. T8 joins T5, T6 and T7. P3 is content only and hangs off T1, but id order keeps it after P2 so the commits follow the plan. P4 joins at T15, and each later phase is a chain that a verification task closes. No cycles.

## Task list

| Id | Title | Blocked by |
|---|---|---|
| T1 | Commit the alignment artifacts | none |
| T2 | Add `package.json`, the manifest pi reads | T1 |
| T3 | Add `.gitignore` that ignores `.scratch/ACTIVE` only | T1 |
| T4 | Copy the gate into `extensions/` | T1, T2 |
| T5 | P1 gate: verify and record | T2, T3, T4 |
| T6 | Copy the suite into `tests/` with two edits | T1, T4 |
| T7 | Add `scripts.test` | T2 |
| T8 | P2 gate: suite green from its new home | T5, T6, T7 |
| T9 | Copy the skill and move `ACTIVE` out of the slug list | T1 |
| T10 | Give the `codebase-design` pointer its full path | T9 |
| T11 | Mark the three external skills "if installed" and add the inline fallback | T9 |
| T12 | P3 gate: skill greps | T9, T10, T11 |
| T13 | Add `releaseAnswered` and collapse the `tool_result` predicate | T8 |
| T14 | Name both release routes in the block message | T13 |
| T15 | Extend the suite for the `question` release route | T6, T13, T14 |
| T16 | P4 gate: 42 checks and a three-hunk review | T15 |
| T17 | Warn once at `session_start` when no question tool exists | T16 |
| T18 | Extend the suite for the startup warning | T15, T17 |
| T19 | P5 gate: 46 checks and a four-hunk review | T18 |
| T20 | Write `docs/AGENTS-snippet.md` | T19 |
| T21 | Write `README.md` | T20 |
| T22 | P6 gate: docs counts, suite, file audit, live skill listing | T19, T21 |
| T23 | Final gate: clean tree, trailers, `ACTIVE` never committed | T22 |

---

## T1. Commit the alignment artifacts

**Files**: `.scratch/pi-qrspi-package/ticket.md`, `state.md`, `questions.md`, `research/1-package-loading.md`, `research/2-tests-and-reads.md`, `research/3-release-and-rules.md`, `research.md`, `tree.md`, `outline.md`, `plan.md`, `worktree.md`. Nothing else.

**Blocked by**: none

**Change**: stage exactly those eleven paths, never `.scratch/ACTIVE`. This is the repository's first commit, so it is the base every later check builds on.

**Check**

```bash
git log --oneline | wc -l
git ls-files '.scratch/pi-qrspi-package' | wc -l
git ls-files --error-unmatch .scratch/ACTIVE >/dev/null 2>&1; echo "ACTIVE tracked=$?"
git log --oneline -- .scratch/ACTIVE | wc -l
```

**Expected**, in order: `1`; `11`; `ACTIVE tracked=1` (exit 1 means not tracked); `0`.

**Commit**

```
chore(qrspi): plan the pi-qrspi package

QRSPI: pi-qrspi-package
```

---

## T2. Add `package.json`, the manifest pi reads

**Files**: `package.json` (new)

**Blocked by**: T1

**Change**: exactly the keys in `plan.md` P1: `name`, `version`, `description`, `keywords`, `author`, `license`, `type: "module"`, `engines.node: ">=22.19.0"`, `pi.extensions: ["./extensions"]`, `pi.skills: ["./skills"]`. No dependencies, no devDependencies, no build output, no `scripts` yet (T7 adds it).

**Check**

```bash
node -e 'const p=require("./package.json"),j=JSON.stringify;const ok=p.name==="pi-qrspi"&&p.version==="0.1.0"&&p.keywords?.includes("pi-package")&&p.engines?.node&&j(p.pi?.extensions)==="[\"./extensions\"]"&&j(p.pi?.skills)==="[\"./skills\"]"&&!p.dependencies&&!p.devDependencies;console.log(ok?"manifest ok":"manifest BAD");process.exit(ok?0:1)'
```

**Expected**: `manifest ok`, exit 0.

**Commit**

```
Add the package manifest with both resource roots listed

A pi object replaces conventional discovery, so extensions and skills are
declared explicitly. No dependencies: host specifiers resolve through pi.

QRSPI: pi-qrspi-package
```

---

## T3. Add `.gitignore` that ignores `.scratch/ACTIVE` only

**Files**: `.gitignore` (new)

**Blocked by**: T1

**Change**: one line, `.scratch/ACTIVE`, nothing else. Artifacts stay committable.

**Check**

```bash
git check-ignore -v .scratch/ACTIVE
git check-ignore -q .scratch/pi-qrspi-package/tree.md; echo "artifacts ignored=$?"
wc -l < .gitignore
```

**Expected**: `.gitignore:1:.scratch/ACTIVE	.scratch/ACTIVE`; `artifacts ignored=1` (exit 1 means not ignored, which is wanted); `1`.

**Commit**

```
Ignore .scratch/ACTIVE, never the artifacts

The skill says the artifacts are committed with the work and the pointer is
not. One line covers that.

QRSPI: pi-qrspi-package
```

---

## T4. Copy the gate into `extensions/`

**Files**: `extensions/qrspi-gate.ts` (new, byte copy of `~/.pi/agent/extensions/qrspi-gate.ts`)

**Blocked by**: T1, T2 (the manifest's `"type": "module"` is what makes bare node read the copy as ESM)

**Change**: `cp`. No edit. Behaviour changes are T13 to T17 only.

**Check**

```bash
diff ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts && echo "copy identical"
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads, default is a function":"gate BAD")'
```

**Expected**: no diff output, then `copy identical`; then `gate loads, default is a function`.

**Commit**

```
Ship the gate as the package extension entry

A byte copy of the installed gate, so the package behaves like this machine
until the two listed patches land.

QRSPI: pi-qrspi-package
```

---

## T5. P1 gate: verify and record

**Files**: `worktree.md` (tick T1 to T5, record the measured output)

**Blocked by**: T2, T3, T4

**Change**: run the whole of P1's automated check together, then the manual check. No deliverable edits.

**Check**

```bash
diff ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts && echo "copy identical"
node -e 'const p=require("./package.json"),j=JSON.stringify;const ok=p.name==="pi-qrspi"&&p.version==="0.1.0"&&p.keywords?.includes("pi-package")&&p.engines?.node&&j(p.pi?.extensions)==="[\"./extensions\"]"&&j(p.pi?.skills)==="[\"./skills\"]"&&!p.dependencies&&!p.devDependencies;console.log(ok?"manifest ok":"manifest BAD");process.exit(ok?0:1)'
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads, default is a function":"gate BAD")'
git check-ignore -q .scratch/ACTIVE && echo "ACTIVE ignored"
git check-ignore -q .scratch/pi-qrspi-package/tree.md || echo "artifacts committable"
git status --porcelain
```

**Expected**, in order: `copy identical`; `manifest ok`; `gate loads, default is a function`; `ACTIVE ignored`; `artifacts committable`; an empty `git status`.

**Manual check** (under a minute): `pi -e "$PWD"` starts with no extension load error, and `/qrspi status` answers `QRSPI gate: ON. Active: pi-qrspi-package at Work Tree, not critical (/home/maverock24/github/pi-qrspi)`. The stage word follows `.scratch/ACTIVE` and `state.md`; what matters is that the gate names the live effort instead of `no active effort`.

**Commit**

```
chore(qrspi): verify the P1 skeleton

QRSPI: pi-qrspi-package
```

---

## T6. Copy the suite into `tests/` with two edits

**Files**: `tests/qrspi-gate.test.ts` (new, copy of `~/.pi/agent/extensions/tests/qrspi-gate.test.ts`)

**Blocked by**: T1, T4

**Change**: exactly two edits. Line 3 (`*   node --experimental-strip-types /tmp/qrspi-gate.test.ts`) becomes `*   npm test`. Line 10 becomes `const mod: any = await import(new URL("../extensions/qrspi-gate.ts", import.meta.url).href);`. No other line changes.

**Check**

```bash
diff ~/.pi/agent/extensions/tests/qrspi-gate.test.ts tests/qrspi-gate.test.ts | grep -c '^[<>]'
diff ~/.pi/agent/extensions/tests/qrspi-gate.test.ts tests/qrspi-gate.test.ts | grep -cE '^[0-9]'
grep -c 'npm test' tests/qrspi-gate.test.ts
grep -n 'new URL("../extensions/qrspi-gate.ts"' tests/qrspi-gate.test.ts | cut -d: -f1
```

**Expected**: `4` changed lines; `2` hunks; `1`; `10`.

**Commit**

```
Copy the gate suite into tests/

Only the import path and the usage comment change. tests/ sits outside both
declared resource roots, so pi never loads the suite as a resource.

QRSPI: pi-qrspi-package
```

---

## T7. Add `scripts.test`

**Files**: `package.json` (touch: add `"scripts": { "test": "node tests/qrspi-gate.test.ts" }`)

**Blocked by**: T2

**Change**: no flag and no loader. Node 22.19+ strips types, and the gate's only pi import is `import type`.

**Check**

```bash
node -e 'const p=require("./package.json");const ok=p.scripts?.test==="node tests/qrspi-gate.test.ts";console.log(ok?"scripts ok":"scripts BAD");process.exit(ok?0:1)'
```

**Expected**: `scripts ok`, exit 0.

**Commit**

```
Run the suite with npm test, no loader

node 22.19 strips types and the gate imports pi as a type only, so the suite
needs no flag and no jiti.

QRSPI: pi-qrspi-package
```

---

## T8. P2 gate: suite green from its new home

**Files**: `worktree.md` (tick T6 to T8, record the measured output)

**Blocked by**: T5, T6, T7

**Change**: none.

**Check**

```bash
npm test > /tmp/qrspi-p2.log 2>&1; echo "exit=$?"
grep -c '^PASS' /tmp/qrspi-p2.log
grep -c '^FAIL' /tmp/qrspi-p2.log
grep -c 'all checks passed' /tmp/qrspi-p2.log
diff ~/.pi/agent/extensions/tests/qrspi-gate.test.ts tests/qrspi-gate.test.ts | grep -c '^[<>]'
```

**Expected**, in order: `exit=0`; `39`; `0`; `1`; `4`. The 39 is the number of `PASS` lines the source suite prints on this machine (`plan.md` measured it; the outline's 44 was wrong).

**Commit**

```
chore(qrspi): verify the suite runs under npm test

QRSPI: pi-qrspi-package
```

---

## T9. Copy the skill and move `ACTIVE` out of the slug list

**Files**: `skills/qrspi/SKILL.md` (new, copy of `~/.agents/skills/qrspi/SKILL.md`)

**Blocked by**: T1 (content only; id order keeps it after P2 so the commit sequence matches the plan)

**Change**: copy, then correction (1) only. From the `## Files` sentence, drop the `` `ACTIVE`, `` token, and add the paragraph that places the pointer at `.scratch/ACTIVE` one level up. Nothing else in the file changes yet.

**Check**

```bash
grep -c '`ACTIVE`,' skills/qrspi/SKILL.md
grep -c '\.scratch/ACTIVE' skills/qrspi/SKILL.md
grep -c '^name: qrspi$' skills/qrspi/SKILL.md
wc -l < skills/qrspi/SKILL.md
diff ~/.agents/skills/qrspi/SKILL.md skills/qrspi/SKILL.md | grep -cE '^[0-9]'
```

**Expected**: `0`; `3`; `1`; `150`; `1`. The source is 148 lines and correction (1) adds one paragraph, one line plus its blank separator, so 150 with a single hunk.

**Commit**

```
Correct where the skill says ACTIVE lives

ACTIVE sits at .scratch/ACTIVE, one level above the slug directory, which is
where the gate reads it and where the skill already writes it.

QRSPI: pi-qrspi-package
```

---

## T10. Give the `codebase-design` pointer its full path

**Files**: `skills/qrspi/SKILL.md` (touch)

**Blocked by**: T9

**Change**: correction (2) only. The bare `` `codebase-design/SKILL.md` `` in the Design line becomes `` `~/.agents/skills/codebase-design/SKILL.md` ``.

**Check**

```bash
grep -c '`codebase-design/SKILL.md`' skills/qrspi/SKILL.md
grep -o 'codebase-design/SKILL.md' skills/qrspi/SKILL.md | wc -l
grep -o '~/.agents/skills/codebase-design/SKILL.md' skills/qrspi/SKILL.md | wc -l
```

**Expected**: `0`; `1`; `1`. The last two are equal, so every occurrence carries the full path.

**Commit**

```
Spell out the codebase-design skill path

QRSPI: pi-qrspi-package
```

---

## T11. Mark the three external skills "if installed" and add the inline fallback

**Files**: `skills/qrspi/SKILL.md` (touch)

**Blocked by**: T9

**Change**: correction (3) only. Add `if installed` after the grilling path and after the codebase-design path on the Design line, and after the code-review path on the PR line. Then extend the Design paragraph's closing sentence, `Done when the frontier is empty.`, with the fallback sentence `None of those three skills ship with this package: if they are not installed, do the same steps inline.`

**Check**

```bash
grep -o 'if installed' skills/qrspi/SKILL.md | wc -l
grep -c 'do the same steps inline' skills/qrspi/SKILL.md
grep -c '^name: qrspi$' skills/qrspi/SKILL.md
```

**Expected**: `3`; `1`; `1`. Use occurrence counts, not line counts: two of the three markers sit on the same line.

**Commit**

```
Qualify the external skill pointers as optional

The grilling, codebase-design and code-review skills belong to the installer,
not to this package, so Design and PR fall back to doing those steps inline.

QRSPI: pi-qrspi-package
```

---

## T12. P3 gate: skill greps

**Files**: `worktree.md` (tick T9 to T12, record the measured output)

**Blocked by**: T9, T10, T11

**Change**: none.

**Check**

```bash
grep -c '`ACTIVE`,' skills/qrspi/SKILL.md
grep -c '\.scratch/ACTIVE' skills/qrspi/SKILL.md
grep -c '`codebase-design/SKILL.md`' skills/qrspi/SKILL.md
grep -o 'codebase-design/SKILL.md' skills/qrspi/SKILL.md | wc -l
grep -o '~/.agents/skills/codebase-design/SKILL.md' skills/qrspi/SKILL.md | wc -l
grep -o 'if installed' skills/qrspi/SKILL.md | wc -l
grep -c 'do the same steps inline' skills/qrspi/SKILL.md
grep -c '^name: qrspi$' skills/qrspi/SKILL.md
```

**Expected**, in order: `0`, `3`, `0`, `1`, `1`, `3`, `1`, `1`, every command exit 0. The last value proves the frontmatter name survived, so pi advertises the skill as `qrspi`.

**Manual check** (under a minute): read `## Files` and `## Stages` once. No sentence points at a file the package does not ship without saying `if installed`.

**Commit**

```
chore(qrspi): verify the skill corrections

QRSPI: pi-qrspi-package
```

---

## T13. Add `releaseAnswered` and collapse the `tool_result` predicate

**Files**: `extensions/qrspi-gate.ts` (touch)

**Blocked by**: T8 (the suite must be green before the gate's behaviour changes)

**Change**: insert the module-level `releaseAnswered` helper from `plan.md` P4 between `stageFromInput` and the `Walk up from cwd` comment. In the `tool_result` handler, replace the `answers` extraction and the `released` test with `if (!releaseAnswered(event.toolName, event.details)) return;`, keeping the toolName guard on the line above and `releasedSlug` / `say()` below untouched.

**Check**

```bash
grep -c '^function releaseAnswered' extensions/qrspi-gate.ts
grep -c 'const released = answers.some' extensions/qrspi-gate.ts
grep -c 'if (!releaseAnswered(event.toolName, event.details)) return;' extensions/qrspi-gate.ts
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads":"gate BAD")'
```

**Expected**: `1`; `0`; `1`; `gate loads`.

**Commit**

```
Accept a question result as the release answer

A question releases only when its answer starts with Release and its own
question mentioned release, so an unrelated free-text answer cannot open an
effort.

QRSPI: pi-qrspi-package
```

---

## T14. Name both release routes in the block message

**Files**: `extensions/qrspi-gate.ts` (touch)

**Blocked by**: T13

**Change**: the three-line block reason at the alignment gate becomes the four lines from `plan.md` P4: `questionnaire with question id qrspi_release and options "Release to Implement" / "Keep aligning", or a question whose answer starts with Release.` Nothing else.

**Check**

```bash
grep -c 'questionnaire with question id qrspi_release and options' extensions/qrspi-gate.ts
grep -c 'question id qrspi_release, options' extensions/qrspi-gate.ts
grep -c 'or a question whose answer starts with' extensions/qrspi-gate.ts
```

**Expected**: `1`; `0`; `1`.

**Commit**

```
Name both release routes in the block message

QRSPI: pi-qrspi-package
```

---

## T15. Extend the suite for the `question` release route

**Files**: `tests/qrspi-gate.test.ts` (touch)

**Blocked by**: T6, T13, T14

**Change**: the `answer()` helper becomes `answer(toolName, details)`, plus the `questionnaire(value)` builder, and the two existing call sites change shape. Add three assertions, each opening with `freshSession()` and `writeState("Plan", "yes")` because `releasedSlug` resets per session: a question answer releases; a question that never said release does not; a question answered keep aligning does not. The existing questionnaire decline stays as it is.

**Check**

```bash
grep -c 'const answer = async (toolName: string, details: any)' tests/qrspi-gate.test.ts
grep -c 'const questionnaire = (value: string)' tests/qrspi-gate.test.ts
npm test > /tmp/qrspi-p4.log 2>&1; echo "exit=$?"
grep -c '^PASS' /tmp/qrspi-p4.log
grep -c '^FAIL' /tmp/qrspi-p4.log
for l in 'a question answer releases' 'a question that never said release does not' 'a question answered keep aligning does not' 'a decline does not release'; do printf '%s => ' "$l"; grep -c "^PASS.*$l" /tmp/qrspi-p4.log; done
```

**Expected**: `1`; `1`; `exit=0`; `42`; `0`; then `1` for each of the four labels.

**Commit**

```
Cover the question release route in the suite

Three assertions, one positive and two negative, so a free-text answer cannot
silently open a critical effort.

QRSPI: pi-qrspi-package
```

---

## T16. P4 gate: 42 checks and a three-hunk review

**Files**: `worktree.md` (tick T13 to T16, record the measured output)

**Blocked by**: T15

**Change**: none.

**Check**

```bash
npm test > /tmp/qrspi-p4-gate.log 2>&1; echo "exit=$?"
grep -c '^PASS' /tmp/qrspi-p4-gate.log
grep -c '^FAIL' /tmp/qrspi-p4-gate.log
diff -u ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts | grep -c '^@@'
```

**Expected**: `exit=0`; `42`; `0`; `3` hunks (the helper, the collapsed predicate, the message). A fourth hunk at this point means something outside P4 changed.

**Manual check** (under a minute): on a critical effort at an alignment stage, put the release with the `question` tool, pick `Release to Implement`, and watch the `released to Implement` notice, then a `Stage: Implement` write that goes through.

**Commit**

```
chore(qrspi): verify the release paths

QRSPI: pi-qrspi-package
```

---

## T17. Warn once at `session_start` when no question tool exists

**Files**: `extensions/qrspi-gate.ts` (touch)

**Blocked by**: T16

**Change**: the `session_start` handler takes `(_event, ctx)` and, after the four resets, maps `pi.getAllTools()` to names and, when neither `question` nor `questionnaire` is present, calls `say(ctx, ..., "warning")` once. No ACTIVE precondition, no new state, the reset and toggle logic untouched. The notice stays behind `say()`, which is silent when `hasUI` is false.

**Check**

```bash
grep -c 'pi.getAllTools' extensions/qrspi-gate.ts
grep -c 'neither "question" nor "questionnaire" is installed' extensions/qrspi-gate.ts
grep -c 'pi.on("session_start", async (_event, ctx)' extensions/qrspi-gate.ts
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads":"gate BAD")'
```

**Expected**: `1`; `1`; `1`; `gate loads`.

**Commit**

```
Warn once when no question tool is installed

Without question or questionnaire the release path is unreachable, so a
critical effort can never leave alignment. say() keeps the notice out of
headless children.

QRSPI: pi-qrspi-package
```

---

## T18. Extend the suite for the startup warning

**Files**: `tests/qrspi-gate.test.ts` (touch)

**Blocked by**: T15, T17

**Change**: add `let toolNames = ["question", "questionnaire"]` above the fake pi and `getAllTools: () => toolNames.map((name) => ({ name }))` inside it, so every existing notice-count assertion still sees both tools. Add a `--- no question tool installed ---` section with four assertions after the release block and before the legacy section: neither tool warns once; `questionnaire` alone is silent; `question` alone is silent; a `{ ...ctx, hasUI: false }` child with no tool is silent. Restore `toolNames` to both at the end.

**Check**

```bash
grep -c 'let toolNames' tests/qrspi-gate.test.ts
grep -c 'getAllTools: () => toolNames.map' tests/qrspi-gate.test.ts
npm test > /tmp/qrspi-p5.log 2>&1; echo "exit=$?"
grep -c '^PASS' /tmp/qrspi-p5.log
grep -c '^FAIL' /tmp/qrspi-p5.log
for l in 'warns once when neither question tool is installed' 'silent when questionnaire is present' 'silent when question is present' 'silent in a headless child with no question tool'; do printf '%s => ' "$l"; grep -c "^PASS.*$l" /tmp/qrspi-p5.log; done
```

**Expected**: `1`; `1`; `exit=0`; `46`; `0`; then `1` for each of the four labels. The fourth is the one that actually proves the headless path; the older `and it stays silent` check runs with both tools installed and cannot.

**Commit**

```
Cover the startup warning, including the headless child

QRSPI: pi-qrspi-package
```

---

## T19. P5 gate: 46 checks and a four-hunk review

**Files**: `worktree.md` (tick T17 to T19, record the measured output)

**Blocked by**: T18

**Change**: none.

**Check**

```bash
npm test > /tmp/qrspi-p5-gate.log 2>&1; echo "exit=$?"
grep -c '^PASS' /tmp/qrspi-p5-gate.log
grep -c '^FAIL' /tmp/qrspi-p5-gate.log
diff -u ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts | grep -c '^@@'
```

**Expected**: `exit=0`; `46`; `0`; `4` hunks and nothing else: the `releaseAnswered` helper, the `session_start` body, the collapsed `tool_result` predicate, the block reason text.

**Commit**

```
chore(qrspi): verify the startup warning

QRSPI: pi-qrspi-package
```

---

## T20. Write `docs/AGENTS-snippet.md`

**Files**: `docs/AGENTS-snippet.md` (new)

**Blocked by**: T19

**Change**: an H1, one line of context, then exactly two `## ` sections, each labelled with the file it belongs in: the QRSPI block for `~/.pi/agent/AGENTS.md` (tier line, full-tier pipeline pointer, branch owner, commit trailer) and the question-tool block for `APPEND_SYSTEM.md`. Each section carries one line on why a package cannot install it. Two headings, not three; the count is a check.

**Check**

```bash
grep -c '^## ' docs/AGENTS-snippet.md
grep '^## ' docs/AGENTS-snippet.md
grep -c 'AGENTS.md' docs/AGENTS-snippet.md
grep -c 'APPEND_SYSTEM.md' docs/AGENTS-snippet.md
```

**Expected**: `2`; exactly `## QRSPI block for `~/.pi/agent/AGENTS.md`` and `## Question-tool block for `APPEND_SYSTEM.md``; at least `1` for each path mention.

**Commit**

```
Add the AGENTS and APPEND_SYSTEM snippets to paste

A package cannot install an instruction file, so the rules travel as two
labelled blocks and the README says where each one goes.

QRSPI: pi-qrspi-package
```

---

## T21. Write `README.md`

**Files**: `README.md` (new)

**Blocked by**: T20

**Change**: the eight sections in `plan.md` P6 order: title, `## What you get`, `## Prerequisites`, `## Install`, `## Paste the rules`, `## State in .scratch`, `## Known limits`, `## Development`. The prerequisite list is exactly the four items in the plan (a question tool; optional subagents; optional skills; node >= 22.19.0) with nothing bundled. The install line appears once, in `## Install`.

**Check**

```bash
grep -c '^## ' README.md
grep -c 'pi install git:github.com/maverock24/pi-qrspi' README.md
grep -c '\.scratch/ACTIVE' README.md
grep -c '^## What you get$\|^## Prerequisites$\|^## Install$\|^## Paste the rules$\|^## State in .scratch$\|^## Known limits$\|^## Development$' README.md
```

**Expected**: `7`; `1`; at least `1`; `7`.

**Commit**

```
Document install, prerequisites and the paste step

The gate needs a question tool to release an effort and the skill needs three
skills only if they are installed. Neither ships here.

QRSPI: pi-qrspi-package
```

---

## T22. P6 gate: docs counts, suite, file audit, live skill listing

**Files**: `worktree.md` (tick T20 to T22, record the measured output)

**Blocked by**: T19, T21

**Change**: none.

**Check**

```bash
grep -c '^## ' docs/AGENTS-snippet.md
grep -c 'pi install git:github.com/maverock24/pi-qrspi' README.md
grep -c '\.scratch/ACTIVE' README.md
npm test > /tmp/qrspi-p6.log 2>&1; echo "exit=$?"; grep -c '^PASS' /tmp/qrspi-p6.log
(git ls-files; git ls-files --others --exclude-standard) | grep -v '^\.scratch/' | sort -u | wc -l
(git ls-files; git ls-files --others --exclude-standard) | grep -v '^\.scratch/' | sort -u
```

**Expected**: `2`; `1`; at least `1`; `exit=0` and `46`; `7`; then exactly these seven paths, one per line: `.gitignore`, `README.md`, `docs/AGENTS-snippet.md`, `extensions/qrspi-gate.ts`, `package.json`, `skills/qrspi/SKILL.md`, `tests/qrspi-gate.test.ts`. The audit counts tracked plus untracked files, so it reads 7 before this commit as well as after.

**Manual check** (under a minute): `pi -e "$PWD"` lists `qrspi` under skills with a location under `/home/maverock24/github/pi-qrspi/skills/qrspi/SKILL.md`, not `~/.agents/skills/...`, and `/qrspi status` still answers. This is the one unobserved fact in `research.md` (Q6), so it is checked before any push. The push and the real `pi install` stay with the human.

**Commit**

```
chore(qrspi): verify the docs and the packaged layout

QRSPI: pi-qrspi-package
```

---

## T23. Final gate: clean tree, trailers, `ACTIVE` never committed

**Files**: `worktree.md` (mark the tree complete, record the final state)

**Blocked by**: T22

**Change**: none. This is the handoff to the PR stage.

**Check**

```bash
git status --porcelain | wc -l
git log --format=%B | grep -c '^QRSPI: pi-qrspi-package$'
git log --oneline -- .scratch/ACTIVE | wc -l
git ls-files --error-unmatch .scratch/ACTIVE >/dev/null 2>&1; echo "ACTIVE tracked=$?"
git check-ignore -q .scratch/ACTIVE && echo "ACTIVE ignored"
git log --oneline | wc -l
```

**Expected**: `0` (clean tree); `23` (one trailer per task, T1 to T23); `0` (no commit ever touched `ACTIVE`); `ACTIVE tracked=1`; `ACTIVE ignored`; `23` commits.

**Commit**

```
chore(qrspi): close the work tree

QRSPI: pi-qrspi-package
```

---

## Coverage of `plan.md`

| Plan step | Tasks |
|---|---|
| P1 files, automated check, manual check, commit | T2, T3, T4, T5 |
| P2 files, automated check, manual check, commit | T6, T7, T8 |
| P3 correction (1), (2), (3), automated check, manual check, commit | T9, T10, T11, T12 |
| P4 helper, handler, block message, suite, automated check, manual check, commit | T13, T14, T15, T16 |
| P5 gate warning, suite, automated check, manual check, commit | T17, T18, T19 |
| P6 snippet, README, automated check, manual check, commit | T20, T21, T22 |
| `.scratch/ACTIVE` never committed | T1, T3, T23 |
| Plan commit messages and trailer | every task block |

No plan step is left without a task.

---

## Records

### P1 gate (T5)

```
copy identical
manifest ok
gate loads, default is a function
ACTIVE ignored
artifacts committable
```

`git status --porcelain` printed one line, ` M .scratch/pi-qrspi-package/state.md`, the Work Tree -> Implement stage change written by the session that opened this stage; T5 does not touch it. `/qrspi status` answered `QRSPI gate: ON. Active: pi-qrspi-package at Implement, not critical (/home/maverock24/github/pi-qrspi)` through the registered handler, and `pi -e "$PWD" --no-tools --no-session -p ...` exited 0, so the package loads with no extension error.

### P2 gate (T8)

```
exit=0
PASS 39
FAIL 0
all checks passed 1
diff changed lines 4
```

The log is at `/tmp/qrspi-p2.log`; the source suite still differs from `tests/qrspi-gate.test.ts` by only the header and import lines.

### P3 gate (T12)

```
0
3
0
1
1
3
1
1
```

All eight values match the expected list. The two zero-count `grep -c` commands exit 1, which is grep's own semantics for no match, not a failed check; the six non-zero ones exit 0. `npm test` stays green (exit=0, 39 PASS, 0 FAIL, log at `/tmp/qrspi-p3.log`), and the only two lines naming an outside file are the Design line and the PR line, whose three pointers each say `if installed`.
