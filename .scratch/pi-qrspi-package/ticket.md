# PI-QRSPI package

- **Slug**: pi-qrspi-package
- **Ticket date**: 2026-10-05
- **Request**: someone who installs the QRSPI gate should get the same experience this machine has, not a silent no-op. Ship the setup as an installable pi package.

## Human decisions

Answered in the startup questionnaire, this session:

| Question | Decision |
|---|---|
| Repo | new `~/github/pi-qrspi`, installed with `pi install git:github.com/maverock24/pi-qrspi` |
| Scope | gate + qrspi skill + README prerequisites. The `question`/`questionnaire` extensions and the subagents package stay prerequisites, documented, not bundled. |
| Rules delivery | `docs/AGENTS-snippet.md` plus README instructions on where to paste it. No bundled AGENTS.md to overwrite. |
| Critical | `no`: new files in a new repo, no auth, payments, migrations or CI. |

## Findings that scope the work (from this session, verified)

1. `~/.pi/agent/extensions/qrspi-gate.ts` (373 lines) imports only `node:fs`, `node:path` and type-only pi types. It is self-contained and its suite is green on pi 1.4.0: `bin/pi-ext-tests qrspi` -> 1 run, 0 failed, 44 checks.
2. The gate is inert without `.scratch/ACTIVE`: `findActiveEffort` walks up from cwd and every handler returns early when it is absent (`qrspi-gate.ts:135-152`, `:262-265`).
3. The release path needs `details.answers[].id === "qrspi_release"` (`:223-227`). pi 1.4.0 ships no question tool (builtin tools under `dist/core/tools/`: bash, edit, find, grep, ls, powershell, read, write). `question.ts` returns `{question, options, answer}` with no `answers` array (`question.ts:286-287`), so only `questionnaire.ts` can release. The gate also subscribes to `question`, a branch that can never fire.
4. The eight-stage workflow lives in `~/.agents/skills/qrspi/SKILL.md`, which points at `~/.agents/skills/grilling/SKILL.md`, `codebase-design/SKILL.md` and `code-review/SKILL.md` by absolute path.
5. "One stage per subagent" needs the `Agent` tool from `@tintinweb/pi-subagents` (`~/.pi/agent/settings.json` `packages`, installed under `~/.pi/agent/npm`) plus custom types in `~/.pi/agent/agents/*.md`.
6. Rules live in `~/.pi/agent/AGENTS.md:9-14` (tier, QRSPI, branch owner, trailer) and `APPEND_SYSTEM.md` (question-tool rule).
7. Gate API surface is current on pi 1.4.0: `getContextUsage` (`core/extensions/types.d.ts:248`), `hasUI` (`:219`), `isIdle` (`:236`), `sendUserMessage` (`:334`), `registerCommand` (`:1231`).
8. Portability defects found: `extensions/tests/load.ts:16-17` hardcodes `/home/maverock24/.nvm/.../v22.19.0/...`; sensitive-path matching is a broad substring test (`session`, `auth`, `crypto`) exempting only `.md`, `.txt`, `docs/` (`qrspi-gate.ts:186-192`); there is no package manifest anywhere in `~/.pi/agent/extensions` and that directory is not a git repo.
9. `~/github/prompt-manager` is the local template for a pi package: `package.json` with a `pi` manifest, `extensions/index.ts`, README, `.gitignore` (`node_modules/`, `*.log`).

## Out of scope unless the design round says otherwise

- Bundling `question.ts` / `questionnaire.ts`.
- Bundling `@tintinweb/pi-subagents` or the custom agent definitions.
- Pushing to GitHub (the remote is the human's call).
