---
name: qrspi
description: Drive one effort through QRSPI, eight stages (Questions, Research, Design, Structure, Plan, Work Tree, Implement, PR). One subagent per stage, a fresh window each, artifacts in .scratch/<slug>/. Use for any full-tier coding task. The human runs no commands.
---

# QRSPI

Decide before you code. Eight stages, one fresh window each, which you get by running each stage in a subagent. The window is thrown away; the artifact carries over.

**The human runs nothing.** You drive the pipeline. They answer two things: the Design round, and the release at the end of alignment.

| Stage | Artifact | Result |
|---|---|---|
| Q Questions | `questions.md` | what to learn about the code |
| R Research | `research.md` | the facts, with `file:line` |
| D Design | `tree.md` | decisions, all settled |
| S Structure | `outline.md` | vertical slices, in order |
| P Plan | `plan.md` | the plan, with a check per phase |
| WT Work Tree | `worktree.md` | tasks, with blocked-by edges |
| I Implement | `plan.md` updated | the code, one commit per task |
| PR | `review.md` | gate result, review, audit |

## You are the orchestrator

Your window stays small on purpose. You hold the plan; the subagents do the work.

- One stage per subagent. Tell the child its stage, the artifact paths to read, the artifact to write, the done-criteria, and "report in under 200 words: what you wrote, what is unresolved".
- Give the child paths, never pasted file contents. It reads and writes the artifact itself.
- A child cannot ask the human: child sessions are non-interactive and the question tools refuse. A child that needs a decision reports it, and you batch it into the Design round.
- Then write `.scratch/<slug>/state.md` to the next stage and spawn the next child.
- Do not do a stage's work here. Two exceptions: D runs in this window, because it asks the human, and you write `ticket.md` at the start, because only this window saw the request.
- Sequential stages: run the child in the foreground so you have its report before advancing. Fan-outs: background, collect, then advance.
- A child reads skills from the same roots you do, so pointing it at a skill file by absolute path works. Fan out where a stage allows it: R one child per question cluster, I one child per ready task, PR one child for the gate and one for the review.

## Two touchpoints

1. **The Design round.** One questionnaire, 2 to 5 questions, concrete options, your recommendation per question. Record the answers in `tree.md`. See the asking rules below.
2. **The release.** When P is done, ask one question with id `qrspi_release` and options `Release to Implement` and `Keep aligning`. Released: write `Stage: Implement`. Not released: fix what they flagged and ask again.

Then PR hands the diff to them to read and own. Nothing else interrupts.

## Start

The request arrives in this window. If the scope, tier or criticality is unclear, fold those into the first questionnaire; otherwise state the tier and the scope in one line and begin.

1. Derive the slug.
2. Write `ticket.md` from the conversation.
3. Write `.scratch/ACTIVE` with the slug.
4. Write `state.md` at stage Questions.
5. Spawn the Q child.

Resuming an existing effort: read `state.md`, rewrite `ACTIVE` if it is missing, and spawn that stage's child.

## Ask, and only when needed

Ask the human only what evidence cannot settle. Facts are your job.

- Send subagents after anything the code, the docs or a primary source can answer.
- R asks nobody. The gate warns if a question tool fires in R.
- One round per frontier, at D.
- Always `questionnaire`, 2 to 5 concrete options, and say which you recommend. No prose questions. No open text: every answer should be a pick.
- Give one line on why evidence cannot settle it.
- A question that turns out to be a fact goes to a subagent, not to the human.

## Gates

Teeth only where it matters. `state.md` holds `Critical: yes|no`, agreed with the human at the start.

- Critical: no code writes during alignment. Alignment ends only on the release answer.
- Not critical: same eight stages, writes allowed, one warning per stage.
- Sensitive paths are critical whatever the flag says: auth, login, session, oauth, permission, migration, payment, billing, secrets, `.env`, crypto, terraform, k8s, helm, dockerfile, docker-compose, CI workflows, `infra/`. A repo adds patterns in `.qrspi-sensitive-paths`.

Every child loads this same gate, so a critical block applies to a child's writes too. The exception is an isolated child, which has no extensions at all: keep isolated workers for after the release, never during alignment.

Never route around the gate, `bash` included, and never write `Implement` without the release answer.

## One window per stage

Each stage gets its own subagent, so Q and R never share a window. Q and R in one window lets the research see the ticket, and it confirms instead of finding.

## Files

`.scratch/<slug>/` holds `ticket.md`, `state.md`, `tree.md`, `questions.md`, `research.md`, `outline.md`, `plan.md`, `worktree.md`, `review.md`. R's children write `research/<n>.md`, then one child merges them into `research.md`.

`ACTIVE` is not one of them: it sits one level up, at `.scratch/ACTIVE`, because that is where every session looks for it.

```markdown
# <title>

- **Slug**: <slug>
- **Stage**: Research (next to run)
- **Critical**: yes
- **Done**: Questions
```

Stage is a full word, never a letter. Critical is `yes` or `no`.

`tree.md` carries the design:

```markdown
# Design tree

## End state

<one or two lines>

## Out of scope

<what this rules out>

## Decisions

### D1. <question>

- **Status**: settled
- **Blocked by**: none
- **Decision**: <answer and why>
```

Frontier: open decisions with nothing left blocking them.

Commit the artifacts with the work. Never commit `ACTIVE`.

## Context

Each child brings a fresh window, so the 40% rule is mostly about yours: keep it under 40% with pointers and summaries, never transcripts. The gate warns at 60%.

If your window is filling, write what you learned into an artifact, keep `state.md` where it is, and hand off. The next window resumes from the artifact.

## Stages

**Q Questions.** Spawn one child: read `ticket.md`, write the questions the code must answer before it can be designed to `questions.md`. Ask what exists, never what to build. Done when every question can be answered with evidence.

**R Research.** Spawn one child per question cluster: read `questions.md` only, ticket out of context. Each reports what exists with a `file:line` per claim and no opinion, and writes `research/<n>.md`. Then one child merges them into `research.md`, one answer per question by number. Done when every question is answered or marked `unresolved` with a reason, and the answer is enough to design on.

**D Design.** In this window. Read `tree.md`, `research.md`, `ticket.md`. Write the end state, the out-of-scope list, and every decision with what blocks it. Put the frontier to the human as one round (read `~/.agents/skills/grilling/SKILL.md` if installed, and `~/.agents/skills/codebase-design/SKILL.md` if installed, when a module's shape is at stake). Record the answers as settled, add what they unblock, repeat. Done when the frontier is empty. None of those three skills ship with this package: if they are not installed, do the same steps inline.

**S Structure.** Spawn one child: read `tree.md`, cut the work into vertical slices, each a full path through every layer and checkable on its own. Prefactor first when it makes the change easy. Write `outline.md`: slices in order, files touched, the check that proves each. Done when every decision sits in a slice and every slice names its check.

**P Plan.** Spawn one child: read `tree.md`, `outline.md`, `research.md`, write `plan.md` with, per phase, the files, the change, one automated check (a command) and one manual check (a human look). Done when no question is open. Then ask for the release, because this is the review that matters most.

**WT Work Tree.** Spawn one child: read `plan.md`, `outline.md`, cut tasks into `worktree.md`, one per checkable step, with files, blocked-by and check. Branch `qrspi/<slug>`, one commit per task. Done when the edges are acyclic and every step is covered.

**I Implement.** Spawn one child per ready task, in parallel: read its task and `plan.md`, make the change, run the task's check, commit with the trailer `QRSPI: <slug>`. Tick the task in `worktree.md` as each reports. Done when every check has passed.

**PR.** Fan out: one child runs the repo's tests, typecheck and lint; one checks the commit log for missing `QRSPI: <slug>` or `QRSPI-Tier: trivial`; one reads `~/.agents/skills/code-review/SKILL.md` if installed and reviews the diff with `plan.md` as the spec. Write `review.md` from their reports. Post findings with `mr-report-findings` when a merge request is loaded, open the MR when a remote and forge exist, and delete `.scratch/ACTIVE`. Done when the human has read the diff and owns it.

## Why

A bad line of research costs more than a bad line of code, and a subagent per stage is what keeps the research honest and this window small. The gate exists because a rule that lives in a prompt gets skipped.
