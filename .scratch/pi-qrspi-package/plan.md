# Plan

- **Slug**: pi-qrspi-package
- **Stage**: Plan
- **Branch**: `master` (the repo has no commits yet)
- **Package root**: `/home/maverock24/github/pi-qrspi`, every path below is relative to it
- **Measured on**: node v22.23.4, pi 1.4.0, `@earendil-works/pi-coding-agent` 1.4.0

Six phases, one per outline slice. Each phase ends green on its own check before the next one starts, and each carries its own commit. The `.scratch/pi-qrspi-package/` artifacts ride along in the same commits and are excluded from the file audit in P6.

Every expected value below was measured, not copied from `outline.md`, on working copies under `/tmp` with node v22.23.4 running the real suite. Three numbers in the outline were wrong, and this plan carries the measured ones:

| Outline claim | Measured |
|---|---|
| source suite prints 44 checks (slice 2) | 39 `PASS` lines |
| `grep -c '\.scratch/ACTIVE'` = 2 and `grep -c 'ACTIVE'` = 2 after slice 3 | 3 and 5 (the corrections add one line, they do not remove three) |
| the test import sits on line 5 (slice 2) | line 10 |

---

## P1. Skeleton that pi can load

**Files**

- `package.json` (new)
- `.gitignore` (new)
- `extensions/qrspi-gate.ts` (new, byte copy of `/home/maverock24/.pi/agent/extensions/qrspi-gate.ts`, no edit)

**Change**

`package.json`, exactly these keys and no others:

```json
{
  "name": "pi-qrspi",
  "version": "0.1.0",
  "description": "QRSPI gate and skill as an installable pi package",
  "keywords": ["pi-package", "qrspi"],
  "author": "maverock24",
  "license": "MIT",
  "type": "module",
  "engines": { "node": ">=22.19.0" },
  "pi": { "extensions": ["./extensions"], "skills": ["./skills"] }
}
```

`pi.extensions` and `pi.skills` are both listed even though the directory names are conventional: a truthy `pi` object becomes the sole source for all four resource types, so an omitted key drops that resource silently (`DIST/core/pi-manifest.js:7-20`). No `dependencies`, no `devDependencies`, no build output. `"type": "module"` so bare `node` reads both `.ts` files as ESM. `scripts.test` waits for P2.

`.gitignore` holds one line, `.scratch/ACTIVE`, so artifacts stay committable and the pointer never is.

The gate is copied with `cp` and is not touched until P4.

**Automated check** (from the package root; valid until P4 patches the gate)

```bash
diff ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts && echo "copy identical"
node -e 'const p=require("./package.json"),j=JSON.stringify;const ok=p.name==="pi-qrspi"&&p.version==="0.1.0"&&p.keywords?.includes("pi-package")&&p.engines?.node&&j(p.pi?.extensions)==="[\"./extensions\"]"&&j(p.pi?.skills)==="[\"./skills\"]"&&!p.dependencies&&!p.devDependencies;console.log(ok?"manifest ok":"manifest BAD");process.exit(ok?0:1)'
node --input-type=module -e 'const m=await import("./extensions/qrspi-gate.ts");console.log(typeof m.default==="function"?"gate loads, default is a function":"gate BAD")'
git check-ignore -q .scratch/ACTIVE && echo "ACTIVE ignored"
git check-ignore -q .scratch/pi-qrspi-package/tree.md || echo "artifacts committable"
```

Expected, in order: no diff output then `copy identical`; `manifest ok`; `gate loads, default is a function`; `ACTIVE ignored`; `artifacts committable`. All five commands were run against these files in `/tmp/piq` and print exactly those lines.

**Manual check** (under a minute)

`pi -e "$PWD"` in the package root starts with no extension load error, and `/qrspi status` answers `QRSPI gate: ON. Active: pi-qrspi-package at <stage>, not critical (/home/maverock24/github/pi-qrspi)`. This repo's own `.scratch/ACTIVE` exists, so the answer names the live effort, not `no active effort`. The point is that the gate loaded and resolved `ctx.cwd`.

**Commit**

```
Add the package skeleton pi can load

The manifest lists pi.extensions and pi.skills explicitly, since a pi object
replaces conventional discovery. The gate is a byte copy of the installed one.

QRSPI: pi-qrspi-package
```

---

## P2. The suite runs from its new home

**Files**

- `tests/qrspi-gate.test.ts` (new, copy of `/home/maverock24/.pi/agent/extensions/tests/qrspi-gate.test.ts`)
- `package.json` (touch: add `"scripts": { "test": "node tests/qrspi-gate.test.ts" }`)

**Change**

Two edits to the copy, nothing else:

1. Line 10, the gate import, moves one hop:

```ts
const mod: any = await import(new URL("../qrspi-gate.ts", import.meta.url).href);
```

becomes

```ts
const mod: any = await import(new URL("../extensions/qrspi-gate.ts", import.meta.url).href);
```

2. Line 3, the header comment, names the package command:

```ts
 *   node --experimental-strip-types /tmp/qrspi-gate.test.ts
```

becomes

```ts
 *   npm test
```

No flag, no loader. Node 22.19+ strips types by default, and the gate's only pi import is `import type` (`extensions/qrspi-gate.ts:29-31`), so nothing resolves a host specifier at runtime.

`tests/` sits outside both declared resource roots, so pi never loads the suite as a resource.

**Automated check**

```bash
npm test
echo "exit=$?"
```

Expected: 39 lines starting `PASS`, zero `FAIL`, a blank line, `all checks passed`, then `exit=0`. The 39 is the count of `^PASS` lines from the source suite on this machine; `~/.pi/agent/bin/pi-ext-tests qrspi` reports the same run as `== 1 run, 0 failed`.

**Manual check** (under a minute)

```bash
diff ~/.pi/agent/extensions/tests/qrspi-gate.test.ts tests/qrspi-gate.test.ts
```

shows only the header comment line and the import line.

**Commit**

```
Run the gate suite from the package with npm test

No loader and no flag: node 22.19 strips types and the gate's pi import is
type-only.

QRSPI: pi-qrspi-package
```

---

## P3. The skill, corrected in three places

**Files**

- `skills/qrspi/SKILL.md` (new, copy of `/home/maverock24/.agents/skills/qrspi/SKILL.md`)

**Change**

Three corrections (D3, D7). The frontmatter, the stage table, the schema samples and the stage wording stay byte-identical.

**(1) The `ACTIVE` contradiction.** Current line 83:

```
`.scratch/<slug>/` holds `ticket.md`, `state.md`, `ACTIVE`, `tree.md`, `questions.md`, `research.md`, `outline.md`, `plan.md`, `worktree.md`, `review.md`. R's children write `research/<n>.md`, then one child merges them into `research.md`.
```

`ACTIVE` comes out of the list, and a new paragraph follows it:

```
`ACTIVE` is not one of them: it sits one level up, at `.scratch/ACTIVE`, because that is where every session looks for it.
```

That matches line 48 (the slug is written there), line 120 (never commit it) and the gate's single read of `.scratch/ACTIVE` (`extensions/qrspi-gate.ts:140`).

Verified by: the slug-directory list no longer holds it, so the pattern `` `ACTIVE`, `` (backticked, followed by a comma) drops from 1 to 0, while `.scratch/ACTIVE` grows from 2 to 3 lines because the new paragraph names the real path.

**(2) The bare skill token.** Line 134 currently reads:

```
D ... (read `~/.agents/skills/grilling/SKILL.md`, and `codebase-design/SKILL.md` when a module's shape is at stake)
```

The second token becomes `` `~/.agents/skills/codebase-design/SKILL.md` ``.

Verified by: `` grep -c '`codebase-design/SKILL.md`' `` drops to 0, while the total occurrences of `codebase-design/SKILL.md` (1) equal the occurrences of `~/.agents/skills/codebase-design/SKILL.md` (1). Equality is the proof: every occurrence carries the full path.

**(3) Three pointers, each "if installed", plus one fallback.** The same line 134 gains `if installed` after the grilling path and after the codebase-design path; line 144 (which becomes 146 after correction 1 adds two lines) gains `if installed` after the code-review path. Then the Design paragraph's last sentence, `Done when the frontier is empty.`, gains a second sentence:

```
None of those three skills ship with this package: if they are not installed, do the same steps inline.
```

Verified by: `grep -o 'if installed' | wc -l` is 3 (two on the Design line, one on the PR line, which a line count would miss), and the fallback sentence appears once.

**Automated check**

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

Expected, in order: `0`, `3`, `0`, `1`, `1`, `3`, `1`, `1`, every command exit 0. The last line proves the frontmatter name survived and pi will advertise the skill as `qrspi`. All eight values were measured on the corrected copy.

**Manual check** (under a minute)

Read `## Files` and `## Stages` once: no sentence names a path the package does not ship without saying "if installed".

**Commit**

```
Correct the skill's ACTIVE placement and external pointers

ACTIVE lives at .scratch/ACTIVE, not inside the slug directory. The three
referenced skills are the installer's own, so each says "if installed" and
Design and PR fall back to doing the same steps inline.

QRSPI: pi-qrspi-package
```

---

## P4. Release recognises both question tools

**Files**

- `extensions/qrspi-gate.ts` (touch)
- `tests/qrspi-gate.test.ts` (touch)

**Change: one module-level helper.** Inserted between `stageFromInput` (ends at line 133) and the `/** Walk up from cwd ... */` comment at line 135, so it sits beside the other pure parser:

```ts
/** Did this tool result carry the human's release answer? */
function releaseAnswered(toolName: string, details: any): boolean {
	const answers = details?.answers;
	if (Array.isArray(answers)) {
		return answers.some(
			(a: any) => a?.id === "qrspi_release" && /^release/i.test(String(a?.value ?? "")),
		);
	}
	if (toolName !== "question") return false;
	const answer = String(details?.answer ?? "").trim();
	return /^release/i.test(answer) && /release/i.test(String(details?.question ?? ""));
}
```

The two release conditions, in order:

1. `details.answers` is an array: any entry with `id === "qrspi_release"` whose `value` starts with `release` (case-insensitive). This is the unchanged `questionnaire` route.
2. Otherwise, and only for `toolName === "question"`: the trimmed `details.answer` starts with `release` **and** `details.question` mentions `release` case-insensitively. The second half is the guard: an unrelated free-text answer such as "Release the hounds" to "Which colour?" cannot release an effort.

**Change: the handler.** Current lines 219-229:

```
219	pi.on("tool_result", async (event, ctx) => {
220		if (event.toolName !== "questionnaire" && event.toolName !== "question") return;
221		const answers = (event.details as any)?.answers;
222		if (!Array.isArray(answers)) return;
223		const released = answers.some(
224			(a: any) => a?.id === "qrspi_release" && /^release/i.test(String(a?.value ?? "")),
225		);
226		if (!released) return;
227		releasedSlug = findActiveEffort(ctx.cwd)?.slug;
228		say(ctx, `QRSPI: "${releasedSlug}" released to Implement by the human.`, "info");
229	});
```

Lines 221-226 collapse to one call; 220 stays as written:

```ts
	if (!releaseAnswered(event.toolName, event.details)) return;
```

**Change: the block message.** Current lines 293-295:

```
293						`Blocked: "${effort.slug}" is not released, so alignment cannot end from here. ` +
294						`Ask the human: questionnaire, question id qrspi_release, options "Release to Implement" ` +
295						`and "Keep aligning". Then write Stage: Implement.`,
```

become

```ts
						`Blocked: "${effort.slug}" is not released, so alignment cannot end from here. ` +
						`Ask the human: questionnaire with question id qrspi_release and options ` +
						`"Release to Implement" / "Keep aligning", or a question whose answer starts with ` +
						`Release. Then write Stage: Implement.`,
```

Nothing else in the gate changes (D6): the toolName guard, `releasedSlug`, the reset on `session_start` and the toggle stay as they are.

**Change: the suite.** The `answer()` helper at lines 84-87 currently hard-codes the toolName:

```
84	const answer = async (id: string, value: string) => {
85		for (const h of handlers["tool_result"] ?? [])
86			await h({ toolName: "questionnaire", details: { answers: [{ id, value, label: value }] } }, ctx);
87	};
```

It becomes `answer(toolName, details)` plus a one-line builder, and the two existing call sites at lines 93 and 95 change shape with it:

```ts
const answer = async (toolName: string, details: any) => {
	for (const h of handlers["tool_result"] ?? []) await h({ toolName, details }, ctx);
};
const questionnaire = (value: string) => ({ answers: [{ id: "qrspi_release", value, label: value }] });
```

Four assertions in the release section, the fourth already present:

1. `answer("question", { question: "Release demo to Implement?", options: [...], answer: "Release to Implement" })` then the `Stage: Implement` write is allowed. Label: `a question answer releases`.
2. `answer("question", { question: "Which colour for the button?", options: [...], answer: "Release the hounds" })` then the write is still blocked. Label: `a question that never said release does not`.
3. `answer("question", { question: "Release demo to Implement?", options: [...], answer: "keep aligning" })` then the write is still blocked. Label: `a question answered keep aligning does not`.
4. The existing `a decline does not release` (questionnaire, `keep-aligning`) still blocks, untouched.

Each of 1 to 3 opens with `await freshSession()` and `writeState("Plan", "yes")`, because `releasedSlug` resets per session.

**Automated check**

```bash
npm test
```

Expected: 42 `PASS` lines (39 from P2 plus 3), zero `FAIL`, `all checks passed`, exit 0. Measured on a P4-only copy at `/tmp/piq4`.

**Manual check** (under a minute)

On a critical effort at an alignment stage, put the release with the `question` tool instead of `questionnaire`, pick `Release to Implement`, and watch the `released to Implement` notice, then a `Stage: Implement` write that goes through instead of blocking.

**Commit**

```
Accept a question result as the release answer

A question releases only when its answer starts with Release and its own
question mentioned release, so an unrelated free-text answer cannot open an
effort. The block message now names both routes.

QRSPI: pi-qrspi-package
```

---

## P5. One warning when no question tool is installed

**Files**

- `extensions/qrspi-gate.ts` (touch)
- `tests/qrspi-gate.test.ts` (touch)

**Change.** The event is `session_start`. The API call is `pi.getAllTools()` (`DIST/core/extensions/types.d.ts:1284`), which returns `ToolInfo[]` where `ToolInfo` is `Pick<ToolDefinition, "name" | "description" | "parameters" | "promptGuidelines" | "reachesTools">` (`:1577`), so the check maps to `t.name`.

Current lines 210-216:

```
210	// Fresh window, fresh budget: the whole point of the stage boundary.
211	pi.on("session_start", async () => {
212		warnedAboutContext = false;
213		releasedSlug = undefined;
214		warnedStages.clear();
215		warnedResearchAsk = false;
216	});
```

The handler takes `(_event, ctx)` and, after the four resets, adds:

```ts
		// The release path needs a question tool. Say so once, and only to a human.
		const names = pi.getAllTools().map((t) => t.name);
		if (!names.includes("question") && !names.includes("questionnaire")) {
			say(
				ctx,
				`QRSPI: neither "question" nor "questionnaire" is installed, so a critical effort cannot be released. ` +
					`Install one, or close the effort before alignment would block.`,
				"warning",
			);
		}
```

No ACTIVE precondition, no other new state, the reset and toggle logic untouched.

**How a headless child stays silent.** The notice goes through the existing `say()` helper, lines 206-208:

```
206	const say = (c: any, msg: string, level: "info" | "warning" = "info") => {
207		if (c?.hasUI) c.ui.notify(msg, level);
208	};
```

`hasUI` is false in a child session, so the string is built and dropped. The `pi.getAllTools()` call is the only work a child does, and it mutates nothing. This is the same gate every other warning uses, so there is no second rule to keep in sync.

**Change: the suite.** The fake pi at lines 13-17 gains a mutable tool list:

```
13	const pi: any = {
14		on: (evt: string, fn: Function) => (handlers[evt] ??= []).push(fn),
15		registerCommand: (name: string, def: any) => (commands[name] = def),
16		sendUserMessage: () => {},
17	};
```

becomes a `let toolNames = ["question", "questionnaire"]` one line above, plus `getAllTools: () => toolNames.map((name) => ({ name })),` inside the object. The default keeps both tools present, so every existing notice-count assertion in the suite stays valid. `freshSession` at lines 32-34 already passes `ctx`, so it needs no change.

Four assertions in a new `--- no question tool installed ---` section, placed after P4's release block and before `--- legacy letters and no ACTIVE ---`:

1. `toolNames = []`, `freshSession()`, exactly one notice whose text mentions `question` or `questionnaire`. Label: `warns once when neither question tool is installed`.
2. `toolNames = ["questionnaire"]`, fresh session, zero notices. Label: `silent when questionnaire is present`.
3. `toolNames = ["question"]`, fresh session, zero notices. Label: `silent when question is present`.
4. `toolNames = []` and a `{ ...ctx, hasUI: false }` child, fresh session, zero notices. Label: `silent in a headless child with no question tool`. This is the fourth the outline did not name, and it is what actually proves the headless path; the existing `and it stays silent` check runs with both tools installed and cannot.

`toolNames` is restored to both tools at the end of the section.

**Automated check**

```bash
npm test
```

Expected: 46 `PASS` lines (42 plus 4), zero `FAIL`, `all checks passed`, exit 0. Measured on `/tmp/piq`.

**Manual check** (under a minute)

```bash
diff -u ~/.pi/agent/extensions/qrspi-gate.ts extensions/qrspi-gate.ts
```

shows exactly four hunks and nothing else: the `releaseAnswered` helper, the `session_start` body, the collapsed `tool_result` predicate, and the block reason text.

**Commit**

```
Warn once when no question tool is installed

session_start asks pi.getAllTools() for question and questionnaire. Without
either, the release path is unreachable, so the human gets one warning. It
goes through say(), which is silent in a headless child.

QRSPI: pi-qrspi-package
```

---

## P6. README, the snippet file, and the dry run

**Files**

- `docs/AGENTS-snippet.md` (new)
- `README.md` (new)

**`docs/AGENTS-snippet.md`.** An H1, one line of context, then exactly two `## ` sections, each labelled with the file it belongs in and one line on why a package cannot install it (instruction files load from the agent dir and cwd ancestors only, and the manifest has no instructions key, `research.md` Q22):

1. A `## QRSPI block for ~/.pi/agent/AGENTS.md` heading (backticked path inside the heading): the tier line, the full-tier pipeline pointer, the branch owner line, the commit trailer rule.
2. A `## Question-tool block for APPEND_SYSTEM.md` heading: ask only through a question tool, concrete options, no prose questions.

Two `## ` headings, not three: the count is a check.

**`README.md`, sections in this order.**

1. `# pi-qrspi`, one line on what it is and one on what ships (gate extension, `qrspi` skill, the snippet file).
2. `## What you get`: the four gate rules in a short list, the eight stages in one line, the toggle `/qrspi on|off|status`.
3. `## Prerequisites`.
4. `## Install`: `pi install git:github.com/maverock24/pi-qrspi`, plus `pi update --extensions` and the note that an unpinned `git:` source tracks the remote default branch.
5. `## Paste the rules`: which block of `docs/AGENTS-snippet.md` goes into `~/.pi/agent/AGENTS.md` and which into `~/.pi/agent/APPEND_SYSTEM.md`, and why the package cannot paste them itself.
6. `## State in .scratch`: the `ACTIVE` file holds one slug, `state.md` holds `Slug`, `Stage`, `Critical`, `Done`, the artifacts are committed with the work, `.scratch/ACTIVE` is in `.gitignore` and never committed.
7. `## Known limits`: the three D6 items (rewriting `state.md` to `Critical: no` ends a block without a human answer; the sensitive-path list is a substring match, so `session`, `auth` and `crypto` can over-block, softened per repo with `.qrspi-sensitive-paths`; a `bash` write is not gated).
8. `## Development`: `npm test` and what the suite covers.

**Prerequisite list, exactly these, no bundled tools.** Under `## Prerequisites`:

- A question tool: the `question` extension **or** the `questionnaire` extension in `~/.pi/agent/extensions/`. Either one can release an effort; with neither, the gate warns at session start because a critical effort cannot leave alignment.
- Optional: `@tintinweb/pi-subagents` plus your own agent definitions in `~/.pi/agent/agents/`, for one subagent per stage. Without it, run the stages inline in one session.
- Optional: the `grilling`, `codebase-design` and `code-review` skills under `~/.agents/skills/`. The skill says "if installed" and falls back to doing those steps inline.
- node `>= 22.19.0`, which `engines.node` declares and only `npm test` needs; the extension itself loads through pi.

**Automated check**

```bash
grep -c '^## ' docs/AGENTS-snippet.md
grep -c 'pi install git:github.com/maverock24/pi-qrspi' README.md
grep -c '\.scratch/ACTIVE' README.md
npm test
(git ls-files; git ls-files --others --exclude-standard) | grep -v '^\.scratch/' | sort -u | wc -l
```

Expected, in order: `2`; `1` (the install line appears exactly once, in `## Install`); a count of at least `1` for `.scratch/ACTIVE`; `all checks passed` with exit 0, 46 `PASS`; `7` from the file audit, one line each for `.gitignore`, `README.md`, `docs/AGENTS-snippet.md`, `extensions/qrspi-gate.ts`, `package.json`, `skills/qrspi/SKILL.md`, `tests/qrspi-gate.test.ts`. The audit counts tracked plus untracked files so it reads 7 before the commit as well as after; measured on a mirror of the layout.

**Manual check** (under a minute)

`pi -e "$PWD"` in the package root: the skills block names `qrspi` and its location is under `/home/maverock24/github/pi-qrspi/skills/qrspi/SKILL.md`, not `~/.agents/skills/...`, and `/qrspi status` still answers. That is the one unobserved fact in `research.md` (Q6) and the reason the check is in P6, before any push. The `git push` and the real `pi install git:...` stay with the human.

**Commit**

```
Document install, prerequisites and the AGENTS snippets

The gate needs a question tool to release an effort, and the skill needs the
optional skills only if they are installed. Neither ships here.

QRSPI: pi-qrspi-package
```

---

## Risks

- **P4 loosens the gate's only human door.** A free-text answer could release an effort if the match were too broad. Mitigated in the phase itself: the `question` route needs the answer to start with `release` **and** the question text to mention release, and three negative assertions cover the unrelated-answer, keep-aligning and questionnaire-decline paths.
- **The outline's expected numbers were wrong in three places** (44 vs 39 checks, the skill grep counts, the test import line), so a copied check would fail on a correct change. Mitigated: every expected value here was measured on `/tmp` copies with node v22.23.4, and P3 uses occurrence counts (`grep -o | wc -l`) instead of line counts, because two of the three "if installed" markers sit on one line.
- **P1's `diff` check expires.** It compares against the installed gate and only holds until P4 edits the copy. Mitigated: it is P1's check alone, and P4 and P5 each end on a `diff -u` review of exactly four hunks.
- **A package skill has never been observed loading live** (`research.md` Q6 unresolved). Mitigated: the manifest lists `pi.skills` explicitly rather than relying on convention, the file sits at `skills/qrspi/SKILL.md`, and P6's manual check reads the advertised location before anything is pushed.
- **P5 runs one extra API call in every session, children included.** Mitigated: the notice goes through `say()`, so a `hasUI: false` child builds a string and drops it, and P5's fourth assertion covers that path specifically rather than inferring it from a check that runs with both tools present.
