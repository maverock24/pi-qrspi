# Release path and rules delivery (Q17-Q23)

Child R3. Scope: clusters E and F. Every claim carries a `file:line`. Nothing here is a recommendation.

Paths abbreviated:

- `GATE` = `/home/maverock24/.pi/agent/extensions/qrspi-gate.ts`
- `QEXT` = `/home/maverock24/.pi/agent/extensions/question.ts`
- `QQEXT` = `/home/maverock24/.pi/agent/extensions/questionnaire.ts`
- `PI` = `/home/maverock24/.nvm/versions/node/v22.23.4/lib/node_modules/@earendil-works/pi-coding-agent`
- `SKILL` = `/home/maverock24/.agents/skills/qrspi/SKILL.md`

---

## Q17

**Which pi 1.4.0 tools produce a `details.answers[]` array carrying an `id`, and what is that shape?**

Only `questionnaire` (QQEXT) does. No builtin tool does, and `question` (QEXT) does not.

- Builtin tool names are exactly eight: `read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, `ls` – `PI/dist/core/tools/index.js:19-28`.
- `PI/dist/core/tools/` contains no `question.*` file; the directory holds bash, edit, edit-diff, file-mutation-queue, find, grep, index, ls, output-accumulator, path-utils, powershell, read, render-utils, renderers, tool-definition-wrapper, truncate, write.
- The `tool_result` event's `details` is typed per builtin: bash, powershell, read, edit, write (`details: undefined`), grep, find, ls – `PI/dist/core/extensions/types.d.ts:1002-1033`. None of those detail types has an `answers` field; the union at `types.d.ts:1039` adds only `CustomToolResultEvent` with `details: unknown` (`types.d.ts:1034-1036`).
- `questionnaire` answer shape: `Answer { id, value, label, wasCustom, index? }` – `QQEXT:38-44`; result shape `QuestionnaireResult { questions, answers, cancelled }` – `QQEXT:46-50`.
- `questionnaire` registers under the name `"questionnaire"` – `QQEXT:86-87`.
- Each answer is written as `answers.set(questionId, { id: questionId, value, label, wasCustom, index })` – `QQEXT:182`, so `id` is the caller-supplied question id.
- Answers reach the model as `details: result` (the whole `QuestionnaireResult`) – `QQEXT:472-476` (success) and `QQEXT:457-461` (user cancelled, `details: result` still present with its answers array).
- The error/cancel path fills `answers: []` – `QQEXT:78-83`, used for non-tui mode (`QQEXT:94-96`) and for a zero-question call (`QQEXT:97-99`).
- `question` result shape is `QuestionDetails { question, options, answer, wasCustom? }` – `QEXT:27-32`; there is no `answers` key on any of its returns: no-UI error `QEXT:54-62`, no-options error `QEXT:65-69`, cancelled `QEXT:266-270`, answered `QEXT:273-292`.
- `question` registers under the name `"question"` – `QEXT:46-47`.
- The gate reads exactly `(event.details as any)?.answers` – `GATE:221`, then matches `a?.id === "qrspi_release"` and a `value` that starts with `release` – `GATE:223-225`. So the shape that releases is `{ answers: [{ id: "qrspi_release", value: "Release to Implement", ... }] }`; `label` is not read.
- Both extension tools exist upstream as pi's own examples, not as builtins: `PI/examples/extensions/question.ts:46`, `PI/examples/extensions/questionnaire.ts:86` (also present under `~/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/examples/extensions/`).
- An extension may register a tool under any name, including a builtin name: `registerTool` validates only that `parameters` is a plain object and then stores it – `PI/dist/core/extensions/loader.js:234-244`. No reserved-name check exists.

## Q18

**With neither `question.ts` nor `questionnaire.ts` installed, can a critical effort ever leave alignment, and what is the only remaining path?**

Yes. Without either tool the release answer cannot be produced, but several other routes reach Implement or remove the gate. The `releasedSlug` route is the only one the release logic owns.

- `releasedSlug` is declared at `GATE:200`, reset to `undefined` on session start at `GATE:213`, assigned at exactly one place, `GATE:227`, and compared at `GATE:289`. No command, flag or file sets it.
- The assignment is reachable only after `GATE:220` (tool name must be `questionnaire` or `question`) and `GATE:221-222` (`details.answers` must be an array). With neither extension installed, no tool result carries either name with that field.
- The state.md block fires only on `critical && next === "Implement" && releasedSlug !== effort.slug` – `GATE:289`. Its reason text is `GATE:293-295`.
- `critical` is re-read from state.md on every tool call: `readCritical` → `parseCritical` – `GATE:169-171`, `GATE:113-117`, called at `GATE:265`. A state.md write that changes only `Critical:` is not blocked: the state.md branch computes `next` from a `Stage:` line only (`GATE:120-133`, `GATE:288`) and returns allow when `next` is not `Implement` (`GATE:298`). The header rule "writes into the repo are blocked" for a critical effort (`GATE:7-10`) is therefore conditional on the file it is reading, and the header's "`Critical: no` cannot downgrade it" (`GATE:11-13`) applies to the sensitive-path branch (`GATE:268-279`), not to the state.md field itself.
- Deleting or never creating `.scratch/ACTIVE` removes the gate: `findActiveEffort` returns `undefined` (`GATE:136-151`) and `tool_call` returns at `GATE:256` (and `GATE:238` for the ask warning).
- `/qrspi off` sets `enabled = false` (`GATE:364`), and `tool_call` returns at `GATE:232`.
- Writes resolving outside `effort.root` return at `GATE:260`.
- Only `edit` and `write` are gated: `const WRITE_TOOLS = new Set(["edit", "write"])` – `GATE:87`, used at `GATE:249`. A shell command that writes a file is not inspected.
- `GATE:301-302` return allow for anything under `.scratch/` and for any non-alignment stage, so a state.md already at `Implement`, `Work Tree` or `PR` is never re-checked for a release.
- The gate's own tests encode the intended shape: `answer("qrspi_release", "release")` is what flips the block – `~/.pi/agent/extensions/tests/qrspi-gate.test.ts:83-102`.
- `unresolved:` a fixture run of the `tool_call` handler with both extensions absent was not executed here; the reading above is from source. The existing test file already imports and drives the handler, so the run is cheap for a later stage.

## Q19

**Can the gate's `question` subscription ever fire, and is there a tool-independent signal that a human (not the agent) answered?**

The `question` half of the subscription can fire but can never release, because that tool's details carry no `answers`. A tool-independent human signal exists in pi (`input` with a `source` field) and the gate does not subscribe to it.

- Subscription filter: `if (event.toolName !== "questionnaire" && event.toolName !== "question") return` – `GATE:220`.
- Next line requires an array: `const answers = (event.details as any)?.answers; if (!Array.isArray(answers)) return;` – `GATE:221-222`. `QEXT` never sets `answers` (`QEXT:27-32`, `QEXT:266-292`), so the `question` branch always returns at `GATE:222`.
- `question` is otherwise used only as a warning trigger: `ASK_TOOLS = new Set(["question", "questionnaire"])` – `GATE:89`, consumed at `GATE:235-249` for the Research-stage warning.
- pi's `input` event carries `text`, `images`, `source: "interactive" | "rpc" | "extension"`, `streamingBehavior` – `PI/dist/core/extensions/types.d.ts:908-920`; documented as the event for raw user input, `PI/docs/extensions.md:151`.
- `source` is set by the caller: default `"interactive"` – `PI/dist/core/agent-session.js:1652`; `"rpc"` from RPC mode – `PI/dist/modes/rpc/rpc-mode.js:306`; `"extension"` for `pi.sendUserMessage` – `PI/dist/core/agent-session.js:1744-1753`; the emitter passes it through – `PI/dist/core/extensions/runner.js:1201-1213`.
- So `input.source` distinguishes human-typed/RPC input from extension-sent messages. The gate registers handlers for four events only: `session_start` `GATE:211`, `tool_result` `GATE:219`, `tool_call` `GATE:231`, `turn_end` `GATE:328`. No `input` handler exists in the file.
- The gate itself sends model-visible text with `pi.sendUserMessage` at `GATE:341-345`, which produces `source: "extension"` per the line above.
- Nested tool calls also pass through `tool_result` handlers ("Nested calls go through argument validation and the `tool_call` and `tool_result` handlers like model-issued calls") – `PI/docs/extensions.md:261` – and carry `parentToolCallId`, `PI/dist/core/extensions/types.d.ts:985-1001`. The gate does not inspect `parentToolCallId` (`GATE:219-228`), so a nested `questionnaire` call, if the tool exists, would set `releasedSlug`. In a non-tui context `questionnaire` returns `answers: []` instead: `QQEXT:94-96`, `QQEXT:78-83`.
- A human answer can also arrive from the phone: `createRemoteChannel("questionnaire")` `QQEXT:122`, `channel.start({ onAnswer, onCancel })` `QQEXT:205-231`; that path still ends in the same `details.answers` shape.

## Q20

**Is `.scratch` a pi convention or only a QRSPI skill convention, and where is it documented outside this machine?**

Only a QRSPI skill convention. Nothing in pi's docs or core code mentions it.

- `grep -rn "\.scratch" PI/docs/` → no matches across all 42 doc files.
- `grep -rl "\.scratch" PI/dist/core/` → no matches.
- The definition lives in the skill: `SKILL:3` (description naming `.scratch/<slug>/`), `SKILL:30` (write state.md), `SKILL:48` (write `.scratch/ACTIVE` with the slug), `SKILL:83` (the artifact list: `ticket.md`, `state.md`, `ACTIVE`, `tree.md`, `questions.md`, `research.md`, `outline.md`, `plan.md`, `worktree.md`, `review.md`, `research/<n>.md`).
- Both consumers are outside pi core: the gate reads `.scratch/ACTIVE` at `GATE:140` (walking up 24 hops, `GATE:136-151`) and `.scratch/<slug>/state.md` via `stagePath` `GATE:153-155` and `readStateFile` `GATE:157-163`.
- The `state.md` field names the gate parses are likewise undocumented elsewhere: `Stage:` regex `GATE:107`, `Critical:` regex `GATE:114`.
- `unresolved:` no other machine's docs were reachable; the claim is limited to the pi 1.4.0 install above and this machine's `~/.pi/agent`.

## Q21

**Which `.scratch` paths do repos ignore, and does anything enforce "commit artifacts, never `ACTIVE`"?**

No repo on this machine ignores any `.scratch` path, and nothing enforces the commit rule. The only place the rule is stated is the skill prose.

- `/home/maverock24/github/pi-qrspi/.gitignore` does not exist (`ls -a` shows `.git` and `.scratch` only).
- `/home/maverock24/gitrepos/Quizzy/.gitignore` has no `scratch` line (`grep -n scratch` exit status 1, no output).
- `git -C /home/maverock24/github/pi-qrspi check-ignore -v .scratch/ACTIVE` → no output; same command in Quizzy → no output. Neither repo has a matching ignore rule.
- `git -C /home/maverock24/github/pi-qrspi status --short` → `?? .scratch/`; `git log` → `fatal: your current branch 'master' does not have any commits yet`; `git ls-files` → empty. The artifacts are currently untracked, not committed.
- `git -C /home/maverock24/gitrepos/Quizzy ls-files | grep -c scratch` → `0`.
- The rule itself: "Commit the artifacts with the work. Never commit `ACTIVE`." – `SKILL:120`. `SKILL:144` says PR ends with `delete .scratch/ACTIVE`.
- Nothing enforces it: `GATE` contains no git invocation and no `gitignore` reference; its only `git`-matching string is the sensitive-path entry `".github/workflows"` at `GATE:84`.
- The gate does not require `ACTIVE` to be clean or untracked; it reads whatever first token the file holds, `GATE:141`.

## Q22

**Can a package deliver rules to the model at all, or is an AGENTS.md snippet the only mechanism?**

An AGENTS.md snippet is not the only mechanism, but a package cannot ship a context file that pi loads by convention. Package delivery has two real channels: pi's own system-level files, and code in a package extension that injects prompt text at run time.

Context files (AGENTS.md family), what pi actually reads:

- Context files load from `<agent-dir>` plus the working directory and each ancestor – `PI/docs/configuration.md:18`, `PI/docs/configuration.md:43-45`.
- Implementation: `loadProjectContextFiles` reads `loadContextFileFromDir(resolvedAgentDir)` first (`PI/dist/core/resource-loader.js:170`), then walks `resolvedCwd` upward to `/`, one file per directory (`resource-loader.js:176-195`); the candidate list is `AGENTS.override.md`, `AGENTS.md`, `AGENTS.MD`, `CLAUDE.md`, `CLAUDE.MD` (`resource-loader.js:116`).
- No package or `node_modules` path appears in that walk (`resource-loader.js:166-195`).
- Package checkouts are not on that path: `/home/maverock24/.pi/agent/git/github.com/maverock24/prompt-manager/` is the layout (`ls` shows `README.md`, `extensions/`, `package-lock.json`, `package.json`, `prompts/`), and `loadContextFileFromDir` is called on the agent dir itself, non-recursively – so an `AGENTS.md` inside a package checkout is never read.
- The package manifest has no instructions/context key: the documented `pi` keys are `extensions`, `skills`, `prompts`, `themes` (`PI/docs/packages.md:63-69`), plus optional `pi.image` / `pi.video` (`packages.md:74`). `grep AGENTS.md PI/docs/packages.md` → no matches.

`APPEND_SYSTEM.md` is a real mechanism, with three documented locations:

- `<agent-dir>/APPEND_SYSTEM.md` "Adds instructions to Pi's system prompt" – `PI/docs/configuration.md:20`.
- `.pi/APPEND_SYSTEM.md` "Adds project-specific instructions to the system prompt" – `PI/docs/configuration.md:33`; the trusted project file takes precedence, and same-name files are not combined – `configuration.md:39`.
- Read by `discoverAppendSystemPromptFile()`: project path gated on `isProjectTrusted()`, else `<agentDir>/APPEND_SYSTEM.md` – `PI/dist/core/resource-loader.js:955-967`. It is also listed among trust-sensitive project resources – `PI/dist/core/trust-manager.js:16`.
- This machine uses it: `/home/maverock24/.pi/agent/APPEND_SYSTEM.md` exists (1086 bytes) and line 3 names `question` / `questionnaire`.

Extension-side delivery, independent of any file on disk:

- `before_agent_start` can return `systemPrompt`, which "Replace[s] the complete system prompt for this turn" – `PI/dist/core/extensions/types.d.ts:1125-1129`, documented at `PI/docs/extensions.md:216`.
- Mutable `systemPromptOptions` lets a handler edit prompt sections in place – `types.d.ts:720-726`, `PI/docs/extensions.md:208`, `PI/docs/extensions.md:216`.
- `context_with_system` can transform the complete transcript including system messages – `PI/docs/extensions.md:156`, `PI/docs/extensions.md:228`.
- Both are code, so the text can live inside the package.

The gate itself injects no prompt text: it only calls `ctx.ui.notify` (`GATE:206-207`) and `pi.sendUserMessage` (`GATE:341-345`). The QRSPI rules on this machine are carried by `/home/maverock24/.pi/agent/AGENTS.md:9-14` (the `## QRSPI (every coding task)` section), `AGENTS.md:41` (extension tests) and `AGENTS.md:43` (`/qrspi` toggle), plus `APPEND_SYSTEM.md:3`.

## Q23

**Does the gate depend on the subagents package at runtime, or only the skill's orchestration prose?**

Only the prose. The gate has no import of any subagents package and loads under plain node.

- Imports are three: `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"` (type-only), `import * as fs from "node:fs"`, `import * as path from "node:path"` – `GATE:29-31`.
- No other import statement exists in the file; the `pi` object is a function parameter, `GATE:196`.
- `node --experimental-strip-types -e "import('./qrspi-gate.ts')"` from `~/.pi/agent/extensions` prints `loaded, default is function` – the module resolves with only node builtins, no `@tintinweb/pi-subagents` present in the resolution path.
- The skill requires subagents without naming a package: "one fresh window each, which you get by running each stage in a subagent" `SKILL:8`; "You hold the plan; the subagents do the work" `SKILL:25`; "One stage per subagent" `SKILL:27`; "## One window per stage" `SKILL:77-79`.
- The installed subagents package is declared in settings, not imported by the gate: `"npm:@tintinweb/pi-subagents"` in the `packages` array – `/home/maverock24/.pi/agent/settings.json:5`.
- `unresolved:` a live session with `@tintinweb/pi-subagents` disabled was not run (no interactive session available); the module-load check above is the substitute evidence.
