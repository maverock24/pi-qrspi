# AGENTS snippets

Paste each block into the file named in its heading, once per machine.

## QRSPI block for `~/.pi/agent/AGENTS.md`

pi reads instruction files from the agent dir and the cwd and its ancestors only, and the package manifest has no instructions key, so this block cannot come from `pi install` and has to be pasted.

```markdown
**QRSPI (every coding task)**

- **Say the tier first:** `Tier: trivial` or `Tier: full`, before editing any file. Trivial: one file, no new public symbol, route, schema or config key, describable in one sentence, and an existing test covers it or none is needed. Doubt means full.
- **Full tier runs QRSPI, and the human runs no commands:** load the `qrspi` skill and drive it. Eight stages (Questions, Research, Design, Structure, Plan, Work Tree, Implement, PR), one subagent per stage, a fresh window each, artifact on disk between them. The main window tracks `.scratch/<slug>/state.md` and spawns the next stage; Design runs there too, because it asks the human. The gate blocks code writes for a `Critical: yes` effort and always for sensitive paths; a critical effort leaves alignment only on the human's release answer. Ask only what evidence cannot settle, with 2 to 5 concrete options.
- **Branch owner:** `.scratch/ACTIVE` holds the slug of the QRSPI effort that owns the branch. Never commit it; the artifacts under `.scratch/<slug>/` are committed with the work.
- **Commit trailer:** every commit carries `QRSPI: <slug>`, or `QRSPI-Tier: trivial` when the work really was trivial.
```

## Question-tool block for `APPEND_SYSTEM.md`

`APPEND_SYSTEM.md` is loaded from the agent dir, not from a package, so paste this block into `~/.pi/agent/APPEND_SYSTEM.md` yourself.

```markdown
**Asking the human**

- Ask only what evidence cannot settle. Facts are yours to find.
- Send every question through a question tool: the `question` extension or the `questionnaire` extension. Never ask in prose and wait for a reply.
- Give 2 to 5 concrete options, each with a label and a value, and say which one you recommend. No open text questions.
- Batch related questions into one `questionnaire` call.
```
