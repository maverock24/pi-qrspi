# pi-qrspi

A pi package that enforces QRSPI: eight stages of alignment before code, for work that earns the ceremony. It ships the gate extension, the `qrspi` skill, and the two instruction blocks a package cannot install itself.

## What you get

The gate acts only when a `.scratch/ACTIVE` file marks a live effort:

- No code writes during alignment while the effort is `Critical: yes`; `.scratch/` stays writable.
- Sensitive paths are critical whatever `state.md` says.
- A critical effort leaves alignment only on the human's answer: a questionnaire answer with id `qrspi_release`, or a question whose answer starts with Release and whose question text mentions release.
- During Research the gate warns if a question tool fires: research asks the code, not the human.

Eight stages: Questions, Research, Design, Structure, Plan, Work Tree, Implement, PR.
Toggle: `/qrspi on|off|status`, default ON.

## Prerequisites

- A question tool: the `question` extension **or** the `questionnaire` extension in `~/.pi/agent/extensions/`. Either one can release an effort; with neither, the gate warns at session start when a live effort exists, because a critical effort cannot leave alignment.
- Optional: `@tintinweb/pi-subagents` plus your own agent definitions in `~/.pi/agent/agents/`, for one subagent per stage. Without it, run the stages inline in one session.
- Optional: the `grilling`, `codebase-design` and `code-review` skills under `~/.agents/skills/`. The skill says "if installed" and falls back to doing those steps inline.
- node `>= 22.19.0`, which `engines.node` declares and only `npm test` needs; the extension itself loads through pi.

None of the prerequisites above ships here.

## Install

```bash
pi install git:github.com/maverock24/pi-qrspi
```

Run `pi update --extensions` to pick up later changes. An unpinned `git:` source tracks the remote default branch, so an update takes whatever sits at the tip.

## Paste the rules

pi loads instruction files only from the agent dir and the cwd and its ancestors, and the package manifest has no instructions key, so the rules travel as two blocks in `docs/AGENTS-snippet.md`:

- The QRSPI block goes at the end of `~/.pi/agent/AGENTS.md`. It states the tier rule, the full-tier pipeline, the branch owner file and the commit trailer.
- The question-tool block goes into `~/.pi/agent/APPEND_SYSTEM.md`. It makes every question a 2 to 5 option pick.

## State in .scratch

```
.scratch/ACTIVE            one line, the slug of the effort that owns the branch
.scratch/<slug>/state.md   Slug, Stage, Critical, Done
.scratch/<slug>/*.md       the artifacts, committed with the work
```

In this repo `.scratch/` is git-ignored, so effort artifacts stay local; in your own repo that choice is yours, but `.scratch/ACTIVE` is never committed because the skill deletes it at PR. No `ACTIVE` file means no gate.

## Known limits

- Rewriting `state.md` to `Critical: no` ends a block without a human answer.
- The sensitive-path list is a substring match, so `session`, `auth` and `crypto` can over-block an unrelated repo. Add patterns per repo in `.qrspi-sensitive-paths`.
- A `bash` write is not gated.

## Development

`npm test` runs `node tests/qrspi-gate.test.ts`: 48 checks against a fake pi and a temp repo, covering write blocking by stage and criticality, both release paths, the sensitive-path list and its per-repo additions, the startup warning and the non-critical warnings. There are no dependencies; node strips the types.
